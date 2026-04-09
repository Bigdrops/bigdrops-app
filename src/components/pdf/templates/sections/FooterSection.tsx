import React from 'react'
import { Text } from '@react-pdf/renderer'
import type { RefrensPdfModel } from '../types'
import type { createTemplateStyles } from '../templateStyles'

type Props = {
  model: RefrensPdfModel
  styles: ReturnType<typeof createTemplateStyles>
}

export function FooterSection({ model, styles }: Props) {
  if (!model.footerText) return null

  return (
    <Text style={styles.footerNote} fixed>
      {model.footerText}
    </Text>
  )
}
