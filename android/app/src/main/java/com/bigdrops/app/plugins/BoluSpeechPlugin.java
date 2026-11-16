package com.bigdrops.app.plugins;

import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.function.Consumer;

/**
 * BoluSpeech — native Android Text-to-Speech bridge.
 *
 * Scope:
 * - Speaks only text that the web layer already prepared for narration.
 * - Uses the device speech engine. No cloud service, no audio download, no key.
 * - Emits `boluSpeechState` so the web layer can reflect speaking, completed,
 *   stopped and error states.
 *
 * Pause and resume are implemented by the web layer: it sends one chunk at a
 * time and re-sends the current chunk on resume. Android has no reliable
 * in-utterance pause, so the bridge stays a simple speak/stop surface.
 */
@CapacitorPlugin(name = "BoluSpeech")
public class BoluSpeechPlugin extends Plugin {
    private static final String TAG = "BigdropsBoluSpeech";
    private static final String UNAVAILABLE_MESSAGE =
        "The device speech engine is not available. Install or enable a Text-to-Speech engine in Android settings.";

    private final Object engineLock = new Object();
    private final List<PendingAction> pendingActions = new ArrayList<>();
    private final List<PluginCall> pendingCapabilityCalls = new ArrayList<>();

    @Nullable
    private TextToSpeech engine;

    private boolean initialising = false;
    private boolean destroyed = false;
    private boolean configured = false;
    private int initStatus = TextToSpeech.ERROR;
    private int languageStatus = TextToSpeech.LANG_NOT_SUPPORTED;
    private String activeMessageId;

    @Override
    public void load() {
        synchronized (engineLock) {
            startEngineLocked();
        }
    }

    @Override
    protected void handleOnDestroy() {
        synchronized (engineLock) {
            destroyed = true;
            pendingActions.clear();
            pendingCapabilityCalls.clear();
            if (engine != null) {
                try {
                    engine.stop();
                    engine.shutdown();
                } catch (RuntimeException ignored) {
                    // Shutdown failures must not break activity teardown.
                }
            }
            engine = null;
            initStatus = TextToSpeech.ERROR;
        }
        super.handleOnDestroy();
    }

    @PluginMethod
    public void getCapability(PluginCall call) {
        synchronized (engineLock) {
            if (destroyed) {
                call.resolve(buildCapabilityLocked());
                return;
            }
            if (engine == null && !initialising) {
                startEngineLocked();
            }
            ensureConfiguredLocked();
            if (initialising) {
                pendingCapabilityCalls.add(call);
                return;
            }
            call.resolve(buildCapabilityLocked());
        }
    }

    @PluginMethod
    public void speak(PluginCall call) {
        String text = call.getString("text");
        String messageId = call.getString("messageId");

        if (text == null || text.trim().isEmpty()) {
            call.reject("Narration text is required.");
            return;
        }

        Double requestedRate = call.getDouble("rate");
        float rate = requestedRate == null ? 1f : requestedRate.floatValue();
        if (Float.isNaN(rate) || Float.isInfinite(rate)) rate = 1f;
        rate = Math.max(0.5f, Math.min(2f, rate));

        final float speechRate = rate;
        whenReady(call, speechEngine -> {
            try {
                // A new utterance always replaces the previous one.
                speechEngine.stop();
                speechEngine.setSpeechRate(speechRate);
                activeMessageId = messageId;

                int maxLength = TextToSpeech.getMaxSpeechInputLength();
                String spoken = text.length() > maxLength ? text.substring(0, maxLength) : text;
                String utteranceId = messageId == null || messageId.trim().isEmpty() ? "bolu-speech" : messageId;

                int result = speechEngine.speak(spoken, TextToSpeech.QUEUE_FLUSH, null, utteranceId);
                if (result == TextToSpeech.ERROR) {
                    call.reject("The device speech engine rejected this request.");
                    return;
                }

                JSObject response = new JSObject();
                response.put("started", true);
                response.put("maxLength", maxLength);
                call.resolve(response);
            } catch (RuntimeException error) {
                call.reject("The device speech engine could not start narration.");
            }
        });
    }

    @PluginMethod
    public void stop(PluginCall call) {
        TextToSpeech speechEngine;
        synchronized (engineLock) {
            speechEngine = engine;
        }

        if (speechEngine != null) {
            try {
                speechEngine.stop();
            } catch (RuntimeException ignored) {
                // A rejected stop must not break the chat.
            }
        }

        JSObject response = new JSObject();
        response.put("stopped", true);
        call.resolve(response);
    }

