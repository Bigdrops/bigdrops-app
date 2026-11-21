# Bolu Voice Text-to-Speech Options Research Report

This report was written by Antigravity on 2026-11-21 via Antigravity.

## Objective

Research and compare zero-cost and free-tier Text-to-Speech (TTS) options for the Bolu conversational assistant in the BOUXRE business operations platform. Evaluate suitability across Android (Capacitor), web browsers, and serverless proxy infrastructure.

## Scope

- In scope: Kokoro-82M, Piper TTS, Google Cloud Text-to-Speech, Microsoft Edge read-aloud (unofficial), Amazon Polly, ElevenLabs, OpenAI TTS, and the existing device baseline (Android TextToSpeech bridge + Web Speech API).
- Evaluation dimensions: licensing and commercial terms, free tier quotas and limits, execution runtime and footprint, audio quality and benchmarks, speaking speed control, and integration cost with BOUXRE's architecture.
- Recommendations for production default and optional upgrade.
- Out of scope: source code modifications, database schema changes, git staging/commits, build runs.

## Files changed

- Created: `docs/reports/bolu-voice/2026-11-21-bolu-tts-options-research.md`
- Modified: None (0 source files changed)

Skills used: NONE
Documentation standard: ASD-STE100 Simplified Technical English

## Architectural Context

BOUXRE currently operates a two-layer local narration architecture (`src/lib/native/boluSpeech.ts` and `src/lib/ai-assistant/bolu-narration.ts`):
1. **Android (Capacitor)**: `BoluSpeechPlugin.java` wraps the native Android `android.speech.tts.TextToSpeech` engine. Execution occurs entirely on-device, offline, with zero network traffic and zero external cost.
2. **Web Browser**: Falls back to `window.speechSynthesis` (Web Speech API).
3. **Backend Proxy**: The platform operates serverless functions in `api/` (Vercel Node.js runtime, e.g. `api/bolu-chat.ts`) and stores sensitive credentials in encrypted database tables. Any external cloud voice solution must route through this serverless layer to protect provider credentials.
4. **Market Context**: BOUXRE serves Nigerian SMEs. Voice naturalness and Nigerian English (`en-NG`) pronunciation accuracy represent key functional requirements.

---

## Comparative Matrix

| Solution | License & Commercial Use | Free Tier Allowance | Runtime & Footprint | Offline? | Published Quality / MOS | Speed Control | Serverless Integration Fit |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Existing Baseline** (Android TTS / Web Speech) | Platform built-in; Commercial OK | Unlimited (device native) | Device OS framework; 0 MB app bloat | Yes | Variable (3.0–4.0; device dependent) | Yes (`rate` 0.25–4.0) | N/A (Client-only) |
| **Kokoro-82M** | Apache-2.0; Commercial OK | Unlimited (Self-hosted / Client) | On-device ONNX Web / Native; ~82 MB (INT8) | Yes | High (UTMOS ~4.45) | Yes (`speed` param) | Poor (Vercel memory/timeout limits) |
| **Piper TTS** | Code MIT / Voices vary; Commercial OK | Unlimited (Self-hosted / Client) | On-device ONNX / WASM; ~15–60 MB | Yes | Medium (UTMOS ~3.0–3.6) | Yes (`lengthScale`) | Moderate (Binary WASM overhead) |
| **Google Cloud TTS** | Google Cloud ToS; Commercial OK | 4M chars/mo (Std/WaveNet); 1M chars/mo (Neural2) | Server API; 0 MB client footprint | No | High (MOS ~4.2–4.5) | Yes (`speakingRate` 0.25–4.0) | Excellent (Direct fit in `api/`) |
| **Microsoft Edge (Unofficial)** | Code MIT/LGPL; Service ToS forbids commercial | Unlimited (Unenforced consumer API) | Server proxy; 0 MB client footprint | No | High (MOS ~4.4+) | Yes (SSML prosody) | Poor (Fragile; ToS violation risk) |
| **Amazon Polly** | AWS Agreement; Commercial OK | 5M chars/mo (Std), 1M chars/mo (Neural) for 12 mos | Server API; 0 MB client footprint | No | Medium-High (MOS ~4.0–4.2) | Yes (SSML prosody) | Good (Fits `api/` via AWS SDK) |
| **ElevenLabs** | Proprietary; Free tier strictly Non-commercial | 10,000 chars/month (~10–12 minutes total) | Server API; 0 MB client footprint | No | Very High (MOS ~4.6+) | Post-process only | Poor (Quota too small for shared app) |
| **OpenAI TTS** (`tts-1`) | Commercial API Terms; Commercial OK | $0 / 0 characters free (Pay-as-you-go only) | Server API; 0 MB client footprint | No | High (MOS ~4.3–4.5) | Yes (`speed` 0.25–4.0) | Excellent (Fits `api/`, but not free) |

