# AGENTS.md Subagent Delegation Protocol Upgrade

This report was written by OpenCode on 2026-07-09 via Local Runner.

## Objective & Scope

This task upgrades the repo-root `AGENTS.md` to establish the subagent directory (`.opencode/agents/*.md`) and its index (`docs/SUBAGENTS.md`) as the primary source of truth for task delegation. The work was a surgical documentation change limited strictly to `AGENTS.md` plus this single report file.

**In scope:**
- Add new section §8 "Subagent Delegation Protocol & Routing" after §7.
- Surgical append to the §3 "Audit & Skill Load First" bullet.
- Surgical append of a "Skills vs Subagents" clarification block to §5.
- Author this evidence-based report.

**Out of scope (intentionally excluded):** changes to any [LOCKED] item in §2; the §3 Verification Gate commands; naming conventions and domain-segregation rules; the §4 Standards Hierarchy; the §6 reporting identity standard; any section renumbering of §1–§7; any code, standards, or subagent-file changes; creation of `docs/SUBAGENTS.md` or `docs/Reports/GENERAL/delegation-log.md` (those artifacts are referenced by the new protocol but not created by this task).

## Facts (Evidence-Based)

All paths relative to `C:\Users\DELL\Desktop\bigdrops-app`.

1. **§3 surgical append** — `AGENTS.md` line 40. The existing "Audit & Skill Load First" bullet (which ends with the `docs/PROJECTSKILLINDEX.md` sentence) now terminates with the appended sentence: *"After identifying an unfamiliar domain and before implementation, also consult `docs/SUBAGENTS.md` (§8) and delegate to a specialized subagent where one exists."* The original bullet text was preserved verbatim; no other part of line 40 was rewritten.

2. **§5 clarification block** — `AGENTS.md` line 75. Appended after the existing "Fallback" bullet (line 74): *"**Skills vs Subagents:** Skills are instruction sets loaded into the current session (this section). Subagents are separate execution personas delegated via `docs/SUBAGENTS.md` (§8). Load a skill for guidance; dispatch a subagent for execution. See §8 for routing and precedence."* No existing §5 content was altered.

3. **§8 new section** — `AGENTS.md` lines ~113–174 (added after the §7 block which ends at line 109, followed by the `---` separator at line 111). Section contains:
   - Intro paragraph (subagent directory `.opencode/agents/*.md`, index `docs/SUBAGENTS.md`, mandate to delegate domain-matching work).
   - §8.1 Consult the index first.
   - §8.2 Skills vs Subagents (precedence 1→2→3; §3 rule retained for skill loading).
   - §8.3 Decision Procedure (six numbered steps using canonical domain tokens).
   - §8.4 Invocation methods (`@<agent-name>`, `/agent`, Task dispatch).
   - §8.5 Mandatory Delegation & Logging (non-negotiable; both code-fenced log templates: Match and No-match; recording destinations (a) response and (b) `docs/Reports/GENERAL/delegation-log.md`).
   - §8.6 Routing Quick Reference table (17 rows mapping domain → recommended subagent, including the LOCKED financial/prefix row delegating to `NONE` + `code-reviewer`).

4. **§4 left untouched** — No natural insertion point exists in the Standards Hierarchy section for subagent references; spec permitted leaving §4 unchanged, so it was not modified.

5. **Preserved verbatim (confirmed unchanged):**
   - All [LOCKED] items in §2 (`Calculations.ts`, `prefixConstants.ts`, waybill number generation) — lines 26–28.
   - §3 Verification Gate commands (`bun run typecheck`, `bun run audit:load`, `git status`; the NEVER `bun run build` critical note) — lines 44–48.
   - Naming conventions (§1, lines 15–18) and Domain Segregation (§2, line 29).
   - §6 Report Identity Standard (lines 81–84).
   - Section numbering §1–§7 retained; only §8 was added.

## Fact vs. Conclusion

| Observation (Fact) | Interpretation (Conclusion) |
| --- | --- |
| `git status --short` shows only `M AGENTS.md`; no `.tsx`/`.ts` files modified. | The 18 typecheck errors originate outside this task. |
| `bun run typecheck` reports 18 TS2304 errors, all in `src/components/waybill/MinimalTemplate.tsx` and `src/components/waybill/ThermalTemplate.tsx` referencing undefined `fillableBold`/`fillableColor`. | These are pre-existing defects in waybill PDF templates, unrelated to markdown documentation edits. |
| AGENTS.md §2–§7 content matched the pre-edit Read output except the three intended edits. | Surgical scope was maintained; no collateral edits introduced. |

## Delegation Protocol Summary

The new §8 makes `.opencode/agents/*.md` (indexed in `docs/SUBAGENTS.md`) the canonical delegation target. Precedence: (1) matching subagent → invoke; (2) else matching skill → load; (3) else generic execution with `subagent=NONE` logged. Every task must emit a `[DELEGATION]` log line recorded in the response and appended to `docs/Reports/GENERAL/delegation-log.md`. A 17-row routing table binds canonical domain tokens (invoice, waybill, BOQ-RFQ, security, docs, git, etc.) to recommended personas, with the LOCKED financial/prefix engine explicitly reserved in-house (`NONE` + `code-reviewer`). This task itself falls under the "Documentation / reports / AGENTS.md edits → `technical-writer`" routing row.

## Risks & Limitations

- **Index artifact not created:** `docs/SUBAGENTS.md` is referenced by the new §8 as the canonical index but was NOT created by this task (out of scope). Until that file exists with the 232 persona entries, the §8.1 "consult the index first" step cannot be fulfilled by agents; the protocol is structurally correct but partially documentary until the index is populated.
- **Pre-existing typecheck failures:** 18 errors in waybill templates mean the repo is not in a clean typecheck state independent of this work. This does not affect the documentation change but should be noted for any downstream CI gating.
- **Naming inconsistencies in source text preserved:** The spec was applied verbatim, including the typographic artefacts present in the source `AGENTS.md` (e.g., "BIGDROPS", "Calculations", "SUBAGENTS") and in the supplied spec (e.g., "Delegation", "BIGDROPS", "Subagents"). These were reproduced exactly as instructed; no spelling normalization was applied to preserve verbatim conformance.

## Verification

- **`bun run typecheck`**: FAILED with 18 errors — **all pre-existing and unrelated** to this task. Every error is TS2304 in `src/components/waybill/MinimalTemplate.tsx` (lines 368, 384, 392, 396, 486, 507) and `src/components/waybill/ThermalTemplate.tsx` (lines 508, 518, 539), referencing undefined identifiers `fillableBold` and `fillableColor`. Markdown edits cannot introduce TypeScript compilation errors; `git status` confirms no source files were touched. These defects predate this change.
- **`git status`**: Clean with respect to this task — only `M AGENTS.md` reported. No unintended files modified or created.
- **`bun run build`**: SKIPPED per the §3 hardware policy (4GB RAM limit; build reserved for project lead). Not executed.

## Deferred Work

- Population of `docs/SUBAGENTS.md` with the 232 subagent persona entries (referenced by §8 but not created here).
- Initialization/appending of `docs/Reports/GENERAL/delegation-log.md` (the §8.5 recording destination) — to be written by future tasks as they emit delegation log lines.
- Resolution of the 18 pre-existing `fillableBold`/`fillableColor` typecheck errors in the waybill PDF templates (separate task, outside this documentation scope).
