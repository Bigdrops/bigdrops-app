export type TeamMember = {
  userId: string
  membershipId: string
  email: string
  name: string
  initials: string
  avatarUrl: string | null
  joinedAt: string
  role: 'owner' | 'member'
  isCurrentUser: boolean
}

export function deriveNameFromEmail(email: string): string {
  const local = email.split('@')[0] || email
  // ponytail: simple split on .,_,- → Title Case, no lib
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ')
}

export function deriveInitials(name: string, email: string): string {
  const source = name || email
  const parts = source.split(/[\s._@-]+/).filter(Boolean)
  if (parts.length === 0) return email.slice(0, 2).toUpperCase()
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}
