import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const reviewPanelPath = path.resolve('src/modules/item-library/components/ItemLibraryDuplicateReviewPanel.tsx')
const groupCardPath = path.resolve('src/modules/item-library/components/ItemLibraryDuplicateGroupCard.tsx')
const mergeCardPath = path.resolve('src/modules/item-library/components/ItemLibraryDuplicateMergeCard.tsx')

test('cleanup duplicate review presents similarity as review evidence, not identity proof', () => {
  const reviewSource = fs.readFileSync(reviewPanelPath, 'utf8')
  const groupSource = fs.readFileSync(groupCardPath, 'utf8')

  assert.match(reviewSource, /review evidence, not identity proof/i)
  assert.match(reviewSource, /models, ratings, sizes, materials, or applications/i)
  assert.match(groupSource, /Review only/i)
  assert.match(groupSource, /different specifications/i)
})

test('cleanup merge card supports leaving records separate and keeps merges deliberate', () => {
  const source = fs.readFileSync(mergeCardPath, 'utf8')

  assert.match(source, /Leave separate/)
  assert.match(source, /setSelectedMergedIds\(\[\]\)/)
  assert.match(source, /Merge only true duplicates/)
  assert.match(source, /future suggestions and linked history will use the primary item/)
  assert.match(source, /Document descriptions stay as they were recorded/)
  assert.match(source, /AlertDialog/)
})
