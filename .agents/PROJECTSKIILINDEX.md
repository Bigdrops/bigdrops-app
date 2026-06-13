# Claude Skills Directory

> A curated library of reusable Claude skills for the BIGDROPS project — organized by location, niche, and purpose.

---

## Overview

| Location | Count | Purpose |
|---|---|---|
| `.agents/skills/` | 14 skills | General-purpose dev, UI, and infra skills |
| `.claude/skills/` | 6 skills | Meta, design, testing, discipline, and skill-discovery skills |
| **Total** | **20 top-level** | *(+ ~30 bundled inside `awesome-claude-skills`)* |

---

## `.agents/skills/`

General engineering and frontend skills used by Claude agents during development tasks.

| # | Skill | Niche |
|---|---|---|
| 1 | `accessibility` | WCAG 2.2 compliance, a11y audits, screen reader support, keyboard navigation, color contrast, ARIA patterns |
| 2 | `deploy-to-vercel` | Deploying apps to Vercel — CLI auth, git push deploys, preview URLs, team selection, no-auth fallbacks |
| 3 | `frontend-design` | Distinctive, production-grade UI — anti-"AI slop" aesthetics, creative typography, color, motion, spatial composition |
| 4 | `impeccable` | UI/UX design intelligence — 67 styles, 96 color palettes, 57 font pairings, 25 chart types, 13 tech stacks, searchable design system generator with Python CLI |
| 5 | `pdf-rendering-correctness` | Invoice PDF pipeline — parent invoice as single source of truth, prevents data mutation in render layers, advance invoice rules |
| 6 | `seo` | Technical SEO — meta tags, structured data (JSON-LD), sitemaps, URL structure, mobile SEO, hreflang |
| 7 | `shadcn` | shadcn/ui — CLI usage, component composition, form patterns, icon handling, styling rules, registry management |
| 8 | `supabase-postgres-best-practices` | Postgres performance — indexing, connection pooling, RLS, schema design, locking, monitoring, query optimization |
| 9 | `tailwind-css-patterns` | Tailwind CSS utility-first styling — responsive design, flexbox/grid, dark mode, component extraction, performance, a11y |
| 10 | `tailwind-v4-shadcn` | Tailwind v4 + shadcn/ui — `@theme inline`, CSS variable architecture, dark mode with ThemeProvider, plugin directives, migration from v3 |
| 11 | `typescript-advanced-types` | Advanced TypeScript — generics, conditional types, mapped types, template literals, type-safe patterns |
| 12 | `vercel-composition-patterns` | React composition — compound components, avoiding boolean prop proliferation, context providers, React 19 APIs |
| 13 | `vercel-react-best-practices` | React/Next.js performance — eliminating waterfalls, bundle optimization, server-side perf, re-render optimization (70 rules, 8 categories) |
| 14 | `vite` | Vite build tool — config, plugin API, SSR, library mode, Vite 8 Rolldown migration, Environment API |

---

## `.claude/skills/`

Higher-order skills for design intelligence, testing, meta-skill creation, and coding discipline.

| # | Skill | Niche |
|---|---|---|
| 1 | `awesome-claude-skills` | Collection of 30+ sub-skills — artifacts-builder, brand-guidelines, canvas-design, changelog-generator, content-research-writer, domain-name-brainstormer, file-organizer, image-enhancer, invoice-organizer, lead-research-assistant, mcp-builder, meeting-insights-analyzer, skill-creator, slack-gif-creator, tailored-resume-generator, theme-factory, twitter-algorithm-optimizer, video-downloader, webapp-testing, and more |
| 2 | `Karpathy` | Coding discipline — think before coding, simplicity first, surgical changes only, goal-driven execution with verifiable success criteria |
| 3 | `skill-creator` | Meta-skill — SKILL.md structure, bundled resources (scripts/references/assets), progressive disclosure, packaging & validation |
| 4 | `ui-ux-pro-max` | UI/UX design intelligence — 67 styles, 96 color palettes, 57 font pairings, 25 chart types, 13 tech stacks, searchable design system generator with Python CLI |
| 5 | `webapp-testing` | Web app testing with Playwright — browser automation, screenshot capture, server lifecycle management, element discovery, console logging |
| 6 | `using-superpowers` | Meta-skill: establishes how to find and use skills — requires Skill tool invocation before ANY response; skill priority, red flags, instruction hierarchy |

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
│       ├── seo/
│       ├── shadcn/
│       ├── supabase-postgres-best-practices/
│       ├── tailwind-css-patterns/
│       ├── tailwind-v4-shadcn/
│       ├── typescript-advanced-types/
│       ├── vercel-composition-patterns/
│       ├── vercel-react-best-practices/
│       └── vite/
└── .claude/
    └── skills/
        ├── awesome-claude-skills/   ← ~30 bundled sub-skills
        ├── Karpathy/
        ├── skill-creator/
        ├── ui-ux-pro-max/
        ├── using-superpowers/
        └── webapp-testing/
```

---

*Last updated: May 2026*
