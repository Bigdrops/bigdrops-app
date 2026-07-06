$files = @(
    "src/components/document-view/quotation/QuotationHeroMeta.module.css",
    "src/components/document-view/quotation/QuotationMoneyStrip.module.css",
    "src/components/document-view/invoice/InvoicePaymentsSection.module.css",
    "src/components/document-view/invoice/InvoiceMoneyStrip.module.css",
    "src/components/document-view/invoice/InvoiceWorkspace.module.css",
    "src/components/document-view/waybill/WaybillDocumentPreview.module.css",
    "src/components/document-view/waybill/WaybillHeroMeta.module.css",
    "src/components/document-view/waybill/WaybillSummaryStrip.module.css",
    "src/components/document-view/waybill/WaybillViewPage.module.css",
    "src/components/document-view/rfq/RfqDocumentPreview.module.css",
    "src/components/document-view/rfq/RfqHeroMeta.module.css",
    "src/components/document-view/rfq/RfqViewPage.module.css",
    "src/components/document-view/rfq/RfqMoneyStrip.module.css",
    "src/components/document-view/boq/BoqDocumentPreview.module.css",
    "src/components/document-view/boq/BoqHeroMeta.module.css",
    "src/components/document-view/boq/BoqViewPage.module.css",
    "src/components/document-view/boq/BoqSummaryStrip.module.css"
)

$tsxFiles = @(
    "src/components/document-view/waybill/WaybillDocumentPreview.tsx"
)

# All css-file replacements (longest match first to avoid partial overlaps)
$replacements = @(
    @{pattern = 'var\(--dv-primary-border\)'; replacement = 'hsl(var(--bd-fab-bg) / 0.2)'},
    @{pattern = 'var\(--dv-primary-bg\)'; replacement = 'hsl(var(--bd-fab-bg) / 0.1)'},
    @{pattern = 'var\(--dv-primary\)'; replacement = 'hsl(var(--bd-fab-bg))'},
    @{pattern = 'var\(--dv-text-4\)'; replacement = 'hsl(var(--bd-text-muted) / 0.6)'},
    @{pattern = 'var\(--dv-text-3\)'; replacement = 'hsl(var(--bd-text-muted) / 0.8)'},
    @{pattern = 'var\(--dv-text-2\)'; replacement = 'hsl(var(--bd-text-muted))'},
    @{pattern = 'var\(--dv-text\)'; replacement = 'hsl(var(--bd-text))'},
    @{pattern = 'var\(--dv-surface-2\)'; replacement = 'hsl(var(--bd-surface-muted))'},
    @{pattern = 'var\(--dv-surface\)'; replacement = 'hsl(var(--bd-card-bg))'},
    @{pattern = 'var\(--dv-bg-2\)'; replacement = 'hsl(var(--bd-surface-muted))'},
    @{pattern = 'var\(--dv-bg\)'; replacement = 'hsl(var(--bd-surface))'},
    @{pattern = 'var\(--dv-border-soft\)'; replacement = 'hsl(var(--bd-border) / 0.5)'},
    @{pattern = 'var\(--dv-border\)'; replacement = 'hsl(var(--bd-border))'},
    @{pattern = 'var\(--dv-amber\)'; replacement = 'hsl(var(--bd-status-warning-text))'},
    @{pattern = 'var\(--dv-emerald\)'; replacement = 'hsl(var(--bd-status-success-text))'},
    @{pattern = 'var\(--dv-sky\)'; replacement = 'hsl(var(--bd-status-info-text))'},
    @{pattern = 'var\(--dv-red-accent\)'; replacement = 'hsl(var(--bd-status-danger-text))'},
    @{pattern = 'var\(--dv-rose\)'; replacement = 'hsl(var(--bd-status-danger-text))'},
    @{pattern = 'var\(--dv-rose-bg\)'; replacement = 'hsl(var(--bd-status-danger-text) / 0.1)'},
    @{pattern = 'var\(--dv-emerald-bg\)'; replacement = 'hsl(var(--bd-status-success-text) / 0.1)'},
    @{pattern = 'var\(--dv-surface-muted\)'; replacement = 'hsl(var(--bd-surface-muted))'},
    @{pattern = 'var\(--dv-bg-3\)'; replacement = 'hsl(var(--bd-surface-muted) / 0.8)'},
    @{pattern = 'var\(--dv-shadow-sm\)'; replacement = 'var(--bd-shadow-sm)'},
    @{pattern = 'var\(--dv-radius-lg\)'; replacement = 'var(--bd-radius-lg)'}
)

# TSX-specific replacements (inside single-quoted style props)
$tsxReplacements = @(
    @{pattern = "'var\(--dv-text-3\)'"; replacement = "'hsl(var(--bd-text-muted) / 0.8)'"},
    @{pattern = "'var\(--dv-text\)'"; replacement = "'hsl(var(--bd-text))'"}
)

$root = "C:\Users\DELL\Desktop\bigdrops-app"

Write-Output "=== Migrating CSS files ==="
foreach ($file in $files) {
    $path = Join-Path $root $file
    if (-not (Test-Path $path)) { Write-Output "SKIP: $file (not found)"; continue }
    
    $content = Get-Content $path -Raw
    $original = $content
    
    foreach ($r in $replacements) {
        $content = $content -replace $r.pattern, $r.replacement
    }
    
    if ($content -ne $original) {
        Set-Content $path $content -NoNewLine
        Write-Output "MIGRATED: $file"
    } else {
        Write-Output "UNCHANGED: $file"
    }
}

Write-Output "`n=== Migrating TSX files ==="
foreach ($file in $tsxFiles) {
    $path = Join-Path $root $file
    if (-not (Test-Path $path)) { Write-Output "SKIP: $file (not found)"; continue }
    
    $content = Get-Content $path -Raw
    $original = $content
    
    foreach ($r in $tsxReplacements) {
        $content = $content -replace $r.pattern, $r.replacement
    }
    
    if ($content -ne $original) {
        Set-Content $path $content -NoNewLine
        Write-Output "MIGRATED: $file"
    } else {
        Write-Output "UNCHANGED: $file"
    }
}

Write-Output "`n=== Done ==="
