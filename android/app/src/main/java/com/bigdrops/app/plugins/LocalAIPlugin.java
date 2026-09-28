package com.bigdrops.app.plugins;

import android.app.ActivityManager;
import android.content.Context;
import android.os.Build;
import android.os.StatFs;
import android.os.SystemClock;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.DigestInputStream;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

@CapacitorPlugin(name = "LocalAI")
public class LocalAIPlugin extends Plugin {
    private static final String PLUGIN_VERSION = "phase-2-poc-native";
    private static final String RUNTIME_NAME = "llama.cpp";
    private static final String LLAMA_CPP_COMMIT = "4da6337767f973e2b4d0797e5b323d77d8565e4a";
    private static final String MODEL_DIRECTORY = "local-ai/models";
    private static final String TEMP_DIRECTORY = "local-ai/tmp";
    private static final String POC_MODEL_ID = "qwen3-0.6b-instruct-q4-k-m-gguf-poc";
    private static final String POC_MODEL_FILENAME = "qwen3-0.6b-instruct-q4-k-m-gguf-poc.gguf";
    private static final String POC_MODEL_METADATA_FILENAME = "qwen3-0.6b-instruct-q4-k-m-gguf-poc.json";
    private static final String POC_MODEL_DOWNLOAD_URL = "https://huggingface.co/QuantFactory/Qwen3-0.6B-GGUF/resolve/e7e05d713acaa2baccdfb52e967eaba8ba562ba8/Qwen3-0.6B.Q4_K_M.gguf?download=1";
    private static final String POC_MODEL_EXPECTED_SHA256 = "7af3fdf842f87b24672f8a7f1dd50404043f0bfb71093ff91c31d2b49df4631d";
    private static final long POC_MODEL_EXPECTED_BYTES = 484_220_000L;
    private static final int MAX_OUTPUT_TOKENS = 384;
    private static final int DOWNLOAD_BUFFER_BYTES = 1024 * 1024;

    private static final String CLEANUP_RESULT_GRAMMAR =
        "root ::= object\n" +
        "object ::= \"{\" ws response-type \",\" ws schema-version \",\" ws task-id \",\" ws cleanup-snapshot-id \",\" ws provider-id \",\" ws model-id \",\" ws proposals \"}\" ws\n" +
        "response-type ::= \"\\\"response_type\\\"\" ws \":\" ws \"\\\"cleanup_ai_review_result\\\"\"\n" +
        "schema-version ::= \"\\\"schema_version\\\"\" ws \":\" ws \"1\"\n" +
        "task-id ::= \"\\\"task_id\\\"\" ws \":\" ws string\n" +
        "cleanup-snapshot-id ::= \"\\\"cleanup_snapshot_id\\\"\" ws \":\" ws string\n" +
        "provider-id ::= \"\\\"provider_id\\\"\" ws \":\" ws \"\\\"local_android\\\"\"\n" +
        "model-id ::= \"\\\"model_id\\\"\" ws \":\" ws string\n" +
        "proposals ::= \"\\\"proposals\\\"\" ws \":\" ws \"[\" ws proposal (\",\" ws proposal)* \"]\"\n" +
        "proposal ::= \"{\" ws group-id \",\" ws decision \",\" ws winner-item-id \",\" ws merged-item-ids \",\" ws reason-codes \",\" ws reason \",\" ws referenced-evidence-ids \",\" ws warnings \"}\"\n" +
        "group-id ::= \"\\\"group_id\\\"\" ws \":\" ws string\n" +
        "decision ::= \"\\\"decision\\\"\" ws \":\" ws (\"\\\"SAME_ITEM\\\"\" | \"\\\"DIFFERENT_ITEM\\\"\" | \"\\\"UNSURE\\\"\")\n" +
        "winner-item-id ::= \"\\\"winner_item_id\\\"\" ws \":\" ws (string | \"null\")\n" +
        "merged-item-ids ::= \"\\\"merged_item_ids\\\"\" ws \":\" ws string-array\n" +
        "reason-codes ::= \"\\\"reason_codes\\\"\" ws \":\" ws string-array\n" +
        "reason ::= \"\\\"reason\\\"\" ws \":\" ws string\n" +
        "referenced-evidence-ids ::= \"\\\"referenced_evidence_ids\\\"\" ws \":\" ws string-array\n" +
        "warnings ::= \"\\\"warnings\\\"\" ws \":\" ws string-array\n" +
        "string-array ::= \"[\" ws (string (\",\" ws string)*)? \"]\"\n" +
        "string ::= \"\\\"\" chars \"\\\"\"\n" +
        "chars ::= ([^\"\\\\] | \"\\\\\" ([\"\\\\/bfnrt] | \"u\" [0-9a-fA-F] [0-9a-fA-F] [0-9a-fA-F] [0-9a-fA-F]))*\n" +
        "ws ::= ([ \\t\\n\\r])*";

