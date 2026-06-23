import React from 'react'
import { View, Text, StyleSheet } from '@react-pdf/renderer'

const blankLineStyle = StyleSheet.create({
  line: {
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
    borderBottomStyle: 'solid',
    height: 24,
    marginBottom: 4,
  },
})

function BlankLine() {
  return <View style={blankLineStyle.line} />
}

const boxStyles = StyleSheet.create({
  wrapper: {
    marginTop: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#d1d5db',
    borderTopStyle: 'solid',
  },
  label: {
    fontSize: 8,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  text: {
    fontSize: 9,
    lineHeight: 1.6,
    color: '#111827',
  },
})

export function ClientNotesBlock({ comments }: { comments?: string }) {
  return (
    <View style={boxStyles.wrapper}>
      <Text style={boxStyles.label}>Client Notes</Text>
      {comments ? (
        <Text style={boxStyles.text}>{comments}</Text>
      ) : (
        <>
          <BlankLine />
          <BlankLine />
          <BlankLine />
        </>
      )}
    </View>
  )
}
