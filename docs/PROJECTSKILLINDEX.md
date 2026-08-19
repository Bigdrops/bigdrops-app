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
| `.agents/skills/` | 96 skills | General-purpose dev, UI, infra, and Capacitor skills (50 base + 41 from `softaworks/agent-toolkit` + 1 from `skills.sh/ceorkm/mobile-app-ui-design` + 1 from `appllama/appllama-skills` + 3 from `dpearson2699/swift-ios-skills`) |
| `.claude/skills/` | 7 skills | Meta, design, testing, discipline, and skill-discovery skills |
| `node_modules/@dietrichgebert/ponytail/` | 6 skills + 6 commands + 10 hooks | Ponytail lazy senior dev mode plugin (RAM Safe) |
| **Total** | **109 skills** | *(+ ~30 bundled inside `awesome-claude-skills` + 232 subagents in `docs/SUBAGENTS.md`)* |

> **Note:** 4 new skills (`appllama-app-design-skill`, `swift-api-design-guidelines`, `swiftui-animation`, `swiftui-gestures`) exist in both `.agents/skills/` and `.claude/skills/` (mirrored install) and in `.commandcode/skills/` (purged duplicate — not indexed because they already exist in `.agents`/`.claude`).

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
| 47 | supabase | .agents/skills/supabase/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\supabase\SKILL.md | Supabase platform — Database, Auth, Edge Functions, Realtime, Storage, Vectors, migrations, RLS |
| 48 | tailwind-capacitor | .agents/skills/tailwind-capacitor/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\tailwind-capacitor\SKILL.md | Tailwind CSS in Capacitor apps — mobile-first design, touch targets, safe areas, dark mode, performance |
| 49 | webapp-to-capacitor | .agents/skills/webapp-to-capacitor/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\webapp-to-capacitor\SKILL.md | Migrate web app/PWA/SPA to store-ready Capacitor iOS/Android app |
| 50 | valyu-best-practices | .agents/skills/valyu-best-practices/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\valyu-best-practices\SKILL.md | Complete Valyu API toolkit — real-time search, content extraction, AI-powered answers with citations |

### Added via `softaworks/agent-toolkit`
41 net-new skills installed from the toolkit. Duplicates already present elsewhere were skipped: `humanizer` (global `~/.agents/skills/`) and `domain-name-brainstormer` (`.claude/skills/awesome-claude-skills/`).

