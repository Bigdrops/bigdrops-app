import React from 'react'
import { View, Text, StyleSheet } from '@react-pdf/renderer'

const NOTE_HEIGHT = 30 // mm

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderStyle: 'solid',
    borderRadius: 4,
    height: NOTE_HEIGHT,
    overflow: 'hidden',
    padding: 6,
  },
  label: {
    fontSize: 7,
    fontWeight: 'bold',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  text: {
    fontSize: 8,
    lineHeight: 1.4,
    color: '#111827',
    maxLines: 5,
    textOverflow: 'ellipsis',
  },
})

export function ClientNotesBlock({ comments }: { comments?: string }) {
  if (!comments || !comments.trim()) return null

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>Client Notes</Text>
      <Text style={styles.text}>{comments}</Text>
    </View>
  )
}
