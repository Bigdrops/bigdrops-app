import type { AppUpdateStatus } from './updateStateMachine'

/**
 * Settings display mapping for the Android update surface.
 *
 * Pure mapping from the resolved update status to a Settings row model.
 * Only a successfully resolved `up_to_date` maps to the current display;
 * `unavailable` (fetch failure, malformed policy, unknown version) maps to
 * an explicit not-determined display — never to "up to date".
 */
export type SettingsUpdateDisplayKind =
  | 'idle'
  | 'checking'
  | 'up_to_date'
  | 'available'
  | 'grace'
  | 'blocked'
  | 'unavailable'

export function mapUpdateStatusToSettingsDisplay(
  status: AppUpdateStatus,
): SettingsUpdateDisplayKind {
  switch (status) {
    case 'up_to_date':
      return 'up_to_date'
    case 'available':
      return 'available'
    case 'grace':
      return 'grace'
    case 'blocked':
      return 'blocked'
    case 'unavailable':
      return 'unavailable'
  }
}
