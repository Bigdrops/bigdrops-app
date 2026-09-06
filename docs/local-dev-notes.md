# Local Dev Notes

Quick reference for localhost-only features and build tricks.

## Debug Routes (localhost only)

| Route | Purpose |
|-------|---------|
| `/debug/tenant` | Tenant debug panel (works everywhere) |
| `/debug/errors` | Error registry viewer — polls `errorRegistry` every 2s, shows all captured errors with copy/dump |

`/debug/errors` is gated to `localhost` in `AppShell.tsx`. Won't appear in production or deployed previews.

## GitHub Codespace Build

Large repos blow past the default Node heap on Codespace VMs. Use:

```bash
NODE_OPTIONS=--max-old-space-size=12288 bun run build
```