    private final Object stateLock = new Object();

    @Nullable
    private String loadedModelId;

    private long nativeHandle = 0L;
    private boolean nativeLibraryLoaded = false;
    private volatile boolean isGenerating = false;
    private long lastLoadMs = 0L;
    private long lastGenerationMs = 0L;
    private int lastPromptTokens = 0;
    private int lastOutputTokens = 0;
    private double lastTokensPerSecond = 0.0;
    private long memoryBeforeLoadBytes = 0L;
    private long memoryAfterLoadBytes = 0L;
    private long memoryAfterUnloadBytes = 0L;
    @Nullable
    private String loadedModelDescription;
    @Nullable
    private Thread modelDownloadThread;
    private volatile boolean cancelModelDownload = false;
    private volatile long modelDownloadBytes = 0L;
    private volatile String modelDownloadMessage = null;

    static {
        // Loading is also guarded at runtime so unsupported builds fail closed.
        try {
            System.loadLibrary("bigdrops_local_ai");
        } catch (UnsatisfiedLinkError ignored) {
            // getRuntimeInfo reports runtimeLinked=false when the native library is absent.
        }
    }

    private static native String nativeRuntimeVersion();
    private native long nativeCreate();
    private native void nativeDestroy(long handle);
    private native String nativeLoadModel(long handle, String path);
    private native String nativeGenerate(long handle, String prompt, String grammar, int maxTokens);
    private native void nativeCancel(long handle);
    private native String nativeUnload(long handle);

    @Override
    public void load() {
        initializeNativeRuntime();
    }

    @Override
    protected void handleOnDestroy() {
        synchronized (stateLock) {
            if (nativeLibraryLoaded && nativeHandle != 0L) {
                nativeDestroy(nativeHandle);
                nativeHandle = 0L;
            }
            loadedModelId = null;
            isGenerating = false;
        }
        super.handleOnDestroy();
    }

    @PluginMethod
    public void getRuntimeInfo(PluginCall call) {
        call.resolve(buildRuntimeInfo());
    }

    @PluginMethod
    public void getModelStatus(PluginCall call) {
        String modelId = safeModelId(call.getString("modelId"));
        if (modelId == null) {
            call.reject("A supported modelId is required.");
            return;
        }

        call.resolve(buildModelStatus(modelId));
    }

    @PluginMethod
    public void downloadModel(PluginCall call) {
        String modelId = safeModelId(call.getString("modelId"));
        if (modelId == null) {
            call.reject("A supported modelId is required.");
            return;
        }

        synchronized (stateLock) {
            if (modelDownloadThread != null && modelDownloadThread.isAlive()) {
                call.reject("A Local AI model download is already running.");
                return;
            }
            if (isModelInstalledAndVerified(modelId)) {
                call.resolve(buildModelStatus(modelId));
                return;
            }
            modelDownloadBytes = 0L;
            modelDownloadMessage = "Download starting.";
            cancelModelDownload = false;
        }

        if (availableStorageBytes() < POC_MODEL_EXPECTED_BYTES + (64L * 1024L * 1024L)) {
            call.reject("Not enough app-private storage is available for this Local AI model.");
            return;
        }

        modelDownloadThread = new Thread(() -> runModelDownload(call, modelId), "bigdrops-local-ai-model-download");
        modelDownloadThread.start();
    }

