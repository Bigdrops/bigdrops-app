import React from 'react'
import type { CsrMaterialItem } from '@/domain/pdf/resolver/csr/csrPreparedContract'
import { Svg, Image, View, Text } from '../primitives'

/**
 * Authorised Cummins Specialist Vector Mark (exact path from approved HTML specifications).
 */
export const CUMMINS_LOGO_PATH_D =
  'M22.442.011L14.081.003C-4.693.003-4.693 27 14.081 27l12.846-.031v-9.807H14.51c-4.84 0-4.84-7.321 0-7.321l12.417-.02V.003L24.111 0l-.89.561c-.154-.149-.344-.038-.387-.011-.169.105-.244.226-.164.355.223.36 1.63-.847 2.231.126.334.54.138 1.168-.766 1.727-.565.349-1.299.55-1.702-.015l.932-.577c.164.1.335.085.458.003.148-.097.28-.242.167-.425-.257-.416-1.562.85-2.185-.155-.41-.663.125-1.261.637-1.578zM8.353 12.421l-.908.562-.231-.182c-.075.36-.207.556-.612.807-.536.332-1.099.201-1.559-.542l-.978-1.58.979-.605.867 1.401c.221.357.409.398.644.252.282-.175.234-.453-.015-.854l-.772-1.248.979-.605 1.606 2.594zM7.189 9.553l.898-.556.235.187c-.001-.429.449-.75.721-.863a.853.853 0 0 1 .878.096c.034-.812.61-1.045.774-1.118.646-.285 1.042.037 1.431.664l.95 1.535-.979.606-.817-1.323c-.223-.359-.393-.497-.66-.331-.287.178-.181.476.012.787l.794 1.283-.979.606-.819-1.322c-.236-.382-.382-.502-.66-.331-.287.177-.181.474.012.786l.794 1.283-.979.605-1.606-2.594zm11.096-3.278L16.679 3.68l.979-.605 1.606 2.595-.979.605zm-2.265-3.66l.979-.605.454.733-.979.606-.454-.734zm2.159.137l.894-.553.287.194c.039-.476.345-.738.711-.895.573-.245 1.039-.004 1.434.634l.962 1.555-.979.606-.849-1.372c-.163-.263-.363-.447-.644-.273-.301.187-.255.439-.05.771l.818 1.322-.979.606-1.605-2.594zM4.111 15.043c-2.637 1.632-5.022-2.176-2.385-3.808l1.198-.733.617.997-1.052.646c-1.312.809-.101 2.597 1.128 1.824l1.053-.646.617.997-1.176.723zm7.783-8.401l.898-.556.235.187c0-.429.45-.75.721-.863a.858.858 0 0 1 .878.096c.034-.812.61-1.045.773-1.118.646-.285 1.043.036 1.431.664l.95 1.535-.979.605-.817-1.322c-.222-.359-.392-.497-.661-.331-.287.178-.181.475.012.787l.794 1.283-.979.605-.818-1.322c-.236-.381-.382-.501-.661-.331-.287.178-.181.475.012.787l.794 1.283-.977.605-1.606-2.594z'

export interface AdaptiveMaterialsResult {
  columns: CsrMaterialItem[][]
  colCount: number
  layoutMode: 'empty' | 'single' | 'dual' | 'quad'
}

/**
 * Adaptive materials partitioner.
 * - 0 items: empty layout.
 * - 1–3 items: single table spanning full width for optimal legibility.
 * - 4 items: portrait uses single table; landscape uses 2 balanced columns.
 * - 5–8 items: 2 balanced columns.
 * - 9+ items: 4 columns with strict vertical reading order (01,05,09...; 02,06,10...).
 */
export function getAdaptiveMaterialColumns(
  materials: readonly CsrMaterialItem[],
  orientation: 'portrait' | 'landscape',
): AdaptiveMaterialsResult {
  const count = materials.length
  if (count === 0) {
    return { columns: [], colCount: 0, layoutMode: 'empty' }
  }

  if (count <= 3 || (count === 4 && orientation === 'portrait')) {
    return {
      columns: [Array.from(materials)],
      colCount: 1,
      layoutMode: 'single',
    }
  }

  if (count <= 8) {
    const half = Math.ceil(count / 2)
    const col1 = materials.slice(0, half)
    const col2 = materials.slice(half)
    return {
      columns: [col1, col2],
      colCount: 2,
      layoutMode: 'dual',
    }
  }

  // 9+ items: 4 columns with strict vertical sequence
  const cols: CsrMaterialItem[][] = [[], [], [], []]
  materials.forEach((item, index) => {
    cols[index % 4].push(item)
  })

  return {
    columns: cols,
    colCount: 4,
    layoutMode: 'quad',
  }
}

/**
 * Brand logo renderer: handles uploaded company logo URLs or falls back to
 * the authentic Cummins vector mark from the approved HTML specifications.
 */
export const BrandLogo: React.FC<{
  logoUrl?: string | null
  width?: number
  height?: number
  fillColor?: string
}> = ({ logoUrl, width = 24, height = 24, fillColor = '#111111' }) => {
  if (logoUrl) {
    return (
      <Image
        src={logoUrl}
        width={width}
        height={height}
        style={{ width, height }}
      />
    )
  }

  return (
    <Svg width={width} height={height} viewBox="0 0 26.927 27">
      <path d={CUMMINS_LOGO_PATH_D} fill={fillColor} />
    </Svg>
  )
}

/**
 * Signature stage renderer:
 * - If signature image URL is provided, renders the signature image.
 * - Otherwise, provides a clean blank writable line for physical handwritten completion.
 * - Never prints "SIGN WITH REAL PEN" or awkward instructions.
 */
export const SignatureStage: React.FC<{
  signatureUrl?: string | null
  height?: number
  lineColor?: string
}> = ({ signatureUrl, height = 22, lineColor = '#111111' }) => {
  if (signatureUrl) {
    return (
      <View
        style={{
          height,
          borderBottomWidth: 0.8,
          borderBottomColor: lineColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          paddingBottom: 2,
        }}
      >
        <Image
          src={signatureUrl}
          height={height - 4}
          style={{ height: height - 4 }}
        />
      </View>
    )
  }

  return (
    <View
      style={{
        height,
        borderBottomWidth: 0.8,
        borderBottomColor: lineColor,
        backgroundColor: '#ffffff',
      }}
    />
  )
}
