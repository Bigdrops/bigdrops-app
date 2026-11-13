# Free Claude Code Evaluation

This ticket was written by MiniMax M3.1 Flash on 2026-11-13 via OpenCode.

---

## Status: OPEN

Area: Developer Tooling
Priority: Medium
Type: Tool Evaluation / Security Review

## Objective

Evaluate Free Claude Code (FCC) as a local proxy for this repository and as a route to on-device model testing.

The source was downloaded and read. Nothing was installed. The repository under review is `Alishahryar1/free-claude-code`.

## What FCC Is

FCC is a local proxy server. It exposes an OpenAI and Anthropic compatible API on a local port. It routes requests from a coding harness to a provider. It adds retries, rate limiting, concurrency control, and model fallback.

| Property | Value |
|---|---|
| License | AGPL-3.0-only |
| Language and runtime | Python 3.14 with uv |
| Harnesses | 12 |
| Providers | 61 |
| Default port | 8082 |
| Repository size | 1,250 commits and 1,028 Python files |

The 12 harnesses are Claude Code, Codex, Pi, OpenCode, Cline, Hermes, DeepSeek Harness, Grok Build, Muse Code, Aider, Antigravity CLI, and VS Code Chat.

The 61 providers fall into three groups.

1. Provider APIs that use a key that the operator obtains.
2. Subscription access that uses the operator's own account through OAuth.
3. Local servers: Ollama on port 11434, LM Studio on port 1234, and llama.cpp on port 8080.

## Safety Findings

These findings come from the source code. They do not come from the README.

| Check | Result |
|---|---|
| FCC telemetry or analytics | None. FCC sets `DISABLE_TELEMETRY=1` for the harnesses that it starts. |
| Hardcoded, pooled, or shared credentials | None. Every provider requires a key from the operator. |
| Origin of the free tokens | Free tiers of providers that the operator signs up for, plus the operator's own OAuth accounts. |
| Admin API exposure | Loopback only. The code rejects a non-loopback client address, a non-loopback `Host` header, and a non-loopback `Origin`. |
| CORS on the proxy | No CORS headers. A browser cannot read a response from another origin. |
| Outbound hosts | Provider and API domains only. No unknown collector. |
| OAuth credential flow | Browser PKCE or device code. The code states that it does not expose secrets. |
| Credential storage | Plaintext under the `~/.fcc` directory. |

Conclusion: FCC is a router over operator-controlled credentials. It is not a credential leak.

## Risks

### Risk 1 - The proxy listens on every network interface by default

`config/settings.py` sets `host` to `0.0.0.0`. `cli/commands.py` passes that value to `uvicorn.Config`. `config/server_urls.py` rewrites the host only for the URL that is shown to a human. No code rewrites the bind address. `proxy_auth_enabled` is `False` by default.

Result: on a shared network, `http://<lan-ip>:8082/v1` is an open relay that spends the operator's keys. The README mentions Proxy Authentication only inside the NVIDIA NIM setup step.

Required action before the first run: set `HOST=127.0.0.1`, or enable Proxy Authentication in the Admin UI.

### Risk 2 - The installer is a remote script

`scripts/install.ps1` is 2,254 lines. It installs uv, RTK, and Headroom. It can install an OpenCode binary. It does not overwrite a global `opencode.json`.

Required action: read the script before passing it to a shell.

### Risk 3 - An FCC OpenCode session cannot use the operator's own providers

The launcher writes a temporary `opencode.json` and exports `OPENCODE_CONFIG` and `OPENCODE_CONFIG_CONTENT`. The overlay adds an experimental policy that denies `provider.use` for every provider except `free-claude-code`. The operator's own model and provider setup therefore does not apply inside that session.

### Risk 4 - Code leaves the machine

Every prompt, diff, and file read by a harness is sent to the selected provider. Free providers apply their own data retention rules. Proprietary client work must not use public free providers.

### Risk 5 - License

AGPL-3.0-only. Internal use is acceptable. If the operator modifies FCC and offers it as a service, the source must be published.

## Use For This Repository

FCC has a llama.cpp provider that expects the OpenAI compatible server of llama.cpp on `http://localhost:8080/v1`. That is the same runtime that the Android build pins at commit `4da6337767f973e2b4d0797e5b323d77d8565e4a`.

This gives two concrete uses.

1. Model evaluation before shipping. Run `llama-server` with a candidate GGUF and send the real Cleanup prompt through it. This produces the output quality evidence that `docs/tickets/local-ai-model-swap-and-speedup.md` records as missing. It does not produce speed evidence, because a desktop CPU is not a phone CPU.
2. A local OpenCode backend at no provider cost, using the same GGUF that the app would ship.

## Acceptance Criteria

- The proxy binds to `127.0.0.1` only, or Proxy Authentication is enabled and tested.
- The Admin UI is not reachable from another machine.
- `scripts/install.ps1` is read before execution.
- The operator knows that an FCC OpenCode session is locked to the FCC provider.
- No proprietary client code is sent to a public free provider.
- A candidate model is evaluated against the real Cleanup prompt before an Android rebuild.

## Verification Status

Verified on 2026-11-13 by reading the source:

- The absence of FCC telemetry and analytics.
- The absence of hardcoded, pooled, and shared credentials.
- The loopback checks in `api/admin_security.py`.
- The default bind host and the default value of `proxy_auth_enabled`.
- The OpenCode overlay policy that restricts `provider.use`.
- The local provider base URLs.
- The OAuth authorization flow in `providers/openai_codex/auth.py`.

Not verified:

- Any install or run.
- Any provider key, free tier, or quota.
- The behavior of the fallback chain under a real rate limit.

## References

- `docs/tickets/local-ai-model-swap-and-speedup.md`
- `docs/tickets/free-model-failover-stack.md`
- `https://github.com/Alishahryar1/free-claude-code`
- `https://huggingface.co/LiquidAI/LFM2.5-1.2B-Instruct-GGUF`