    @PluginMethod
    public void cancelModelDownload(PluginCall call) {
        String modelId = safeModelId(call.getString("modelId"));
        if (modelId == null) {
            call.reject("A supported modelId is required.");
            return;
        }

        boolean active = modelDownloadThread != null && modelDownloadThread.isAlive();
        cancelModelDownload = true;
        JSObject result = new JSObject();
        result.put("cancelled", active);
        call.resolve(result);
    }

    @PluginMethod
    public void verifyModel(PluginCall call) {
        String modelId = safeModelId(call.getString("modelId"));
        if (modelId == null) {
            call.reject("A supported modelId is required.");
            return;
        }

        try {
            ModelVerification verification = verifyModelFile(modelId);
            if (!verification.ok) {
                deleteMetadataFile(modelId);
                call.reject(verification.message);
                return;
            }
            writeModelMetadata(modelId, verification.sha256, verification.bytes);
            call.resolve(buildModelStatus(modelId));
        } catch (RuntimeException error) {
            call.reject("Local AI model verification failed.");
        }
    }

    @PluginMethod
    public void deleteModel(PluginCall call) {
        String modelId = safeModelId(call.getString("modelId"));
        if (modelId == null) {
            call.reject("A supported modelId is required.");
            return;
        }

        synchronized (stateLock) {
            if (isGenerating) {
                if (isLlamaRuntimeLinked()) nativeCancel(nativeHandle);
                call.reject("Local AI generation is being cancelled. Try deleting the model again after it stops.");
                return;
            }
            if (loadedModelId != null && loadedModelId.equals(modelId) && isLlamaRuntimeLinked()) {
                try {
                    nativeUnload(nativeHandle);
                } catch (RuntimeException ignored) {
                    // Deletion is still fail-closed below if the file cannot be removed.
                }
                loadedModelId = null;
                loadedModelDescription = null;
                memoryAfterUnloadBytes = availableMemoryBytes();
            }
        }

        cancelModelDownload = true;
        File modelFile = resolveModelFile(modelId);
        File tempFile = resolveTempModelFile(modelId);
        if (modelFile.exists() && !modelFile.delete()) {
            call.reject("The installed Local AI model could not be deleted.");
            return;
        }
        if (tempFile.exists()) {
            //noinspection ResultOfMethodCallIgnored
            tempFile.delete();
        }
        deleteMetadataFile(modelId);
        call.resolve(buildModelStatus(modelId));
    }

    @PluginMethod
    public void loadModel(PluginCall call) {
        String modelId = safeModelId(call.getString("modelId"));
        if (modelId == null) {
            call.reject("A supported modelId is required.");
            return;
        }

        if (!isLlamaRuntimeLinked()) {
            call.reject("The LocalAI Capacitor bridge is installed, but the llama.cpp native runtime is not linked in this Android build.");
            return;
        }

        if (!isModelInstalledAndVerified(modelId)) {
            call.reject("The requested GGUF model is not installed and verified in app-private Local AI storage.");
            return;
        }

        File modelFile = resolveModelFile(modelId);

        synchronized (stateLock) {
            if (isGenerating) {
                call.reject("Cancel the active Local AI generation before loading a model.");
                return;
            }
            if (loadedModelId != null) {
                if (loadedModelId.equals(modelId)) {
                    JSObject result = new JSObject();
                    result.put("loaded", true);
                    result.put("modelId", modelId);
                    result.put("message", "Model is already loaded.");
                    call.resolve(result);
                    return;
                }
                call.reject("Unload the current Local AI model before loading another model.");
                return;
            }
        }

        long startedAt = SystemClock.elapsedRealtime();
        memoryBeforeLoadBytes = availableMemoryBytes();

        try {
            JSONObject nativeResult = parseNativeResult(nativeLoadModel(nativeHandle, modelFile.getAbsolutePath()));
            if (!nativeResult.optBoolean("ok", false)) {
                call.reject(nativeResult.optString("error", "The native runtime could not load the model."));
                return;
            }

            synchronized (stateLock) {
                loadedModelId = modelId;
                loadedModelDescription = nativeResult.optString("modelDescription", null);
                lastLoadMs = SystemClock.elapsedRealtime() - startedAt;
                memoryAfterLoadBytes = availableMemoryBytes();
            }

            JSObject result = new JSObject();
            result.put("loaded", true);
            result.put("modelId", modelId);
            result.put("message", "Model loaded.");
            result.put("loadMs", lastLoadMs);
            result.put("modelDescription", loadedModelDescription);
            result.put("modelSizeBytes", nativeResult.optLong("modelSizeBytes", 0L));
            result.put("modelParameterCount", nativeResult.optLong("modelParameterCount", 0L));
            call.resolve(result);
        } catch (JSONException error) {
            call.reject("The native runtime returned an invalid load response.");
        } catch (RuntimeException error) {
            call.reject("The native runtime could not load the model.");
        }
    }

