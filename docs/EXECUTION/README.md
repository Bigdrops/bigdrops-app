# docs/execution/ — Transformation Standard Enforcement Workspace

> Permanent execution workspace for Document Transformation Standard compliance.

## Structure

```
EXECUTION/
├── README.md                  ← This file
├── audits/                    ← Versioned compliance audits (never overwrite)
├── findings/                  ← Individual finding details
├── implementation/            ← Implementation task tracking
└── verification/              ← Post-implementation verification reports
```

## Workflow

1. **Audit** — Read-only compliance evaluation against `docs/standard/document-transformation-standard.md`
2. **Findings** — Each failed rule gets a unique Action ID (e.g., `EDIT-INV-001`)
3. **Implementation** — Tasks resolve audit findings (one finding → one task)
4. **Verification** — Confirm compliance after implementation

## Naming Convention

- Audits: `YYYY-MM-DD-<description>.md` (never overwrite previous versions)
- Findings: `<ACTION_ID>.md` (e.g., `EDIT-INV-001.md`)
- Implementation tasks: `YYYY-MM-DD-<task-name>.md`
- Verification: `YYYY-MM-DD-<verification-name>.md`

## Standards Hierarchy

```
AGENTS.md
    ↓
docs/standard/*
    ↓
docs/execution/*
    ↓
Implementation
```

## Rules

- No implementation work begins without an Execution Audit
- Standards define expected behaviour; audits identify deviations
- Every finding requires a unique Action ID
- Previous audit versions are never overwritten
- Verification confirms compliance before marking findings CLOSED
