const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const alertDialogPath = path.join(process.cwd(), 'src', 'components', 'ui', 'alert-dialog.tsx')
const source = fs.readFileSync(alertDialogPath, 'utf8')

test('AlertDialogAction forwards children into Button', () => {
  assert.match(
    source,
    /function AlertDialogAction\(\{[\s\S]*?children,[\s\S]*?<Button[\s\S]*?>[\s\S]*?\{children\}[\s\S]*?<\/Button>/,
  )
})

test('AlertDialogCancel forwards children into Button', () => {
  assert.match(
    source,
    /function AlertDialogCancel\(\{[\s\S]*?children,[\s\S]*?<Button[\s\S]*?>[\s\S]*?\{children\}[\s\S]*?<\/Button>/,
  )
})
