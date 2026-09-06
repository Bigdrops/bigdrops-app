import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import { normalizeRichTextHtml, richTextToPlainText } from '../../components/pdf/core/richText.ts'

const industryTemplatePath = path.resolve('src/components/pdf/templates/Industry.tsx')
const industryAdapterPath = path.resolve('src/components/pdf/industryAdapter.ts')

const sampleRichText = [
  '<p><strong>Bold</strong></p>',
  '<p><em>Italic</em></p>',
  '<p><u>Underline</u></p>',
  '<ul><li>One</li><li>Two</li></ul>',
  '<ol><li>First</li><li>Second</li></ol>',
].join('')

test('neutral rich-text pipeline preserves only the supported formatting and strips unsafe markup', () => {
  const normalized = normalizeRichTextHtml(`${sampleRichText}<script>alert(1)</script><div><span>Tail</span></div>`)
  const plain = richTextToPlainText(normalized)

  assert.match(normalized, /<strong>Bold<\/strong>/)
  assert.match(normalized, /<em>Italic<\/em>/)
  assert.match(normalized, /<u>Underline<\/u>/)
  assert.match(normalized, /<ul><li>One<\/li><li>Two<\/li><\/ul>/)
  assert.match(normalized, /<ol><li>First<\/li><li>Second<\/li><\/ol>/)
  assert.doesNotMatch(normalized, /<script|<span|onclick=|style=/i)

  assert.match(plain, /Bold/)
  assert.match(plain, /Italic/)
  assert.match(plain, /Underline/)
  assert.match(plain, /• One/)
  assert.match(plain, /• Two/)
  assert.match(plain, /1\. First/)
  assert.match(plain, /2\. Second/)
  assert.doesNotMatch(plain, /<p>|<strong>|<em>|<u>|<ul>|<ol>|<li>/)
})

test('Industry adapter keeps notes and terms on the shared rich-text pipeline instead of flattening them early', () => {
  const source = fs.readFileSync(industryAdapterPath, 'utf8')

  assert.match(source, /normalizeRichTextSection/)
  assert.doesNotMatch(source, /richTextToPlainText\(section\.content\)/)
  assert.doesNotMatch(source, /format:\s*'text'/)
})

test('Industry template routes notes and terms through the shared rich-text PDF renderer', () => {
  const source = fs.readFileSync(industryTemplatePath, 'utf8')

  assert.match(source, /renderPdfRichText\(/)
  assert.doesNotMatch(source, /<Text style=\{styles\.optionalText\}>\{data\.notes\.content\}<\/Text>/)
  assert.doesNotMatch(source, /<Text style=\{styles\.optionalText\}>\{data\.terms\.content\}<\/Text>/)
})
