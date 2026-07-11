# Document View Token Architecture

> **Status:** Canonical Project Memory
>
> This document records the architectural conclusions reached after the Phase 2 Document View token migration and governance audit. It exists to prevent future contributors from repeating investigations or treating intentional design decisions as technical debt.

---

# Background

The Document View styling system originally used a large `--dv-*` semantic token layer that acted as an abstraction over the platform design system (`--bd-*`).

During Phase 2, the project undertook a controlled migration to determine whether this layer could be removed or significantly reduced.

The work was intentionally executed in multiple evidence-driven phases rather than a repository-wide find-and-replace.

---

# Related Reports

This document is based on the findings contained in:

- `docs/Reports/GENERAL/phase2-document-view-css-architecture-audit.md`
- `docs/Reports/GENERAL/phase-2c-token-governance-audit.md`

Those reports contain the detailed inventories, token traces, consumer maps, and governance evidence.

This document records the architectural decision that resulted from those findings.

---

# Final Conclusion

The migration successfully removed every remaining **mechanical alias** that could be safely replaced.

The remaining `--dv-*` tokens are **not migration debt**.

They represent intentional architecture.

Future contributors should **not** continue attempting to eliminate them simply because they appear during a repository search.

---

# What Phase 2 Achieved

Phase 2 successfully:

- Eliminated all mechanical `--dv-*` alias usage that had direct `--bd-*` equivalents.
- Fixed the undefined `--dv-radius-sm` defect.
- Flattened document-specific alias layers where canonical replacements existed.
- Verified that no legacy token leakage exists outside the Document View subsystem.
- Produced a complete governance audit of every remaining `--dv-*` token.

From an architectural perspective, the migration is complete.

---

# Remaining Token Categories

The governance audit established that every remaining `--dv-*` token belongs to one of two intentional categories.

## 1. Design Primitives

These are foundational design tokens that currently have no equivalent in the platform token system.

Examples include:

- `--dv-font-mono`
- `--dv-font-ui`
- `--dv-font-display`
- `--dv-violet`
- `--dv-amber`
- `--dv-emerald`
- `--dv-sky`
- `--dv-red-accent`

These are considered part of the Document View design language and should remain until the global design system provides equivalent primitives.

---

## 2. Derived Semantic Tokens

These tokens intentionally wrap platform values using opacity, alpha channels, or composed HSL expressions.

Examples include:

- opacity wrappers
- transparency helpers
- composed semantic colours

These cannot be mechanically replaced because the underlying platform tokens expose raw HSL channels rather than complete CSS colour values.

Removing them would change rendering behaviour.

---

# Why Many Theme Definitions Were Not Deleted

The governance audit identified numerous theme definitions with zero active consumers.

Although technically removable, they were intentionally retained.

Reasoning:

- Zero current consumers does **not** mean the semantic API should disappear.
- These tokens form part of the Document View vocabulary.
- Keeping them preserves naming consistency.
- Removing them would create unnecessary churn for little practical benefit.
- Future document modules may legitimately reuse these semantic names.

They should only be removed as part of a deliberate design-system evolution—not a cleanup exercise.

---

# Local Dead Definitions

The audit also identified several locally scoped CSR variables with zero consumers.

Unlike shared semantic theme tokens, these are implementation details rather than public design primitives.

They may be safely removed during future maintenance if desired.

---

# Architectural Rule Going Forward

Future contributors should classify any remaining `--dv-*` token before modifying it.

Questions to ask:

1. Is it a mechanical alias?
2. Is it a design primitive?
3. Is it a derived semantic token?
4. Is it a local implementation detail?

Only confirmed mechanical aliases should be migrated automatically.

Everything else requires architectural review.

---

# Lessons Learned

This migration reinforced several project principles:

- Repository-wide search results do not automatically indicate technical debt.
- Mechanical migrations must be evidence-driven.
- Semantic abstraction layers have architectural value even when lightly used.
- Design primitives should not be removed simply because they currently have few consumers.
- Governance audits should precede large-scale cleanup work.

---

# Current Project Status

Phase 2 Document View Token Migration is considered **complete**.

The remaining `--dv-*` tokens are intentional architectural components of the Document View subsystem.

Future work should focus on evolving the platform design system rather than continuing mechanical token replacement.

---

# Reference

For complete inventories, token classifications, consumer matrices, and governance evidence, refer to:

- `docs/Reports/GENERAL/phase2-document-view-css-architecture-audit.md`
- `docs/Reports/GENERAL/phase-2c-token-governance-audit.md`