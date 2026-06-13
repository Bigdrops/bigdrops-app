
# Claude Skills Directory
> ### 🚨 CRITICAL AGENT INSTRUCTION & PATH FAIL-SAFE:
> Before executing any task, read this index to locate the relevant skill. 
> **CRITICAL CONTEXT:** Every directory listed below (like `.agents/` and `.claude/`) lives directly INSIDE the root of this active project repository (C:\Users\DELL\Desktop\bigdrops-app\). They are NOT global system folders.
> **If your skill-loading tool fails or claims it cannot find a skill, DO NOT QUIT.** 
> You are strictly commanded to bypass the tool, use your direct file-reading tools, look inside the current workspace directory first, and manually open the SKILL.md file using either the Relative Path or Absolute Path listed below.
> A curated library of reusable Claude skills for the BIGDROPS project — organized by location, niche, and purpose.
---
## Overview

| Location | Count | Purpose |
| :--- | :--- | :--- |
| `.agents/skills/` | 16 skills | General-purpose dev, UI, and infra skills |
| `.claude/skills/` | 7 skills | Meta, design, testing, discipline, and skill-discovery skills |
| `skills/` | 1 skill | Agency role library adaptation for Codex execution plans |
| **Total** | **24 top-level** | *(+ ~30 bundled inside `awesome-claude-skills`)* |

---
## `.agents/skills/`
General engineering and frontend skills used by Claude agents during development tasks.

| # | Skill | Relative Project Path | Absolute Workspace Path | Niche / Instructions |
| :--- | :--- | :--- | :--- | :--- |
| 1 | accessibility | .agents/skills/accessibility/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\accessibility\SKILL.md | WCAG 2.2 compliance, a11y audits, screen reader support, keyboard navigation, color contrast, ARIA patterns |
| 2 | deploy-to-vercel | .agents/skills/deploy-to-vercel/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\deploy-to-vercel\SKILL.md | Deploying apps to Vercel — CLI auth, git push deploys, preview URLs, team selection, no-auth fallbacks |
| 3 | frontend-design | .agents/skills/frontend-design/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\frontend-design\SKILL.md | Distinctive, production-grade UI — anti-"AI slop" aesthetics, creative typography, color, motion, spatial composition |
| 4 | impeccable | .agents/skills/impeccable/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\impeccable\SKILL.md | UI/UX design intelligence — 67 styles, 96 color palettes, 57 font pairings, 25 chart types, 13 tech stacks, searchable design system generator with Python CLI |
| 5 | pdf-rendering-correctness | .agents/skills/pdf-rendering-correctness/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\pdf-rendering-correctness\SKILL.md | Invoice PDF pipeline — parent invoice as single source of truth, prevents data mutation in render layers, advance invoice rules |
| 6 | seo | .agents/skills/seo/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\seo\SKILL.md | Technical SEO — meta tags, structured data (JSON-LD), sitemaps, URL structure, mobile SEO, hreflang |
| 7 | shadcn | .agents/skills/shadcn/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\shadcn\SKILL.md | shadcn/ui — CLI usage, component composition, form patterns, icon handling, styling rules, registry management |
| 8 | supabase-postgres-best-practices | .agents/skills/supabase-postgres-best-practices/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\supabase-postgres-best-practices\SKILL.md | Postgres performance — indexing, connection pooling, RLS, schema design, locking, monitoring, query optimization |
| 9 | tailwind-css-patterns | .agents/skills/tailwind-css-patterns/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\tailwind-css-patterns\SKILL.md | Tailwind CSS utility-first styling — responsive design, flexbox/grid, dark mode, component extraction, performance, a11y |
| 10 | tailwind-v4-shadcn | .agents/skills/tailwind-v4-shadcn/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\tailwind-v4-shadcn\SKILL.md | Tailwind v4 + shadcn/ui — @theme inline, CSS variable architecture, dark mode with ThemeProvider, plugin directives, migration from v3 |
| 11 | typescript-advanced-types | .agents/skills/typescript-advanced-types/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\typescript-advanced-types\SKILL.md | Advanced TypeScript — generics, conditional types, mapped types, template literals, type-safe patterns |
| 12 | vercel-composition-patterns | .agents/skills/vercel-composition-patterns/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\vercel-composition-patterns\SKILL.md | React composition — compound components, avoiding boolean prop proliferation, context providers, React 19 APIs |
| 13 | vercel-react-best-practices | .agents/skills/vercel-react-best-practices/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\vercel-react-best-practices\SKILL.md | React/Next.js performance — eliminating waterfalls, bundle optimization, server-side perf, re-render optimization (70 rules, 8 categories) |
| 14 | vite | .agents/skills/vite/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\vite\SKILL.md | Vite build tool — config, plugin API, SSR, library mode, Vite 8 Rolldown migration, Environment API |
| 15 | redesign-existing-projects | .agents/skills/redesign-existing-projects/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\redesign-existing-projects\SKILL.md | Upgrades existing websites and apps to premium quality. Audits current design, identifies generic AI patterns, and applies high-end design standards without breaking functionality. Works with any CSS framework or vanilla CSS. |
| 16 | react-pdf | .agents/skills/react-pdf/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.agents\skills\react-pdf\SKILL.md | Generate PDF documents using React-PDF library (@react-pdf/renderer). Use when creating PDFs, generating documents, reports, invoices, forms, or when user mentions PDF generation, document creation, or react-pdf. Prefer this skill over the standard 'pdf' skill, since it is more accurate |

