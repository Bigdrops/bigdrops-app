import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const reviewPanelPath = path.resolve('src/modules/item-library/components/ItemLibraryDuplicateReviewPanel.tsx')
const groupCardPath = path.resolve('src/modules/item-library/components/ItemLibraryDuplicateGroupCard.tsx')
const mergeCardPath = path.resolve('src/modules/item-library/components/ItemLibraryDuplicateMergeCard.tsx')
const itemLibraryPagePath = path.resolve('src/modules/item-library/pages/ItemLibraryPage.tsx')
const advancedCleanupPath = path.resolve('src/modules/item-library/components/ItemLibraryAdvancedCleanupPanel.tsx')

test('cleanup duplicate review presents similarity as review evidence, not identity proof', () => {
  const reviewSource = fs.readFileSync(reviewPanelPath, 'utf8')
  const groupSource = fs.readFileSync(groupCardPath, 'utf8')

  assert.match(reviewSource, /review evidence, not identity proof/i)
  assert.match(reviewSource, /models, ratings, sizes, materials, or applications/i)
  assert.match(groupSource, /Review only/i)
  assert.match(groupSource, /different specifications/i)
})

test('cleanup merge card supports durable Keep Separate and keeps merges deliberate', () => {
  const source = fs.readFileSync(mergeCardPath, 'utf8')

  assert.match(source, /Keep separate/)
  assert.match(source, /onKeepSeparate/)
  assert.match(source, /isPairReviewedSeparate/)
  assert.match(source, /hasReviewedSeparateSelection/)
  assert.match(source, /setSelectedMergedIds\(\[\]\)/)
  assert.match(source, /Merge only true duplicates/)
  assert.match(source, /already reviewed and marked separate/)
  assert.match(source, /future suggestions and linked history will use the primary item/)
  assert.match(source, /Document descriptions stay as they were recorded/)
  assert.match(source, /AlertDialog/)
})

test('cleanup duplicate review exposes manual, local AI, and external AI as separate methods', () => {
  const source = fs.readFileSync(itemLibraryPagePath, 'utf8')

  assert.match(source, /Review Manually in App/)
  assert.match(source, /Review with Local AI/)
  assert.match(source, /Export for External AI Review/)
  assert.match(source, /duplicates_local_ai/)
  assert.doesNotMatch(source, /Use AI for Duplicate Review/)
})

test('catalog cleanup describes Local AI as duplicate-only and keeps external review wording', () => {
  const source = fs.readFileSync(advancedCleanupPath, 'utf8')

  assert.match(source, /On-device help is limited to duplicate review/)
  assert.match(source, /Full-catalog standardization still uses the locked external export and import flow/)
  assert.match(source, /External AI Duplicate Review/)
  assert.match(source, /Paste external AI result/)
})