| # | Skill | Relative Project Path | Absolute Workspace Path | Niche / Instructions |
| :--- | :--- | :--- | :--- | :--- |
| 51 | agent-md-refactor | .agents/skills/agent-md-refactor/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\agent-md-refactor\SKILL.md | Refactor bloated AGENTS.md/CLAUDE.md instruction files via progressive disclosure — split monoliths into organized, linked docs |
| 52 | backend-to-frontend-handoff-docs | .agents/skills/backend-to-frontend-handoff-docs/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\backend-to-frontend-handoff-docs\SKILL.md | Create API handoff documentation for frontend integration when backend work is complete |
| 53 | c4-architecture | .agents/skills/c4-architecture/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\c4-architecture\SKILL.md | Generate C4-model architecture docs as Mermaid diagrams — context, container, component, deployment |
| 54 | codex | .agents/skills/codex/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\codex\SKILL.md | Run OpenAI Codex CLI (codex exec/resume) for code analysis, refactoring, automated editing (GPT-5.2 default) |
| 55 | command-creator | .agents/skills/command-creator/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\command-creator\SKILL.md | Create optimized Claude Code slash commands with proper structure and best practices |
| 56 | commit-work | .agents/skills/commit-work/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\commit-work\SKILL.md | Create high-quality git commits — stage intended changes, split into logical commits, Conventional Commits messages |
| 57 | crafting-effective-readmes | .agents/skills/crafting-effective-readmes/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\crafting-effective-readmes\SKILL.md | Write/improve README files with templates matched to audience and project type |
| 58 | daily-meeting-update | .agents/skills/daily-meeting-update/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\daily-meeting-update\SKILL.md | Interactive daily standup generator — pulls GitHub/Jira/session activity, 4-question interview, Markdown update |
| 59 | database-schema-designer | .agents/skills/database-schema-designer/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\database-schema-designer\SKILL.md | Design scalable SQL/NoSQL schemas — normalization, indexing, migrations, constraints, performance |
| 60 | datadog-cli | .agents/skills/datadog-cli/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\datadog-cli\SKILL.md | Datadog CLI — search logs, query metrics, trace requests, manage dashboards for production debugging |
| 61 | dependency-updater | .agents/skills/dependency-updater/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\dependency-updater\SKILL.md | Smart dependency management — auto-detect project type, safe updates, major-version prompts, fix issues |
| 62 | design-system-starter | .agents/skills/design-system-starter/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\design-system-starter\SKILL.md | Create/evolve design systems — tokens, component architecture, a11y guidelines, documentation |
| 63 | difficult-workplace-conversations | .agents/skills/difficult-workplace-conversations/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\difficult-workplace-conversations\SKILL.md | Structured approach to workplace conflicts and critical feedback — preparation-delivery-followup |
| 64 | draw-io | .agents/skills/draw-io/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\draw-io\SKILL.md | draw.io diagram creation/editing — .drawio XML, PNG conversion, layout, AWS icons |
| 65 | excalidraw | .agents/skills/excalidraw/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\excalidraw\SKILL.md | Excalidraw diagram/flowchart operations delegated to subagents to avoid context exhaustion from verbose JSON |
| 66 | feedback-mastery | .agents/skills/feedback-mastery/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\feedback-mastery\SKILL.md | Deliver constructive feedback — Preparation-Delivery-Follow-up + Situation-Behavior-Impact (SBI) |
| 67 | frontend-to-backend-requirements | .agents/skills/frontend-to-backend-requirements/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\frontend-to-backend-requirements\SKILL.md | Document frontend data needs / API requirements for backend developers |
| 68 | game-changing-features | .agents/skills/game-changing-features/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\game-changing-features\SKILL.md | Find 10x product opportunities and high-leverage improvements — strategic product thinking |
| 69 | gemini | .agents/skills/gemini/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\gemini\SKILL.md | Run Gemini CLI for code/plan review and big-context (>200k) processing (Gemini 3 Pro default) |
| 70 | gepetto | .agents/skills/gepetto/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\gepetto\SKILL.md | Create sectionized implementation plans via research, interviews, multi-LLM review |
| 71 | jira | .agents/skills/jira/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\jira\SKILL.md | Jira workflow — create/view/update issues, sprint status, backlog (triggers on issue keys like PROJ-123) |
| 72 | lesson-learned | .agents/skills/lesson-learned/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\lesson-learned\SKILL.md | Analyze git history to extract software engineering lessons and principles from recent work |
| 73 | marp-slide | .agents/skills/marp-slide/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\marp-slide\SKILL.md | Create Marp presentation slides — 7 themes, custom layouts, image handling, quality improvements |
| 74 | meme-factory | .agents/skills/meme-factory/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\meme-factory\SKILL.md | Generate memes via memegen.link API — 100+ templates, custom text |
| 75 | mermaid-diagrams | .agents/skills/mermaid-diagrams/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\mermaid-diagrams\SKILL.md | Create software diagrams in Mermaid — class, sequence, flowchart, ERD, C4, state, gantt |
| 76 | mui | .agents/skills/mui/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\mui\SKILL.md | Material-UI v7 patterns — sx prop styling, theme integration, responsive design, MUI hooks |
| 77 | naming-analyzer | .agents/skills/naming-analyzer/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\naming-analyzer\SKILL.md | Suggest better variable/function/class names based on context and conventions |
| 78 | openapi-to-typescript | .agents/skills/openapi-to-typescript/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\openapi-to-typescript\SKILL.md | Convert OpenAPI 3.0 JSON/YAML to TypeScript interfaces and type guards |
| 79 | perplexity | .agents/skills/perplexity/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\perplexity\SKILL.md | Web search/research via Perplexity AI for generic queries (not library docs or workspace questions) |
| 80 | plugin-forge | .agents/skills/plugin-forge/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\plugin-forge\SKILL.md | Create/manage Claude Code plugins — manifests, components, versioning, marketplace integration |
| 81 | professional-communication | .agents/skills/professional-communication/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\professional-communication\SKILL.md | Technical communication — email structure, team messaging, meeting agendas, audience adaptation |
| 82 | qa-test-planner | .agents/skills/qa-test-planner/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\qa-test-planner\SKILL.md | Generate test plans, manual test cases, regression suites, bug reports (Figma MCP integration) |
| 83 | react-dev | .agents/skills/react-dev/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\react-dev\SKILL.md | Build React components with TypeScript — type-safe hooks, events, React 18-19, Server Components, routing |
| 84 | react-useeffect | .agents/skills/react-useeffect/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\react-useeffect\SKILL.md | useEffect best practices — when NOT to use Effect, derived state, data fetching, synchronization |
| 85 | reducing-entropy | .agents/skills/reducing-entropy/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\reducing-entropy\SKILL.md | Manual-only: minimize total codebase size — bias toward deletion (activate only when requested) |
| 86 | requirements-clarity | .agents/skills/requirements-clarity/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\requirements-clarity\SKILL.md | Clarify ambiguous requirements before coding — Why? (YAGNI) and Simpler? (KISS) checks |
| 87 | session-handoff | .agents/skills/session-handoff/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\session-handoff\SKILL.md | Create handoff documents for AI session transfers — solves context exhaustion on long tasks |
| 88 | ship-learn-next | .agents/skills/ship-learn-next/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\ship-learn-next\SKILL.md | Turn learning content (transcripts, articles) into actionable implementation plans |
| 89 | skill-judge | .agents/skills/skill-judge/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\skill-judge\SKILL.md | Evaluate Agent Skill design quality vs. spec — multi-dimensional scoring, improvement suggestions |
| 90 | web-to-markdown | .agents/skills/web-to-markdown/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\web-to-markdown\SKILL.md | Convert webpage URLs to clean Markdown via local web2md CLI (explicit-invocation only) |
| 91 | writing-clearly-and-concisely | .agents/skills/writing-clearly-and-concisely/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\writing-clearly-and-concisely\SKILL.md | Apply Strunk's rules for clearer prose — docs, commits, error messages, UI text |

