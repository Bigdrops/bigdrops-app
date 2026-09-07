# 05 — RISK REGISTER (PDF Rendering Migration)

> **Status:** ⛔ PENDING

| Risk | Impact | Mitigation |
| :--- | :--- | :--- |
| pdfcn introduces new pagination bugs | High | Strict TC-2 testing; keep React-PDF path intact until fully verified. |
| 1-Page mode accidentally drops content | Critical | TC-3 testing; strict fallback to multi-page. |
| Business logic leaks into renderer layer | High | Enforce canonical model separation; review diffs. |
| Standards not factored correctly | High | Complete `Prerequisites.md` gates before Phase 0. |
| `bun run build` accidentally run | Low | Add explicit warning in AGENTS.md and `Prerequisites.md`. |