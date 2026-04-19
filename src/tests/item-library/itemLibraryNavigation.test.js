import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const appShellPath = path.resolve('src/components/app/AppShell.tsx')
const layoutPath = path.resolve('src/components/Layout.jsx')
const itemLibraryPagePath = path.resolve('src/modules/item-library/pages/ItemLibraryPage.tsx')
const itemLibrarySummaryListPath = path.resolve('src/modules/item-library/components/ItemLibrarySummaryList.tsx')
const itemLibraryDetailPanelPath = path.resolve('src/modules/item-library/components/ItemLibraryDetailPanel.tsx')

test('item library is routed and exposed through app navigation', () => {
  const appShellSource = fs.readFileSync(appShellPath, 'utf8')
  const layoutSource = fs.readFileSync(layoutPath, 'utf8')
  const pageSource = fs.readFileSync(itemLibraryPagePath, 'utf8')
  const summaryListSource = fs.readFileSync(itemLibrarySummaryListPath, 'utf8')
  const detailPanelSource = fs.readFileSync(itemLibraryDetailPanelPath, 'utf8')

  assert.match(appShellSource, /const ItemLibraryPage = lazy\(\(\) => import\('@\/modules\/item-library\/pages\/ItemLibraryPage'\)\)/)
  assert.match(appShellSource, /<Route path="\/item-library" element=\{withBoundary\(<ItemLibraryPage \/>\)\} \/>/)
  assert.match(layoutSource, /key: 'item-library'/)
  assert.match(layoutSource, /label: 'Item Library'/)
  assert.match(layoutSource, /path: '\/item-library'/)
  assert.match(pageSource, /useItemHistoryList\(200\)/)
  assert.match(pageSource, /useItemHistoryDetail\(selectedItem\?\.item_id, 50\)/)
  assert.match(pageSource, /lg:grid-cols-\[minmax\(0,1\.05fr\)_minmax\(340px,0\.95fr\)\]/)
  assert.match(summaryListSource, /aria-pressed=\{isSelected\}/)
  assert.match(detailPanelSource, /Select an item to view history/)
})
