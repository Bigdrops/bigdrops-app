# Role Info Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a view-first, responsive Role Info experience that preserves existing M8 role and permission semantics.

**Architecture:** Keep role data and mutations in the existing `RoleBuilder`. Add explicit view and edit state within that component. Pass existing Team Hub member data into `RoleBuilder` only for display, while holder membership continues to come from explicit assignment IDs. Use CSS media queries to rearrange one semantic Role Info tree for mobile, fold, and desktop.

**Tech Stack:** React 19, TypeScript, Tailwind utility components, scoped Settings CSS, Bun tests.

---

### Task 1: Establish view-first coverage

**Files:**
- Modify: `src/tests/settings/role-builder.test.js`
- Modify: `src/pages/settings/RoleBuilder.tsx`

- [ ] **Step 1: Add a static-render assertion for the Role Info hierarchy**

```ts
expect(html).toContain('Role Info')
expect(html).toContain('Access by area')
expect(html).toContain('Exact permission rows')
expect(html).toContain('Edit role')
```

- [ ] **Step 2: Run the focused test before implementation**

Run: `bun test src/tests/settings/role-builder.test.js`
Expected: the new Role Info assertion fails before the view-first UI exists.

- [ ] **Step 3: Model separate role selection and edit state**

```ts
const [selectedTemplate, setSelectedTemplate] = useState<PermissionTemplate | null>(null)
const [editor, setEditor] = useState<Editor | null>(null)
```

Role list buttons set `selectedTemplate`. The Role Info state renders only identity, access summary, holders, advanced pair disclosure, and owner management actions. `Edit role` initializes the existing edit state.

- [ ] **Step 4: Run the focused test**

Run: `bun test src/tests/settings/role-builder.test.js`
Expected: PASS.

### Task 2: Render canonical access and holder summaries

**Files:**
- Modify: `src/pages/settings/RoleBuilder.tsx`
- Modify: `src/pages/settings/AdminSettingsSection.tsx`

- [ ] **Step 1: Pass existing Team Hub member display data to the Role Builder**

```tsx
<RoleBuilder
  members={members}
  assignmentsByUser={assignmentsByUser}
  {...roleBuilderProps}
/>
```

`RoleBuilder` filters members by `assignmentsByUser.get(member.userId)?.has(template.id)`. It must not inspect `effectiveByUser` to determine holders.

- [ ] **Step 2: Build category summary data from the existing canonical groups**

```ts
const granted = template.items.filter(pair => group.resources.includes(pair.resource)).length
const total = group.resources.length * ROLE_ACTIONS.length
```

The wildcard resource is displayed separately as “All company resources”; no unsupported prototype resource names are introduced.

- [ ] **Step 3: Keep exact stored pairs as a secondary disclosure**

```tsx
<details className="su-perm-details">
  <summary>Exact permission rows ({template.items.length})</summary>
  {/* Stored resource/action pairs only. */}
</details>
```

- [ ] **Step 4: Confirm static behavior manually**

Inspect `RoleBuilder.tsx` to verify the only holder predicate uses `assignmentsByUser` and that no permission mutation runs in Role Info.

### Task 3: Separate the editing surface and preserve mutation behavior

**Files:**
- Modify: `src/pages/settings/RoleBuilder.tsx`

- [ ] **Step 1: Retain the existing role editor form and RPC calls**

```ts
await updatePermissionTemplate(editor.template.id, { name, description, items })
await duplicatePermissionTemplate(editor.template.id, name)
await enforcePermissionTemplate(confirmation.template.id)
await deletePermissionTemplate(confirmation.template.id)
```

No role-management, hook, RPC, migration, or permission-domain file changes are made.

- [ ] **Step 2: Keep explicit pair editing semantics**

```ts
onChange={(event) => setItems(prev => event.target.checked
  ? [...prev, pair]
  : prev.filter(row => row.resource !== resource || row.action !== action))}
```

Do not add view when another action is selected and do not cascade remove actions when view is cleared.

- [ ] **Step 3: Keep delete confirmation for Mark All and destructive lifecycle confirmations**

The existing `Include Delete` / `Exclude Delete` control remains. Synchronize and delete retain the existing alert-dialog confirmations.

### Task 4: Apply responsive visual hierarchy

**Files:**
- Modify: `src/components/settings/settings.css`

- [ ] **Step 1: Add scoped Role Info styles**

```css
.su-role-info { display: grid; gap: 16px; }
.su-role-info-layout { display: grid; gap: 18px; }
@media (min-width: 768px) { .su-role-info-layout { grid-template-columns: minmax(0, 1fr) 280px; } }
```

- [ ] **Step 2: Add action-specific ability styles**

```css
.su-perm-action-item.active[data-action='view'] { /* blue */ }
.su-perm-action-item.active[data-action='create'] { /* green */ }
.su-perm-action-item.active[data-action='edit'] { /* amber */ }
.su-perm-action-item.active[data-action='delete'] { /* red */ }
```

Colors supplement visible action labels and do not alter interaction logic.

- [ ] **Step 3: Add mobile and fold adaptations**

Mobile retains one column and usable action chips. Intermediate widths make category cards denser without duplicating data. Desktop exposes the sidebar and retains the same semantic content.

### Task 5: Verify scoped behavior

**Files:**
- Modify: `src/tests/settings/role-builder.test.js`

- [ ] **Step 1: Run type validation**

Run: `bun run typecheck`
Expected: PASS.

- [ ] **Step 2: Run focused tests**

Run: `bun test src/tests/settings/role-builder.test.js`
Expected: PASS.

- [ ] **Step 3: Check whitespace and scope**

Run: `git diff --check`
Expected: no output.

Run: `git status --short`
Expected: only Role Info files plus pre-existing unrelated worktree changes; no migration or backend file changes.

**Commit:** Omitted because the user explicitly requested no commit.

## Approved Amendments

- The focused test must verify the `library`, `info`, and `editor` surface states through a pure exported resolver and static rendering of each surface. It must prove that Role Info contains no mutable fields or permission matrix and that read-only information has no edit affordance.
- The complete reference HTML is the visual authority for the hero, badges, category cards, progress, holder sidebar, disclosure position, action hierarchy, and responsive composition.
- Holder count comes from every explicit assignment ID. Known Team Hub members render identities. Missing members render an explicit unresolved-holder row and do not reduce the count.
- Wildcard permission rows render separately as `All company resources`; they do not contribute to ordinary category totals or progress.
- Ability color vocabulary applies to Role Info summaries and edit controls: view blue, create green, edit amber, delete red.
- Duplicate, synchronize, and delete move into a secondary management disclosure. Edit remains the authorized primary action and existing confirmation dialogs remain unchanged.
- Responsive verification must inspect the one semantic tree at narrow mobile, standard mobile, intermediate/fold, and desktop breakpoints. No breakpoint duplicates role logic.
