/**
 * GitHub Releases discovery, filtered by the BIGDROPS release contract.
 *
 * GitHub is distribution only. A release becomes an actionable update
 * only when it matches every contract rule:
 *   1. Its APK asset name starts with the policy's approved prefix
 *      (BIGDROPS-test-release-...). No arbitrary asset is trusted.
 *   2. The policy row names the required versionCode; GitHub metadata
 *      never decides mandatory/effective — the Supabase policy does.
 *
 * The repository is resolved from the git remote at build time
 * (VITE_GIT_REPO), never hardcoded or guessed. Releases without a
 * matching asset are ignored, not treated as broken updates.
 */

const GITHUB_RELEASES_API = 'https://api.github.com/repos'

export interface ApprovedApkAsset {
  name: string
  downloadUrl: string
  sizeBytes: number | null
}

export interface ApprovedRelease {
  versionCode: number
  versionName: string | null
  /** External release page for the "Download on Web" path. */
  webUrl: string
  assets: ApprovedApkAsset[]
  publishedAtMs: number | null
}

interface GithubAsset {
  name?: unknown
  browser_download_url?: unknown
  size?: unknown
}

interface GithubRelease {
  tag_name?: unknown
  name?: unknown
  html_url?: unknown
  published_at?: unknown
  assets?: unknown
  draft?: unknown
  prerelease?: unknown
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

/** Resolves owner/name from the git remote injected at build time. */
export function resolveGithubRepo(): { owner: string; repo: string } | null {
  const raw = import.meta.env.VITE_GIT_REPO
  if (!isNonEmptyString(raw)) return null

  const match = raw.match(/github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?\/?$/i)
  if (!match) return null

  return { owner: match[1], repo: match[2] }
}

/**
 * Selects the APK asset for the release: first asset whose name starts
 * with the approved prefix. Unknown asset types are ignored entirely.
 */
export function selectApprovedApkAssets(
  assets: GithubAsset[],
  apkAssetPrefix: string,
): ApprovedApkAsset[] {
  const prefix = apkAssetPrefix.toLowerCase()
  const approved: ApprovedApkAsset[] = []

  for (const asset of assets) {
    if (!asset || typeof asset !== 'object') continue
    const name = isNonEmptyString(asset.name) ? asset.name.trim() : null
    const url = isNonEmptyString(asset.browser_download_url) ? asset.browser_download_url : null

    if (!name || !url) continue
    if (!name.toLowerCase().startsWith(prefix)) continue
    if (!url.toLowerCase().endsWith('.apk')) continue
    if (!/^https:\/\//i.test(url)) continue

    approved.push({
      name,
      downloadUrl: url,
      sizeBytes: typeof asset.size === 'number' && asset.size > 0 ? asset.size : null,
    })
  }

  return approved
}

/**
 * Maps one GitHub release into an ApprovedRelease when it satisfies the
 * contract for the given policy target. Returns null when it does not.
 */
export function mapGithubRelease(
  release: unknown,
  policyVersionCode: number,
  apkAssetPrefix: string,
): ApprovedRelease | null {
  if (!release || typeof release !== 'object') return null

  const r = release as GithubRelease
  if (r.draft === true) return null

  const webUrl = isNonEmptyString(r.html_url) ? r.html_url : null
  if (!webUrl || !/^https:\/\//i.test(webUrl)) return null

  if (!Array.isArray(r.assets)) return null
  const assets = selectApprovedApkAssets(r.assets as GithubAsset[], apkAssetPrefix)
  if (assets.length === 0) return null

  const publishedAtMs = isNonEmptyString(r.published_at)
    ? (() => {
        const t = new Date(r.published_at).getTime()
        return Number.isFinite(t) ? t : null
      })()
    : null

  return {
    versionCode: policyVersionCode,
    versionName: isNonEmptyString(r.tag_name) ? r.tag_name : null,
    webUrl,
    assets,
    publishedAtMs,
  }
}

/**
 * Fetches GitHub releases and returns the newest release that carries an
 * approved APK asset for the policy target. Network errors resolve to
 * null (metadata unavailable — the fail-safe path applies).
 */
export async function fetchApprovedRelease(
  policyVersionCode: number,
  apkAssetPrefix: string,
): Promise<ApprovedRelease | null> {
  const repo = resolveGithubRepo()
  if (!repo) return null

  try {
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 12_000)

    const response = await fetch(
      `${GITHUB_RELEASES_API}/${repo.owner}/${repo.repo}/releases?per_page=15`,
      {
        headers: { Accept: 'application/vnd.github+json' },
        signal: controller.signal,
      },
    ).finally(() => window.clearTimeout(timeout))

    if (!response.ok) return null

    const releases = (await response.json()) as unknown
    if (!Array.isArray(releases)) return null

    // Newest release wins. GitHub returns releases newest-first, but the
    // scan order must not matter: any release carrying an approved asset
    // is contract-valid; the first match is used.
    for (const release of releases) {
      const mapped = mapGithubRelease(release, policyVersionCode, apkAssetPrefix)
      if (mapped) return mapped
    }

    return null
  } catch {
    return null
  }
}