    @PluginMethod
    public void analyzeCleanupTask(PluginCall call) {
        if (!isLlamaRuntimeLinked()) {
            call.reject("The llama.cpp native runtime is not linked in this Android build.");
            return;
        }

        JSObject task = call.getObject("task");
        String prompt = call.getString("prompt");
        if (task == null || prompt == null || prompt.trim().isEmpty()) {
            call.reject("A Cleanup task and prompt are required.");
            return;
        }

        String modelId;
        synchronized (stateLock) {
            if (isGenerating) {
                call.reject("A Local AI generation is already running.");
                return;
            }
            if (loadedModelId == null) {
                call.reject("Load a Local AI model before analysis.");
                return;
            }
            modelId = loadedModelId;
            isGenerating = true;
        }

        try {
            JSONObject nativeResult = parseNativeResult(nativeGenerate(nativeHandle, prompt, CLEANUP_RESULT_GRAMMAR, MAX_OUTPUT_TOKENS));
            if (!nativeResult.optBoolean("ok", false)) {
                call.reject(nativeResult.optString("error", "Local AI generation failed."));
                return;
            }

            synchronized (stateLock) {
                lastPromptTokens = nativeResult.optInt("promptTokens", 0);
                lastOutputTokens = nativeResult.optInt("outputTokens", 0);
                lastGenerationMs = nativeResult.optLong("elapsedMs", 0L);
                lastTokensPerSecond = nativeResult.optDouble("tokensPerSecond", 0.0);
            }

            JSObject result = new JSObject();
            result.put("rawText", nativeResult.optString("rawText", ""));
            result.put("modelId", modelId);
            result.put("elapsedMs", lastGenerationMs);
            result.put("promptTokens", lastPromptTokens);
            result.put("outputTokens", lastOutputTokens);
            result.put("tokensPerSecond", lastTokensPerSecond);
            result.put("peakMemoryBytes", JSONObject.NULL);
            call.resolve(result);
        } catch (JSONException error) {
            call.reject("The native runtime returned an invalid generation response.");
        } catch (RuntimeException error) {
            call.reject("Local AI generation failed.");
        } finally {
            synchronized (stateLock) {
                isGenerating = false;
            }
        }
    }

    @PluginMethod
    public void cancelGeneration(PluginCall call) {
        boolean wasGenerating;
        synchronized (stateLock) {
            wasGenerating = isGenerating;
        }
        if (isLlamaRuntimeLinked()) {
            nativeCancel(nativeHandle);
        }

        JSObject result = new JSObject();
        result.put("cancelled", wasGenerating);
        call.resolve(result);
    }

