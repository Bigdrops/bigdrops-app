# BIGDROPS

**B2B business management suite for Nigerian SMEs — invoicing, quotations, waybills, CSRs, payments, and project tracking.**

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?logo=tailwindcss)](https://tailwindcss.com)
[![Supabase](https://img.shields.io/badge/Supabase-2.x-3FCF8E?logo=supabase)](https://supabase.com)
[![Vite](https://img.shields.io/badge/Vite-7.x-646CFF?logo=vite)](https://vitejs.dev)
[![Bun](https://img.shields.io/badge/Bun-1.x-000?logo=bun)](https://bun.sh)
[![Vercel](https://img.shields.io/badge/Vercel-Deployed-000?logo=vercel)](https://vercel.com)
[![Capacitor](https://img.shields.io/badge/Capacitor-8.x-119EFF?logo=capacitor)](https://capacitorjs.com)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

---

## What is BIGDROPS

BIGDROPS is a full-stack B2B business management platform built for Nigerian SMEs. It replaces paper-based operations with digital workflows across invoicing, quotations, customer service reports (CSR), waybills (external and internal), payments, and project tracking. The platform runs as a Progressive Web App with native Android deployment via Capacitor, backed by Supabase for real-time data, auth, and storage.

## Core Modules

| Module | Description |
|---|---|
| **Invoices** | Create, edit, view, and manage invoices with JSONB line items, tax, extra charges, and PDF generation |
| **Quotations** | Quote generation reusing the invoice domain layer — consistent pricing, items, and PDF output |
| **CSR** | Customer Service Reports — service date tracking, problem/service logs, technician remarks, and PDF export |
| **Waybills** | External (client delivery notes) and internal (transfer notes) with prefix engine, dual-action custody sign-off, and field-masked PDFs |
| **Payments** | Payment recording against invoices with amount, method, date, and automatic outstanding balance computation |
| **Projects** | Project-centric aggregation of invoices, payments, quotations, and CSRs under a single client engagement |
| **Client Management** | Full client lifecycle — add, edit, view, and link to projects and documents |

## Tech Stack

| Category | Technology |
|---|---|
| Frontend | React 19 with TypeScript |
| Styling | Tailwind CSS 3.4 + Radix UI primitives |
| Database | Supabase (Postgres) with JSONB validation constraints |
| Auth | Supabase Auth (Row Level Security) |
| Storage | Supabase Storage |
| Build Tool | Vite 7 |
| Runtime | Bun |
| Deployment | Vercel |
| Mobile | Capacitor 8 (Android APK) |

## Project Structure

```
src/
├── app/              App bootstrap and sync
├── auth/             Auth session management
├── components/       Shared UI, document components, module-specific components
├── config/           Module adapters, filter capabilities
├── context/          React contexts (DocumentQueryContext)
├── domain/           Domain logic per module (invoice, quotation, waybill, csr, boq, rfq, audit)
├── hooks/            Custom React hooks (invoice, dashboard, notifications, layout)
├── lib/              Calculations.ts (single source of truth), fonts, icons, PDF, themes
├── modules/          Module-specific logic (invoices, quotations, compliance, item-library)
├── pages/            Route-level page components (NewInvoice, ViewWaybill, Projects, etc.)
├── services/         External service integrations
├── styles/           Global CSS
├── supabase/         Supabase client config
├── tests/            Critical path tests
└── types/            Shared type definitions
```

## Getting Started

```bash
# Clone
git clone https://github.com/Bigdrops/bigdrops-app.git

# Install
bun install

# Dev server
bun run dev

# Build
bun run build
```

**Note:** Bun is the only supported package manager. Never use npm or yarn.

## Scripts

| Script | Command | Description |
|---|---|---|
| dev | `bun run dev` | Start Vite dev server |
| build | `bun run build` | Production build |
| typecheck | `bun run typecheck` | TypeScript type checking |
| lint | `bun run lint` | ESLint across the project |
| test | `bun run test` | Run critical path Node tests |
| preview | `bun run preview` | Preview production build |
| audit:load | `bun run audit:load` | Check load risk on queries |
| audit:supabase-queries | `bun run audit:supabase-queries` | Audit Supabase query patterns |

## Architecture Highlights

- **Single source of truth for calculations** — `src/lib/Calculations.ts` owns all pricing, tax, and total computations. No duplicate logic anywhere.
- **Field masking rules** — Waybill PDFs render blank pen-and-ink lines for empty fields, while the on-screen view hides them. Inline eye toggles let operators hide fields from PDF without deleting data.
- **Waybill prefix engine** — Dynamic number generation (`AWB-E-000001`, `AWB-ME-000001`) with a permanent blank token audit log that prevents number reuse.
- **JSONB validation** — Postgres CHECK constraints enforce structural integrity on `items` arrays (non-empty, description + qty required, qty > 0) at the database level.
- **Invoice-to-waybill spawning** — Transform pipeline extracts item descriptions, quantities, and units from invoices, strips monetary values, and binds the new waybill to the parent document.

## Contributing / Agent Workflow

This repository is designed for AI-assisted development. All coding agents must read `AGENTS.md` at the project root before modifying any file, and must consult the relevant skill files in `.agents/skills/` before writing code. The skill registry at `.agents/PROJECTSKIILINDEX.md` catalogs all available skills.