    private void startEngineLocked() {
        if (destroyed || initialising || engine != null) return;

        initialising = true;
        engine = new TextToSpeech(getContext(), status -> {
            synchronized (engineLock) {
                initialising = false;
                initStatus = status;

                if (status == TextToSpeech.SUCCESS && engine != null) {
                    configureEngineLocked(engine);
                }

                drainLocked();
            }
        });
    }

    private void configureEngineLocked(@NonNull TextToSpeech speechEngine) {
        speechEngine.setSpeechRate(1f);

        int availability = speechEngine.isLanguageAvailable(Locale.getDefault());
        if (availability >= TextToSpeech.LANG_AVAILABLE) {
            speechEngine.setLanguage(Locale.getDefault());
        } else {
            availability = speechEngine.isLanguageAvailable(Locale.US);
            if (availability >= TextToSpeech.LANG_AVAILABLE) {
                speechEngine.setLanguage(Locale.US);
            }
        }
        languageStatus = availability;

        configured = true;

        speechEngine.setOnUtteranceProgressListener(new UtteranceProgressListener() {
            @Override
            public void onStart(String utteranceId) {
                emitState(utteranceId, "speaking", null);
            }

            @Override
            public void onDone(String utteranceId) {
                emitState(utteranceId, "completed", null);
            }

            @Override
            public void onStop(String utteranceId, boolean interrupted) {
                emitState(utteranceId, "stopped", null);
            }

            @Override
            public void onError(String utteranceId) {
                emitState(utteranceId, "error", "The device could not read this response aloud.");
            }

            @Override
            public void onError(String utteranceId, int errorCode) {
                onError(utteranceId);
            }
        });
    }

    /** Guards the rare case where the engine reports ready before assignment. */
    private void ensureConfiguredLocked() {
        if (engine != null && initStatus == TextToSpeech.SUCCESS && !configured) {
            configureEngineLocked(engine);
        }
    }

    private void whenReady(@NonNull PluginCall call, @NonNull Consumer<TextToSpeech> action) {
        synchronized (engineLock) {
            if (destroyed) {
                call.reject(UNAVAILABLE_MESSAGE);
                return;
            }

            if (engine == null && !initialising) {
                startEngineLocked();
            }

            if (engine != null && initStatus == TextToSpeech.SUCCESS) {
                ensureConfiguredLocked();
                action.accept(engine);
                return;
            }

            if (!initialising && initStatus != TextToSpeech.SUCCESS) {
                call.reject(UNAVAILABLE_MESSAGE);
                return;
            }

            pendingActions.add(new PendingAction(call, action));
        }
    }

    private void drainLocked() {
        if (engine != null && initStatus == TextToSpeech.SUCCESS) {
            for (PendingAction pending : pendingActions) {
                pending.action.accept(engine);
            }
        } else {
            for (PendingAction pending : pendingActions) {
                pending.call.reject(UNAVAILABLE_MESSAGE);
            }
        }
        pendingActions.clear();

        JSObject capability = buildCapabilityLocked();
        for (PluginCall capabilityCall : pendingCapabilityCalls) {
            capabilityCall.resolve(capability);
        }
        pendingCapabilityCalls.clear();
    }

    @NonNull
    private JSObject buildCapabilityLocked() {
        boolean engineReady = engine != null && initStatus == TextToSpeech.SUCCESS;
        boolean languageReady = languageStatus >= TextToSpeech.LANG_AVAILABLE;
        boolean available = engineReady && languageReady;

        JSObject capability = new JSObject();
        capability.put("available", available);
        capability.put("platform", "android");
        capability.put("engine", "android.speech.tts.TextToSpeech");
        capability.put("language", Locale.getDefault().toLanguageTag());
        capability.put("languageStatus", languageStatus);
        capability.put("missingLanguageData", languageStatus == TextToSpeech.LANG_MISSING_DATA);
        capability.put("speaking", activeMessageId != null);
        capability.put("message", available
            ? "The Android speech engine is ready."
            : UNAVAILABLE_MESSAGE);
        return capability;
    }

    private void emitState(@Nullable String messageId, @NonNull String status, @Nullable String error) {
        JSObject event = new JSObject();
        event.put("messageId", messageId);
        event.put("status", status);
        event.put("error", error);
        notifyListeners("boluSpeechState", event);
    }

    private static final class PendingAction {
        final PluginCall call;
        final Consumer<TextToSpeech> action;

        PendingAction(@NonNull PluginCall call, @NonNull Consumer<TextToSpeech> action) {
            this.call = call;
            this.action = action;
        }
    }
}