### Added via `skills.sh/ceorkm/mobile-app-ui-design`
Installed manually by the project lead on 2026-08-18. Mobile-first UI/UX design skill.

| # | Skill | Relative Project Path | Absolute Workspace Path | Niche / Instructions |
| :--- | :--- | :--- | :--- | :--- |
| 92 | mobile-app-ui-design | .agents/skills/mobile-app-ui-design/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\mobile-app-ui-design\SKILL.md | Mobile-first UI/UX — thumb-zone CTAs, F-pattern layout, 8-point grid, 60/30/10 color rule, soft tinted shadows, mobile screens/flows/onboarding |

### Added via `appllama/appllama-skills`
Installed from `appllama/appllama-skills` on 2026-08-19. Native-feeling mobile app screens (Expo / React Native), Apple HIG fidelity.

| # | Skill | Relative Project Path | Absolute Workspace Path | Niche / Instructions |
| :--- | :--- | :--- | :--- | :--- |
| 93 | appllama-app-design-skill | .agents/skills/appllama-app-design-skill/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\appllama-app-design-skill\SKILL.md | Native-feeling Expo/React Native screens — Apple HIG, semantic colors, Reanimated motion, simulator-verified loop |

### Added via `dpearson2699/swift-ios-skills`
Installed from `dpearson2699/swift-ios-skills` on 2026-08-19. Swift 6.3 / iOS 26+ design and SwiftUI skills.

| # | Skill | Relative Project Path | Absolute Workspace Path | Niche / Instructions |
| :--- | :--- | :--- | :--- | :--- |
| 94 | swift-api-design-guidelines | .agents/skills/swift-api-design-guidelines/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\swift-api-design-guidelines\SKILL.md | Swift API Design Guidelines — argument labels, mutating pairs (-ed/-ing), documentation comments, protocol naming (-able/-ible) |
| 95 | swiftui-animation | .agents/skills/swiftui-animation/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\swiftui-animation\SKILL.md | SwiftUI motion — explicit/scoped implicit animations, springs, PhaseAnimator, KeyframeAnimator, matchedGeometry, SF Symbol effects |
| 96 | swiftui-gestures | .agents/skills/swiftui-gestures/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\swiftui-gestures\SKILL.md | SwiftUI gestures — tap/longPress/drag/magnify/rotate, composition (simultaneous/sequenced), @GestureState, custom Gesture protocol |

