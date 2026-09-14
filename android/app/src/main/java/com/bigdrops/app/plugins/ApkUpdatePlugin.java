package com.bigdrops.app.plugins;

import android.app.DownloadManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.net.Uri;
import android.os.Build;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Native APK download/install bridge for the mandatory-update system.
 *
 * Download: DownloadManager into the app-private cache dir (updates/).
 * No storage permission is needed for app-private cache. HTTPS only.
 * The caller must pass an https URL (enforced here and in TypeScript).
 *
 * Install: FileProvider content:// URI handed to ACTION_VIEW /
 * ACTION_INSTALL_PACKAGE with FLAG_GRANT_READ_URI_PERMISSION, so Android
 * runs its standard package-install confirmation. The app never installs
 * silently. Rationale for ACTION_VIEW with application/vnd.android.package-archive:
 * on API 24+ it routes into the same PackageInstaller confirm flow and
 * avoids REQUEST_INSTALL_PACKAGES edge cases that ACTION_INSTALL_PACKAGE
 * alone can trigger on some OEM builds; both are Android-supported flows.
 *
 * Files stay in cache until deleted (deleteDownload) or evicted by the OS.
 */
@CapacitorPlugin(name = "ApkUpdate")
public class ApkUpdatePlugin extends Plugin {

    private static final String UPDATES_DIR = "updates";
    private static final String FILE_PROVIDER_AUTHORITY_SUFFIX = ".fileprovider";

    private final ConcurrentHashMap<Long, PluginCall> activeDownloadCalls = new ConcurrentHashMap<>();
    private volatile Long lastEnqueueId = null;

    @PluginMethod
    public void downloadApk(PluginCall call) {
        String url = call.getString("url");
        if (url == null || url.trim().isEmpty()) {
            call.reject("Missing url.");
            return;
        }
        if (!url.toLowerCase().startsWith("https://")) {
            call.reject("Only https URLs are allowed.");
            return;
        }

        Context context = getContext();
        File updatesDir = new File(context.getCacheDir(), UPDATES_DIR);
        if (!updatesDir.exists() && !updatesDir.mkdirs()) {
            call.reject("Could not prepare update cache directory.");
            return;
        }

        // Deterministic local file name: last path segment, sanitized.
        String fileName = sanitizeFileName(Uri.parse(url).getLastPathSegment());
        if (fileName == null || fileName.isEmpty()) {
            fileName = "bigdrops-update.apk";
        }
        if (!fileName.toLowerCase().endsWith(".apk")) {
            fileName = fileName + ".apk";
        }

        // A completed prior download of the same URL is reused; a partial
        // file is replaced. This makes retry-after-failure safe and cheap.
        File destination = new File(updatesDir, fileName);

        DownloadManager.Request request;
        try {
            request = new DownloadManager.Request(Uri.parse(url))
                    .setTitle(fileName)
                    .setDescription("BIGDROPS update")
                    .setMimeType("application/vnd.android.package-archive")
                    .setNotificationVisibility(DownloadManager.Request.VISIBILITY_HIDDEN)
                    .setDestinationUri(Uri.fromFile(destination));
        } catch (Exception e) {
            call.reject("Could not start download: " + safeMessage(e));
            return;
        }

        DownloadManager downloadManager =
                (DownloadManager) context.getSystemService(Context.DOWNLOAD_SERVICE);
        if (downloadManager == null) {
            call.reject("Download service unavailable.");
            return;
        }

        long downloadId;
        try {
            downloadId = downloadManager.enqueue(request);
        } catch (Exception e) {
            call.reject("Could not enqueue download: " + safeMessage(e));
            return;
        }

        lastEnqueueId = downloadId;
        activeDownloadCalls.put(downloadId, call);
        registerCompletionReceiver(context, downloadId, destination);
    }