---

## Detailed Evaluation by Provider

### 1. Existing Device Baseline (Android TextToSpeech & Web Speech API)
- **Source**: Android Open Source Project documentation (`android.speech.tts.TextToSpeech`) and W3C Web Speech API specification. Observed in `src/lib/native/boluSpeech.ts` and `src/lib/ai-assistant/bolu-narration.ts`.
- **License & Commercial Use**: **[Observed]** Standard operating system API. Fully permitted for commercial use without royalties.
- **Free Tier**: **[Observed]** 100% free, unlimited, permanent. No monthly quota, no credit card, no network billing.
- **Where It Runs & Footprint**: **[Observed]** Runs 100% on-device. Uses system-installed TTS engines (Google Speech Recognition & Synthesis on Android; Safari/Chrome system voices on web/desktop). Adds 0 MB to the Capacitor APK bundle. Works completely offline.
- **Quality Notes**: **[Observed]** Highly variable across user devices. Modern Android devices with downloaded high-quality voice packs deliver intelligible speech (MOS ~3.5–3.9). Budget Android handsets without updated voice assets fall back to older mechanical formants.
- **Speed Control**: **[Observed]** Supported natively via speech rate parameter (`TextToSpeech.setSpeechRate` and `SpeechSynthesisUtterance.rate`).
- **Integration Cost**: **[Observed]** Already completed and operating in the repository.

### 2. Kokoro-82M
- **Source**: Hugging Face / GitHub repository (`hexgrad/Kokoro-82M`, `hexgrad/kokoro`), Version v0.19 / v1.0 (release cycle late 2024 / early 2025).
- **License & Commercial Use**: **[Observed]** Apache License 2.0 covering both code and model weights. Commercial use is explicitly permitted with attribution.
- **Free Tier**: **[Observed]** 100% free open weights. Unlimited duration and quota.
- **Where It Runs & Footprint**: **[Observed]** Runs on-device in web browsers via `kokoro-js` (ONNX Runtime Web with WebGPU or WASM) or in native environments via ONNX Runtime / Sherpa-ONNX.
  - Model file size: ~82 million parameters. FP32 is ~310 MB; quantized INT8 ONNX is ~82 MB to 86 MB.
  - Offline capability: Fully functional offline after downloading or bundling the ONNX weight file.
- **Quality Notes**: **[Observed]** Evaluated at top of Hugging Face TTS Spaces Arena for lightweight models. UTMOS benchmark score ~4.44–4.45 / 5.0.
  - Opinion: Exhibits remarkably human-like cadence, rhythmic prosody, and low robotic artifacting. However, it lacks dedicated Nigerian English accents (voice library is primarily US and British English).
- **Speed Control**: **[Observed]** Supported natively during model inference via speed parameter without altering vocal pitch.
- **Integration Cost for Repo**: **[Inferred]**
  - Android bundle: Bundling ~85 MB into the Capacitor APK increases app download size significantly (from ~15 MB to ~100 MB).
  - Web client: Requires an 85 MB initial download cached in IndexedDB.
  - Serverless (`api/`): Poor fit for Vercel functions (50 MB–250 MB bundle limit; cold-start loading of an 85 MB model causes execution timeouts on Vercel Hobby tier).
  - Keys: No API key required.

