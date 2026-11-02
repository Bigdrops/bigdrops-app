import test from 'node:test'
import assert from 'node:assert/strict'

import {
  isDirectApkUrl,
  extractApkFileName,
  buildDirectPolicyRelease,
} from '../../lib/appUpdate/releaseDiscovery.ts'

test('isDirectApkUrl recognizes Supabase Storage and direct APK URLs', () => {
  assert.equal(
    isDirectApkUrl('https://xyz.supabase.co/storage/v1/object/public/app-releases/bigdrops-latest.apk?v=1024'),
    true,
  )
  assert.equal(
    isDirectApkUrl('https://example.com/builds/app.apk'),
    true,
  )
  assert.equal(
    isDirectApkUrl('https://xyz.supabase.co/storage/v1/object/public/app-releases/BIGDROPS-test-release-1.0.24.apk'),
    true,
  )
  assert.equal(
    isDirectApkUrl('https://github.com/Bigdrops/bigdrops-app/releases/tag/v1.0.24'),
    false,
  )
  assert.equal(
    isDirectApkUrl('http://example.com/insecure.apk'),
    false,
  )
  assert.equal(isDirectApkUrl(''), false)
  assert.equal(isDirectApkUrl(null), false)
  assert.equal(isDirectApkUrl(undefined), false)
})

test('extractApkFileName extracts filename from url or uses fallback', () => {
  assert.equal(
    extractApkFileName('https://xyz.supabase.co/storage/v1/object/public/app-releases/bigdrops-latest.apk?v=1024'),
    'bigdrops-latest.apk',
  )
  assert.equal(
    extractApkFileName('https://xyz.supabase.co/app.apk'),
    'app.apk',
  )
  assert.equal(
    extractApkFileName('https://github.com/Bigdrops/bigdrops-app/releases', 'custom-fallback'),
    'custom-fallback.apk',
  )
})

test('buildDirectPolicyRelease returns complete ApprovedRelease for direct APK URLs', () => {
  const policy = {
    versionCode: 1024,
    versionName: '1.0.24',
    webReleaseUrl: 'https://xyz.supabase.co/storage/v1/object/public/app-releases/bigdrops-latest.apk?v=1024',
    apkAssetPrefix: 'BIGDROPS-test-release-',
    effectiveAtMs: 1729000000000,
  }

  const release = buildDirectPolicyRelease(policy)
  assert.notEqual(release, null)
  assert.equal(release?.versionCode, 1024)
  assert.equal(release?.versionName, '1.0.24')
  assert.equal(release?.webUrl, policy.webReleaseUrl)
  assert.equal(release?.publishedAtMs, 1729000000000)
  assert.equal(release?.assets.length, 1)
  assert.equal(release?.assets[0].name, 'bigdrops-latest.apk')
  assert.equal(release?.assets[0].downloadUrl, policy.webReleaseUrl)
  assert.equal(release?.assets[0].sizeBytes, null)
})

test('buildDirectPolicyRelease returns null for non-APK web release URLs to allow fallback', () => {
  const policy = {
    versionCode: 1024,
    versionName: '1.0.24',
    webReleaseUrl: 'https://github.com/Bigdrops/bigdrops-app/releases/tag/v1.0.24',
    apkAssetPrefix: 'BIGDROPS-test-release-',
  }

  assert.equal(buildDirectPolicyRelease(policy), null)
})
