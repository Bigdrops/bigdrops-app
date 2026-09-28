#include <jni.h>

#include <atomic>
#include <chrono>
#include <cstdint>
#include <cstdlib>
#include <cstring>
#include <mutex>
#include <sstream>
#include <string>
#include <thread>
#include <vector>

#include "llama.h"

namespace {

constexpr const char * LLAMA_CPP_COMMIT = "4da6337767f973e2b4d0797e5b323d77d8565e4a";
constexpr int32_t CONTEXT_TOKENS = 4096;
constexpr int32_t BATCH_TOKENS = 512;

std::once_flag g_backend_once;

struct RuntimeState {
    std::mutex mutex;
    llama_model * model = nullptr;
    std::atomic_bool cancel_requested{false};
    std::atomic_bool generation_active{false};
    std::string model_path;
    std::string model_description;
    uint64_t model_size_bytes = 0;
    uint64_t model_parameter_count = 0;
};

void ensure_backend() {
    std::call_once(g_backend_once, [] {
        llama_backend_init();
    });
}

RuntimeState * state_from_handle(jlong handle) {
    return reinterpret_cast<RuntimeState *>(static_cast<intptr_t>(handle));
}

std::string jstring_to_string(JNIEnv * env, jstring value) {
    if (value == nullptr) return "";
    const char * chars = env->GetStringUTFChars(value, nullptr);
    if (chars == nullptr) return "";
    std::string result(chars);
    env->ReleaseStringUTFChars(value, chars);
    return result;
}

jstring string_to_jstring(JNIEnv * env, const std::string & value) {
    return env->NewStringUTF(value.c_str());
}

std::string escape_json(const std::string & value) {
    std::ostringstream out;
    for (unsigned char ch : value) {
        switch (ch) {
            case '\\':
                out << "\\\\";
                break;
            case '"':
                out << "\\\"";
                break;
            case '\b':
                out << "\\b";
                break;
            case '\f':
                out << "\\f";
                break;
            case '\n':
                out << "\\n";
                break;
            case '\r':
                out << "\\r";
                break;
            case '\t':
                out << "\\t";
                break;
            default:
                if (ch < 0x20) {
                    const char * hex = "0123456789abcdef";
                    out << "\\u00" << hex[(ch >> 4) & 0x0f] << hex[ch & 0x0f];
                } else {
                    out << ch;
                }
                break;
        }
    }
    return out.str();
}

std::string ok_json(const std::string & fields) {
    return "{\"ok\":true" + fields + "}";
}

std::string error_json(const std::string & message) {
    return "{\"ok\":false,\"error\":\"" + escape_json(message) + "\"}";
}

// Stage-tagged native failure. The human message carries the stage so the
// Java bridge can surface it without parsing free text. Counts stay in the
// payload for logcat diagnostics. Never include prompt or model output here.
std::string failure_json(
    const std::string & stage,
    const std::string & error_class,
    const std::string & message,
    int32_t prompt_tokens,
    int32_t output_tokens,
    int64_t elapsed_ms
) {
    std::ostringstream out;
    out << "{\"ok\":false"
        << ",\"error\":\"" << escape_json(message) << "\""
        << ",\"stage\":\"" << escape_json(stage) << "\""
        << ",\"errorClass\":\"" << escape_json(error_class) << "\""
        << ",\"promptTokens\":" << prompt_tokens
        << ",\"outputTokens\":" << output_tokens
        << ",\"elapsedMs\":" << elapsed_ms;
    out << "}";
    return out.str();
}

// Exception text may name files or backends. Keep one line, capped length,
// and never echo prompt or generated content.
std::string sanitize_exception_text(const char * what) {
    if (what == nullptr) return "";
    std::string text(what);
    const size_t newline = text.find_first_of("\r\n");
    if (newline != std::string::npos) text.resize(newline);
    if (text.size() > 200) text.resize(200);
    return text;
}

bool abort_requested(void * user_data) {
    auto * state = static_cast<RuntimeState *>(user_data);
    return state != nullptr && state->cancel_requested.load();
}

int32_t preferred_thread_count() {
    const unsigned int hardware_threads = std::thread::hardware_concurrency();
    if (hardware_threads <= 2) return 2;
    if (hardware_threads >= 6) return 4;
    return static_cast<int32_t>(hardware_threads - 1);
}

bool append_token_piece(const llama_vocab * vocab, llama_token token, std::string & output) {
    char small_buffer[256];
    int32_t written = llama_token_to_piece(vocab, token, small_buffer, sizeof(small_buffer), 0, false);
    if (written >= 0 && written < static_cast<int32_t>(sizeof(small_buffer))) {
        output.append(small_buffer, static_cast<size_t>(written));
        return true;
    }

    if (written < 0) {
        const int32_t required = -written;
        std::vector<char> buffer(static_cast<size_t>(required) + 1);
        written = llama_token_to_piece(vocab, token, buffer.data(), required, 0, false);
        if (written >= 0) {
            output.append(buffer.data(), static_cast<size_t>(written));
            return true;
        }
    }

    return false;
}

std::string tokenize_prompt(
    const llama_vocab * vocab,
    const std::string & prompt,
    std::vector<llama_token> & tokens
) {
    int32_t token_count = llama_tokenize(
        vocab,
        prompt.c_str(),
        static_cast<int32_t>(prompt.size()),
        nullptr,
        0,
        true,
        true
    );

    if (token_count >= 0) {
        return "Prompt tokenization did not return the expected token count.";
    }

    token_count = -token_count;
    if (token_count <= 0) {
        return "Prompt did not produce tokens.";
    }

    tokens.resize(static_cast<size_t>(token_count));
    const int32_t actual_count = llama_tokenize(
        vocab,
        prompt.c_str(),
        static_cast<int32_t>(prompt.size()),
        tokens.data(),
        token_count,
        true,
        true
    );

    if (actual_count < 0) {
        return "Prompt tokenization failed.";
    }
    tokens.resize(static_cast<size_t>(actual_count));
    return "";
}

std::string decode_prompt_tokens(
    RuntimeState * state,
    llama_context * ctx,
    std::vector<llama_token> & tokens
) {
    int32_t offset = 0;
    while (offset < static_cast<int32_t>(tokens.size())) {
        if (state->cancel_requested.load()) return "cancelled";
        const int32_t remaining = static_cast<int32_t>(tokens.size()) - offset;
        const int32_t chunk_size = remaining > BATCH_TOKENS ? BATCH_TOKENS : remaining;
        llama_batch batch = llama_batch_get_one(tokens.data() + offset, chunk_size);
        const int32_t decode_result = llama_decode(ctx, batch);
        if (decode_result != 0) {
            return "llama.cpp prompt decode failed.";
        }
        offset += chunk_size;
    }

    return "";
}

} // namespace

