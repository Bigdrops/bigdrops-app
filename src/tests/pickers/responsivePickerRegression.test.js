import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const comboboxPath = path.resolve('src/components/ui/combobox.tsx')
const clientSelectorPath = path.resolve('src/components/ClientSelector.tsx')
const sharedDocumentFormPath = path.resolve('src/components/document/SharedDocumentForm.tsx')
const csrFormScreenPath = path.resolve('src/components/csr/CsrFormScreen.tsx')
const waybillFormPath = path.resolve('src/components/waybill/WaybillForm.tsx')
const paymentSheetPath = path.resolve('src/components/document-view/invoice/InvoiceRecordPaymentSheet.tsx')
const unifiedActionSheetPath = path.resolve('src/components/actions/UnifiedActionSheet.tsx')
const invoiceListActionSheetPath = path.resolve('src/components/invoice/InvoiceListActionSheet.tsx')
const mobileSalesSheetPath = path.resolve('src/components/layout/MobileSalesSheet.tsx')
const listActionSheetPath = path.resolve('src/components/layout/ListActionSheet.tsx')
const dashboardRedesignPath = path.resolve('src/pages/DashboardRedesign.tsx')

test('combobox owns responsive auto strategy with drawer on mobile and popover on desktop', () => {
  const source = fs.readFileSync(comboboxPath, 'utf8')

  assert.match(source, /type ComboboxStrategy = "auto" \| "popover" \| "drawer"/)
  assert.match(source, /type ComboboxMobileBehavior = "drawer" \| "popover"/)
  assert.match(source, /type ComboboxDesktopBehavior = "popover" \| "inline"/)
  assert.match(source, /strategy = "auto"/)
  assert.match(source, /mobileBehavior = "drawer"/)
  assert.match(source, /desktopBehavior = "popover"/)
  assert.match(source, /useLayoutMode/)
  assert.match(source, /layoutMode === ['"]mobile['"]/)
  assert.match(source, /<Sheet/)
  assert.match(source, /<Popover/)
})

test('client selector no longer accepts or requires an isMobile prop', () => {
  const source = fs.readFileSync(clientSelectorPath, 'utf8')

  assert.doesNotMatch(source, /isMobile\?: boolean/)
  assert.doesNotMatch(source, /{[\s\S]*isMobile,/)
  assert.match(source, /<Combobox/)
})

test('client selector call sites stop threading explicit mobile flags', () => {
  const sharedFormSource = fs.readFileSync(sharedDocumentFormPath, 'utf8')
  const csrFormSource = fs.readFileSync(csrFormScreenPath, 'utf8')
  const waybillFormSource = fs.readFileSync(waybillFormPath, 'utf8')

  assert.doesNotMatch(sharedFormSource, /<ClientSelector[\s\S]*isMobile=/)
  assert.doesNotMatch(csrFormSource, /<ClientSelector[\s\S]*isMobile/)
  assert.doesNotMatch(waybillFormSource, /<ClientSelector[\s\S]*isMobile=/)
})

test('invoice payment sheet uses shared select primitives instead of native selects', () => {
  const source = fs.readFileSync(paymentSheetPath, 'utf8')

  assert.doesNotMatch(source, /<select/)
  assert.match(source, /import\s*{\s*Select,\s*SelectContent,\s*SelectItem,\s*SelectTrigger,\s*SelectValue\s*}/)
})

test('unified action sheet only exposes approved layouts', () => {
  const source = fs.readFileSync(unifiedActionSheetPath, 'utf8')

  assert.match(source, /layout\?:\s*"list" \| "grid" \| "list-compact"/)
  assert.doesNotMatch(source, /grid-scroll/)
})

test('action sheet call sites use only approved list or grid layouts', () => {
  const invoiceListSource = fs.readFileSync(invoiceListActionSheetPath, 'utf8')
  const mobileSalesSource = fs.readFileSync(mobileSalesSheetPath, 'utf8')
  const listSheetSource = fs.readFileSync(listActionSheetPath, 'utf8')
  const dashboardSource = fs.readFileSync(dashboardRedesignPath, 'utf8')

  assert.match(invoiceListSource, /layout="grid"/)
  assert.match(mobileSalesSource, /layout="grid"/)
  assert.match(listSheetSource, /layout="list-compact"/)
  assert.match(dashboardSource, /layout="list-compact"/)
})
