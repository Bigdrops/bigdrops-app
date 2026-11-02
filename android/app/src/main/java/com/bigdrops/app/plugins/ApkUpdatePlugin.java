package com.bigdrops.app.plugins;

import android.app.DownloadManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.util.Log;

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
 * silently.
 *
 * Files stay in cache until deleted (deleteDownload) or evicted by the OS.
 */
@CapacitorPlugin(name = "ApkUpdate")
public class ApkUpdatePlugin extends Plugin {

    private static final String UPDATES_DIR = "updates";
    private static final String FILE_PROVIDER_AUTHORITY_SUFFIX = ".fileprovider";
    private static final String DIAGNOSTIC_TAG = "BIGDROPS/Update";
    private static final int DIAGNOSTIC_MAX_LENGTH = 512;

    private final ConcurrentHashMap<Long, PluginCall> activeDownloadCalls = new ConcurrentHashMap<>();
    private final Handler progressHandler = new Handler(Looper.getMainLooper());
    private Runnable progressRunnable = null;
    private String currentDownloadUrl = null;
    private volatile Long lastEnqueueId = null;
    private volatile String pendingInstallUri = null;

    private File getUpdatesDir(Context context) {
        File dir = context.getExternalCacheDir();
        if (dir == null) {
            dir = context.getCacheDir();
        }
        return new File(dir, UPDATES_DIR);
    }

    private synchronized void startProgressPolling(Context context, long downloadId, String url) {
        stopProgressPolling();
        currentDownloadUrl = url;
        DownloadManager downloadManager =
                (DownloadManager) context.getSystemService(Context.DOWNLOAD_SERVICE);
        if (downloadManager == null) return;

        progressRunnable = new Runnable() {
            @Override
            public void run() {
                if (lastEnqueueId == null || lastEnqueueId != downloadId) {
                    return;
                }

                DownloadManager.Query query = new DownloadManager.Query().setFilterById(downloadId);
                Cursor cursor = null;
                try {
                    cursor = downloadManager.query(query);
                    if (cursor != null && cursor.moveToFirst()) {
                        int bytesIdx = cursor.getColumnIndex(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR);
                        int totalIdx = cursor.getColumnIndex(DownloadManager.COLUMN_TOTAL_SIZE_BYTES);
                        int statusIdx = cursor.getColumnIndex(DownloadManager.COLUMN_STATUS);

                        long downloaded = bytesIdx >= 0 ? cursor.getLong(bytesIdx) : 0L;
                        long total = totalIdx >= 0 ? cursor.getLong(totalIdx) : -1L;
                        int status = statusIdx >= 0 ? cursor.getInt(statusIdx) : -1;

                        if (status == DownloadManager.STATUS_RUNNING || status == DownloadManager.STATUS_PENDING) {
                            JSObject progress = new JSObject();
                            progress.put("url", currentDownloadUrl);
                            progress.put("downloadedBytes", downloaded);
                            if (total > 0) {
                                progress.put("totalBytes", total);
                            } else {
                                progress.put("totalBytes", null);
                            }
                            notifyListeners("apkDownloadProgress", progress);
                        }
                    }
                } catch (Exception ignored) {
                } finally {
                    if (cursor != null) cursor.close();
                }

                synchronized (ApkUpdatePlugin.this) {
                    if (progressRunnable != null && lastEnqueueId != null && lastEnqueueId == downloadId) {
                        progressHandler.postDelayed(this, 250);
                    }
                }
            }
        };
        progressHandler.post(progressRunnable);
    }

    private synchronized void stopProgressPolling() {
        if (progressRunnable != null) {
            progressHandler.removeCallbacks(progressRunnable);
            progressRunnable = null;
        }
    }

    @Override
    protected void handleOnDestroy() {
        stopProgressPolling();
        super.handleOnDestroy();
    }

    @Override
    protected void handleOnResume() {
        super.handleOnResume();
        if (pendingInstallUri != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Context context = getContext();
            if (context != null && context.getPackageManager().canRequestPackageInstalls()) {
                String uriToInstall = pendingInstallUri;
                pendingInstallUri = null;
                try {
                    Uri contentUri = Uri.parse(uriToInstall);
                    Intent intent = new Intent(Intent.ACTION_VIEW);
                    intent.setDataAndType(contentUri, "application/vnd.android.package-archive");
                    intent.addFlags(
                            Intent.FLAG_GRANT_READ_URI_PERMISSION
                                    | Intent.FLAG_ACTIVITY_NEW_TASK);
                    context.startActivity(intent);
                } catch (Exception e) {
                    Log.e(DIAGNOSTIC_TAG, "Auto-install failed on resume: " + safeMessage(e));
                }
            }
        }
    }

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
        File updatesDir = getUpdatesDir(context);
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

        // Delete any existing target file so bigdrops-latest.apk never collides with a prior download.
        File destination = new File(updatesDir, fileName);
        if (destination.exists()) {
            //noinspection ResultOfMethodCallIgnored
            destination.delete();
        }

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
        startProgressPolling(context, downloadId, url);
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

                stopProgressPolling();

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

        // Android 8.0+ (Oreo, API 26+) unknown sources check
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            if (!context.getPackageManager().canRequestPackageInstalls()) {
                pendingInstallUri = uriValue;
                try {
                    Intent settingsIntent = new Intent(
                            Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                            Uri.parse("package:" + context.getPackageName()));
                    settingsIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    context.startActivity(settingsIntent);
                } catch (Exception e) {
                    try {
                        Intent genericIntent = new Intent(Settings.ACTION_SECURITY_SETTINGS);
                        genericIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        context.startActivity(genericIntent);
                    } catch (Exception ignored) {
                    }
                }
                call.reject("Please allow 'Install unknown apps' for BOURXE in Settings, then tap 'Install update' again.");
                return;
            }
        }

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
        stopProgressPolling();
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

        File target = new File(getUpdatesDir(getContext()), fileName);
        boolean removed = !target.exists() || target.delete();
        if (!removed) {
            call.reject("Could not delete downloaded file.");
            return;
        }
        call.resolve();
    }

    /**
     * Narrow diagnostic sink for sanitized update reason lines. Uses
     * android.util.Log directly so output reaches logcat even when
     * Capacitor's Logger gate is closed on release builds. The message is
     * sanitized upstream (reason codes only); it is flattened to one
     * bounded line here as defense in depth.
     */
    @PluginMethod
    public void logDiagnostic(PluginCall call) {
        String message = call.getString("message");
        if (message == null) {
            call.reject("Missing message.");
            return;
        }
        String singleLine = message.replaceAll("[\\r\\n]+", " ");
        if (singleLine.length() > DIAGNOSTIC_MAX_LENGTH) {
            singleLine = singleLine.substring(0, DIAGNOSTIC_MAX_LENGTH);
        }
        Log.i(DIAGNOSTIC_TAG, singleLine);
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
