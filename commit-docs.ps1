# commit-docs.ps1 — Intelligent stage, commit, push with descriptive messages
# Generates meaningful subject lines by analyzing file changes (add/modify/delete)
# Usage: pwsh ./commit-docs.ps1
#
# Output format: <gitmoji> <type>(<scope>): <descriptive subject>
#   - Subject describes what changed (not "update project files")
#   - Scope is the most-affected module, not alphabetically first
#   - Gitmoji + type reflect the dominant change type

git add -A

$changed = git diff --cached --name-only
if (-not $changed) {
    Write-Host "No changes to commit."
    exit 0
}

# ============================================================
# STEP 1: Classify all changes by operation type
# ============================================================
$added = @()
$modified = @()
$deleted = @()

git diff --cached --name-status | ForEach-Object {
    $parts = $_ -split "`t"
    $status = $parts[0]
    $path = $parts[1]
    if (-not $path) { return }

    if     ($status -match '^A') { $added += $path }
    elseif ($status -match '^D') { $deleted += $path }
    elseif ($status -match '^R') { $modified += $path }  # renamed = content change
    else                        { $modified += $path }
}

$allCount   = $changed.Count
$addedCount = $added.Count
$modCount   = $modified.Count
$delCount   = $deleted.Count

$srcChanged   = @($changed | Where-Object { $_ -match '^src/' })
$docsChanged  = @($changed | Where-Object { $_ -match '^docs/' })
$configChanged = @($changed | Where-Object { $_ -match '^\.(github|githooks|opencode|mimocode)' -or $_ -match '^(commit-docs|AGENTS|package|vite|tailwind)' })

# Compute diff stats for magnitude analysis
$totalAddedLines   = 0
$totalDeletedLines = 0
git diff --cached --numstat | ForEach-Object {
    $fields = $_ -split "`t"
    if ($fields[0] -match '^\d+$') { $totalAddedLines   += [int]$fields[0] }
    if ($fields[1] -match '^\d+$') { $totalDeletedLines += [int]$fields[1] }
}

# ============================================================
# STEP 2: Detect primary scope (most-affected module)
# ============================================================
function Get-PrimaryModule {
    param([string[]]$Paths)

    $scores = @{}

    # Source modules: check src/ paths
    $srcPaths = @($Paths | Where-Object { $_ -match '^src/' })
    foreach ($p in $srcPaths) {
        $mod = 'project'
        if      ($p -match '/csr/'       ) { $mod = 'csr'       }
        elseif  ($p -match '/waybill/'   ) { $mod = 'waybill'   }
        elseif  ($p -match '/invoice/'   ) { $mod = 'invoice'   }
        elseif  ($p -match '/quotation/' ) { $mod = 'quotation' }
        elseif  ($p -match '/letter/'    ) { $mod = 'letter'    }
        elseif  ($p -match '/receipt/'   ) { $mod = 'receipt'   }
        elseif  ($p -match '/boq/'       ) { $mod = 'boq'       }
        elseif  ($p -match '/rfq/'       ) { $mod = 'rfq'       }
        elseif  ($p -match '/pdf-new/'   ) { $mod = 'pdf'       }
        elseif  ($p -match '/pdf/'       ) { $mod = 'pdf'       }
        elseif  ($p -match '/ui/'        ) { $mod = 'ui'        }
        elseif  ($p -match '/auth/'      ) { $mod = 'auth'      }
        elseif  ($p -match '/supabase/'  ) { $mod = 'db'        }
        elseif  ($p -match '/tests/'     ) { $mod = 'tests'     }
        $scores[$mod] = ($scores[$mod] ?? 0) + 1
    }

    # If source modules dominate, return the top one
    $srcTotal = ($scores.Values | Measure-Object -Sum).Sum
    if ($srcTotal -gt 0 -and $srcTotal -ge ($Paths.Count * 0.3)) {
        $top = ($scores.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 1).Key
        return $top
    }

    # Docs-only or docs-dominant
    $docsPaths = @($Paths | Where-Object { $_ -match '^docs/' })
    if ($docsPaths.Count -gt 0 -and $docsPaths.Count -ge ($Paths.Count * 0.5)) {
        foreach ($p in $docsPaths) {
            if      ($p -match 'docs/STANDARD/') { return 'docs(standard)' }
            elseif  ($p -match 'docs/Reports/')  { return 'docs(report)'   }
            elseif  ($p -match 'docs/Prompts/')  { return 'docs(prompts)'  }
            elseif  ($p -match 'docs/TEMPLATES/'){ return 'docs(templates)'}
            elseif  ($p -match 'docs/SUPABASE/') { return 'docs(schema)'   }
        }
        return 'docs'
    }

    # Config changes — check from the passed-in $Paths
    $cfgPaths = @($Paths | Where-Object { $_ -match '^\.(github|githooks|opencode|mimocode)' -or $_ -match '^(commit-docs|AGENTS|package|vite|tailwind)' })
    if ($cfgPaths.Count -gt 0 -and $cfgPaths.Count -ge ($Paths.Count * 0.5)) {
        return 'config'
    }

    return 'project'
}

