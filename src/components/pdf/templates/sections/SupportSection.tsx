import React from 'react'
import { Image, Text, View } from '@react-pdf/renderer'
import type { RefrensPdfModel } from '../types'
import type { createTemplateStyles } from '../templateStyles'

type Props = {
  model: RefrensPdfModel
  styles: ReturnType<typeof createTemplateStyles>
}

export function SupportSection({ model, styles }: Props) {
  const signatureBlock = model.supportBlocks.find((b) => b.type === 'signature')
  const otherBlocks = model.supportBlocks.filter((b) => b.type !== 'signature')

  if (otherBlocks.length === 0 && !signatureBlock) return null

  return (
    <View style={styles.supportWrap}>
      <View style={styles.supportColumn}>
        {otherBlocks.map((block, idx) => (
          <View key={idx} style={styles.supportBlock} wrap={false}>
            <Text style={styles.supportTitle}>{block.title}</Text>
            {block.type === 'bank' || block.type === 'fields' ? (
              block.rows.map((row) => (
                <View key={row.label} style={styles.supportRow}>
                  <Text style={styles.supportLabel}>{row.label}:</Text>
                  <Text style={styles.supportValue}>{row.value}</Text>
                </View>
              ))
            ) : block.type === 'text' ? (
              <Text style={styles.supportText}>{block.text}</Text>
            ) : null}
          </View>
        ))}
      </View>

      {signatureBlock?.type === 'signature' && signatureBlock.signatureUrl && (
        <View style={styles.signatureColumn} wrap={false}>
          <Text style={styles.supportTitle}>{signatureBlock.title}</Text>
          <Image src={signatureBlock.signatureUrl} style={styles.signatureImage} />
          {signatureBlock.name && <Text style={styles.signatureName}>For {signatureBlock.name}</Text>}
          {signatureBlock.role && <Text style={styles.signatureRole}>{signatureBlock.role}</Text>}
        </View>
      )}
    </View>
  )
}
