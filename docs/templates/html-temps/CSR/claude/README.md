# Command CSR — Forme version

Install (any shadcn-style project with the `@/*` alias):
    npm i @formepdf/react @formepdf/core react
Files:
    components/command-csr-report.tsx   -> components/pdf/command-csr-report.tsx
    lib/csr-assets.ts                   -> lib/csr-assets.ts   (PLACEHOLDER logo + signature, replace)
Render:
    const { pdf } = await renderDocumentWithLayout(<CommandCsrReport data={data} />)
Replace `logo` / `serviceEngineer.signature` with `{ viewBox, content }` where `content` is the SVG
inner markup. Convert arcs/relative commands to absolute M/L/C/Z first (Forme's SVG renderer
draws those exactly; unnormalised paths rendered as blobs in testing).
