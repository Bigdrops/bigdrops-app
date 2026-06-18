---
description: Run TypeScript type checking for the BIGDROPS project. Use bun run typecheck with appropriate timeout and error handling.
---

# Type Check Command

Run TypeScript type checking for the BIGDROPS project.

## Usage

```bash
bun run typecheck
```

## Parameters

- **timeout**: Optional timeout in milliseconds (default: 120000ms = 2 minutes)
- **workdir**: Working directory (default: project root)

## Example

```bash
# Basic usage
bun run typecheck

# With longer timeout
bun run typecheck 2>&1

# With explicit timeout (in PowerShell)
$bun run typecheck
```

## Error Handling

- If typecheck fails, capture the full output
- Look for specific TypeScript errors in the output
- Common issues: missing types, incorrect imports, type mismatches

## Integration

This command is typically run as part of the verification protocol:
1. Make code changes
2. Run `bun run typecheck`
3. Fix any TypeScript errors
4. Run `bun run lint`
5. Manual verification

## Notes

- The BIGDROPS project uses TypeScript 5.9
- Type checking is strict - all errors must be resolved
- Timeout may need to be increased for large codebases