extern "C" JNIEXPORT jstring JNICALL
Java_com_bigdrops_app_plugins_LocalAIPlugin_nativeRuntimeVersion(JNIEnv * env, jclass) {
    ensure_backend();
    std::ostringstream result;
    result << "llama.cpp@" << LLAMA_CPP_COMMIT << " " << llama_print_system_info();
    return string_to_jstring(env, result.str());
}

extern "C" JNIEXPORT jlong JNICALL
Java_com_bigdrops_app_plugins_LocalAIPlugin_nativeCreate(JNIEnv *, jobject) {
    ensure_backend();
    auto * state = new RuntimeState();
    return static_cast<jlong>(reinterpret_cast<intptr_t>(state));
}

extern "C" JNIEXPORT void JNICALL
Java_com_bigdrops_app_plugins_LocalAIPlugin_nativeDestroy(JNIEnv *, jobject, jlong handle) {
    RuntimeState * state = state_from_handle(handle);
    if (state == nullptr) return;

    {
        std::lock_guard<std::mutex> lock(state->mutex);
        state->cancel_requested.store(true);
        if (state->model != nullptr) {
            llama_model_free(state->model);
            state->model = nullptr;
        }
    }

    delete state;
}

extern "C" JNIEXPORT jstring JNICALL
Java_com_bigdrops_app_plugins_LocalAIPlugin_nativeLoadModel(JNIEnv * env, jobject, jlong handle, jstring path) {
    RuntimeState * state = state_from_handle(handle);
    if (state == nullptr) return string_to_jstring(env, error_json("Native Local AI runtime is not initialized."));

    const std::string model_path = jstring_to_string(env, path);
    if (model_path.empty()) return string_to_jstring(env, error_json("Model path is empty."));

    std::lock_guard<std::mutex> lock(state->mutex);
    if (state->generation_active.load()) {
        return string_to_jstring(env, error_json("A generation is active. Cancel it before loading a model."));
    }
    if (state->model != nullptr) {
        return string_to_jstring(env, error_json("A model is already loaded. Unload it before loading another model."));
    }

    ensure_backend();
    state->cancel_requested.store(false);

    llama_model_params model_params = llama_model_default_params();
    llama_model * model = llama_model_load_from_file(model_path.c_str(), model_params);
    if (model == nullptr) {
        return string_to_jstring(env, error_json("llama.cpp could not load the GGUF model."));
    }

    char description[256] = {0};
    llama_model_desc(model, description, sizeof(description));

    state->model = model;
    state->model_path = model_path;
    state->model_description = description;
    state->model_size_bytes = llama_model_size(model);
    state->model_parameter_count = llama_model_n_params(model);

    std::ostringstream result;
    result << ",\"modelDescription\":\"" << escape_json(state->model_description) << "\""
           << ",\"modelSizeBytes\":" << state->model_size_bytes
           << ",\"modelParameterCount\":" << state->model_parameter_count;
    return string_to_jstring(env, ok_json(result.str()));
}