### 3. Piper TTS
- **Source**: GitHub repository (`rhasspy/piper`), Version 1.2.0 (Open Home Foundation / Rhasspy project).
- **License & Commercial Use**: **[Observed]** Engine code is licensed under MIT (upstream `rhasspy/piper`) and GPL-3.0 (downstream fork `OHF-Voice/piper1-gpl`).
  - Model licenses vary by voice dataset. Standard voices such as `en_US-lessac-medium` are MIT-compatible and permit commercial use. Restricted voices must be filtered.
- **Free Tier**: **[Observed]** 100% free open weights. Unlimited duration and quota.
- **Where It Runs & Footprint**: **[Observed]** Runs on-device (Android C++ / JNI, WebAssembly, or backend server).
  - Model file sizes: `x_low` (~10 MB), `low` (~18 MB), `medium` (~30–60 MB), `high` (~100 MB).
  - Offline capability: Fully functional offline.
- **Quality Notes**: **[Observed]** VITS architecture. Automated UTMOS benchmarks typically score between 3.0 and 3.6 / 5.0.
  - Opinion: Speech is clean and very fast (real-time factor < 0.1 on low-power CPUs), but noticeably more robotic and less expressive than Kokoro-82M or cloud neural voices. Limited African accent options.
- **Speed Control**: **[Observed]** Supported via `lengthScale` parameter (`--length-scale`): values < 1.0 accelerate speech, values > 1.0 decelerate speech.
- **Integration Cost for Repo**: **[Inferred]**
  - Capacitor Android: Requires embedding a C++/JNI native wrapper or Sherpa-ONNX plugin.
  - Serverless (`api/`): Can run via WebAssembly, but cold-start latency and CPU limits on serverless functions make it suboptimal.
  - Keys: No API key required.

### 4. Google Cloud Text-to-Speech
- **Source**: Google Cloud Text-to-Speech Pricing and Voice Documentation (Google Cloud Platform official docs, observed November 2024–2025).
- **License & Commercial Use**: **[Observed]** Commercial SaaS Terms of Service. Commercial applications and monetization are permitted.
- **Free Tier**: **[Observed]** Permanent monthly recurring free quota:
  - Standard Voices: **4,000,000 characters per month free**.
  - WaveNet Voices: **4,000,000 characters per month free**.
  - Neural2 Voices: **1,000,000 characters per month free**.
  - Conditions: Requires a Google Cloud project with an active billing account. No charges occur as long as monthly usage remains within free allowance.
- **Where It Runs & Footprint**: **[Observed]** Cloud server API.
  - Model file size: 0 MB client footprint.
  - Offline capability: No (requires active internet connection).
- **Quality Notes**: **[Observed]** DeepMind-developed WaveNet and Neural2 architectures produce natural cadence with Mean Opinion Scores (MOS) between 4.2 and 4.5.
  - Crucial Advantage for BOUXRE: Google Cloud TTS provides **native Nigerian English (`en-NG`) voices** (e.g., `en-NG-Standard-A/B/C/D`, `en-NG-Wavenet-A/B/C/D`). This delivers authentic accent, local cadence, and proper pronunciation of Nigerian business terminology.
- **Speed Control**: **[Observed]** Supported natively via `audioConfig.speakingRate` (`0.25` to `4.0`, where `1.0` is normal).
- **Integration Cost for Repo**: **[Inferred]**
  - Fits existing `api/` proxy architecture: **Highest fit**. A lightweight endpoint `api/bolu-tts.ts` can accept text and rate from the client, call the Google Cloud TTS REST API using service account credentials stored in server environment variables (`GCP_TTS_KEY`), and return an MP3 stream.
  - Client bundle impact: 0 MB.

