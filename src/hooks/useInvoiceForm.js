import { useEffect, useState, useRef } from 'react'

export function useIsNarrow() {
  const [isNarrow, setIsNarrow] = useState(window.innerWidth < 768)
  const lastWidth = useRef(window.innerWidth)
  useEffect(() => {
    const handler = () => {
      const currentWidth = window.innerWidth
      if (currentWidth === lastWidth.current) return
      lastWidth.current = currentWidth
      setIsNarrow(currentWidth < 768)
    }
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return isNarrow
}

export const makeGroupId = () =>
  `grp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

export function numberToWords(num) {
  if (!num || num === 0) return 'ZERO NAIRA ONLY'
  const ones = [
    '',
    'ONE',
    'TWO',
    'THREE',
    'FOUR',
    'FIVE',
    'SIX',
    'SEVEN',
    'EIGHT',
    'NINE',
    'TEN',
    'ELEVEN',
    'TWELVE',
    'THIRTEEN',
    'FOURTEEN',
    'FIFTEEN',
    'SIXTEEN',
    'SEVENTEEN',
    'EIGHTEEN',
    'NINETEEN',
  ]
  const tens = [
    '',
    '',
    'TWENTY',
    'THIRTY',
    'FORTY',
    'FIFTY',
    'SIXTY',
    'SEVENTY',
    'EIGHTY',
    'NINETY',
  ]
  const c = (n) => {
    if (n < 20) return ones[n]
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '')
    if (n < 1000)
      return (
        ones[Math.floor(n / 100)] +
        ' HUNDRED' +
        (n % 100 ? ' ' + c(n % 100) : '')
      )
    if (n < 1e6)
      return c(Math.floor(n / 1000)) + ' THOUSAND' + (n % 1000 ? ' ' + c(n % 1000) : '')
    if (n < 1e9)
      return c(Math.floor(n / 1e6)) + ' MILLION' + (n % 1e6 ? ' ' + c(n % 1e6) : '')
    return c(Math.floor(n / 1e9)) + ' BILLION' + (n % 1e9 ? ' ' + c(n % 1e9) : '')
  }
  const naira = Math.floor(num)
  const kobo = Math.round((num - naira) * 100)
  return c(naira) + ' NAIRA' + (kobo > 0 ? ' AND ' + c(kobo) + ' KOBO' : '') + ' ONLY'
}

export const inp = {
  width: '100%',
  padding: '8px 12px',
  border: '1px solid #ddd',
  borderRadius: '6px',
  fontSize: '16px',
  outline: 'none',
  boxSizing: 'border-box',
  color: '#1a1a1a',
  backgroundColor: 'white',
}

export const sec = {
  backgroundColor: 'white',
  padding: '24px',
  borderRadius: '8px',
  boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
  marginBottom: '20px',
}

export const secT = {
  margin: '0 0 16px 0',
  color: '#0056B3',
  fontSize: '14px',
  textTransform: 'uppercase',
  letterSpacing: '1px',
}

export const tog = (active) => ({
  padding: '5px 12px',
  fontSize: '12px',
  cursor: 'pointer',
  backgroundColor: active ? '#CC0000' : 'white',
  color: active ? 'white' : '#555',
  fontWeight: 'bold',
  border: 'none',
  outline: 'none',
})
