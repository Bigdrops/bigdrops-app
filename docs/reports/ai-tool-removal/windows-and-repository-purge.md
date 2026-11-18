# AI Coding Tool Removal: Windows and BIGDROPS Repository

This report was written by Saffron on 2026-11-18 via Perch Desktop.

## 1. Objective

Remove Continue, Roo Code, Windsurf, and CommandCode from the Windows workstation and the `C:\Users\DELL\Desktop\bigdrops-app` repository without damaging BOURXE, unrelated AI tooling, IDE configuration, or existing user work.

Skills used: workspace, github, documents
Documentation standard: ASD-STE100 Simplified Technical English

## 2. Completion Status

**Partially completed: All in-scope removals were verified, except that no standalone Windsurf application installer was found. An application uninstall therefore could not be performed or verified.**

All four repository directories are absent. All four user-level product directories are absent. CommandCode global CLI files are absent. Product-specific caches and settings are absent. No verified product-specific startup entries, services, or PATH entries remain. Other AI tools and IDE configuration were preserved.

## 3. Governance and Method

Repository root `AGENTS.md` was read before changes. Relevant rules applied: preserve pre-existing work, do not stage or commit, do not modify application code, do not delete shared directories wholesale, and confirm ownership before deletion.

Before deletion, each target directory was inventoried. The four repository directories were tracked skill mirrors. All eight skills in `.continue/skills` had matching copies in the protected `.agents/skills` library. File counts matched for all eight skills, including `video-shotcraft` at 1,361 files. The four mirrors had identical tree hashes except `.commandcode`, which had 18 fewer files because four skills had been purged earlier. Those four skills also existed in `.agents` and `.claude`. No unique skill content was lost.

## 4. Initial Installation Findings

### Repository

| Directory | Tracked files | Content |
| :--- | ---: | :--- |
| `.continue/` | 1,386 | Skill mirror |
| `.roo/` | 1,386 | Skill mirror |
| `.windsurf/` | 1,386 | Skill mirror |
| `.commandcode/` | 1,386 | Skill mirror |

`.idea/` contained seven ordinary JetBrains project files. `.vscode/` contained `extensions.json` and `settings.json`. Neither contained product-specific settings.

### Windows

| Product | Finding |
| :--- | :--- |
| Continue | User directory `C:\Users\DELL\.continue` with config, sessions, index, and skills. No command, service, or uninstall registration. |
| Roo Code | User directory `C:\Users\DELL\.roo`; VS Code globalStorage folder `rooveterinaryinc.roo-cline`; three `roo-cline` settings in shared VS Code settings. No command, service, or uninstall registration. |
| Windsurf | User directory `C:\Users\DELL\.windsurf`; AppData Roaming directory `Windsurf`; PATH entry `C:\Users\DELL\AppData\Local\Programs\Windsurf\bin`. No executable, uninstall registration, service, or extension was found. |
| CommandCode | User directory `C:\Users\DELL\.commandcode`; global npm package `command-code@0.37.2`; nine npm shims; `commandcode` command on PATH via shared npm directory. |

No product appeared in HKLM or HKCU uninstall registries. No product services or startup folder entries were found. Scheduled task matches were false positives such as `WakeUpAndContinueUpdates`.

## 5. Repository Changes

Removed:

- `.continue/` (1,386 tracked files)
- `.roo/` (1,386 tracked files)
- `.windsurf/` (1,386 tracked files)
- `.commandcode/` (1,386 tracked files)

Edited `docs/PROJECTSKILLINDEX.md` to remove four product-specific mirror notes. Canonical `.agents`, `.claude`, `.hermes`, and `.kiro` references were preserved.

No application source, test, configuration, manifest, lockfile, or database file was changed for this task.

## 6. Windows Changes

Removed:

- `C:\Users\DELL\.continue`
- `C:\Users\DELL\.roo`
- `C:\Users\DELL\.windsurf`
- `C:\Users\DELL\.commandcode`
- `C:\Users\DELL\AppData\Roaming\Windsurf`
- `C:\Users\DELL\AppData\Roaming\Code\User\globalStorage\rooveterinaryinc.roo-cline`
- Global npm package `C:\Users\DELL\AppData\Roaming\npm\node_modules\command-code`
- Nine CommandCode npm shims: `commandcode`, `command-code`, `cmdc`, each with no extension, `.cmd`, and `.ps1`

