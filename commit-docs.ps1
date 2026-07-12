# commit-docs.ps1 — Quick stage, commit, push for docs changes
# Usage: pwsh ./commit-docs.ps1

git add -A

$changed = git diff --cached --name-only
$docsChanged = $changed -match '^docs/'

if ($docsChanged) {
    $summary = ($docsChanged | ForEach-Object { "- $_" }) -join "`n"
    $msg = "📝 docs: update documentation`n`n$summary"
} else {
    $msg = "📝 chore: update project files"
}

git commit -m $msg
git push origin main

Write-Host "`nPushed to main successfully."
