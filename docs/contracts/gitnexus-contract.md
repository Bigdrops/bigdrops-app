# GitNexus Integration Contract

**Status:** Active
**Owner:** BIGDROPS Architecture
**Last Updated:** 2026-06-30

---

# Purpose

GitNexus is used as an architectural analysis tool for BIGDROPS.

It supplements—not replaces—traditional tools such as:

- grep
- ripgrep (rg)
- TypeScript language server
- IDE Find References
- Git history

GitNexus provides repository-wide structural knowledge that allows safer refactoring, dependency analysis, impact analysis and architectural audits.

---

# Repository Location

GitNexus stores its local index inside:

```

.gitnexus/

```

Current structure:

```

.gitnexus/
├── lbug
├── meta.json
├── run.cjs
├── parse-cache/
└── parsedfile-cache/

```

---

# Important Files

## lbug

Primary LadybugDB knowledge graph.

Contains:

- AST graph
- symbol graph
- dependency graph
- execution flows
- callers
- callees
- relationships

This is **not** human readable.

Do not edit manually.

---

## meta.json

Repository metadata.

Contains information such as:

- indexed files
- timestamps
- repository identity
- indexing metadata

Human readable JSON.

---

## parse-cache/

Parser cache.

Speeds up future indexing.

Safe to regenerate.

---

## parsedfile-cache/

Stores parsed file cache.

Safe to regenerate.

---

## run.cjs

Runtime launcher used internally by GitNexus.

Do not modify.

---

# Current Repository Statistics

Repository indexed successfully.

Date:

2026-06-30

Statistics:

- Files parsed: ~1047
- Nodes: 18,701
- Edges: 41,567
- Clusters: 827
- Execution Flows: 300

Large generated files skipped:

- android/app/src/main/assets/public/assets/index-*.js
- react-pdf.browser-*.js
- temp-build/index.js
- temp-build/csrUtils.js

---

# Why BIGDROPS Uses GitNexus

GitNexus is primarily used before large architectural changes.

Examples:

- UI consolidation
- component replacement
- design token migration
- shared component extraction
- CSS cleanup
- PDF architecture work
- module splitting

---

# Standard Workflow

## Step 1

Update repository.

## Step 2

Run

```bash
npx gitnexus analyze
```

This refreshes the knowledge graph.

---

## Step 3

Perform architectural queries.

Examples:

```bash
npx gitnexus query "SharedDocumentForm"
```

```bash
npx gitnexus impact SharedDocumentForm
```

```bash
npx gitnexus context SharedDocumentForm
```

```bash
npx gitnexus trace InvoiceForm SharedDocumentForm
```

---

## Step 4

Perform implementation.

---

## Step 5

Run

```bash
bun run audit:load
bun run typecheck
bun run build
```

---

# Approved Use Cases

GitNexus SHOULD be used before:

- moving files
- deleting files
- removing CSS variables
- replacing shared components
- introducing design tokens
- consolidating layouts
- changing application architecture
- removing utilities
- splitting modules

---

# Design Token Migration

GitNexus is mandatory before removing CSS variables.

Required process:

1. Refresh GitNexus index.
2. Query token usage.
3. Run impact analysis.
4. Verify with grep.
5. Verify with TypeScript.
6. Implement.
7. Run visual QA.

GitNexus supplements grep.

grep remains mandatory.

---

# Component Consolidation

Before replacing any shared component:

Run:

```bash
npx gitnexus impact ComponentName
```

Confirm:

- callers
- imports
- execution paths
- dependencies

Only then begin migration.

---

# Knowledge Graph Scope

GitNexus understands:

- imports
- exports
- symbols
- functions
- classes
- interfaces
- JSX
- React components
- execution flows
- dependency graph

GitNexus is not intended for:

- visual design
- screenshots
- pixel comparison
- accessibility testing

---

# Relationship with Existing Tooling

| Tool | Purpose |
|-------|----------|
| grep | exact text search |
| rg | fast search |
| TypeScript | type safety |
| audit:load | project conventions |
| GitNexus | structural analysis |

These tools complement each other.

None replaces the others.

---

# Repository Policy

Developers should refresh the GitNexus index after major architectural changes.

Recommended cadence:

- after major refactors
- after UI consolidation phases
- after component extraction
- after design-token migration
- before release candidates

---

# Files That Should Never Be Edited

```
.gitnexus/lbug
.gitnexus/run.cjs
```

Delete only by rerunning GitNexus or using GitNexus cleanup commands.

---

# Conclusion

GitNexus is the architectural knowledge layer for BIGDROPS.

It reduces refactoring risk by providing repository-wide structural awareness beyond conventional text search.