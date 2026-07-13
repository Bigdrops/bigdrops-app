# commit-docs.ps1 — Stage, commit, push with report-driven commit messages
#
# If docs/Reports/*.md files changed → reads the # Title from the report
# and uses it as the commit message subject. This is the "easy way out" —
# the report title IS the message, because reports describe the work.
#
# If no reports changed → falls back to basic file analysis.
# Never stops without a message.
#
# Usage: pwsh ./commit-docs.ps1

git add -A

$changed = git diff --cached --name-only
if (-not $changed) {
    Write-Host "No changes to commit."
    exit 0
}

$changedCount = $changed.Count
$srcChanged   = @($changed | Where-Object { $_ -match '^src/' })
$docsChanged  = @($changed | Where-Object { $_ -match '^docs/' })
$configChanged = @($changed | Where-Object {
    $_ -match '^\.(github|githooks|opencode|mimocode)' -or
    $_ -match '^(commit-docs|AGENTS|package|vite|tailwind)'
})

# ============================================================
# STEP 1: Detect scope (most-affected module)
# ============================================================
function Get-Scope {
    param([string[]]$Paths)

    $scores = @{}
    $modulePatterns = @{
        '/csr/' = 'csr'; '/waybill/' = 'waybill'; '/invoice/' = 'invoice'
        '/quotation/' = 'quotation'; '/letter/' = 'letter'; '/receipt/' = 'receipt'
        '/boq/' = 'boq'; '/rfq/' = 'rfq'; '/pdf-new/' = 'pdf'; '/pdf/' = 'pdf'
        '/ui/' = 'ui'; '/auth/' = 'auth'; '/supabase/' = 'db'; '/tests/' = 'tests'
    }

    # Score source modules
    foreach ($p in @($Paths | Where-Object { $_ -match '^src/' })) {
        $mod = 'project'
        foreach ($pat in $modulePatterns.Keys) {
            if ($p -match $pat) { $mod = $modulePatterns[$pat]; break }
        }
        $scores[$mod] = ($scores[$mod] ?? 0) + 1
    }

    $srcTotal = ($scores.Values | Measure-Object -Sum).Sum
    if ($srcTotal -gt 0 -and $srcTotal -ge ($Paths.Count * 0.3)) {
        $top = ($scores.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 1).Key
        return $top
    }

    # Docs scope
    $docsP = @($Paths | Where-Object { $_ -match '^docs/' })
    if ($docsP.Count -gt 0 -and $docsP.Count -ge ($Paths.Count * 0.5)) {
        foreach ($p in $docsP) {
            if      ($p -match 'docs/STANDARD/') { return 'docs(standard)' }
            elseif  ($p -match 'docs/Reports/')  { return 'docs(report)'   }
            elseif  ($p -match 'docs/Prompts/')  { return 'docs(prompts)'  }
            elseif  ($p -match 'docs/TEMPLATES/'){ return 'docs(templates)'}
        }
        return 'docs'
    }

    # Config scope
    $cfg = @($Paths | Where-Object {
        $_ -match '^\.(github|githooks|opencode|mimocode)' -or
        $_ -match '^(commit-docs|AGENTS|package|vite|tailwind)'
    })
    if ($cfg.Count -gt 0 -and $cfg.Count -ge ($Paths.Count * 0.5)) { return 'config' }

    return 'project'
}

$scope = Get-Scope $changed

# ============================================================
# STEP 2: Generate subject — try report title first, else fallback
# ============================================================
$subject = ''
$usedReportTitle = $false

# Look for added/modified report files
$reportFiles = @($changed | Where-Object {
    $_ -match '^docs/Reports/' -and $_ -match '\.md$'
})

# Also check untracked report files (they'll be staged by git add -A)
if ($reportFiles.Count -eq 0) {
    $reportFiles = @($reportFiles + (git ls-files --others --exclude-standard 'docs/Reports/*.md'))
}

