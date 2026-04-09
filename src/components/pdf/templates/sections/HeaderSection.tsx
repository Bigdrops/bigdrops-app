import React from 'react'
import { Image, Text, View } from '@react-pdf/renderer'
import type { RefrensPdfModel } from '../types'
import type { createTemplateStyles } from '../templateStyles'

type Props = {
  model: RefrensPdfModel
  styles: ReturnType<typeof createTemplateStyles>
}

export function HeaderSection({ model, styles }: Props) {
  return (
    <View style={styles.headerWrap}>
      <View style={styles.headerBusiness}>
        <Text style={styles.businessName}>{model.companyName}</Text>
        {model.companyTagline ? <Text style={styles.businessTagline}>{model.companyTagline}</Text> : null}
        {model.rightParty.lines.map((line, index) => (
          <Text key={`biz_${index}`} style={styles.businessLine}>
            {line}
          </Text>
        ))}
      </View>

      <View style={styles.headerMeta}>
        {model.logoUrl ? <Image src={model.logoUrl} style={styles.logo} /> : null}
        <Text style={styles.documentLabel}>{model.documentLabel}</Text>
        <Text style={styles.documentNumber}>{model.documentNumber}</Text>
        
        {model.metaEntries.map((entry) => (
          <View key={entry.label} style={styles.metaRow}>
            <Text style={styles.metaLabel}>{entry.label}:</Text>
            <Text style={styles.metaValue}>{entry.value}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}