    @PluginMethod
    public void unloadModel(PluginCall call) {
        if (!isLlamaRuntimeLinked()) {
            call.reject("The llama.cpp native runtime is not linked in this Android build.");
            return;
        }

        synchronized (stateLock) {
            if (isGenerating) {
                call.reject("Cancel the active Local AI generation before unloading the model.");
                return;
            }
        }

        try {
            JSONObject nativeResult = parseNativeResult(nativeUnload(nativeHandle));
            if (!nativeResult.optBoolean("ok", false)) {
                call.reject(nativeResult.optString("error", "The native runtime could not unload the model."));
                return;
            }

            synchronized (stateLock) {
                loadedModelId = null;
                loadedModelDescription = null;
                memoryAfterUnloadBytes = availableMemoryBytes();
            }

            JSObject result = new JSObject();
            result.put("unloaded", true);
            call.resolve(result);
        } catch (JSONException error) {
            call.reject("The native runtime returned an invalid unload response.");
        } catch (RuntimeException error) {
            call.reject("The native runtime could not unload the model.");
        }
    }

    @NonNull
    private JSObject buildRuntimeInfo() {
        boolean linked = isLlamaRuntimeLinked();
        JSObject info = new JSObject();
        info.put("available", true);
        info.put("platform", "android");
        info.put("pluginVersion", PLUGIN_VERSION);
        info.put("runtime", RUNTIME_NAME);
        info.put("runtimeLinked", linked);
        info.put("llamaCppCommit", LLAMA_CPP_COMMIT);
        info.put("runtimeVersion", linked ? nativeRuntimeVersion() : null);
        JSArray supportedAbis = new JSArray();
        for (String abi : Build.SUPPORTED_ABIS) {
            supportedAbis.put(abi);
        }
        info.put("supportedAbis", supportedAbis);
        info.put("selectedAbi", Build.SUPPORTED_ABIS.length > 0 ? Build.SUPPORTED_ABIS[0] : null);
        info.put("modelDirectoryReady", ensureModelDirectory().isDirectory());
        info.put("loadedModelId", loadedModelId);
        info.put("loadedModelDescription", loadedModelDescription);
        info.put("isGenerating", isGenerating);
        info.put("lastLoadMs", lastLoadMs);
        info.put("lastGenerationMs", lastGenerationMs);
        info.put("lastPromptTokens", lastPromptTokens);
        info.put("lastOutputTokens", lastOutputTokens);
        info.put("lastTokensPerSecond", lastTokensPerSecond);
        info.put("memoryBeforeLoadBytes", memoryBeforeLoadBytes);
        info.put("memoryAfterLoadBytes", memoryAfterLoadBytes);
        info.put("memoryAfterUnloadBytes", memoryAfterUnloadBytes);
        info.put("message", linked
            ? "Local llama.cpp runtime is linked."
            : "LocalAI bridge is present. Add the pinned llama.cpp Android runtime before real inference can run.");
        return info;
    }

    private void initializeNativeRuntime() {
        synchronized (stateLock) {
            if (nativeLibraryLoaded) return;
            try {
                if (nativeHandle == 0L) {
                    nativeHandle = nativeCreate();
                }
                nativeLibraryLoaded = nativeHandle != 0L;
            } catch (UnsatisfiedLinkError error) {
                nativeLibraryLoaded = false;
                nativeHandle = 0L;
            }
        }
    }

    private boolean isLlamaRuntimeLinked() {
        initializeNativeRuntime();
        return nativeLibraryLoaded && nativeHandle != 0L;
    }

    @Nullable
    private String safeModelId(@Nullable String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        if (POC_MODEL_ID.equals(trimmed)) return trimmed;
        return null;
    }

    @NonNull
    private File ensureModelDirectory() {
        File directory = new File(getContext().getFilesDir(), MODEL_DIRECTORY);
        if (!directory.isDirectory()) {
            //noinspection ResultOfMethodCallIgnored
            directory.mkdirs();
        }
        return directory;
    }

    @NonNull
    private File ensureTempDirectory() {
        File directory = new File(getContext().getFilesDir(), TEMP_DIRECTORY);
        if (!directory.isDirectory()) {
            //noinspection ResultOfMethodCallIgnored
            directory.mkdirs();
        }
        return directory;
    }