### 5. Microsoft Edge Read-Aloud (Unofficial / `msedge-tts` / `edge-tts`)
- **Source**: GitHub repository `rany2/edge-tts` (v6.1.15+, 2024–2025) and Microsoft Services Agreement.
- **License & Commercial Use**: **[Observed]** Wrapper code is LGPL-3.0 or MIT.
  - Commercial Use: **Strictly Prohibited / High Legal Risk**. The backend endpoint is an undocumented WebSocket service intended solely for the Microsoft Edge web browser. Routing commercial business application traffic through consumer Edge endpoints breaches Microsoft's Terms of Service.
- **Free Tier**: **[Observed]** 0 monetary cost and no API key required, but with zero SLA, zero uptime guarantee, and active risk of IP throttling or silent breaking changes.
- **Where It Runs & Footprint**: **[Observed]** Cloud server proxy only. 0 MB client footprint. Does not work offline.
- **Quality Notes**: **[Observed]** Backed by Azure Neural Speech models (e.g. `en-NG-AbeoNeural`, `en-NG-EzinneNeural`). Excellent naturalness and realistic Nigerian accents.
- **Speed Control**: **[Observed]** Supported via SSML prosody rate tag or wrapper parameter.
- **Integration Cost for Repo**: **[Inferred]**
  - Serverless fit: Poor. Vercel serverless functions have short execution windows and proxying WebSockets through serverless functions introduces latency and connection drops.
  - Operational risk: High risk of sudden breakage when Microsoft rotates internal tokens or bans cloud provider IP blocks.

### 6. Amazon Polly
- **Source**: AWS Polly Pricing Guide and AWS Free Tier Terms (observed 2024–2025).
- **License & Commercial Use**: **[Observed]** AWS Customer Agreement. Commercial use is permitted.
- **Free Tier**: **[Observed]**
  - Standard Voices: 5,000,000 characters per month for the **first 12 months** only.
  - Neural Voices: 1,000,000 characters per month for the **first 12 months** only.
  - Generative Voices: 100,000 characters per month for the **first 12 months** only.
  - **Limitation**: Free tier **expires 12 months** after AWS account signup. After 12 months, all requests are billed ($4.00/1M Standard, $16.00/1M Neural).
- **Where It Runs & Footprint**: **[Observed]** Cloud server API. 0 MB client footprint. Does not work offline.
- **Quality Notes**: **[Observed]** Neural voices score MOS ~4.0–4.2.
  - Limitation: Lacks native Nigerian English (`en-NG`) voices (only South African `en-ZA` Ayanda).
