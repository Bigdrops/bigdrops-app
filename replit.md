# BigDrops ERP

A job-centric business management web application for organizing projects, documents (quotations, invoices, customer service reports), and financial records.

## Stack

- **Frontend:** React 19 + Vite 7
- **Styling:** Tailwind CSS + Shadcn/UI + Radix UI
- **Backend/Auth/DB:** Supabase (PostgreSQL)
- **PDF Generation:** @react-pdf/renderer
- **Rich Text:** Tiptap
- **Icons:** Hugeicons + Lucide React
- **Package Manager:** npm

## Project Structure

- `src/` — Main source code
  - `components/` — Reusable UI components (including `ui/`, `invoice/`, `quotation/`, `csr/`, `pdf/`)
  - `domain/` — Core business logic in TypeScript (calculations, types, normalization)
  - `pages/` — Top-level route components
  - `hooks/` — Custom React hooks
  - `lib/` — Utility functions
  - `App.jsx` — Main routing and auth shell
  - `supabase.js` — Supabase client initialization
- `sql/` — SQL migration scripts
- `docs/` — Technical specs and product documentation
- `public/` — Static assets

## Environment Variables (Secrets)

- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anon/public API key

## Development

```bash
npm install
npm run dev
```

Runs on port 5000 at `0.0.0.0`.

## Deployment

Configured as a static site deployment. Build output goes to `dist/`.

```bash
npm run build
```