    @NonNull
    private File resolveModelFile(@NonNull String modelId) {
        if (!POC_MODEL_ID.equals(modelId)) {
            return new File(ensureModelDirectory(), "unsupported-model.gguf");
        }
        return new File(ensureModelDirectory(), POC_MODEL_FILENAME);
    }

    @NonNull
    private File resolveMetadataFile(@NonNull String modelId) {
        if (!POC_MODEL_ID.equals(modelId)) {
            return new File(ensureModelDirectory(), "unsupported-model.json");
        }
        return new File(ensureModelDirectory(), POC_MODEL_METADATA_FILENAME);
    }

    @NonNull
    private File resolveTempModelFile(@NonNull String modelId) {
        if (!POC_MODEL_ID.equals(modelId)) {
            return new File(ensureTempDirectory(), "unsupported-model.gguf.download");
        }
        return new File(ensureTempDirectory(), POC_MODEL_FILENAME + ".download");
    }

    @NonNull
    private JSObject buildModelStatus(@NonNull String modelId) {
        boolean downloading = modelDownloadThread != null && modelDownloadThread.isAlive();
        File modelFile = resolveModelFile(modelId);
        File metadataFile = resolveMetadataFile(modelId);
        boolean verified = false;
        String state = "not_installed";
        String message = null;

        if (downloading) {
            state = "downloading";
            message = modelDownloadMessage;
        } else if (modelFile.isFile() && metadataFile.isFile() && isMetadataVerified(modelId)) {
            verified = true;
            state = "installed";
            message = "Model is installed and verified.";
        } else if (modelFile.exists() || metadataFile.exists()) {
            state = "failed";
            message = "Model file exists but has not passed pinned checksum verification.";
        }

        JSObject status = new JSObject();
        status.put("modelId", modelId);
        status.put("state", state);
        status.put("verified", verified);
        status.put("expectedBytes", POC_MODEL_EXPECTED_BYTES);
        status.put("expectedSha256", POC_MODEL_EXPECTED_SHA256);
        status.put("installedBytes", modelFile.isFile() ? modelFile.length() : 0L);
        status.put("downloadedBytes", downloading ? modelDownloadBytes : 0L);
        status.put("totalBytes", POC_MODEL_EXPECTED_BYTES);
        status.put("message", message);
        return status;
    }

