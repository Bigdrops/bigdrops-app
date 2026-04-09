import React from 'react'
import { Text, View } from '@react-pdf/renderer'
import type { RefrensPdfModel } from '../types'
import type { createTemplateStyles } from '../templateStyles'

type Props = {
  model: RefrensPdfModel
  styles: ReturnType<typeof createTemplateStyles>
}

export function PartiesSection({ model, styles }: Props) {
  return (
    <View style={styles.partiesWrap}>
      <View style={styles.partyCard}>
        <Text style={styles.partyLabel}>{model.leftParty.label}</Text>
        <Text style={styles.partyName}>{model.leftParty.name}</Text>
        {model.leftParty.lines.map((line, index) => (
          <Text key={`left_${index}`} style={styles.partyLine}>
            {line}
          </Text>
        ))}
      </View>

      <View style={styles.partyCard}>
        <Text style={styles.partyLabel}>{model.rightParty.label}</Text>
        <Text style={styles.partyName}>{model.rightParty.name}</Text>
        {model.rightParty.lines.map((line, index) => (
          <Text key={`right_${index}`} style={styles.partyLine}>
            {line}
          </Text>
        ))}
      </View>
    </View>
  )
}