$scope = Get-PrimaryModule $changed

# ============================================================
# STEP 3: Extract meaningful nouns from file paths
# ============================================================
function Get-CoreNoun {
    param([string]$Path)

    $name = Split-Path $Path -Leaf
    $base = [System.IO.Path]::GetFileNameWithoutExtension($name)

    # Strip compound suffixes commonly used in this codebase
    $suffixes = @(
        'Component', 'Screen', 'Page', 'Form', 'Modal', 'Dialog',
        'Service', 'Util', 'Helper', 'Hook', 'Type', 'Types',
        'Model', 'Provider', 'Context', 'Reducer', 'Action', 'Slice',
        'Dto', 'Config', 'Engine', 'Manager', 'Builder', 'Factory',
        'Preview', 'View', 'Card', 'List', 'Item', 'Section',
        'Layout', 'Header', 'Footer', 'Button', 'Input', 'Field',
        'Table', 'Panel', 'Badge', 'Avatar', 'Menu', 'Nav', 'Bar',
        'Utils', 'Constants', 'Index', 'Schema'
    )

    # Remove multi-word suffixes iteratively
    $prev = ''
    while ($prev -ne $base) {
        $prev = $base
        foreach ($s in $suffixes) {
            # Case-insensitive suffix removal at end
            $regex = "$s`$"
            if ($base -match $regex) {
                $base = $base -replace $regex, ''
                break
            }
        }
    }

    # Also strip file-extension-like suffixes that survived
    $base = $base -replace '\.(tsx?|jsx?|css|scss|json)$', ''

    # Skip very short or trivial names
    if ($base.Length -lt 3) { return '' }
    if ($base -match '^(index|style|styles|types|constants|utils)$') { return '' }

    # Convert PascalCase/kebab-case to space-separated for readability
    $readable = $base -replace '([a-z])([A-Z])', '$1 $2'
    $readable = $readable -replace '[-_]', ' '
    $readable = $readable.ToLower()
    return $readable.Trim()
}

function Get-Nouns {
    param([string[]]$Paths, [int]$Max = 3)
    $nouns = @()
    foreach ($p in $Paths) {
        $n = Get-CoreNoun $p
        if ($n -and $n -notin $nouns) { $nouns += $n }
        if ($nouns.Count -ge 10) { break }
    }

    # Fallback: use directory leaf name
    if ($nouns.Count -eq 0) {
        foreach ($p in $Paths) {
            $dir = Split-Path $p -Parent
            $n = (Split-Path $dir -Leaf) -replace '[-_]', ' '
            if ($n -and $n.Length -gt 2 -and $n -notin $nouns) { $nouns += $n.ToLower() }
            if ($nouns.Count -ge 3) { break }
        }
    }

    return $nouns
}

