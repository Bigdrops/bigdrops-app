# GitNexus Operations Manual
**Location:** `docs/contracts/gitnexus-operations.md`

> **Status:** Active
> **Version:** 1.0
> **Project:** BIGDROPS
> **Last Updated:** 2026-06-30

---

# Purpose

This document is the operational handbook for GitNexus within the BIGDROPS repository.

Unlike the architecture contract, this manual focuses on **how to operate, maintain, troubleshoot, rebuild, and safely use GitNexus** during day-to-day development.

---

# Overview

GitNexus builds a local knowledge graph from the repository.

Instead of searching text files, GitNexus understands:

- syntax trees
- symbol relationships
- call graphs
- execution flows
- dependencies
- imports
- module relationships
- architectural clusters

This allows AI agents and developers to answer structural questions that ordinary text search cannot.

---

# Repository Layout

```
.gitnexus/
│
├── lbug
├── meta.json
├── run.cjs
├── parse-cache/
└── parsedfile-cache/
```

---

# File Reference

## lbug

Large binary knowledge graph.

Contains:

- AST
- symbol graph
- dependency graph
- execution graph
- embeddings
- node relationships
- indexes

This file is generated automatically.

Never edit manually.

---

## meta.json

Repository metadata.

Contains information such as:

- repository path
- indexing status
- graph statistics
- timestamps
- parser metadata

Human-readable JSON.

Safe to inspect.

---

## run.cjs

Bootstrap runner used internally by GitNexus.

Do not modify.

---

## parse-cache

Parser acceleration cache.

Safe to delete.

Automatically rebuilt.

---

## parsedfile-cache

File parsing cache.

Safe to delete.

Automatically rebuilt.

---

# Initial Setup

Install GitNexus.

```
npx gitnexus setup
```

Configure your preferred editor if prompted.

---

# Indexing a Repository

Navigate to the repository.

```
cd bigdrops-app
```

Run

```
npx gitnexus analyze .
```

GitNexus will:

- parse every source file
- build AST
- generate dependency graph
- generate execution graph
- compute embeddings
- store everything inside `.gitnexus`

Large repositories may take several minutes.

---

# Example Result

```
18,701 nodes

41,567 edges

827 clusters

300 flows
```

These values vary as the repository evolves.

---

# Repository Status

View repository status.

```
npx gitnexus status
```

Displays whether the current repository has already been indexed.

---

# Registered Repositories

List every indexed repository.

```
npx gitnexus list
```

---

# Search the Knowledge Graph

```
npx gitnexus query "invoice totals"
```

Returns:

- symbols
- files
- execution flows
- related components

---

# Symbol Context

Display everything connected to a symbol.

```
npx gitnexus context InvoiceTotals
```

Shows:

- callers

- callees

- dependencies

- imports

- execution paths

---

# Dependency Impact

Determine what changing a symbol will affect.

```
npx gitnexus impact InvoiceTotals
```

Useful before refactoring.

---

# Trace Execution

Trace the shortest execution path.

```
npx gitnexus trace InvoiceForm saveInvoice
```

Useful for debugging.

---

# Detect Git Changes

Map modified files onto the knowledge graph.

```
npx gitnexus detect-changes
```

Useful before:

- pull requests
- reviews
- refactoring

---

# Generate Wiki

Generate repository documentation.

```
npx gitnexus wiki
```

Useful for onboarding.

---

# Structural Validation

Run graph consistency checks.

```
npx gitnexus check
```

---

# Publish Graph

Optional.

```
npx gitnexus publish
```

Requires repository token.

Not normally needed.

---

# Start Local Server

```
npx gitnexus serve
```

Runs the local HTTP service.

Useful for integrations.

---

# MCP Server

Run Model Context Protocol server.

```
npx gitnexus mcp
```

Supports:

- Claude Code
- Cursor
- Codex
- OpenCode

---

# Doctor

Inspect runtime capabilities.

```
npx gitnexus doctor
```

Useful when troubleshooting.

---

# Clean Index

Delete the current repository index.

```
npx gitnexus clean
```

Removes `.gitnexus`.

Next analysis performs a full rebuild.

---

# Remove Registered Repository

```
npx gitnexus remove <repository>
```

Removes repository registration.

Does not affect Git history.

---

# Full Rebuild

Delete the index.

```
npx gitnexus clean
```

Then rebuild.

```
npx gitnexus analyze .
```

---

# Safe Files to Delete

Safe:

```
.gitnexus/
```

GitNexus regenerates everything.

Nothing inside `.gitnexus` should be manually edited.

---

# Files That Should Never Be Edited

```
lbug

run.cjs
```

Treat these as generated artifacts.

---

# Typical Workflow

Morning:

```
git pull

bun install

bun run audit:load

npx gitnexus detect-changes
```

If major architectural changes occurred:

```
npx gitnexus analyze .
```

Before asking AI questions:

```
npx gitnexus query "<topic>"
```

Before refactoring:

```
npx gitnexus impact SymbolName
```

Before merging:

```
bun run typecheck

bun run build

bun run audit:load
```

---

# Recommended AI Workflow

1. Update repository.

2. Run audit.

3. Refresh GitNexus if needed.

4. Ask architectural questions.

5. Perform implementation.

6. Run verification.

---

# Performance Notes

Large repositories:

- Initial indexing may take several minutes.
- Incremental queries are significantly faster.
- Larger graphs consume more disk space.

Current BIGDROPS snapshot:

```
Nodes:
18,701

Edges:
41,567

Clusters:
827

Flows:
300

Knowledge Graph:
≈295 MB
```

---

# Backup

GitNexus indexes are reproducible.

Recommended backup strategy:

Do **not** back up `.gitnexus`.

Instead back up:

- repository
- documentation
- contracts
- session memories

The graph can always be regenerated.

---

# Troubleshooting

## Missing `.gitnexus`

Run:

```
npx gitnexus analyze .
```

---

## Empty Results

Rebuild the index.

```
npx gitnexus clean

npx gitnexus analyze .
```

---

## Repository Not Registered

```
npx gitnexus index .
```

---

## Command Not Found

Use:

```
npx gitnexus
```

or install globally if desired.

---

## Corrupted Index

Delete:

```
.gitnexus
```

Re-run:

```
npx gitnexus analyze .
```

---

# Best Practices

✅ Rebuild after major refactors.

✅ Run impact analysis before deleting shared code.

✅ Use context before modifying unfamiliar components.

✅ Keep contracts synchronized with architecture.

✅ Keep session memories for important indexing milestones.

✅ Never manually edit generated GitNexus files.

---

# Operational Rules

1. `.gitnexus` is generated.
2. Never commit manual edits inside `.gitnexus`.
3. Always regenerate instead of repairing.
4. Use GitNexus for architecture questions, not text search.
5. Keep this manual updated as GitNexus gains new features.

---

# Related Documents

- `docs/contracts/gitnexus-contract.md`
- `docs/Session-memories/2026-06-30-gitnexus-bootstrap.md`
- `AGENTS.md`

---

# Revision History

| Date | Version | Notes |
|-------|----------|------|
| 2026-06-30 | 1.0 | Initial operations manual created. |
