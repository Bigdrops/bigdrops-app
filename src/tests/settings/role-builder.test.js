import { beforeEach, describe, expect, mock, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { ROLE_ACTIONS, ROLE_RESOURCES, categoryState, markCategory, permissionCovers, removedPermissions } from '../../domain/team/role-permissions'
import { buildGroups } from '../../pages/settings/settings-config'

const rpc = mock(async () => ({ data: 'role-id', error: null }))
mock.module('@/supabase', () => ({ supabase: { rpc } }))
const roles = await import('../../domain/team/role-management')

beforeEach(() => { rpc.mockClear(); rpc.mockImplementation(async () => ({ data: 'role-id', error: null })) })

describe('canonical permission editor', () => {
  test('matches the backend resource and action vocabulary', () => {
    const sql = readFileSync('supabase/migrations/20260915220000_role_assignments_and_template_management.sql', 'utf8')
    const canonical = sql.split('RETURN p_resource IN (')[1].split(');')[0]
    const resources = [...canonical.matchAll(/'([^']+)'/g)].map(match => match[1])
    expect(ROLE_RESOURCES.map(([resource]) => resource).sort()).toEqual(resources.sort())
    expect(ROLE_ACTIONS).toEqual(['view', 'create', 'edit', 'delete'])
  })

  test('None / Partial / All counts explicit selections, including deliberate delete', () => {
    expect(categoryState([], 'invoice')).toBe('None')
    const withoutDelete = markCategory([], 'invoice', false, () => true)
    expect(categoryState(withoutDelete, 'invoice')).toBe('Partial')
    expect(withoutDelete.some(pair => pair.action === 'delete')).toBe(false)
    const all = markCategory(withoutDelete, 'invoice', true, () => true)
    expect(categoryState(all, 'invoice')).toBe('All')
    expect(all).toHaveLength(4)
    expect(markCategory(all, 'invoice', false, () => true)).toHaveLength(3)
  })

  test('mark all respects the ceiling and preserves other categories', () => {
    const original = [{ resource: 'quotation', action: 'view' }]
    const result = markCategory(original, 'invoice', true, pair => pair.action === 'view')
    expect(result).toEqual([...original, { resource: 'invoice', action: 'view' }])
    expect(original).toHaveLength(1)
  })

  test('coverage recognizes wildcard grants without inferring assignments', () => {
    expect(permissionCovers({ resource: '*', action: 'view' }, { resource: 'invoice', action: 'view' })).toBe(true)
    expect(permissionCovers({ resource: '*', action: 'view' }, { resource: 'invoice', action: 'edit' })).toBe(false)
    expect(permissionCovers({ resource: 'invoice', action: 'edit' }, { resource: '*', action: 'edit' })).toBe(false)
  })

  test('warns about subtraction, including replacing wildcard with one resource', () => {
    expect(removedPermissions([{ resource: '*', action: 'edit' }], [{ resource: 'invoice', action: 'edit' }])).toHaveLength(1)
    expect(removedPermissions([{ resource: 'invoice', action: 'edit' }], [{ resource: '*', action: 'edit' }])).toHaveLength(0)
  })
})

describe('existing role RPC contracts', () => {
  const definition = { name: ' Site lead ', description: 'Site work', items: [{ resource: 'invoice', action: 'edit' }] }
  test('create sends canonical rows to the workspace RPC', async () => {
    expect(await roles.createPermissionTemplate('workspace-id', definition)).toBe('role-id')
    expect(rpc).toHaveBeenCalledWith('create_permission_template', { p_workspace_id: 'workspace-id', p_name: 'Site lead', p_description: 'Site work', p_items: definition.items })
  })
  test('Save calls update only, never destructive sync', async () => {
    await roles.updatePermissionTemplate('role-id', { ...definition, items: [] })
    expect(rpc).toHaveBeenCalledTimes(1)
    expect(rpc.mock.calls[0]).toEqual(['update_permission_template', { p_template_id: 'role-id', p_name: 'Site lead', p_description: 'Site work', p_items: [] }])
  })
  test('duplicate and deletion delegate to their own RPCs', async () => {
    await roles.duplicatePermissionTemplate('role-id', ' Copy ')
    await roles.deletePermissionTemplate('role-id')
    expect(rpc.mock.calls).toEqual([
      ['duplicate_permission_template', { p_template_id: 'role-id', p_new_name: 'Copy' }],
      ['delete_permission_template', { p_template_id: 'role-id' }],
    ])
  })
  test('enforce is a separate explicit operation', async () => {
    rpc.mockImplementation(async () => ({ data: 3, error: null }))
    expect(await roles.enforcePermissionTemplate('role-id')).toBe(3)
    expect(rpc).toHaveBeenCalledWith('sync_permission_template_assignments', { p_template_id: 'role-id', p_mode: 'enforce' })
  })
  test('backend rejection is preserved', async () => {
    rpc.mockImplementation(async () => ({ data: null, error: new Error('Only the workspace owner can manage roles') }))
    await expect(roles.createPermissionTemplate('workspace-id', definition)).rejects.toThrow('Only the workspace owner')
  })
})

test('all 17 settings stay reachable in their corrected scope with owner gates', () => {
  const groups = buildGroups(true, true)
  expect(groups.flatMap(group => group.items)).toHaveLength(17)
  expect(groups.find(group => group.id === 'workspace').items.map(item => item.id)).toContain('team')
  const company = groups.find(group => group.id === 'company').items.map(item => item.id)
  expect(company[0]).toBe('company-manage')
  expect(company).toContain('documents')
  expect(company).toContain('archives')
  expect(groups.find(group => group.id === 'account').items.map(item => item.id)).toContain('theme')
  expect(buildGroups(false, false).flatMap(group => group.items).map(item => item.id)).not.toContain('devices')
})