if ($reportFiles.Count -gt 0) {
    # Try reading the first report's title
    $firstReport = $reportFiles | Select-Object -First 1
    $fullPath = Join-Path (Get-Location) $firstReport.Trim()
    if (Test-Path $fullPath) {
        try {
            $firstLine = Get-Content $fullPath -TotalCount 1 -ErrorAction Stop
            if ($firstLine -match '^#\s+(.+)') {
                $reportTitle = $matches[1].Trim()
                if ($reportTitle.Length -gt 0) {
                    $subject = $reportTitle
                    $usedReportTitle = $true
                }
            }
        } catch {
            # Fall through to fallback
        }
    }
}

if (-not $subject) {
    # ============================================================
    # Fallback: Basic file-change description
    # ============================================================
    $added = @()
    $modified = @()
    $deleted = @()

    git diff --cached --name-status | ForEach-Object {
        $parts = $_ -split "`t"
        $status = $parts[0]
        $path = $parts[1]
        if (-not $path) { return }

        if ($status -match '^R') {
            if ($parts[0]) { $deleted += $parts[1] }
            if ($parts[2]) { $added   += $parts[2] }
            return
        }
        if ($status -match '^A')      { $added   += $path }
        elseif ($status -match '^D')  { $deleted += $path }
        else                          { $modified += $path }
    }

    $a = $added.Count; $d = $deleted.Count; $m = $modified.Count
    $parts = @()
    if ($a -gt 0) { $parts += "+$a" }
    if ($d -gt 0) { $parts += "-$d" }
    if ($m -gt 0) { $parts += "~$m" }

    if ($parts.Count -gt 0) { $subject = "$($parts -join ' ') | $changedCount files" }
    else                    { $subject = "update $changedCount files" }
}

# ============================================================
# STEP 3: Determine gitmoji + type
# ============================================================
$gitmoji = ''
$type    = ''

if ($usedReportTitle) {
    # Report-driven: gitmoji depends on whether src also changed
    if ($srcChanged.Count -gt 0) {
        # Source code changed alongside report — could be feat, fix, etc.
        # Check for new files vs modifications
        $newFiles = @(git diff --cached --diff-filter=A --name-only)
        if ($newFiles.Count -gt 0) {
            # Check if there are substantial new additions
            $addLines = 0
            git diff --cached --numstat | ForEach-Object {
                $fields = $_ -split "`t"
                if ($fields[0] -match '^\d+$') { $addLines += [int]$fields[0] }
            }
            if ($addLines -gt 50) { $gitmoji = '✨'; $type = 'feat' }
            else                  { $gitmoji = '🐛'; $type = 'fix'  }
        } else {
            $gitmoji = '🐛'; $type = 'fix'
        }
    } else {
        $gitmoji = '📝'; $type = 'docs'
    }
}
else {
    # No report — derive from what changed
    if ($docsChanged.Count -gt 0 -and $srcChanged.Count -eq 0) {
        $gitmoji = '📝'; $type = 'docs'
    }
    elseif ($configChanged.Count -gt 0) {
        $gitmoji = '🔧'; $type = 'chore'
    }
    else {
        $gitmoji = '🐛'; $type = 'fix'
    }
}

# ============================================================
# STEP 4: Build and validate commit message
# ============================================================
$fileList = ($changed | ForEach-Object { "- $_" }) -join "`n"

# Clean up subject: lowercase first letter, trim
$subject = $subject.Substring(0,1).ToLower() + $subject.Substring(1)
$subject = $subject.Trim()

$msg = "$gitmoji $type($scope): $subject`n`n$fileList"

# Enforce subject ≤ 72 chars
$subjectLine = ($msg -split "`n")[0]
if ($subjectLine.Length -gt 72) {
    if ($usedReportTitle) {
        $shortSubject = $subject
        if ($shortSubject.Length -gt 60) {
            $shortSubject = $shortSubject.Substring(0, 57) + '...'
        }
        $msg = "$gitmoji $type($scope): $shortSubject`n`n$fileList"
    } else {
        $msg = "$gitmoji $type($scope): update $changedCount files`n`n$fileList"
    }
}

Write-Host "`n=== Commit message ==="
Write-Host ($msg -split "`n" | Select-Object -First 1)
if ($usedReportTitle) { Write-Host "(from report title)" }
Write-Host "=====================`n"

git commit -m $msg
git push origin main

Write-Host "`nPushed to main successfully."
