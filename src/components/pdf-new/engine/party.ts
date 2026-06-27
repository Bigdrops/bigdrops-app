type PartyInput = {
  name?: string | null
  address?: string | null
  cityState?: string | null
  phone?: string | null
  email?: string | null
  website?: string | null
  customInfo?: Array<{ label: string; value: string }>
}

type PartyLine = {
  key: string
  value: string
  type: 'name' | 'address' | 'cityState' | 'phone' | 'email' | 'website' | 'custom'
}

export function buildPartyLines(party: PartyInput): PartyLine[] {
  const lines: PartyLine[] = []

  if (party.name) {
    lines.push({ key: 'name', value: party.name, type: 'name' })
  }
  if (party.address) {
    lines.push({ key: 'address', value: party.address, type: 'address' })
  }
  if (party.cityState) {
    lines.push({ key: 'cityState', value: party.cityState, type: 'cityState' })
  }
  if (party.phone) {
    lines.push({ key: 'phone', value: party.phone, type: 'phone' })
  }
  if (party.email) {
    lines.push({ key: 'email', value: party.email, type: 'email' })
  }
  if (party.website) {
    lines.push({ key: 'website', value: party.website, type: 'website' })
  }
  if (party.customInfo?.length) {
    for (const entry of party.customInfo) {
      if (entry.value) {
        lines.push({
          key: `custom-${entry.label}`,
          value: `${entry.label}: ${entry.value}`,
          type: 'custom',
        })
      }
    }
  }

  return lines
}
