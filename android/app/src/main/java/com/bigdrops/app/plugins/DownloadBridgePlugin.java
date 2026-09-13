package com.bigdrops.app.plugins;

import android.content.ContentResolver;
import android.content.ContentValues;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.IOException;
import java.io.OutputStream;

/**
 * Writes user downloads to public Documents via MediaStore.
 *
 * Raw file writes to shared Documents are blocked by scoped storage on
 * Android 10 and later (EACCES), and the app requests no storage
 * permissions. MediaStore insertion needs no permission for the app's own
 * files, so this bridge is the lasting write path for Android 10+.
 * Devices below Android 10 fall back to the Filesystem flow in
 * fileDownload.ts. No manifest change required.
 */
@CapacitorPlugin(name = "DownloadBridge")
public class DownloadBridgePlugin extends Plugin {

    @PluginMethod
    public void save(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            call.reject("DownloadBridge requires Android 10 or newer.");
            return;
        }

        String folder = call.getString("folder", "BigDrops");
        String fileName = call.getString("fileName");
        String base64Data = call.getString("base64Data");
        String mimeType = call.getString("mimeType", "application/octet-stream");

        if (fileName == null || fileName.isEmpty() || base64Data == null) {
            call.reject("Missing fileName or base64Data.");
            return;
        }

        String relativePath = Environment.DIRECTORY_DOCUMENTS + "/" + folder + "/";

        try {
            String actualName = findAvailableName(relativePath, fileName);
            Uri uri = insertAndWrite(relativePath, actualName, mimeType, base64Data);

            JSObject result = new JSObject();
            result.put("fileName", actualName);
            result.put("uri", uri.toString());
            call.resolve(result);
        } catch (Exception e) {
            String detail = e.getMessage() == null ? "unknown error" : e.getMessage();
            call.reject("Could not save file to Documents: " + detail);
        }
    }

    /**
     * Browser-style collision rule, mirroring fileDownload.ts:
     * name.ext, name (1).ext, name (2).ext, ...
     */
    private String findAvailableName(String relativePath, String fileName) {
        if (!displayNameExists(relativePath, fileName)) {
            return fileName;
        }

        int dot = fileName.lastIndexOf('.');
        String base = dot <= 0 ? fileName : fileName.substring(0, dot);
        String extension = dot <= 0 ? "" : fileName.substring(dot);

        int suffix = 1;
        while (displayNameExists(relativePath, base + " (" + suffix + ")" + extension)) {
            suffix += 1;
        }
        return base + " (" + suffix + ")" + extension;
    }

    private boolean displayNameExists(String relativePath, String displayName) {
        ContentResolver resolver = getContext().getContentResolver();
        Uri collection = MediaStore.Files.getContentUri(MediaStore.VOLUME_EXTERNAL);
        String[] projection = new String[]{MediaStore.MediaColumns._ID};
        String selection = MediaStore.MediaColumns.RELATIVE_PATH + "=? AND "
                + MediaStore.MediaColumns.DISPLAY_NAME + "=?";
        String[] args = new String[]{relativePath, displayName};

        try (Cursor cursor = resolver.query(collection, projection, selection, args, null)) {
            return cursor != null && cursor.getCount() > 0;
        } catch (Exception e) {
            return false;
        }
    }

    private Uri insertAndWrite(
            String relativePath,
            String displayName,
            String mimeType,
            String base64Data
    ) throws IOException {
        ContentResolver resolver = getContext().getContentResolver();
        Uri collection = MediaStore.Files.getContentUri(MediaStore.VOLUME_EXTERNAL);

        ContentValues values = new ContentValues();
        values.put(MediaStore.MediaColumns.DISPLAY_NAME, displayName);
        values.put(MediaStore.MediaColumns.MIME_TYPE, mimeType);
        values.put(MediaStore.MediaColumns.RELATIVE_PATH, relativePath);

        Uri uri = resolver.insert(collection, values);
        if (uri == null) {
            throw new IOException("MediaStore insert returned null.");
        }

        byte[] bytes;
        try {
            bytes = Base64.decode(base64Data, Base64.DEFAULT);
        } catch (IllegalArgumentException e) {
            resolver.delete(uri, null, null);
            throw new IOException("Invalid base64 payload.");
        }

        try (OutputStream out = resolver.openOutputStream(uri)) {
            if (out == null) {
                throw new IOException("Could not open MediaStore output stream.");
            }
            out.write(bytes);
            out.flush();
        } catch (IOException | RuntimeException e) {
            try {
                resolver.delete(uri, null, null);
            } catch (Exception ignored) {
                // Best effort: entry already removed or never committed.
            }
            throw e;
        }

        return uri;
    }
}