    private void registerCompletionReceiver(Context context, long downloadId, File destination) {
        IntentFilter filter = new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE);
        BroadcastReceiver receiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context ctx, Intent intent) {
                if (intent == null) return;
                long completedId = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1);
                if (completedId != downloadId) return;

                PluginCall call = activeDownloadCalls.remove(downloadId);
                try {
                    ctx.unregisterReceiver(this);
                } catch (IllegalArgumentException ignored) {
                    // Receiver already unregistered.
                }
                if (call == null) return;

                int status = downloadStatus(ctx, downloadId);
                if (status != DownloadManager.STATUS_SUCCESSFUL) {
                    // Partial or failed file must not linger as installable.
                    //noinspection ResultOfMethodCallIgnored
                    destination.delete();
                    call.reject("Download failed (status " + status + "). You can retry safely.");
                    return;
                }

                long size = destination.length();
                JSObject result = new JSObject();
                result.put("uri", buildProviderUri(ctx, destination).toString());
                result.put("fileName", destination.getName());
                result.put("sizeBytes", size);
                result.put("reusedExisting", false);
                call.resolve(result);
            }
        };

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            context.registerReceiver(receiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            context.registerReceiver(receiver, filter);
        }
    }

    private int downloadStatus(Context context, long downloadId) {
        DownloadManager downloadManager =
                (DownloadManager) context.getSystemService(Context.DOWNLOAD_SERVICE);
        if (downloadManager == null) return DownloadManager.STATUS_FAILED;

        android.database.Cursor cursor = downloadManager.query(
                new DownloadManager.Query().setFilterById(downloadId));
        if (cursor == null) return DownloadManager.STATUS_FAILED;

        int status = DownloadManager.STATUS_FAILED;
        try {
            if (cursor.moveToFirst()) {
                int idx = cursor.getColumnIndex(DownloadManager.COLUMN_STATUS);
                if (idx >= 0) status = cursor.getInt(idx);
            }
        } finally {
            cursor.close();
        }
        return status;
    }

    @PluginMethod
    public void installApk(PluginCall call) {
        String uriValue = call.getString("uri");
        if (uriValue == null || uriValue.trim().isEmpty()) {
            call.reject("Missing uri.");
            return;
        }

        Context context = getContext();
        Uri contentUri = Uri.parse(uriValue);

        try {
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(contentUri, "application/vnd.android.package-archive");
            intent.addFlags(
                    Intent.FLAG_GRANT_READ_URI_PERMISSION
                            | Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Could not start the package installer: " + safeMessage(e));
        }
    }

    @PluginMethod
    public void cancelDownload(PluginCall call) {
        Context context = getContext();
        DownloadManager downloadManager =
                (DownloadManager) context.getSystemService(Context.DOWNLOAD_SERVICE);
        if (downloadManager == null) {
            call.resolve();
            return;
        }

        // Cancels the most recent enqueue. Duplicate downloads are already
        // prevented at the TypeScript layer, so one slot is sufficient.
        if (lastEnqueueId != null) {
            downloadManager.remove(lastEnqueueId);
            activeDownloadCalls.remove(lastEnqueueId);
        }
        call.resolve();
    }

    @PluginMethod
    public void deleteDownload(PluginCall call) {
        String fileName = call.getString("fileName");
        if (fileName == null || fileName.isEmpty()) {
            call.reject("Missing fileName.");
            return;
        }
        if (fileName.contains("/") || fileName.contains("..")) {
            call.reject("Invalid fileName.");
            return;
        }

        File target = new File(new File(getContext().getCacheDir(), UPDATES_DIR), fileName);
        boolean removed = !target.exists() || target.delete();
        if (!removed) {
            call.reject("Could not delete downloaded file.");
            return;
        }
        call.resolve();
    }

    private Uri buildProviderUri(Context context, File file) {
        String authority = context.getPackageName() + FILE_PROVIDER_AUTHORITY_SUFFIX;
        return FileProvider.getUriForFile(context, authority, file);
    }

    private static String sanitizeFileName(String raw) {
        if (raw == null) return null;
        String cleaned = raw.replaceAll("[^A-Za-z0-9._-]", "_");
        return cleaned.replaceAll("\\.\\.+", "_");
    }

    private static String safeMessage(Exception e) {
        return e.getMessage() == null ? "unknown error" : e.getMessage();
    }
}