extern "C" JNIEXPORT jstring JNICALL
Java_com_bigdrops_app_plugins_LocalAIPlugin_nativeGenerate(
    JNIEnv * env,
    jobject,
    jlong handle,
    jstring prompt_value,
    jstring grammar_value,
    jint max_tokens
) {
    RuntimeState * state = state_from_handle(handle);
    if (state == nullptr) return string_to_jstring(env, error_json("Native Local AI runtime is not initialized."));

    const std::string prompt = jstring_to_string(env, prompt_value);
    const std::string grammar = jstring_to_string(env, grammar_value);
    if (prompt.empty()) return string_to_jstring(env, error_json("Prompt is empty."));
    if (grammar.empty()) return string_to_jstring(env, error_json("Output grammar is empty."));

    std::unique_lock<std::mutex> lock(state->mutex);
    if (state->model == nullptr) {
        return string_to_jstring(env, error_json("No model is loaded."));
    }
    if (state->generation_active.exchange(true)) {
        return string_to_jstring(env, error_json("A generation is already active."));
    }

    state->cancel_requested.store(false);

    const auto started_at = std::chrono::steady_clock::now();
    int32_t prompt_token_count = 0;
    int32_t output_token_count = 0;
    std::string output;
    std::string failure;
    std::string failure_stage = "start";
    std::string failure_class;

    auto failure_elapsed_ms = [&started_at]() {
        return std::chrono::duration_cast<std::chrono::milliseconds>(
            std::chrono::steady_clock::now() - started_at).count();
    };

    llama_context * ctx = nullptr;
    llama_sampler * sampler = nullptr;

    try {
        failure_stage = "context_init";
        llama_context_params ctx_params = llama_context_default_params();
        ctx_params.n_ctx = CONTEXT_TOKENS;
        ctx_params.n_batch = BATCH_TOKENS;
        ctx_params.n_ubatch = 128;
        ctx_params.n_seq_max = 1;
        ctx_params.n_threads = preferred_thread_count();
        ctx_params.n_threads_batch = preferred_thread_count();
        ctx_params.abort_callback = abort_requested;
        ctx_params.abort_callback_data = state;

        ctx = llama_init_from_model(state->model, ctx_params);
        if (ctx == nullptr) {
            failure = "llama.cpp could not initialize a generation context.";
        }

        failure_stage = "vocab";
        const llama_vocab * vocab = failure.empty() ? llama_model_get_vocab(state->model) : nullptr;
        if (failure.empty() && vocab == nullptr) {
            failure = "llama.cpp model vocabulary is unavailable.";
        }

        std::vector<llama_token> prompt_tokens;
        if (failure.empty()) {
            failure_stage = "tokenize";
            failure = tokenize_prompt(vocab, prompt, prompt_tokens);
            prompt_token_count = static_cast<int32_t>(prompt_tokens.size());
        }

        if (failure.empty() && prompt_token_count >= CONTEXT_TOKENS - 64) {
            failure = "Cleanup AI prompt is too large for the POC context window.";
        }

        if (failure.empty()) {
            failure_stage = "prompt_decode";
            failure = decode_prompt_tokens(state, ctx, prompt_tokens);
        }

        if (failure.empty()) {
            failure_stage = "sampler_init";
            sampler = llama_sampler_chain_init(llama_sampler_chain_default_params());
            if (sampler == nullptr) {
                failure = "llama.cpp could not initialize the sampler chain.";
            }
        }

        if (failure.empty()) {
            failure_stage = "grammar_init";
            llama_sampler * grammar_sampler = llama_sampler_init_grammar(vocab, grammar.c_str(), "root");
            if (grammar_sampler == nullptr) {
                failure = "llama.cpp could not initialize the JSON grammar.";
            } else {
                llama_sampler_chain_add(sampler, grammar_sampler);
                llama_sampler_chain_add(sampler, llama_sampler_init_greedy());
            }
        }

        failure_stage = "generate";
        while (failure.empty() && output_token_count < max_tokens) {
            if (state->cancel_requested.load()) {
                failure = "cancelled";
                break;
            }

            llama_token next_token = llama_sampler_sample(sampler, ctx, -1);
            llama_sampler_accept(sampler, next_token);

            if (llama_vocab_is_eog(vocab, next_token)) {
                break;
            }

            if (!append_token_piece(vocab, next_token, output)) {
                failure = "llama.cpp could not decode generated token text.";
                break;
            }
            output_token_count += 1;

            llama_batch batch = llama_batch_get_one(&next_token, 1);
            const int32_t decode_result = llama_decode(ctx, batch);
            if (decode_result != 0) {
                failure = state->cancel_requested.load()
                    ? "cancelled"
                    : "llama.cpp generation decode failed.";
                break;
            }
        }
    } catch (const std::bad_alloc &) {
        failure = "The device ran out of native memory during generation.";
        failure_class = "out_of_memory";
    } catch (const std::exception & error) {
        const std::string detail = sanitize_exception_text(error.what());
        failure = detail.empty()
            ? "llama.cpp native generation failed."
            : "llama.cpp native generation failed: " + detail;
        failure_class = "native_exception";
    } catch (...) {
        failure = "llama.cpp native generation failed.";
        failure_class = "unknown_native_error";
    }

    if (sampler != nullptr) {
        llama_sampler_free(sampler);
    }
    if (ctx != nullptr) {
        llama_free(ctx);
    }

    const auto finished_at = std::chrono::steady_clock::now();
    const auto elapsed_ms = std::chrono::duration_cast<std::chrono::milliseconds>(finished_at - started_at).count();
    state->generation_active.store(false);

    if (failure == "cancelled") {
        return string_to_jstring(env, error_json("Local AI generation was cancelled."));
    }
    if (!failure.empty()) {
        return string_to_jstring(env, failure_json(
            failure_stage,
            failure_class.empty() ? "generation_error" : failure_class,
            failure,
            prompt_token_count,
            output_token_count,
            static_cast<int64_t>(failure_elapsed_ms())));
    }

    const double tokens_per_second = elapsed_ms > 0
        ? (static_cast<double>(output_token_count) * 1000.0 / static_cast<double>(elapsed_ms))
        : 0.0;

    std::ostringstream result;
    result << ",\"rawText\":\"" << escape_json(output) << "\""
           << ",\"promptTokens\":" << prompt_token_count
           << ",\"outputTokens\":" << output_token_count
           << ",\"elapsedMs\":" << elapsed_ms
           << ",\"tokensPerSecond\":" << tokens_per_second;
    return string_to_jstring(env, ok_json(result.str()));
}

extern "C" JNIEXPORT void JNICALL
Java_com_bigdrops_app_plugins_LocalAIPlugin_nativeCancel(JNIEnv *, jobject, jlong handle) {
    RuntimeState * state = state_from_handle(handle);
    if (state == nullptr) return;
    state->cancel_requested.store(true);
}

extern "C" JNIEXPORT jstring JNICALL
Java_com_bigdrops_app_plugins_LocalAIPlugin_nativeUnload(JNIEnv * env, jobject, jlong handle) {
    RuntimeState * state = state_from_handle(handle);
    if (state == nullptr) return string_to_jstring(env, error_json("Native Local AI runtime is not initialized."));

    std::lock_guard<std::mutex> lock(state->mutex);
    if (state->generation_active.load()) {
        return string_to_jstring(env, error_json("A generation is active. Cancel it before unloading the model."));
    }

    state->cancel_requested.store(true);
    if (state->model != nullptr) {
        llama_model_free(state->model);
        state->model = nullptr;
    }
    state->model_path.clear();
    state->model_description.clear();
    state->model_size_bytes = 0;
    state->model_parameter_count = 0;

    return string_to_jstring(env, ok_json(""));
}