Edited:

- User PATH: removed only `C:\Users\DELL\AppData\Local\Programs\Windsurf\bin`. Entry count changed from 38 to 37. Shared `%APPDATA%\npm` entry was preserved.
- `%APPDATA%\Code\User\settings.json`: removed only `roo-cline.debug`, `roo-cline.allowedCommands`, and `roo-cline.deniedCommands`. JSON was validated after edit. All unrelated VS Code settings were preserved.

No credentials were read into this report. No shared provider credential was revoked.

## 7. Items Intentionally Preserved

- `.idea/` and all JetBrains project files.
- `.vscode/` and all unrelated VS Code settings.
- `.cursor/`, `.agents/`, `.claude/`, `.hermes/`, `.kiro/`, `.opencode/`, and other unrelated AI tooling.
- Canonical skills in `.agents/skills` and `.claude/skills`.
- Shared npm directory and all unrelated global packages.
- BOURXE application code, tests, database files, and Git history.
- Pre-existing modified and untracked work.

## 8. Items Not Removable

- No standalone Windsurf application installer or executable was found. Uninstall registration, program directories, and common executable paths were checked. Only user data, AppData, and a PATH reference existed. No application uninstall could be performed.
- No Continue, Roo Code, or Windsurf IDE extension was found in VS Code or Cursor extension directories. No extension removal was needed.
- Windsurf icon files in unrelated `node_modules` icon libraries under `C:\Users\DELL\Desktop\bgd-soft` were not removed. They belong to shared icon packages, not to the Windsurf product.

## 9. Verification

Verified absent:

- All four repository directories.
- All four user-level product directories.
- Windsurf AppData Roaming directory.
- Roo VS Code globalStorage directory.
- CommandCode global package and all nine shims.
- `continue`, `roo`, `windsurf`, `commandcode`, and `cmdc` commands.
- Product-specific PATH entries.
- Product-specific settings in shared VS Code settings.
- Product-specific references in `docs/PROJECTSKILLINDEX.md`.

Repository-wide grep for `.continue`, `.roo`, `.windsurf`, `.commandcode`, `roo-cline`, `roo code`, `command-code`, and `continue.dev` returned no matches in indexed source, config, and documentation files. The grep excludes ignored directories such as `node_modules`.

No build, typecheck, or application test was run. No code or application behavior was changed for this task.

## 10. Git State

Initial state: branch `main`, HEAD `e721142e`. Pre-existing work included 19 deleted `.commandcode/skills/video-shotcraft` files, 10 modified PRD documents, three modified application/test files, and several untracked directories and files. No staged changes. Two pre-existing stashes were left untouched.

Final state: branch `main`, HEAD `e721142e`. No commit, push, staging, stash, reset, clean, or checkout was performed by this task.

Final status summary:

- 5,544 tracked deletions: `.commandcode` 1,386, `.continue` 1,386, `.roo` 1,386, `.windsurf` 1,386.
- 14 modified files: 10 PRD documentation files from the prior audit, three pre-existing application/test files, and `docs/PROJECTSKILLINDEX.md` from this task.
- 6 untracked entries: `.perch/`, `.workbuddy-ai/`, `docs/reports/bolu-persistence-integrity/`, `docs/reports/governance/`, one Bolu test file, and one Bolu migration. All pre-existing except this report under `docs/reports/governance/` and the new report directory.

The 19 `.commandcode/skills/video-shotcraft` deletions observed at the start were superseded by the full directory removal. No unrelated pre-existing change was reverted or overwritten.

## 11. Risks and Limitations

The PowerShell host produced two fatal CLR errors during bulk npm and file-deletion commands. The affected operations were retried with narrower commands and verified afterward. Recursive forced deletion was blocked by policy; non-forced recursive removal was used for verified product directories.

A recursive shortcut scan timed out. A bounded scan of Start Menu and Desktop locations found no product shortcuts. Deeper nested shortcut locations were not exhaustively verified.

No claim is made that a Windsurf standalone application was uninstalled. The evidence showed only user data and a PATH entry, both removed.

## 12. Deferred Work

None within this task scope. If a Windsurf installer is found later, uninstall it through its supported mechanism and verify the result.
