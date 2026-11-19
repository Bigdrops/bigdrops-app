package com.bigdrops.app.plugins;

import android.app.DownloadManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
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
    private static final String APK_MIME_TYPE = "application/vnd.android.package-archive";

    // One in-flight download record survives process death. DownloadManager
    // keeps downloading after Android kills the app, so the record is the
    // only way to reattach to that transfer on the next cold start.
    private static final String PREFS_NAME = "bd_update_download";
    private static final String KEY_DOWNLOAD_ID = "downloadId";
    private static final String KEY_VERSION_CODE = "versionCode";
    private static final String KEY_EXPECTED_BYTES = "expectedBytes";
    private static final String KEY_FILE_NAME = "fileName";
    private static final String KEY_URL = "url";

    private final ConcurrentHashMap<Long, PluginCall> activeDownloadCalls = new ConcurrentHashMap<>();
    private final Handler progressHandler = new Handler(Looper.getMainLooper());
    private Runnable progressRunnable = null;
    private String currentDownloadUrl = null;
    private volatile Long lastEnqueueId = null;
    private volatile String pendingInstallUri = null;
    private volatile boolean isForeground = false;
    private volatile boolean expectedBytesRecorded = false;

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

                        // DownloadManager reports -1 for the total until the
                        // transfer connects. Record it once, so a process kill
                        // can still detect a truncated file later.
                        if (total > 0 && !expectedBytesRecorded) {
                            expectedBytesRecorded = true;
                            downloadPrefs(context).edit()
                                    .putLong(KEY_EXPECTED_BYTES, total)
                                    .apply();
                        }

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

    private SharedPreferences downloadPrefs(Context context) {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }

    private void persistDownloadRecord(
            Context context,
            long downloadId,
            int versionCode,
            long expectedBytes,
            String fileName,
            String url
    ) {
        expectedBytesRecorded = expectedBytes > 0;
        downloadPrefs(context).edit()
                .putLong(KEY_DOWNLOAD_ID, downloadId)
                .putInt(KEY_VERSION_CODE, versionCode)
                .putLong(KEY_EXPECTED_BYTES, expectedBytes)
                .putString(KEY_FILE_NAME, fileName)
                .putString(KEY_URL, url)
                .apply();
    }

    private void clearDownloadRecord(Context context) {
        downloadPrefs(context).edit().clear().apply();
    }

    /**
     * Reattaches to a download that outlived the process that started it.
     * Runs when Capacitor creates the plugin, before the first resume.
     */
    @Override
    public void load() {
        super.load();

        Context context = getContext();
        if (context == null) return;

        SharedPreferences prefs = downloadPrefs(context);
        long downloadId = prefs.getLong(KEY_DOWNLOAD_ID, -1L);
        if (downloadId <= 0) return;

        String fileName = prefs.getString(KEY_FILE_NAME, null);
        String url = prefs.getString(KEY_URL, null);
        if (fileName == null || fileName.isEmpty()) {
            clearDownloadRecord(context);
            return;
        }

        File destination = new File(getUpdatesDir(context), fileName);
        int status = downloadStatus(context, downloadId);

        if (status == DownloadManager.STATUS_SUCCESSFUL) {
            if (!destination.exists()) {
                clearDownloadRecord(context);
                return;
            }
            long expectedBytes = prefs.getLong(KEY_EXPECTED_BYTES, 0L);
            if (expectedBytes > 0 && destination.length() != expectedBytes) {
                // Truncated file left by an interrupted transfer.
                //noinspection ResultOfMethodCallIgnored
                destination.delete();
                clearDownloadRecord(context);
                return;
            }
            // Routes through the normal auto-install path, so a cold launch
            // still respects the foreground and unknown-sources rules.
            autoInstall(buildProviderUri(context, destination));
            return;
        }

        if (status == DownloadManager.STATUS_FAILED) {
            //noinspection ResultOfMethodCallIgnored
            destination.delete();
            clearDownloadRecord(context);
            return;
        }

        if (status == DownloadManager.STATUS_RUNNING || status == DownloadManager.STATUS_PENDING) {
            lastEnqueueId = downloadId;
            if (url != null && !url.isEmpty()) {
                startProgressPolling(context, downloadId, url);
            }
            registerCompletionReceiver(context, downloadId, destination);
        }
    }

    /** Total bytes reported by DownloadManager, or 0 when not yet known. */
    private long downloadTotalBytes(Context context, long downloadId) {
        DownloadManager downloadManager =
                (DownloadManager) context.getSystemService(Context.DOWNLOAD_SERVICE);
        if (downloadManager == null) return 0L;

        android.database.Cursor cursor = downloadManager.query(
                new DownloadManager.Query().setFilterById(downloadId));
        if (cursor == null) return 0L;

        try {
            if (cursor.moveToFirst()) {
                int idx = cursor.getColumnIndex(DownloadManager.COLUMN_TOTAL_SIZE_BYTES);
                if (idx >= 0) {
                    long total = cursor.getLong(idx);
                    return Math.max(total, 0L);
                }
            }
        } finally {
            cursor.close();
        }
        return 0L;
    }

    /** {downloadedBytes, totalBytes} as reported by DownloadManager. */
    private long[] downloadByteCounts(Context context, long downloadId) {
        long[] counts = new long[]{0L, 0L};
        DownloadManager downloadManager =
                (DownloadManager) context.getSystemService(Context.DOWNLOAD_SERVICE);
        if (downloadManager == null) return counts;

        android.database.Cursor cursor = downloadManager.query(
                new DownloadManager.Query().setFilterById(downloadId));
        if (cursor == null) return counts;

        try {
            if (cursor.moveToFirst()) {
                int bytesIdx = cursor.getColumnIndex(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR);
                int totalIdx = cursor.getColumnIndex(DownloadManager.COLUMN_TOTAL_SIZE_BYTES);
                long downloaded = bytesIdx >= 0 ? cursor.getLong(bytesIdx) : 0L;
                long total = totalIdx >= 0 ? cursor.getLong(totalIdx) : -1L;
                counts[0] = Math.max(downloaded, 0L);
                counts[1] = Math.max(total, 0L);
            }
        } finally {
            cursor.close();
        }
        return counts;
    }

    @Override
    protected void handleOnDestroy() {
        stopProgressPolling();
        super.handleOnDestroy();
    }

    @Override
    protected void handleOnResume() {
        super.handleOnResume();
        isForeground = true;
        // A download that finished while the app was backgrounded could not
        // launch the installer then (Android 10+ blocks background activity
        // starts). Resume is the first legal moment to retry the queued URI.
        if (pendingInstallUri != null) {
            autoInstall(Uri.parse(pendingInstallUri));
        }
    }

    @Override
    protected void handleOnPause() {
        isForeground = false;
        super.handleOnPause();
    }

    /**
     * Starts Android's package installer for a completed APK.
     *
     * The installer is a normal activity launch, so it only runs while BOUXRE
     * is foregrounded. When the app is backgrounded the URI is queued and
     * retried from handleOnResume(). Nothing is installed silently: Android
     * always shows its own install confirmation.
     */
    private void autoInstall(Uri uri) {
        if (uri == null) return;

        Context context = getContext();
        if (context == null) {
            pendingInstallUri = uri.toString();
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                && !context.getPackageManager().canRequestPackageInstalls()) {
            // Hold the URI until "Install unknown apps" is granted. installApk()
            // opens that settings screen, and resume picks the URI back up.
            pendingInstallUri = uri.toString();
            JSObject blocked = new JSObject();
            blocked.put("uri", uri.toString());
            blocked.put("reason", "unknown-sources-disabled");
            notifyListeners("apkInstallBlocked", blocked);
            return;
        }

        if (!isForeground || getActivity() == null) {
            // Backgrounded: keep the URI for the next resume.
            pendingInstallUri = uri.toString();
            return;
        }

        try {
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(uri, APK_MIME_TYPE);
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);
            pendingInstallUri = null;
            // The installer owns the flow now. Nothing left to recover.
            clearDownloadRecord(context);
        } catch (Exception e) {
            // Do not keep a failing URI queued, or every resume retries it.
            pendingInstallUri = null;
            Log.e(DIAGNOSTIC_TAG, "Auto-install failed: " + safeMessage(e));
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
            // VISIBILITY_HIDDEN (2) requires DOWNLOAD_WITHOUT_NOTIFICATION and
            // throws "Invalid value for visibility: 2" at enqueue without it.
            // A visible notification needs no extra permission.
            request = new DownloadManager.Request(Uri.parse(url))
                    .setTitle(fileName)
                    .setDescription("BIGDROPS update")
                    .setMimeType("application/vnd.android.package-archive")
                    .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                    .setDestinationUri(Uri.fromFile(destination));
        } catch (Exception e) {
            Log.e(DIAGNOSTIC_TAG, "Download request setup failed: " + safeMessage(e));
            call.reject("The download could not start on this device. Use the web download instead.");
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
            Log.e(DIAGNOSTIC_TAG, "Download enqueue failed: " + safeMessage(e));
            call.reject("The download could not start on this device. Use the web download instead.");
            return;
        }

        lastEnqueueId = downloadId;
        activeDownloadCalls.put(downloadId, call);

        // Persist before polling starts: if Android kills the process from
        // here on, load() must still find this transfer.
        Integer versionCodeArg = call.getInt("versionCode");
        int targetVersionCode =
                versionCodeArg == null || versionCodeArg < 0 ? 0 : versionCodeArg;
        persistDownloadRecord(
                context,
                downloadId,
                targetVersionCode,
                downloadTotalBytes(context, downloadId),
                destination.getName(),
                url
        );

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
                int status = downloadStatus(ctx, downloadId);
                if (status != DownloadManager.STATUS_SUCCESSFUL) {
                    // Partial or failed file must not linger as installable.
                    //noinspection ResultOfMethodCallIgnored
                    destination.delete();
                    clearDownloadRecord(ctx);
                    if (call != null) {
                        call.reject("Download failed (status " + status + "). You can retry safely.");
                    }
                    return;
                }

                long size = destination.length();
                Uri contentUri = buildProviderUri(ctx, destination);

                // Announce the verified asset before the installer takes over
                // the screen, so the web layer can enter its installing state.
                JSObject completed = new JSObject();
                completed.put("uri", contentUri.toString());
                completed.put("fileName", destination.getName());
                completed.put("sizeBytes", size);
                notifyListeners("apkDownloadCompleted", completed);

                if (call != null) {
                    JSObject result = new JSObject();
                    result.put("uri", contentUri.toString());
                    result.put("fileName", destination.getName());
                    result.put("sizeBytes", size);
                    result.put("reusedExisting", false);
                    call.resolve(result);
                }

                // Fire the system installer. Deferred to the next resume when
                // BOUXRE is not in the foreground.
                autoInstall(contentUri);
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
                call.reject("Please allow 'Install unknown apps' for BOUXRE in Settings, then tap 'Install update' again.");
                return;
            }
        }

        Uri contentUri = Uri.parse(uriValue);

        try {
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(contentUri, APK_MIME_TYPE);
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
            lastEnqueueId = null;
        }
        clearDownloadRecord(context);
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
        clearDownloadRecord(getContext());
        call.resolve();
    }

    /**
     * Current durable download record, so a cold-started web layer can
     * rehydrate its progress UI. Read-only: it never starts an install.
     */
    @PluginMethod
    public void getDownloadState(PluginCall call) {
        Context context = getContext();
        JSObject result = new JSObject();
        result.put("status", "idle");
        result.put("downloadedBytes", 0L);
        result.put("totalBytes", 0L);
        result.put("versionCode", 0);

        if (context == null) {
            call.resolve(result);
            return;
        }

        SharedPreferences prefs = downloadPrefs(context);
        long downloadId = prefs.getLong(KEY_DOWNLOAD_ID, -1L);
        if (downloadId <= 0) {
            call.resolve(result);
            return;
        }

        String fileName = prefs.getString(KEY_FILE_NAME, null);
        result.put("versionCode", prefs.getInt(KEY_VERSION_CODE, 0));
        if (fileName != null && !fileName.isEmpty()) {
            result.put("fileName", fileName);
        }

        int status = downloadStatus(context, downloadId);

        if (status == DownloadManager.STATUS_SUCCESSFUL) {
            if (fileName == null || fileName.isEmpty()) {
                clearDownloadRecord(context);
                call.resolve(result);
                return;
            }
            File destination = new File(getUpdatesDir(context), fileName);
            if (!destination.exists()) {
                clearDownloadRecord(context);
                call.resolve(result);
                return;
            }
            try {
                result.put("status", "downloaded");
                result.put("downloadedBytes", destination.length());
                result.put("totalBytes", Math.max(
                        destination.length(),
                        prefs.getLong(KEY_EXPECTED_BYTES, 0L)));
                result.put("uri", buildProviderUri(context, destination).toString());
            } catch (Exception e) {
                Log.e(DIAGNOSTIC_TAG, "Could not build install URI: " + safeMessage(e));
                result.put("status", "failed");
            }
            call.resolve(result);
            return;
        }

        if (status == DownloadManager.STATUS_FAILED) {
            result.put("status", "failed");
            call.resolve(result);
            return;
        }

        if (status == DownloadManager.STATUS_RUNNING
                || status == DownloadManager.STATUS_PENDING
                || status == DownloadManager.STATUS_PAUSED) {
            long[] counts = downloadByteCounts(context, downloadId);
            result.put("status", "downloading");
            result.put("downloadedBytes", counts[0]);
            result.put("totalBytes", counts[1] > 0
                    ? counts[1]
                    : prefs.getLong(KEY_EXPECTED_BYTES, 0L));
            call.resolve(result);
            return;
        }

        // No DownloadManager row for this id: the record is stale.
        clearDownloadRecord(context);
        call.resolve(result);
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
