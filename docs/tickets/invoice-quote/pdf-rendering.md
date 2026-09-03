
### Ticket 2 — PDF rendering fidelity

```md
# PDF Rendering Corrupts or Omits Valid Document Characters

## Type
Bug

## Priority
High

## Modules
- Invoice PDF
- Quotation PDF
- Shared PDF rendering/font pipeline

## Description

The PDF renderer does not correctly preserve certain characters entered into document content.

Some Unicode characters render correctly while other valid characters are omitted or corrupted.

This affects document text such as item descriptions, notes, terms, and other user-entered content.

## Reproduction

Generate an Invoice or Quotation PDF containing the following text:

```text
¾
⅘
²
2"
1"
6"
3½
5¾