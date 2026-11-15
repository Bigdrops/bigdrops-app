import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const CONNECTION_DIALOG = path.resolve('src/pages/settings/bolu-provider/ConnectionDialog.tsx')

/**
 * Provider credential fields must never be treated as browser login fields.
 *
 * Chrome and Edge ignore autocomplete="off" on password inputs, so a saved
 * Google account password was silently written into the API key field and a
 * saved account email into the connection name field. The password was one
 * click from being encrypted into the tenant database as a provider key.
 */

/** Returns the source of the tag that starts at the given marker. */
function tagStartingAt(source, marker, length = 500) {
  const index = source.indexOf(marker)
  assert.notEqual(index, -1, `Marker "${marker}" must exist in the file`)
  return source.slice(index, index + length)
}

test('ConnectionDialog: the API key field is marked as a new password, not a login', () => {
  const keyField = tagStartingAt(fs.readFileSync(CONNECTION_DIALOG, 'utf8'), 'id="bolu-conn-key"')

  assert.ok(
    keyField.includes('autoComplete="new-password"'),
    'The API key field must use autocomplete="new-password"',
  )
  assert.ok(
    !keyField.includes('autoComplete="off"'),
    'autocomplete="off" is ignored by Chrome on password inputs',
  )
  assert.ok(keyField.includes('data-1p-ignore'), 'The API key field must opt out of 1Password autofill')
  assert.ok(keyField.includes('data-lpignore="true"'), 'The API key field must opt out of LastPass autofill')
})

test('ConnectionDialog: the connection name field must not be treated as a username', () => {
  const nameField = tagStartingAt(fs.readFileSync(CONNECTION_DIALOG, 'utf8'), 'id="bolu-conn-name"')

  assert.ok(nameField.includes('autoComplete="off"'), 'The connection name field must disable autofill')
  assert.ok(
    nameField.includes('name="bolu-connection-name"'),
    'The connection name field must carry a non-credential name attribute',
  )
})
