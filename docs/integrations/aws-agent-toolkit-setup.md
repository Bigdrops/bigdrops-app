# AWS Agent Toolkit — Setup Record

Date: 2026-11-18
Environment: Windows 11 Pro, OpenCode (project `bigdrops-app`)
AWS experience: New AWS experience (social sign-in, project-based)
Selected Region: `eu-north-1`
AWS CLI profile: `default`

## What was installed

- AWS CLI v2.41.0 (installed via official PowerShell installer `https://awscli.amazonaws.com/v2/install.ps1`); installed to `C:\Users\DELL\AppData\Local\Programs\Amazon\AWSCLIV2`.
- Authentication via `aws login --region eu-north-1 --profile default` (browser flow). Credentials are valid for 12 hours and renewable for 90 days without re-authenticating in the browser.
- Region set on the `default` profile via `aws configure set region eu-north-1 --profile default`.
- Verified with `aws sts get-caller-identity --profile default` (returns AccountId/Arn/UserId).
- Agent Toolkit installed with `aws configure agent-toolkit --yes --region us-east-1 --profile default` (the toolkit service is only available in `us-east-1`; this does not change the project's selected Region).
  - 25 default AWS skills installed for detected agents (Claude Code, Cline, Codex, Cursor, Kiro, Gemini CLI, OpenCode, Windsurf).
  - AWS MCP server (`aws-mcp`, via `uvx mcp-proxy-for-aws@latest`, endpoint `https://aws-mcp.us-east-1.api.aws/mcp`) configured for the same agents.
  - Automatic skill-update hooks installed for Claude Code, Codex, Cursor, Gemini CLI, Kiro. Not supported for OpenCode, Cline, or Windsurf. Codex additionally requires running `/hooks` in Codex to trust the hook.
  - Codex MCP setup was skipped (`codex` not on PATH).
- Toolkit verification: `aws agent-toolkit list-available-skills --region us-east-1 --profile default` returns 126 skills (name, description, skillVersion, categories). On Windows, run with `chcp 65001` / `PYTHONUTF8=1` / `PYTHONIOENCODING=utf-8` and redirect output to a file; the default cp1252 console crashes printing the JSON (`charmap` codec error).

## MCP configuration changes

Each generated `aws-mcp` entry was missing the named profile (it falls back to the `default` profile, which happened to match here, but the toolkit docs require the explicit env block). Added `AWS_MCP_PROXY_PROFILES=default` to the `env` block of the `aws-mcp` entry in:

- `C:\Users\DELL\.claude.json`
- `C:\Users\DELL\.cline\mcp.json`
- `C:\Users\DELL\.cursor\mcp.json`
- `C:\Users\DELL\.gemini\settings.json`
- `C:\Users\DELL\.kiro\settings\mcp.json` (kept existing `timeout`/`transport`)
- `C:\Users\DELL\.config\opencode\opencode.json` (OpenCode schema: `environment`, not `env`)
- `C:\Users\DELL\.codeium\mcp_config.json`

`command`, `args`, `timeout`, and `transport` were left exactly as generated. No other server entries were modified. All files re-validated as JSON after editing.

To use another AWS project/account later: `aws login --profile <name>`, add `<name>` to the space-separated `AWS_MCP_PROXY_PROFILES` list in each MCP config file, and restart the AI tool.

## Rules file

AWS starter rules (new AWS experience) were appended to this project's `AGENTS.md`, wrapped in `<!-- BEGIN AWS Agent Toolkit rules -->` / `<!-- END AWS Agent Toolkit rules -->` markers. Existing project instructions are preserved and take precedence over the AWS rules where they conflict. Rules were added only to `AGENTS.md` (OpenCode); Claude Code (`CLAUDE.md`), Cursor (`.cursor/rules/`), and Kiro (`.kiro/steering/`) were detected but intentionally not modified.

## Notes & caveats

- New AWS experience constraints apply: single shared project Region (`eu-north-1`); no other Regional resources elsewhere; no Lambda@Edge, StackSets, cross-Region actions, or Route 53 cross-Region routing; CloudFront is allowed in `us-east-1`; Rekognition, Textract, Personalize, and App Runner are not available in `eu-north-1`.
- Credentials expire after 12 hours — re-run `aws login --profile default` to renew.
- The `aws-mcp` server exposes `aws___search_documentation` / `aws___retrieve_skill`; restart the AI tool for it (and the rules) to take effect.
- Setup performed from the official guide: https://raw.githubusercontent.com/aws/agent-toolkit-for-aws/refs/heads/main/setup-instructions/setup.md