> **Note:** These 4 skills are mirrored in `.claude/skills/` and `.commandcode/skills/` by the installer. Index lists the canonical `.agents/skills/` copy; `.commandcode` duplicates are purged (not indexed) because the skills already exist in `.agents`/`.claude`.

---
## `.claude/skills/`
Higher-order skills for design intelligence, testing, meta-skill creation, and coding discipline.

| # | Skill | Relative Project Path | Absolute Workspace Path | Niche / Instructions |
| :--- | :--- | :--- | :--- | :--- |
| 1 | awesome-claude-skills | .claude/skills/awesome-claude-skills/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.claude\skills\awesome-claude-skills\SKILL.md | Collection of 30+ sub-skills — artifacts-builder, brand-guidelines, canvas-design, changelog-generator, webapp-testing, and more |
| 2 | karpathy | .claude/skills/karpathy/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.claude\skills\karpathy\SKILL.md | Coding discipline — think before coding, simplicity first, surgical changes only, goal-driven execution with verifiable success criteria |
| 3 | skill-creator | .claude/skills/skill-creator/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.claude\skills\skill-creator\SKILL.md | Meta-skill — SKILL.md structure, bundled resources (scripts/references/assets), packaging & validation |
| 4 | ui-ux-pro-max | .claude/skills/ui-ux-pro-max/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.claude\skills\ui-ux-pro-max\SKILL.md | UI/UX design intelligence — 67 styles, 96 color palettes, 57 font pairings, 25 chart types, searchable design system generator |
| 5 | webapp-testing | .claude/skills/webapp-testing/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.claude\skills\webapp-testing\SKILL.md | Web app testing with Playwright — browser automation, screenshot capture, server lifecycle management, element discovery |
| 6 | using-superpowers | .claude/skills/using-superpowers/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.claude\skills\using-superpowers\SKILL.md | Meta-skill: establishes how to find and use skills — requires Skill tool invocation before ANY response; skill priority, red flags |
| 7 | gitnexus | .claude/skills/gitnexus/ | C:\Users\DELL\Desktop\bigdrops-app\.claude\skills\gitnexus\ | 6-sub-skill collection — codebase impact analysis, debugging, refactoring, exploring. Entry: `docs/contracts/gitnexus-operations.md` |

---
## `.opencode/agents/`
→ **Canonical index: `docs/SUBAGENTS.md`** (232 subagent personas, 18 divisions). This file tracks skills only; subagent routing and delegation rules live in `AGENTS.md` §8.
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
│       ├── mobile-app-ui-design/
│       ├── pdf-rendering-correctness/
│       ├── react-pdf/
│       ├── redesign-existing-projects/
│       ├── seo/
│       ├── shadcn/
│       ├── supabase/
│       ├── supabase-postgres-best-practices/
│       ├── tailwind-css-patterns/
│       ├── tailwind-v4-shadcn/
│       ├── typescript-advanced-types/
│       ├── valyu-best-practices/
│       ├── vercel-composition-patterns/
│       ├── vercel-react-best-practices/
│       └── vite/
├── .claude/
│   └── skills/
│       ├── awesome-claude-skills/   ← ~30 bundled sub-skills
│       ├── karpathy/                 ← LIVE: Thinking discipline engine
│       ├── skill-creator/
│       ├── ui-ux-pro-max/
│       ├── using-superpowers/
│       ├── gitnexus/             ← 6 sub-skills
│       └── webapp-testing/
├── .opencode/
│   └── agents/          ← 232 subagents → canonical index: docs/SUBAGENTS.md
├── node_modules/
│   └── @dietrichgebert/
│       └── ponytail/    ← Plugin: 6 skills, 6 commands, 10 hooks
```
---
*Last updated: August 19, 2026 — purged `.mimocode` (2 skills + 1 command, deleted), added 4 skills (`appllama-app-design-skill` from `appllama/appllama-skills` + 3 from `dpearson2699/swift-ios-skills`), purged `.commandcode` duplicates (not indexed — already in `.agents`/`.claude`)*
```
