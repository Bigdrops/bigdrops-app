# docs/PROJECTSKILLINDEX.md — Claude & OpenCode Skills Directory
> ### 🚨 CRITICAL AGENT INSTRUCTION & PATH FAIL-SAFE:
> Before executing any task, read this index to locate the relevant skill. 
> **CRITICAL CONTEXT:** Every directory listed below (like `.agents/` and `.claude/`) lives directly INSIDE the root of this active project repository (`C:\Users\DELL\Desktop\bigdrops-app\`). They are NOT global system folders.
> **If your skill-loading tool fails or claims it cannot find a skill, DO NOT QUIT.** 
> You are strictly commanded to bypass the tool, use your direct file-reading tools, look inside the current workspace directory first, and manually open the `SKILL.md` file using either the Relative Path or Absolute Path listed below.
> A curated library of reusable skills for the BIGDROPS project — organized by location, niche, and purpose.
---
## Overview

| Location | Count | Purpose |
| :--- | :--- | :--- |
| `.agents/skills/` | 48 skills | General-purpose dev, UI, infra, and Capacitor skills |
| `.claude/skills/` | 7 skills | Meta, design, testing, discipline, and skill-discovery skills |
| `.opencode/agents/` | 232 subagents | Upstream agency-agents — 18 divisions of specialized personas |
| `.mimocode/skills/` | 1 skill | Waybill template debugging and investigation |
| `.mimocode/commands/` | 1 command | Type checking verification |
| `node_modules/@dietrichgebert/ponytail/` | 6 skills + 6 commands + 10 hooks | Ponytail lazy senior dev mode plugin (RAM Safe) |
| **Total** | **64 skills + 232 subagents** | *(+ ~30 bundled inside `awesome-claude-skills`)* |

---
## `.agents/skills/`
General engineering and frontend skills used by coding agents during development tasks.

| # | Skill | Relative Project Path | Absolute Workspace Path | Niche / Instructions |
| :--- | :--- | :--- | :--- | :--- |
| 1 | accessibility | .agents/skills/accessibility/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\accessibility\SKILL.md | WCAG 2.2 compliance, a11y audits, screen reader support, keyboard navigation, color contrast, ARIA patterns |
| 2 | deploy-to-vercel | .agents/skills/deploy-to-vercel/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\deploy-to-vercel\SKILL.md | Deploying apps to Vercel — CLI auth, git push deploys, preview URLs, team selection, no-auth fallbacks |
| 3 | frontend-design | .agents/skills/frontend-design/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\frontend-design\SKILL.md | Distinctive, production-grade UI — anti-"AI slop" aesthetics, creative typography, color, motion, spatial composition |
| 4 | pdf-rendering-correctness | .agents/skills/pdf-rendering-correctness/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\pdf-rendering-correctness\SKILL.md | Invoice PDF pipeline — parent invoice as single source of truth, prevents data mutation in render layers, advance invoice rules, waybill template rules |
| 5 | seo | .agents/skills/seo/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\seo\SKILL.md | Technical SEO — meta tags, structured data (JSON-LD), sitemaps, URL structure, mobile SEO, hreflang |
| 6 | shadcn | .agents/skills/shadcn/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\shadcn\SKILL.md | shadcn/ui — CLI usage, component composition, form patterns, icon handling, styling rules, registry management |
| 7 | supabase-postgres-best-practices | .agents/skills/supabase-postgres-best-practices/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\supabase-postgres-best-practices\SKILL.md | Postgres performance — indexing, connection pooling, RLS, schema design, locking, monitoring, query optimization |
| 8 | tailwind-css-patterns | .agents/skills/tailwind-css-patterns/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\tailwind-css-patterns\SKILL.md | Tailwind CSS utility-first styling — responsive design, flexbox/grid, dark mode, component extraction, performance, a11y |
| 9 | tailwind-v4-shadcn | .agents/skills/tailwind-v4-shadcn/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\tailwind-v4-shadcn\SKILL.md | Tailwind v4 + shadcn/ui — @theme inline, CSS variable architecture, dark mode with ThemeProvider, plugin directives, migration from v3 |
| 10 | typescript-advanced-types | .agents/skills/typescript-advanced-types/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\typescript-advanced-types\SKILL.md | Advanced TypeScript — generics, conditional types, mapped types, template literals, type-safe patterns |
| 11 | vercel-composition-patterns | .agents/skills/vercel-composition-patterns/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\vercel-composition-patterns\SKILL.md | React composition — compound components, avoiding boolean prop proliferation, context providers, React 19 APIs |
| 12 | vercel-react-best-practices | .agents/skills/vercel-react-best-practices/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\vercel-react-best-practices\SKILL.md | React/Next.js performance — eliminating waterfalls, bundle optimization, server-side perf, re-render optimization (70 rules, 8 categories) |
| 13 | vite | .agents/skills/vite/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\vite\SKILL.md | Vite build tool — config, plugin API, SSR, library mode, Vite 8 Rolldown migration, Environment API |
| 14 | redesign-existing-projects | .agents/skills/redesign-existing-projects/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\redesign-existing-projects\SKILL.md | Upgrades existing websites and apps to premium quality. Audits current design, identifies generic AI patterns, and applies high-end design standards without breaking functionality. |
| 15 | react-pdf | .agents/skills/react-pdf/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\react-pdf\SKILL.md | Generate PDF documents using React-PDF library (@react-pdf/renderer). Use when creating PDFs, generating documents, reports, invoices, forms, or when user mentions PDF generation. |
| 16 | capacitor-accessibility | .agents/skills/capacitor-accessibility/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\capacitor-accessibility\SKILL.md | Accessibility guide for Capacitor apps — screen readers, semantic HTML, focus management, WCAG compliance |
| 17 | capacitor-best-practices | .agents/skills/capacitor-best-practices/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\capacitor-best-practices\SKILL.md | Best practices for Capacitor — project structure, plugin usage, performance, security, deployment |
| 18 | capacitor-ci-cd | .agents/skills/capacitor-ci-cd/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\capacitor-ci-cd\SKILL.md | CI/CD for Capacitor apps — GitHub Actions, GitLab CI, build automation, app signing, deployment pipelines |
| 19 | capacitor-deep-linking | .agents/skills/capacitor-deep-linking/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\capacitor-deep-linking\SKILL.md | Deep links and universal links — iOS Universal Links, Android App Links, custom URL schemes |
| 20 | capacitor-keyboard | .agents/skills/capacitor-keyboard/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\capacitor-keyboard\SKILL.md | Keyboard handling — visibility detection, accessory bar, scroll behavior, input focus |
| 21 | capacitor-mcp | .agents/skills/capacitor-mcp/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\capacitor-mcp\SKILL.md | MCP tools for Capacitor — Ionic/Capacitor component APIs, plugin documentation, CLI commands, AI-assisted dev |
| 22 | capacitor-offline-first | .agents/skills/capacitor-offline-first/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\capacitor-offline-first\SKILL.md | Offline-first Capacitor apps — data sync, caching strategies, conflict resolution, Fast SQL, service workers |
| 23 | capacitor-performance | .agents/skills/capacitor-performance/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\capacitor-performance\SKILL.md | Performance optimization — bundle size, rendering, memory, native bridge, profiling |
| 24 | capacitor-plugin-spm-support | .agents/skills/capacitor-plugin-spm-support/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\capacitor-plugin-spm-support\SKILL.md | Swift Package Manager support for Capacitor plugins — Package.swift, CAPBridgedPlugin conversion |
| 25 | capacitor-plugin-upgrades | .agents/skills/capacitor-plugin-upgrades/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\capacitor-plugin-upgrades\SKILL.md | Upgrade Capacitor plugins to newer major versions — dependency alignment, native changes, verification |
| 26 | capacitor-plugins | .agents/skills/capacitor-plugins/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\capacitor-plugins\SKILL.md | Official Capacitor package guide + Capgo ecosystem plugin recommendations |
| 27 | capacitor-push-notifications | .agents/skills/capacitor-push-notifications/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\capacitor-push-notifications\SKILL.md | Push notifications via FCM and APNs — setup, handling, best practices |
| 28 | capacitor-security | .agents/skills/capacitor-security/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\capacitor-security\SKILL.md | Security audit with Capsec scanner — 63+ rules across secrets, storage, network, auth, crypto |
| 29 | capacitor-splash-screen | .agents/skills/capacitor-splash-screen/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\capacitor-splash-screen\SKILL.md | Splash screen configuration — asset generation, animation, programmatic control |
| 30 | capacitor-testing | .agents/skills/capacitor-testing/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\capacitor-testing\SKILL.md | Testing guide — unit, integration, E2E, native; Jest, Vitest, Playwright, Appium |
| 31 | capgo-live-updates | .agents/skills/capgo-live-updates/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\capgo-live-updates\SKILL.md | Live updates via Capgo — deploy without app store review, update strategies, CI/CD integration |
| 32 | capgo-release-management | .agents/skills/capgo-release-management/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\capgo-release-management\SKILL.md | Capgo OTA release workflows — bundle uploads, channels, cleanup, encryption key setup |
| 33 | capgo-release-workflows | .agents/skills/capgo-release-workflows/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\capgo-release-workflows\SKILL.md | Capgo-centered release workflows — live updates, native builds, app store publishing via CI/CD |
| 34 | cocoapods-to-spm | .agents/skills/cocoapods-to-spm/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\cocoapods-to-spm\SKILL.md | Migrate iOS from CocoaPods to Swift Package Manager — SPM migration, xcconfig, plugin verification |
| 35 | cordova-to-capacitor | .agents/skills/cordova-to-capacitor/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\cordova-to-capacitor\SKILL.md | Migrate from Apache Cordova to Capacitor — plugin migration, platform differences |
| 36 | debugging-capacitor | .agents/skills/debugging-capacitor/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\debugging-capacitor\SKILL.md | Debugging Capacitor apps — WebView/native debugging, crash analysis, network inspection |
| 37 | framework-to-capacitor | .agents/skills/framework-to-capacitor/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\framework-to-capacitor\SKILL.md | Integrate web frameworks with Capacitor — Next.js, React, Vue, Angular, Svelte |
| 38 | ionic-appflow-migration | .agents/skills/ionic-appflow-migration/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\ionic-appflow-migration\SKILL.md | Migrate from Ionic Appflow to Capgo — replace live updates, cloud builds, store deployment |
| 39 | ionic-design | .agents/skills/ionic-design/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\ionic-design\SKILL.md | Ionic Framework components — component usage, theming, platform-specific styling, mobile UI |
| 40 | ionic-enterprise-sdk-migration | .agents/skills/ionic-enterprise-sdk-migration/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\ionic-enterprise-sdk-migration\SKILL.md | Migrate from Ionic Enterprise SDK plugins to Capgo/Capacitor alternatives |
| 41 | ios-android-logs | .agents/skills/ios-android-logs/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\ios-android-logs\SKILL.md | Access device logs on iOS and Android — CLI tools, GUI apps, filtering, real-time streaming |
| 42 | konsta-ui | .agents/skills/konsta-ui/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\konsta-ui\SKILL.md | Konsta UI for native-looking iOS/Material Design components — React, Vue, Svelte |
| 43 | safe-area-handling | .agents/skills/safe-area-handling/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\safe-area-handling\SKILL.md | Safe area handling — iPhone notch, Dynamic Island, home indicator, Android cutouts |
| 44 | skill-creator | .agents/skills/skill-creator/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\skill-creator\SKILL.md | Author and validate agent skills — metadata, references, packaging, eval preparation |
| 45 | sqlite-to-fast-sql | .agents/skills/sqlite-to-fast-sql/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\sqlite-to-fast-sql\SKILL.md | Migrate SQLite/Capacitor SQL plugins to @capgo/capacitor-fast-sql — encryption, transactions |
| 46 | subscription-app-revenue | .agents/skills/subscription-app-revenue/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\subscription-app-revenue\SKILL.md | Revenue playbook for subscription apps — $1K MRR, monetization, ASO, growth loops, pricing |
| 47 | tailwind-capacitor | .agents/skills/tailwind-capacitor/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\tailwind-capacitor\SKILL.md | Tailwind CSS in Capacitor apps — mobile-first design, touch targets, safe areas, dark mode, performance |
| 48 | webapp-to-capacitor | .agents/skills/webapp-to-capacitor/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\webapp-to-capacitor\SKILL.md | Migrate web app/PWA/SPA to store-ready Capacitor iOS/Android app |

---
## `.claude/skills/`
Higher-order skills for design intelligence, testing, meta-skill creation, and coding discipline.

| # | Skill | Relative Project Path | Absolute Workspace Path | Niche / Instructions |
| :--- | :--- | :--- | :--- | :--- |
| 1 | awesome-claude-skills | .claude/skills/awesome-claude-skills/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.claude\skills\awesome-claude-skills\SKILL.md | Collection of 30+ sub-skills — artifacts-builder, brand-guidelines, canvas-design, changelog-generator, webapp-testing, and more |
| 2 | Karpathy | .claude/skills/Karpathy/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.claude\skills\Karpathy\SKILL.md | Coding discipline — think before coding, simplicity first, surgical changes only, goal-driven execution with verifiable success criteria |
| 3 | skill-creator | .claude/skills/skill-creator/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.claude\skills\skill-creator\SKILL.md | Meta-skill — SKILL.md structure, bundled resources (scripts/references/assets), packaging & validation |
| 4 | ui-ux-pro-max | .claude/skills/ui-ux-pro-max/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.claude\skills\ui-ux-pro-max\SKILL.md | UI/UX design intelligence — 67 styles, 96 color palettes, 57 font pairings, 25 chart types, searchable design system generator |
| 5 | webapp-testing | .claude/skills/webapp-testing/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.claude\skills\webapp-testing\SKILL.md | Web app testing with Playwright — browser automation, screenshot capture, server lifecycle management, element discovery |
| 6 | using-superpowers | .claude/skills/using-superpowers/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.claude\skills\using-superpowers\SKILL.md | Meta-skill: establishes how to find and use skills — requires Skill tool invocation before ANY response; skill priority, red flags |
| 7 | gitnexus | .claude/skills/gitnexus/ | C:\Users\DELL\Desktop\bigdrops-app\.claude\skills\gitnexus\ | 6-sub-skill collection — codebase impact analysis, debugging, refactoring, exploring. Entry: `docs/contracts/gitnexus-operations.md` |

---
## `.mimocode/skills/`
Specialized agent skills for targeted debugging workflows.

| # | Skill | Relative Project Path | Absolute Workspace Path | Niche / Instructions |
| :--- | :--- | :--- | :--- | :--- |
| 1 | waybill-template-debug | .mimocode/skills/waybill-template-debug/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.mimocode\skills\waybill-template-debug\SKILL.md | Debug waybill PDF template rendering issues — validates template structure, tests edge cases, ensures correctness |

---
## `.opencode/agents/`
232 upstream agency-agents personas installed for use as OpenCode subagents. Organized into 18 divisions:

| Division | Example Agents | Count |
| :--- | :--- | :--- |
| academic | anthropologist, geographer, historian, narratologist, psychologist | 5 |
| design | brand-guardian, ui-designer, ux-architect, ux-researcher, visual-storyteller | 7 |
| engineering | backend-architect, frontend-developer, devops-automator, code-reviewer | 8 |
| examples | codebase-onboarding-engineer, document-generator, report-distribution-agent | 3 |
| finance | account-strategist, bookkeeper-controller, cfo, financial-analyst, tax-strategist | 12 |
| game-development | 3d-scene-developer, game-designer, godot-\*, roblox-\*, unity-\*, unreal-\* | 23 |
| gis | geographer, gis-analyst, cartography-designer, spatial-data-engineer, web-gis-developer | 12 |
| marketing | seo-specialist, social-media-strategist, content-creator, email-marketing, tiktok-\* | 19 |
| paid-media | ad-creative-strategist, ppc-campaign-strategist, programmatic-display-buyer | 6 |
| product | product-manager, sprint-prioritizer, proposal-strategist, discovery-coach | 7 |
| project-management | project-shepherd, jira-workflow-steward, senior-project-manager | 4 |
| sales | deal-strategist, sales-engineer, sales-coach, outbound-strategist | 9 |
| security | application-security-engineer, penetration-tester, threat-detection-engineer | 10 |
| spatial-computing | xr-immersive-developer, visionos-spatial-engineer, macos-spatial-engineer | 6 |
| specialized | grant-writer, legal-\*, medical-billing, compliance-auditor, data-privacy-officer | 28 |
| strategy | business-strategist, m-a-integration-manager, change-management-consultant | 4 |
| support | customer-service, support-responder, it-service-manager | 5 |
| testing | api-tester, test-results-analyzer, performance-benchmarker | 5 |

Used by OpenCode's `/agent` command.
---
## `@dietrichgebert/ponytail` Plugin
Installed via `opencode.json` plugin entry. Provides 6 agent skills, 6 commands, and 10 hooks. Perfect for 4GB RAM resource safety by prioritizing minimal impact fixes. Mode toggling: `/ponytail lite|full|ultra|off`.

| # | Skill | Package Path | Niche / Instructions |
| :--- | :--- | :--- | :--- |
| 1 | ponytail | `node_modules/@dietrichgebert/ponytail/skills/ponytail/SKILL.md` | Core lazy senior dev mode — YAGNI ladder, minimum code, root-cause fixes |
| 2 | ponytail-audit | `node_modules/@dietrichgebert/ponytail/skills/ponytail-audit/SKILL.md` | Audit mode — codebase waste, dead code, over-engineering detection |
| 3 | ponytail-debt | `node_modules/@dietrichgebert/ponytail/skills/ponytail-debt/SKILL.md` | Technical debt assessment and prioritization |
| 4 | ponytail-gain | `node_modules/@dietrichgebert/ponytail/skills/ponytail-gain/SKILL.md` | Gain mode — maximum ROI, leverage existing code |
| 5 | ponytail-help | `node_modules/@dietrichgebert/ponytail/skills/ponytail-help/SKILL.md` | Help system for ponytail commands |
| 6 | ponytail-review | `node_modules/@dietrichgebert/ponytail/skills/ponytail-review/SKILL.md` | Code review with ponytail lens — minimal diffs, YAGNI enforcement |

**Commands:** `/ponytail`, `/ponytail-audit`, `/ponytail-debt`, `/ponytail-gain`, `/ponytail-help`, `/ponytail-review`
---
## Quick Reference
```
.
├── .agents/
│   └── skills/
│       ├── accessibility/
│       ├── deploy-to-vercel/
│       ├── frontend-design/
│       ├── pdf-rendering-correctness/
│       ├── react-pdf/
│       ├── redesign-existing-projects/
│       ├── seo/
│       ├── shadcn/
│       ├── supabase-postgres-best-practices/
│       ├── tailwind-css-patterns/
│       ├── tailwind-v4-shadcn/
│       ├── typescript-advanced-types/
│       ├── vercel-composition-patterns/
│       ├── vercel-react-best-practices/
│       └── vite/
├── .claude/
│   └── skills/
│       ├── awesome-claude-skills/   ← ~30 bundled sub-skills
│       ├── Karpathy/                ← LIVE: Thinking discipline engine
│       ├── skill-creator/
│       ├── ui-ux-pro-max/
│       ├── using-superpowers/
│       ├── gitnexus/             ← 6 sub-skills
│       └── webapp-testing/
├── .mimocode/
│   ├── commands/
│   │   └── typecheck.md
│   └── skills/
│       └── waybill-template-debug/
├── .opencode/
│   └── agents/          ← 232 upstream agency-agents (18 divisions)
├── node_modules/
│   └── @dietrichgebert/
│       └── ponytail/    ← Plugin: 6 skills, 6 commands, 10 hooks
```
---
*Last updated: July 4, 2026, 6:03 PM*
```