# ============================================================
# STEP 4: Build a descriptive subject line
# ============================================================
function Build-Subject {
    param(
        [string[]]$Added,
        [string[]]$Modified,
        [string[]]$Deleted,
        [int]$AddedLines,
        [int]$DeletedLines
    )

    $aCount = $Added.Count
    $mCount = $Modified.Count
    $dCount = $Deleted.Count
    $total  = $aCount + $mCount + $dCount

    # --- CASE: Pure additions ---
    if ($aCount -gt 0 -and $mCount -eq 0 -and $dCount -eq 0) {
        $nouns = Get-Nouns $Added 2
        if ($nouns.Count -eq 1) { return "add $($nouns[0])" }
        if ($nouns.Count -ge 2) {
            $extra = if ($aCount -gt 2) { " +$($aCount-2) more" } else { '' }
            return "add $($nouns[0..1] -join ', ')$extra"
        }
        return "add $aCount files"
    }

    # --- CASE: Pure deletions ---
    if ($dCount -gt 0 -and $aCount -eq 0 -and $mCount -eq 0) {
        $nouns = Get-Nouns $Deleted 2
        if ($nouns.Count -eq 1) { return "remove $($nouns[0])" }
        if ($nouns.Count -ge 2) {
            $extra = if ($dCount -gt 2) { " +$($dCount-2) more" } else { '' }
            return "remove $($nouns[0..1] -join ', ')$extra"
        }
        return "remove $dCount files"
    }

    # --- CASE: Only modifies (edit existing files) ---
    if ($mCount -gt 0 -and $aCount -eq 0 -and $dCount -eq 0) {
        $nouns = Get-Nouns $Modified 2
        if ($nouns.Count -eq 1) { return "update $($nouns[0])" }
        if ($nouns.Count -ge 2) {
            $extra = if ($mCount -gt 2) { " +$($mCount-2) more" } else { '' }
            return "update $($nouns[0..1] -join ', ')$extra"
        }
        return "update $mCount files"
    }

    # --- CASE: Replacement (add + delete, no modify) ---
    if ($aCount -gt 0 -and $dCount -gt 0 -and $mCount -eq 0) {
        $addNouns = Get-Nouns $Added 1
        if ($addNouns.Count -gt 0) {
            return "replace $($addNouns[0]) ($aCount add, $dCount remove)"
        }
        return "replace $aCount add, $dCount remove"
    }

    # --- CASE: Mixed modifications ---
    # Build description from the most significant changes
    $parts = @()
    
    if ($aCount -gt 0) {
        $an = Get-Nouns $Added 1
        if ($an.Count -gt 0 -and $an[0].Length -gt 2) {
            $parts += "+$($an[0])"
        } else {
            $parts += "+$aCount"
        }
    }
    if ($dCount -gt 0) {
        $dn = Get-Nouns $Deleted 1
        if ($dn.Count -gt 0 -and $dn[0].Length -gt 2) {
            $parts += "-$($dn[0])"
        } else {
            $parts += "-$dCount"
        }
    }
    if ($mCount -gt 0) {
        $parts += "~$mCount files"
    }

    if ($parts.Count -gt 0) {
        return $parts -join '; '
    }

    # Final fallback
    return "update $total files"
}

$subject = Build-Subject $added $modified $deleted $totalAddedLines $totalDeletedLines

# ============================================================
# STEP 5: Determine gitmoji + conventional commit type
# ============================================================
$gitmoji = ''
$type    = ''

if ($subject -match '^add ') {
    # New features — check if it's substantial code or docs
    if ($srcChanged.Count -gt 0 -and $totalAddedLines -gt 30) {
        $gitmoji = "✨"; $type = "feat"
    } else {
        $gitmoji = "📝"; $type = "docs"
    }
}
elseif ($subject -match '^remove ') {
    $gitmoji = "🔥"; $type = "chore"
}
elseif ($subject -match '^replace ') {
    $gitmoji = "♻️"; $type = "refactor"
}
elseif ($docsChanged.Count -gt 0 -and $srcChanged.Count -eq 0) {
    $gitmoji = "📝"; $type = "docs"
}
elseif ($configChanged.Count -gt 0) {
    $gitmoji = "🔧"; $type = "chore"
}
else {
    # Default: modification of existing src files
    $gitmoji = "🐛"; $type = "fix"
}

# ============================================================
# STEP 6: Build and commit
# ============================================================
$fileList = ($changed | ForEach-Object { "- $_" }) -join "`n"
$msg = "$gitmoji $type($scope): $subject`n`n$fileList"

# Enforce subject ≤ 72 chars — if too long, rebuild with shorter nouns
$subjectLine = ($msg -split "`n")[0]
if ($subjectLine.Length -gt 72) {
    # Regenerate with shorter subject
    $shortSubject = "update $allCount files"
    # Try preserving some meaning by checking dominant change type
    if ($subject -match '^add ') {
        $shortSubject = "add $allCount files"
    } elseif ($subject -match '^remove ') {
        $shortSubject = "remove $allCount files"
    } elseif ($subject -match '^replace ') {
        $shortSubject = "replace $addedCount add, $delCount remove"
    }
    $msg = "$gitmoji $type($scope): $shortSubject`n`n$fileList"

    # Final safety check — if still too long, truncate scope
    $subjectLine2 = ($msg -split "`n")[0]
    if ($subjectLine2.Length -gt 72) {
        $shortScope = $scope -replace '\(.*$', ''
        $msg = "$gitmoji $type($shortScope): $shortSubject`n`n$fileList"
    }
}

Write-Host "`n=== Commit message ==="
Write-Host ($msg -split "`n" | Select-Object -First 1)
Write-Host "=====================`n"

git commit -m $msg
git push origin main

Write-Host "`nPushed to main successfully."