    private void runModelDownload(@NonNull PluginCall call, @NonNull String modelId) {
        File tempFile = resolveTempModelFile(modelId);
        File modelFile = resolveModelFile(modelId);
        HttpURLConnection connection = null;

        try {
            if (tempFile.exists() && !tempFile.delete()) {
                throw new RuntimeException("Could not clear the previous partial model download.");
            }

            URL url = new URL(POC_MODEL_DOWNLOAD_URL);
            if (!"https".equalsIgnoreCase(url.getProtocol())) {
                throw new RuntimeException("Local AI model download must use HTTPS.");
            }

            connection = (HttpURLConnection) url.openConnection();
            connection.setConnectTimeout(20_000);
            connection.setReadTimeout(30_000);
            connection.setInstanceFollowRedirects(true);

            int code = connection.getResponseCode();
            if (code < 200 || code >= 300) {
                throw new RuntimeException("Local AI model download failed with HTTP " + code + ".");
            }

            MessageDigest digest = sha256Digest();
            long downloaded = 0L;
            long lastProgressAt = 0L;
            modelDownloadMessage = "Downloading model.";
            emitDownloadProgress(modelId, "downloading", downloaded, "Downloading model.");

            try (
                InputStream input = connection.getInputStream();
                DigestInputStream digestInput = new DigestInputStream(input, digest);
                FileOutputStream output = new FileOutputStream(tempFile)
            ) {
                byte[] buffer = new byte[DOWNLOAD_BUFFER_BYTES];
                int read;
                while ((read = digestInput.read(buffer)) != -1) {
                    if (cancelModelDownload) {
                        throw new InterruptedException("Local AI model download was cancelled.");
                    }
                    output.write(buffer, 0, read);
                    downloaded += read;
                    modelDownloadBytes = downloaded;
                    long now = SystemClock.elapsedRealtime();
                    if (now - lastProgressAt > 500L) {
                        lastProgressAt = now;
                        emitDownloadProgress(modelId, "downloading", downloaded, "Downloading model.");
                    }
                }
                output.getFD().sync();
            }

            modelDownloadMessage = "Verifying checksum.";
            emitDownloadProgress(modelId, "verifying", downloaded, "Verifying checksum.");

            String actualSha256 = hexDigest(digest.digest());
            if (downloaded != POC_MODEL_EXPECTED_BYTES) {
                throw new RuntimeException("Downloaded model size does not match the pinned manifest.");
            }
            if (!POC_MODEL_EXPECTED_SHA256.equalsIgnoreCase(actualSha256)) {
                throw new RuntimeException("Downloaded model SHA-256 does not match the pinned manifest.");
            }

            if (modelFile.exists() && !modelFile.delete()) {
                throw new RuntimeException("Could not replace the installed Local AI model.");
            }
            if (!tempFile.renameTo(modelFile)) {
                throw new RuntimeException("Could not promote the verified Local AI model.");
            }

            writeModelMetadata(modelId, actualSha256, downloaded);
            modelDownloadMessage = "Model installed and verified.";
            emitDownloadProgress(modelId, "installed", downloaded, "Model installed and verified.");
            call.resolve(buildModelStatus(modelId));
        } catch (InterruptedException error) {
            if (tempFile.exists()) {
                //noinspection ResultOfMethodCallIgnored
                tempFile.delete();
            }
            modelDownloadMessage = "Download cancelled.";
            emitDownloadProgress(modelId, "failed", modelDownloadBytes, "Download cancelled.");
            call.reject("Local AI model download was cancelled.");
        } catch (RuntimeException | java.io.IOException error) {
            if (tempFile.exists()) {
                //noinspection ResultOfMethodCallIgnored
                tempFile.delete();
            }
            modelDownloadMessage = error.getMessage();
            emitDownloadProgress(modelId, "failed", modelDownloadBytes, modelDownloadMessage);
            call.reject(modelDownloadMessage != null ? modelDownloadMessage : "Local AI model download failed.");
        } finally {
            if (connection != null) connection.disconnect();
            synchronized (stateLock) {
                modelDownloadThread = null;
                cancelModelDownload = false;
            }
        }
    }

    private void emitDownloadProgress(@NonNull String modelId, @NonNull String state, long downloadedBytes, @Nullable String message) {
        JSObject event = new JSObject();
        event.put("modelId", modelId);
        event.put("state", state);
        event.put("downloadedBytes", downloadedBytes);
        event.put("totalBytes", POC_MODEL_EXPECTED_BYTES);
        event.put("message", message);
        notifyListeners("localAIModelDownloadProgress", event);
    }

    private boolean isModelInstalledAndVerified(@NonNull String modelId) {
        File modelFile = resolveModelFile(modelId);
        return modelFile.isFile() && modelFile.canRead() && resolveMetadataFile(modelId).isFile() && isMetadataVerified(modelId);
    }

    private boolean isMetadataVerified(@NonNull String modelId) {
        try (FileInputStream input = new FileInputStream(resolveMetadataFile(modelId))) {
            byte[] bytes = new byte[(int) resolveMetadataFile(modelId).length()];
            int read = input.read(bytes);
            if (read <= 0) return false;
            JSONObject metadata = new JSONObject(new String(bytes, 0, read, java.nio.charset.StandardCharsets.UTF_8));
            return POC_MODEL_ID.equals(metadata.optString("modelId"))
                && POC_MODEL_EXPECTED_SHA256.equalsIgnoreCase(metadata.optString("sha256"))
                && POC_MODEL_EXPECTED_BYTES == metadata.optLong("bytes", -1L)
                && resolveModelFile(modelId).length() == POC_MODEL_EXPECTED_BYTES;
        } catch (Exception error) {
            return false;
        }
    }

