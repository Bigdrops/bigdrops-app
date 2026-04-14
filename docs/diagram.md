# BigDrops Architecture Diagram

This file uses Mermaid so GitHub can render it directly in a repository README or standalone Markdown file.

```mermaid
flowchart LR
    %% =========================
    %% USERS
    %% =========================
    U1[Web Users]
    U2[Android Users]

    %% =========================
    %% CLIENTS
    %% =========================
    subgraph C["Clients"]
        WEB["React 19 + Vite SPA
        React Router
        Tailwind CSS
        Radix / shadcn-style UI
        TipTap
        PDF UI flows"]

        ANDROID["Capacitor Android App
        Native shell
        Filesystem / Share / File Opener"]
    end

    %% =========================
    %% APP FEATURES
    %% =========================
    subgraph F["Business Features"]
        DASH["Dashboard & Reports"]
        DOCS["Invoices / Quotations / CSRs / Waybills / RFQs / BOQs"]
        OPS["Projects / Clients / Settings / Compliance Hub"]
        DOMAIN["Shared Domain Logic
        totals / transforms / document rules"]
        PDF["PDF & Document Generation
        @react-pdf/renderer
        html-to-image"]
    end

    %% =========================
    %% MOBILE OFFLINE
    %% =========================
    subgraph M["Mobile Offline Layer"]
        SQLITE["Capacitor SQLite
        local offline store"]
        OFFLINE["Offline Access / Device Assignment"]
        SYNC["Sync Modules
        quotations / CSRs / waybills"]
    end

    %% =========================
    %% BACKEND API
    %% =========================
    subgraph A["Backend API"]
        API["ASP.NET Core Minimal API"]
        HANDLER["Transactional Command Handler
        revert invoice to quotation"]
        DBACCESS["Npgsql data access"]
        APIVAL["Supabase token validation"]
    end

    %% =========================
    %% SUPABASE CLOUD
    %% =========================
    subgraph S["Supabase Cloud"]
        AUTH["Supabase Auth"]
        DB["Supabase PostgreSQL
        app tables + reporting views"]
        STORAGE["Supabase Storage"]
    end

    %% =========================
    %% DEPLOYMENT
    %% =========================
    HOST["Vercel
    SPA hosting / route rewrites"]

    %% =========================
    %% USER FLOWS
    %% =========================
    U1 --> WEB
    U2 --> ANDROID

    %% =========================
    %% CLIENT TO FEATURES
    %% =========================
    WEB --> DASH
    WEB --> DOCS
    WEB --> OPS
    DOCS --> DOMAIN
    OPS --> DOMAIN
    DOMAIN --> PDF

    ANDROID --> DOCS
    ANDROID --> OPS
    ANDROID --> SQLITE
    ANDROID --> OFFLINE
    OFFLINE --> SYNC
    SQLITE --> SYNC

    %% =========================
    %% FRONTEND TO CLOUD
    %% =========================
    WEB --> AUTH
    WEB --> DB
    WEB --> STORAGE

    %% =========================
    %% MOBILE TO CLOUD
    %% =========================
    SYNC --> DB
    SYNC --> STORAGE
    ANDROID --> AUTH

    %% =========================
    %% BACKEND CONNECTIONS
    %% =========================
    WEB --> API
    API --> HANDLER
    API --> APIVAL
    API --> DBACCESS
    APIVAL --> AUTH
    DBACCESS --> DB

    %% =========================
    %% EXPORT FLOWS
    %% =========================
    PDF --> WEB
    PDF --> ANDROID

    %% =========================
    %% HOSTING
    %% =========================
    HOST --> WEB

    %% =========================
    %% STYLES
    %% =========================
    classDef users fill:#dbeafe,stroke:#1d4ed8,stroke-width:2px,color:#111827;
    classDef clients fill:#e0f2fe,stroke:#0284c7,stroke-width:2px,color:#111827;
    classDef features fill:#ede9fe,stroke:#7c3aed,stroke-width:2px,color:#111827;
    classDef mobile fill:#dcfce7,stroke:#16a34a,stroke-width:2px,color:#111827;
    classDef backend fill:#fee2e2,stroke:#dc2626,stroke-width:2px,color:#111827;
    classDef supabase fill:#fae8ff,stroke:#c026d3,stroke-width:2px,color:#111827;
    classDef infra fill:#fef3c7,stroke:#d97706,stroke-width:2px,color:#111827;

    class U1,U2 users;
    class WEB,ANDROID clients;
    class DASH,DOCS,OPS,DOMAIN,PDF features;
    class SQLITE,OFFLINE,SYNC mobile;
    class API,HANDLER,DBACCESS,APIVAL backend;
    class AUTH,DB,STORAGE supabase;
    class HOST infra;
```

## Notes
- Main platform shape: React/Vite frontend + Capacitor Android app + Supabase backend + small ASP.NET Core API.
- The frontend talks mostly directly to Supabase for auth, database access, and storage.
- The Android app adds offline SQLite storage and sync modules.
- The .NET API handles selected transactional server-side operations.
