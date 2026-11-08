import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import { normalizeRichTextHtml, richTextToPlainText } from '../../components/pdf/core/richText.ts'

const commercialTemplatePath = fs.existsSync(path.resolve('src/components/pdf/templates/Evergreen.tsx'))
  ? path.resolve('src/components/pdf/templates/Evergreen.tsx')
  : path.resolve('src/components/pdf/forme/IndustryFormeDocument.tsx')
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

test('Commercial template routes notes and terms through the shared rich-text PDF renderer', () => {
  const source = fs.readFileSync(commercialTemplatePath, 'utf8')

  assert.match(source, /render(?:Pdf|Forme)RichText\(/)
  assert.doesNotMatch(source, /<Text style=\{styles\.optionalText\}>\{data\.notes\.content\}<\/Text>/)
  assert.doesNotMatch(source, /<Text style=\{styles\.optionalText\}>\{data\.terms\.content\}<\/Text>/)
})

test('neutral rich-text pipeline preserves plain-text newlines and multi-line paragraphs', () => {
  const plainNotes = 'Equipment: YORC Diesel Engine\nSerial No: Y2024-8841\nLocation: Ikeja\n\nWork Completed: Replaced parts.'
  const normalized = normalizeRichTextHtml(plainNotes)
  const plain = richTextToPlainText(normalized)

  assert.match(normalized, /<p>Equipment: YORC Diesel Engine<br \/>Serial No: Y2024-8841<br \/>Location: Ikeja<\/p>/)
  assert.match(normalized, /<p>Work Completed: Replaced parts\.<\/p>/)
  assert.equal(plain, plainNotes)
})

test('neutral rich-text pipeline preserves mathematical comparisons and special symbols without dropping content', () => {
  const mathComparison = '5 < 10 & 20 > 15'
  const normalized = normalizeRichTextHtml(mathComparison)
  const plain = richTextToPlainText(normalized)

  assert.equal(normalized, '<p>5 &lt; 10 &amp; 20 &gt; 15</p>')
  assert.equal(plain, mathComparison)

  const inHtml = '<p>Rule: 5 < 10 & 20 > 15</p>'
  const normalizedHtml = normalizeRichTextHtml(inHtml)
  const plainHtml = richTextToPlainText(normalizedHtml)

  assert.equal(normalizedHtml, '<p>Rule: 5 &lt; 10 &amp; 20 &gt; 15</p>')
  assert.equal(plainHtml, 'Rule: 5 < 10 & 20 > 15')

  const complexSymbols = 'Values: <= 10 && >= 20, "quoted" & \'apostrophe\''
  const normComplex = normalizeRichTextHtml(complexSymbols)
  const plainComplex = richTextToPlainText(normComplex)

  assert.equal(normComplex, '<p>Values: &lt;= 10 &amp;&amp; &gt;= 20, &quot;quoted&quot; &amp; &#39;apostrophe&#39;</p>')
  assert.equal(plainComplex, complexSymbols)
})

test('F-05: rich-text pipeline preserves already-escaped entities without double-escaping and remains idempotent', () => {
  const input = 'Tom &amp; Jerry'
  const normalized = normalizeRichTextHtml(input)
  const plain = richTextToPlainText(normalized)

  assert.equal(normalized, '<p>Tom &amp; Jerry</p>')
  assert.equal(plain, 'Tom & Jerry')

  // Normalizing already-normalized HTML must be strictly idempotent
  const secondPass = normalizeRichTextHtml(normalized)
  assert.equal(secondPass, normalized)
  assert.equal(richTextToPlainText(secondPass), plain)

  const escapedPrice = 'Price &lt; 10 &amp; Stock &gt; 5'
  const normPrice = normalizeRichTextHtml(escapedPrice)
  assert.equal(normPrice, '<p>Price &lt; 10 &amp; Stock &gt; 5</p>')
  assert.equal(richTextToPlainText(normPrice), 'Price < 10 & Stock > 5')
})

test('F-14: literal HTML-like tag names in plain text are preserved and do not cause word loss or runaway formatting', () => {
  // Case 3b: literal <strong> without closing tag
  const boldLiteral = 'Use <strong> for bold'
  const normBold = normalizeRichTextHtml(boldLiteral)
  assert.equal(normBold, '<p>Use &lt;strong&gt; for bold</p>')
  assert.equal(richTextToPlainText(normBold), 'Use <strong> for bold')

  // Case 3c: literal <a> without closing tag
  const anchorLiteral = 'See <a> here'
  const normAnchor = normalizeRichTextHtml(anchorLiteral)
  assert.equal(normAnchor, '<p>See &lt;a&gt; here</p>')
  assert.equal(richTextToPlainText(normAnchor), 'See <a> here')

  // Case 3a: literal <p> in plain text (must not split into two paragraphs)
  const paragraphLiteral = 'Text with <p> literal tag'
  const normParagraph = normalizeRichTextHtml(paragraphLiteral)
  assert.equal(normParagraph, '<p>Text with &lt;p&gt; literal tag</p>')
  assert.equal(richTextToPlainText(normParagraph), 'Text with <p> literal tag')

  // Embedded literal tags inside real HTML paragraphs
  const inHtml = '<p>Rule: use <strong> for bold and <a> for links</p>'
  const normInHtml = normalizeRichTextHtml(inHtml)
  assert.equal(normInHtml, '<p>Rule: use &lt;strong&gt; for bold and &lt;a&gt; for links</p>')
  assert.equal(richTextToPlainText(normInHtml), 'Rule: use <strong> for bold and <a> for links')
})

test('rich-text security boundary: malformed tags, XSS payloads, and script/style contents', () => {
  // Case 5: Malformed open tag
  const unclosed = '<p>unclosed'
  const normUnclosed = normalizeRichTextHtml(unclosed)
  assert.equal(normUnclosed, '<p>unclosed</p>')
  assert.equal(richTextToPlainText(normUnclosed), 'unclosed')

  // Case 6: Malformed close tag / stray tag
  const stray = 'stray </p> text'
  const normStray = normalizeRichTextHtml(stray)
  assert.equal(normStray, '<p>stray</p><p>text</p>')

  // Case 7: Script and style content is completely discarded
  const scriptContent = '<div><script>alert("xss")</script><style>body { color: red }</style>safe text</div>'
  const normScript = normalizeRichTextHtml(scriptContent)
  assert.equal(normScript, '<p>safe text</p>')
  assert.equal(richTextToPlainText(normScript), 'safe text')

  // Case 8: Event handlers are stripped
  const onclickPayload = '<p onclick="alert(1)">Click me</p>'
  const normOnclick = normalizeRichTextHtml(onclickPayload)
  assert.equal(normOnclick, '<p>Click me</p>')
  assert.doesNotMatch(normOnclick, /onclick/i)

  // Case 9: javascript: URLs are stripped
  const jsUrlPayload = '<a href="javascript:alert(1)">Click me</a>'
  const normJsUrl = normalizeRichTextHtml(jsUrlPayload)
  assert.equal(normJsUrl, '<p>Click me</p>')
  assert.doesNotMatch(normJsUrl, /javascript/i)

  // Case 10: Valid nested formatting is preserved
  const nested = '<p><strong><em>bold and italic</em></strong></p>'
  const normNested = normalizeRichTextHtml(nested)
  assert.equal(normNested, '<p><strong><em>bold and italic</em></strong></p>')
  assert.equal(richTextToPlainText(normNested), 'bold and italic')
})
