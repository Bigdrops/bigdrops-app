function toFiniteAmount(value) {
  const parsed =
    typeof value === 'string'
      ? Number(value.replace(/[^0-9.-]/g, '') || 0)
      : Number(value || 0)

  return Number.isFinite(parsed) ? parsed : 0
}

export function formatCurrency(value, options = {}) {
  const {
    currencySymbol = '₦',
    locale = 'en-NG',
    preserveFraction = false,
    round = false,
  } = options

  const numericAmount = round ? Math.round(toFiniteAmount(value)) : toFiniteAmount(value)
  const hasFraction = preserveFraction && Math.abs(numericAmount % 1) > 0.000001

  return `${currencySymbol}${numericAmount.toLocaleString(locale, {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: hasFraction ? 2 : 0,
  })}`
}

export function formatNaira(value, options = {}) {
  return formatCurrency(value, {
    currencySymbol: '₦',
    locale: 'en-NG',
    ...options,
  })
}
