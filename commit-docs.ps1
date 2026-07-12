# commit-docs.ps1 — Quick stage, commit, push with Gitmoji + Conventional Commits
# Usage: pwsh ./commit-docs.ps1

git add -A

$changed = git diff --cached --name-only
if (-not $changed) {
    Write-Host "No changes to commit."
    exit 0
}

# Detect what changed
$docsChanged = $changed -match '^docs/'
$srcChanged = $changed -match '^src/'
$configChanged = $changed -match '^\.(github|githooks|opencode)|^commit-docs|^\.mimocode/'

# Determine gitmoji + type + scope
if ($docsChanged -and -not $srcChanged) {
    $gitmoji = "📝"
    $type = "docs"
    $scope = "standard"
} elseif ($srcChanged) {
    # Detect primary module from changed src files
    $modules = $srcChanged | ForEach-Object {
        if ($_ -match 'csr') { "csr" }
        elseif ($_ -match 'waybill') { "waybill" }
        elseif ($_ -match 'invoice') { "invoice" }
        elseif ($_ -match 'letter') { "letter" }
        elseif ($_ -match 'quotation') { "quotation" }
        elseif ($_ -match 'pdf') { "pdf" }
        elseif ($_ -match 'ui') { "ui" }
        else { "project" }
    } | Sort-Object -Unique
    $scope = $modules[0]
    
    # Detect change type from diff
    $additions = git diff --cached --numstat | Measure-Object -Property 1 -Sum
    $deletions = git diff --cached --numstat | Measure-Object -Property 2 -Sum
    
    # Check for new files (additions only)
    $newFiles = git diff --cached --diff-filter=A --name-only
    if ($newFiles) {
        $gitmoji = "✨"
        $type = "feat"
    } elseif ($deletions.Sum -gt $additions.Sum * 2) {
        $gitmoji = "🔥"
        $type = "chore"
    } else {
        $gitmoji = "🐛"
        $type = "fix"
    }
} elseif ($configChanged) {
    $gitmoji = "🔧"
    $type = "chore"
    $scope = "config"
} else {
    $gitmoji = "📝"
    $type = "chore"
    $scope = "project"
}

# Build summary
$summary = ($changed | ForEach-Object { "- $_" }) -join "`n"
$msg = "$gitmoji $type($scope): update project files`n`n$summary"

# Ensure subject line is <= 72 chars
$subject = $msg -split "`n" | Select-Object -First 1
if ($subject.Length -gt 72) {
    $msg = "$gitmoji $type($scope): update files`n`n$summary"
}

git commit -m $msg
git push origin main

Write-Host "`nPushed to main successfully."
