import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const sql = readFileSync(resolve('supabase/migrations/20260906140000_accounting_remediation.sql'), 'utf8')

// The corrected migration uses the pattern:
//   EXECUTE format(
//       $q$
//       ... SQL with %I/%L/%s ...
//       $q$
//       ... args ...
//   );
//
// A simpler approach: split the whole file on ');' to get each
// statement, then for each statement that contains 'EXECUTE format('
// extract the SQL string and args.

const statements = sql.split(';')
  .map(s => s.trim())
  .filter(s => s.startsWith('EXECUTE format(') || s.includes('post_from_source_transaction('))

console.log('=== format() blocks ===\n')
let idx = 0
for (const statement of statements) {
  if (!statement.startsWith('EXECUTE format(')) continue
  idx++

  // Extract the $q$ ... $q$ parts
  // pattern: EXECUTE format( $q$ SQL $q$ ARGS )
  // We'll capture the SQL string (between first $q$ and next $q$)
  // and the args (after second $q$ to the closing )).
  const formatStart = statement.indexOf('format(')
  const afterFormat = statement.slice(formatStart + 7) // after 'format('

  // afterFormat should start with $q$
  if (!afterFormat.trim().startsWith('$q$')) {
    console.log(`block ${idx}: no leading $q$`)
    console.log(statement.slice(0, 500))
    console.log('---')
    continue
  }

  // Find the two $q$ delimiters
  const firstQEnd = afterFormat.indexOf('$q$', 3) // after the leading $q$
  if (firstQEnd === -1) {
    console.log(`block ${idx}: only one $q$`)
    console.log(statement.slice(0, 500))
    console.log('---')
    continue
  }

  const sqlPart = afterFormat.slice(3, firstQEnd) // SQL string
  const afterSecondQ = afterFormat.slice(firstQEnd + 3) // after second $q$

  // Trim trailing whitespace and the closing ')'
  const argsRaw = afterSecondQ.replace(/\)\s*$/, '').trim()

  const placeholders = (sqlPart.match(/%[IL0-9]+/g) || []).length

  // count arg tokens: split on commas not inside quotes
  const argTokens = argsRaw.split(',')
    .map(t => t.trim())
    .filter(t => t.length > 0)

  const argCount = argTokens.length

  const ok = placeholders === argCount ? 'OK' : 'MISMATCH'

  console.log([
    `block ${idx}: placeholders=${placeholders} args=${argCount} ${ok}`,
    'SQL snippet:',
    sqlPart.slice(0, 600),
    '\nArgs snippet:',
    argsRaw.slice(0, 300),
    '\n---'
  ].join('\n'))
}
console.log(`total format blocks: ${idx}\n`)

// Find the post_from_source_transaction calls
console.log('=== post_from_source_transaction calls ===\n')
const postCalls = sql
  .split(/\n/)
  .filter(line => line.trim().startsWith('v_post_result := public.post_from_source_transaction(') ||
                 line.trim().startsWith('public.post_from_source_transaction('))
  .map(line => line.trim())

let postIdx = 0
for (const line of postCalls) {
  postIdx++
  console.log(`\npost_from_source_transaction call #${postIdx}`)
  console.log(line.slice(0, 700))
}
console.log(`total post_from_source_transaction line starts: ${postIdx}`)
