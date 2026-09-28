package com.bigdrops.app.plugins;

import android.app.ActivityManager;
import android.content.Context;
import android.os.Build;
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

@CapacitorPlugin(name = "LocalAI")
public class LocalAIPlugin extends Plugin {
    private static final String PLUGIN_VERSION = "phase-2-poc-native";
    private static final String RUNTIME_NAME = "llama.cpp";
    private static final String LLAMA_CPP_COMMIT = "4da6337767f973e2b4d0797e5b323d77d8565e4a";
    private static final String MODEL_DIRECTORY = "local-ai/models";
    private static final String POC_MODEL_ID = "qwen3-0.6b-instruct-q4-k-m-gguf-poc";
    private static final String POC_MODEL_FILENAME = "qwen3-0.6b-instruct-q4-k-m-gguf-poc.gguf";
    private static final int MAX_OUTPUT_TOKENS = 384;

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

        File modelFile = resolveModelFile(modelId);
        if (!modelFile.isFile() || !modelFile.canRead()) {
            call.reject("The requested GGUF model is not installed in app-private Local AI storage.");
            return;
        }

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
    private File resolveModelFile(@NonNull String modelId) {
        if (!POC_MODEL_ID.equals(modelId)) {
            return new File(ensureModelDirectory(), "unsupported-model.gguf");
        }
        return new File(ensureModelDirectory(), POC_MODEL_FILENAME);
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

    private JSONObject parseNativeResult(@Nullable String result) throws JSONException {
        if (result == null || result.trim().isEmpty()) {
            throw new JSONException("Empty native result");
        }
        return new JSONObject(result);
    }
}