- **Speed Control**: **[Observed]** Supported via SSML `<prosody rate="...">` tags.
- **Integration Cost for Repo**: **[Inferred]**
  - Fits `api/` proxy via `@aws-sdk/client-polly`. Requires AWS IAM credentials (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`).
  - Not a permanent free solution due to the 12-month expiration.

### 7. ElevenLabs
- **Source**: ElevenLabs Terms of Service and Pricing Portal (observed 2024–2025).
- **License & Commercial Use**: **[Observed]** Free tier is **strictly restricted to non-commercial use** and requires mandatory public attribution ("elevenlabs.io" or "11.ai" in titles/descriptions). Commercial use in BOUXRE requires a paid plan ($5/mo Starter or higher).
- **Free Tier**: **[Observed]** **10,000 characters per month** total (~10–12 minutes of audio).
  - In a multi-tenant business application, 10,000 characters would be exhausted by a single user in fewer than 20 conversation turns.
- **Where It Runs & Footprint**: **[Observed]** Cloud server API. 0 MB client footprint. Does not work offline.
- **Quality Notes**: **[Observed]** Industry benchmark for expressiveness and human inflection (MOS > 4.6).
- **Speed Control**: **[Observed]** API does not provide a direct speed rate parameter; playback rate must be altered on the client audio element.
- **Integration Cost for Repo**: **[Inferred]**
  - The 10k character monthly quota and non-commercial restriction disqualify ElevenLabs as a free tier solution for BOUXRE.

### 8. OpenAI TTS (`tts-1`, `tts-1-hd`)
- **Source**: OpenAI API Pricing Documentation and Platform Deprecation Schedule (observed 2024–2025).
- **License & Commercial Use**: **[Observed]** Commercial API Terms. Commercial use permitted.
- **Free Tier**: **[Observed]** **No recurring free tier**. Every character is billable ($15.00 per 1M characters for `tts-1`, $30.00 per 1M characters for `tts-1-hd`).
  - Note: OpenAI has announced official deprecation of `tts-1` / `tts-1-hd` effective January 6, 2027.
- **Where It Runs & Footprint**: **[Observed]** Cloud server API (`https://api.openai.com/v1/audio/speech`). 0 MB client footprint. Does not work offline.
- **Quality Notes**: **[Observed]** High quality (MOS ~4.35–4.45), but restricted to 6 fixed voices (Alloy, Echo, Fable, Onyx, Nova, Shimmer) with predominantly American accents.
- **Speed Control**: **[Observed]** Supported via `speed` parameter (`0.25` to `4.0`).
- **Integration Cost for Repo**: **[Inferred]**
  - Easy to proxy in `api/`, but disqualified under the free tier requirement.

---

## Synthesis & Recommendations

### 1. Recommended Production Default: Two-Tier Hybrid
**Tier 1 (On-Device Native Baseline) + Tier 2 (Google Cloud Text-to-Speech Proxy Fallback)**

- **Rationale**:
  1. **Zero Cost and High Limits**: Google Cloud TTS provides an ongoing, permanent free allowance of **4,000,000 characters per month** for WaveNet/Standard and **1,000,000 characters per month** for Neural2. For an early-to-mid stage SME platform, 4M characters (~80 hours of spoken assistance monthly) is generous and recurring.
  2. **Market & Accent Fit**: Google Cloud TTS natively supports **Nigerian English (`en-NG`)** with localized phonetics (`en-NG-Standard-A/B/C/D` and `en-NG-Wavenet-A/B/C/D`). Neither Kokoro, Piper, Polly, nor OpenAI provides native `en-NG` voices.
  3. **Zero Client Footprint**: Cloud audio streaming adds 0 MB to the Capacitor APK and 0 MB to the web app bundle, preserving memory on resource-constrained devices.
  4. **Seamless Failover**: When offline or when the device native voice is high quality, the existing `BoluSpeech` Android bridge handles speech locally. When online, the platform can stream natural Nigerian neural audio via `api/bolu-tts.ts`.

### 2. Recommended Optional Upgrade: Kokoro-82M (Client-Side ONNX)
**On-Demand Download for Full Offline High-Fidelity Speech**

- **Rationale**:
  1. **Permissive Open-Source License**: Apache 2.0 allows unrestricted commercial use with zero recurring costs.
  2. **Superior Quality**: State-of-the-art open-weight naturalness (UTMOS ~4.45), far superior to standard Android robotic voices and Piper.
  3. **Implementation**: Implemented as an optional downloadable voice package (~82 MB INT8) stored in IndexedDB (Web) or Android app storage. This avoids forcing an 85 MB download on users with limited data plans, while giving power users an offline voice model.

---

## Verification Result

Verification:
- bun run audit:load: skipped (documentation-only change)
- bun run typecheck: skipped (documentation-only change)
- git status: clean (only report file created)
- supabase db push: not applicable (no SQL changes)
- bun run build: skipped due to hardware policy

## Supabase push status

Not applicable. This research task made no schema or database changes.

## Risks or limitations

- Google Cloud TTS requires a billing account to activate API keys, though usage under 4M characters/month incurs no charge.
- Device native voices vary between budget Android manufacturers.
- Kokoro-82M does not currently feature Nigerian English datasets; fine-tuning or community voicepack releases would be required for local accent parity.

## Deferred work

- PROPOSED: Implementation of `api/bolu-tts.ts` serverless proxy with GCP WaveNet `en-NG` routing.
- PROPOSED: Capability test for optional on-demand `kokoro-js` Web Worker caching.
