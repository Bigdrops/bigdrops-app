import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const reviewPanelPath = path.resolve('src/modules/item-library/components/ItemLibraryDuplicateReviewPanel.tsx')
const groupCardPath = path.resolve('src/modules/item-library/components/ItemLibraryDuplicateGroupCard.tsx')
const mergeCardPath = path.resolve('src/modules/item-library/components/ItemLibraryDuplicateMergeCard.tsx')
const itemLibraryPagePath = path.resolve('src/modules/item-library/pages/ItemLibraryPage.tsx')
const advancedCleanupPath = path.resolve('src/modules/item-library/components/ItemLibraryAdvancedCleanupPanel.tsx')
const localAIJobPanelPath = path.resolve('src/modules/item-library/components/ItemLibraryLocalAIJobPanel.tsx')
const listPanelPath = path.resolve('src/modules/item-library/components/ItemLibraryListPanel.tsx')

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
  assert.match(source, /Are these actually the same item/)
  assert.match(source, /identityDecision === 'merge'/)
  assert.match(source, /Save Keep Separate/)
  assert.match(source, /Choose whether these items are the same identity/)
  assert.match(source, /Choose Merge only for true duplicates/)
  assert.match(source, /already reviewed and marked separate/)
  assert.match(source, /future suggestions and linked history will use the primary item/)
  assert.match(source, /Document descriptions stay as they were recorded/)
  assert.match(source, /AlertDialog/)
})

test('cleanup duplicate review uses one resolver instead of separate method destinations', () => {
  const source = fs.readFileSync(itemLibraryPagePath, 'utf8')

  assert.match(source, /Duplicate Items/)
  assert.match(source, /Unlinked Items/)
  assert.match(source, /Clean &amp; Standardize Catalog/)
  assert.match(source, /Past Changes/)
  assert.match(source, /setViewMode\('duplicates'\)/)
  assert.match(source, /setViewMode\('duplicates_outsourced'\)/)
  assert.doesNotMatch(source, /Review Manually in App/)
  assert.doesNotMatch(source, /Review with Local AI/)
  assert.doesNotMatch(source, /Export for External AI Review/)
  assert.doesNotMatch(source, /duplicates_local_ai/)
  assert.doesNotMatch(source, /duplicates_choice/)
})

test('duplicate items renders duplicate groups and integrated AI assistance, not the catalog rows', () => {
  const pageSource = fs.readFileSync(itemLibraryPagePath, 'utf8')
  const listSource = fs.readFileSync(listPanelPath, 'utf8')

  assert.match(listSource, /viewMode === 'duplicates'/)
  assert.match(listSource, /duplicateGroups\.map/)
  assert.match(listSource, /ItemLibraryDuplicateGroupCard/)
  assert.match(listSource, /duplicateAssistant/)
  assert.match(listSource, /aria-label=\{isLibrary \? 'Item catalog' : 'Duplicate groups'\}/)
  assert.match(pageSource, /onResultsChange=\{setLocalAIResults\}/)
  assert.match(pageSource, /localAIStatusByGroupId/)
  assert.match(pageSource, /aiResult=\{selectedDuplicateGroup/)
})

test('local AI controls use app surfaces and small workloads review all directly', () => {
  const source = fs.readFileSync(localAIJobPanelPath, 'utf8')

  assert.match(source, /Cleanup AI Assistant/)
  assert.match(source, /Talk to AI/)
  assert.match(source, /parseCleanupAssistantIntent/)
  assert.match(source, /Ask AI to review duplicates/)
  assert.match(source, /I will not change anything/)
  assert.match(source, /Nothing was changed/)
  assert.match(source, /ThinkingOrb/)
  assert.match(source, /App\.addListener\('resume'/)
  assert.match(source, /visibilitychange/)
  assert.match(source, /refreshLocalAIModelSelectionSnapshot/)
  assert.match(source, /Sheet open=\{modelSheetOpen\}/)
  assert.match(source, /Choose AI model/)
  assert.match(source, /formatModelLabel/)
  assert.match(source, /Advanced details/)
  assert.doesNotMatch(source, /<select/)
  assert.doesNotMatch(source, /local-ai-job-size/)
  assert.doesNotMatch(source, /local-ai-model/)
  assert.doesNotMatch(source, /Job Size/)
  assert.doesNotMatch(source, /Start AI Review/)
})

test('unlinked items is exposed in Cleanup Hub while backend naming remains internal', () => {
  const pageSource = fs.readFileSync(itemLibraryPagePath, 'utf8')
  const panelSource = fs.readFileSync(path.resolve('src/modules/item-library/components/ItemLibraryHistoricalReviewPanel.tsx'), 'utf8')

  assert.match(pageSource, /Unlinked Items/)
  assert.match(pageSource, /setWorkflowMode\('historical_review'\)/)
  assert.match(pageSource, /Connect old document items to your Item Library/)
  assert.match(panelSource, /Connect old document line items to reusable Item Library identities/)
  assert.match(panelSource, /Historical commercial values are not changed/)
  assert.doesNotMatch(panelSource, /Tier C/)
  assert.doesNotMatch(panelSource, /Tier D/)
})

test('catalog cleanup describes Local AI as duplicate-only and keeps external review wording', () => {
  const source = fs.readFileSync(advancedCleanupPath, 'utf8')

  assert.match(source, /On-device help is limited to duplicate review/)
  assert.match(source, /Full-catalog standardization still uses the locked external export and import flow/)
  assert.match(source, /External AI Duplicate Review/)
  assert.match(source, /Paste external AI result/)
})