    @NonNull
    private ModelVerification verifyModelFile(@NonNull String modelId) {
        File modelFile = resolveModelFile(modelId);
        if (!modelFile.isFile() || !modelFile.canRead()) {
            return ModelVerification.failed("The requested GGUF model is not installed in app-private Local AI storage.");
        }
        if (modelFile.length() != POC_MODEL_EXPECTED_BYTES) {
            return ModelVerification.failed("Model size does not match the pinned manifest.");
        }

        try (
            FileInputStream input = new FileInputStream(modelFile);
            DigestInputStream digestInput = new DigestInputStream(input, sha256Digest())
        ) {
            byte[] buffer = new byte[DOWNLOAD_BUFFER_BYTES];
            //noinspection StatementWithEmptyBody
            while (digestInput.read(buffer) != -1) {
                // Stream through the file so the digest sees every byte.
            }
            String sha256 = hexDigest(digestInput.getMessageDigest().digest());
            if (!POC_MODEL_EXPECTED_SHA256.equalsIgnoreCase(sha256)) {
                return ModelVerification.failed("Model SHA-256 does not match the pinned manifest.");
            }
            return ModelVerification.ok(sha256, modelFile.length());
        } catch (Exception error) {
            return ModelVerification.failed("Local AI model verification failed.");
        }
    }

    private void writeModelMetadata(@NonNull String modelId, @NonNull String sha256, long bytes) {
        try (FileOutputStream output = new FileOutputStream(resolveMetadataFile(modelId))) {
            JSONObject metadata = new JSONObject();
            metadata.put("modelId", modelId);
            metadata.put("sha256", sha256);
            metadata.put("bytes", bytes);
            metadata.put("verifiedAt", System.currentTimeMillis());
            output.write(metadata.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8));
            output.getFD().sync();
        } catch (Exception error) {
            throw new RuntimeException("Could not write Local AI model metadata.");
        }
    }

    private void deleteMetadataFile(@NonNull String modelId) {
        File metadataFile = resolveMetadataFile(modelId);
        if (metadataFile.exists()) {
            //noinspection ResultOfMethodCallIgnored
            metadataFile.delete();
        }
    }

    private long availableMemoryBytes() {
        ActivityManager activityManager = (ActivityManager) getContext().getSystemService(Context.ACTIVITY_SERVICE);
        ActivityManager.MemoryInfo memoryInfo = new ActivityManager.MemoryInfo();
        if (activityManager != null) {
            activityManager.getMemoryInfo(memoryInfo);
            return memoryInfo.availMem;
        }
        return 0L;
    }

    private long availableStorageBytes() {
        StatFs statFs = new StatFs(getContext().getFilesDir().getAbsolutePath());
        return statFs.getAvailableBytes();
    }

    @NonNull
    private MessageDigest sha256Digest() {
        try {
            return MessageDigest.getInstance("SHA-256");
        } catch (NoSuchAlgorithmException error) {
            throw new RuntimeException("SHA-256 is not available on this device.");
        }
    }

    @NonNull
    private String hexDigest(@NonNull byte[] digest) {
        StringBuilder builder = new StringBuilder(digest.length * 2);
        for (byte b : digest) {
            builder.append(String.format("%02x", b));
        }
        return builder.toString();
    }

    private JSONObject parseNativeResult(@Nullable String result) throws JSONException {
        if (result == null || result.trim().isEmpty()) {
            throw new JSONException("Empty native result");
        }
        return new JSONObject(result);
    }

    private static final class ModelVerification {
        final boolean ok;
        final String sha256;
        final long bytes;
        final String message;

        private ModelVerification(boolean ok, @NonNull String sha256, long bytes, @NonNull String message) {
            this.ok = ok;
            this.sha256 = sha256;
            this.bytes = bytes;
            this.message = message;
        }

        static ModelVerification ok(@NonNull String sha256, long bytes) {
            return new ModelVerification(true, sha256, bytes, "");
        }

        static ModelVerification failed(@NonNull String message) {
            return new ModelVerification(false, "", 0L, message);
        }
    }
}
