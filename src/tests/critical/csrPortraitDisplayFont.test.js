import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import React from 'react'
import { PDFDocument } from 'pdf-lib'
import { Document, Page, Text, Font } from '@formepdf/react'

import { CSR_PORTRAIT_DISPLAY_FONT } from '../../components/pdf/pdfcn/csr/csrPortraitFonts'
import { renderPdfcnToBytes } from '../../components/pdf/pdfcn'

const FONT_FILE = 'public/fonts/ArchivoBlack-Regular.ttf'

test('Portrait display font: licensed TTF is present and registered', () => {
  assert.equal(CSR_PORTRAIT_DISPLAY_FONT, 'Archivo Black')
  assert.ok(existsSync(FONT_FILE), `${FONT_FILE} must be bundled`)

  const registered = Font.getRegistered().filter((font) => font.family === CSR_PORTRAIT_DISPLAY_FONT)
  assert.ok(registered.length > 0, 'Archivo Black must be registered with Forme')
  for (const font of registered) {
    assert.equal(font.src, FONT_FILE)
  }
})

test('Portrait display font: TTF is embedded in the generated PDF', async () => {
  const element = React.createElement(
    Document,
    { title: 'Font embedding probe' },
    React.createElement(
      Page,
      { size: 'A4' },
      React.createElement(
        Text,
        { style: { fontFamily: CSR_PORTRAIT_DISPLAY_FONT, fontWeight: 'bold', fontSize: 24 } },
        'OPERATIONAL READINGS',
      ),
    ),
  )

  const bytes = await renderPdfcnToBytes(element)
  const pdf = await PDFDocument.load(bytes)
  const { width, height } = pdf.getPages()[0].getSize()
  assert.equal(Math.round(width), 595)
  assert.equal(Math.round(height), 842)

  const raw = new TextDecoder('latin1').decode(bytes)
  assert.ok(raw.includes('ArchivoBlack'), 'embedded font must be Archivo Black')
  assert.ok(raw.includes('/FontFile2'), 'TrueType font program must be embedded')
})