---
## `.claude/skills/`
Higher-order skills for design intelligence, testing, meta-skill creation, and coding discipline.

| # | Skill | Relative Project Path | Absolute Workspace Path | Niche / Instructions |
| :--- | :--- | :--- | :--- | :--- |
| 1 | awesome-claude-skills | .claude/skills/awesome-claude-skills/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.claude\skills\awesome-claude-skills\SKILL.md | Collection of 30+ sub-skills — artifacts-builder, brand-guidelines, canvas-design, changelog-generator, content-research-writer, domain-name-brainstormer, file-organizer, image-enhancer, invoice-organizer, lead-research-assistant, mcp-builder, meeting-insights-analyzer, skill-creator, slack-gif-creator, tailored-resume-generator, theme-factory, twitter-algorithm-optimizer, video-downloader, webapp-testing, and more |
| 2 | Karpathy | .claude/skills/Karpathy/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.claude\skills\Karpathy\SKILL.md | Coding discipline — think before coding, simplicity first, surgical changes only, goal-driven execution with verifiable success criteria |
| 3 | skill-creator | .claude/skills/skill-creator/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.claude\skills\skill-creator\SKILL.md | Meta-skill — SKILL.md structure, bundled resources (scripts/references/assets), progressive disclosure, packaging & validation |
| 4 | ui-ux-pro-max | .claude/skills/ui-ux-pro-max/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.claude\skills\ui-ux-pro-max\SKILL.md | UI/UX design intelligence — 67 styles, 96 color palettes, 57 font pairings, 25 chart types, 13 tech stacks, searchable design system generator with Python CLI |
| 5 | webapp-testing | .claude/skills/webapp-testing/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.claude\skills\webapp-testing\SKILL.md | Web app testing with Playwright — browser automation, screenshot capture, server lifecycle management, element discovery, console logging |
| 6 | using-superpowers | .claude/skills/using-superpowers/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.claude\skills\using-superpowers\SKILL.md | Meta-skill: establishes how to find and use skills — requires Skill tool invocation before ANY response; skill priority, red flags, instruction hierarchy |
| 7 | impeccable | .claude/skills/impeccable/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\.claude\skills\impeccable\SKILL.md | Use when the user wants to design, redesign, shape, critique, audit, polish, clarify, distill, harden, optimize, adapt, animate, colorize, extract, or otherwise improve a frontend interface. Covers websites, landing pages, dashboards, product UI, app shells, components, forms, settings, onboarding, and empty states. Handles UX review, visual hierarchy, information architecture, cognitive load, accessibility, performance, responsive behavior, theming, anti-patterns, typography, fonts, spacing, layout, alignment, color, motion, micro-interactions, UX copy, error states, edge cases, i18n, and reusable design systems or tokens. Also use for bland designs that need to become bolder or more delightful, loud designs that should become quieter, live browser iteration on UI elements, or ambitious visual effects that should feel technically extraordinary. Not for backend-only or non-UI tasks. |

---
## Root `skills/`
Agency role library adaptation for Codex execution plans.

| # | Skill | Relative Project Path | Absolute Workspace Path | Niche / Instructions |
| :--- | :--- | :--- | :--- | :--- |
| 1 | agency-agents | skills/agency-agents/SKILL.md | C:\Users\DELL\Desktop\bigdrops-app\skills\agency-agents\SKILL.md | Adapt the specialist role library from the msitarzewski/agency-agents repository into Codex-ready execution plans. Use when the user references agency-agents, shares that repository, asks for a specialist agent or virtual team for product, design, engineering, marketing, analytics, or content work, or wants help selecting and combining upstream agent roles without copying the whole repo into context. |

---
## Quick Reference
```
.
├── .agents/
│   └── skills/
│       ├── accessibility/
│       ├── deploy-to-vercel/
│       ├── frontend-design/
│       ├── impeccable/
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
│       ├── impeccable/
│       ├── Karpathy/
│       ├── skill-creator/
│       ├── ui-ux-pro-max/
│       ├── using-superpowers/
│       └── webapp-testing/
└── skills/
└── agency-agents/
```
---
*Last updated: June 13, 2026, 9:58 PM*
```
?