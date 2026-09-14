/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  /** Git remote URL, injected at build time; drives GitHub release discovery. */
  readonly VITE_GIT_REPO: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
