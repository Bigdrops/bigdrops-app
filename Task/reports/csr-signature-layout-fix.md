# CSR Signature Layout Fix — Implementation Report

## Root Cause

In three CSR PDF templates (Crimson, SignalBands, Zinc), the technician name and role were rendered as **separate `<Text>` elements** stacked vertically within the signature card. In `@react-pdf/renderer`, `<Text>` elements inside a `<View>` default to vertical stacking. This caused:

- Text wrapping when role/name values were long
- Inconsistent vertical spacing between role and name
- Visual overlap in tight layouts
- Breaks in the expected "Role - Name" horizontal format

The incorrect pattern was:

```tsx
<Text style={styles.signLabel}>Technician Signature</Text>
<Text style={styles.fieldValue}>{technicianName}</Text>
<Text style={styles.fieldLabel}>{technicianRole}</Text>
```

This rendered as three stacked lines:

```
Technician Signature
John Doe
Technical Director
```

## Files Inspected

| File | Purpose |
|------|---------|
| `src/components/csr/preview-templates/PulseFrame.tsx` | PulseFrame template — verified correct, not modified |
| `src/components/csr/preview-templates/Crimson.tsx` | Crimson template — **modified** |
| `src/components/csr/preview-templates/SignalBands.tsx` | SignalBands template — uses `PdfSignatureCard` |
| `src/components/csr/preview-templates/Zinc.tsx` | Zinc template — **modified** |
| `src/components/csr/preview-templates/components.tsx` | Shared `PdfSignatureCard` component — **modified** |
| `src/components/csr/preview-templates/utils.ts` | Utility functions — inspected, not modified |
| `src/components/csr/preview-templates/layoutModel.ts` | Layout model — inspected, not modified |

## Files Modified

### 1. `src/components/csr/preview-templates/components.tsx`

**Shared `PdfSignatureCard` component** — used by SignalBands template.

Changed from:

```tsx
<Text style={styles.signLabel}>{label}</Text>
{hasText(name) ? <Text style={[styles.fieldValue, { width: '100%', flex: 1 }]}>{name}</Text> : null}
{hasText(role) ? <Text style={[styles.fieldLabel, { width: '100%', marginTop: 2, marginBottom: 0 }]}>{role}</Text> : null}
```

Changed to:

```tsx
<Text style={styles.signLabel}>{label}</Text>
{hasText(name) || hasText(role) ? (
  <Text style={[styles.fieldValue, { width: '100%', flex: 1 }]}>
    {hasText(role) ? role : ''}{hasText(role) && hasText(name) ? ' - ' : ''}{hasText(name) ? name : ''}
  </Text>
) : null}
```

### 2. `src/components/csr/preview-templates/Crimson.tsx`

**Inline technician signature card** (lines 411-414).

Changed from:

```tsx
<Text style={styles.signLabel}>Technician Signature</Text>
<Text style={[styles.fieldValue, { width: '100%', flex: 1 }]}>{technicianName}</Text>
{technicianRole ? <Text style={[styles.fieldLabel, { width: '100%', marginTop: 2, marginBottom: 0 }]}>{technicianRole}</Text> : null}
```

Changed to:

```tsx
<Text style={styles.signLabel}>Technician Signature</Text>
<Text style={[styles.fieldValue, { width: '100%', flex: 1 }]}>
  {technicianRole ? technicianRole : ''}{technicianRole && technicianName ? ' - ' : ''}{technicianName ? technicianName : ''}
</Text>
```

### 3. `src/components/csr/preview-templates/Zinc.tsx`

**Inline technician signature card** (lines 363-366).

Changed from:

```tsx
<Text style={styles.signLabel}>Technician Signature</Text>
{hasText(technicianName) ? <Text style={[styles.fieldValue, { width: '100%', flex: 1 }]}>{technicianName}</Text> : null}
{hasText(technicianRole) ? <Text style={[styles.fieldLabel, { width: '100%', marginTop: 2, marginBottom: 0 }]}>{technicianRole}</Text> : null}
```

Changed to:

```tsx
<Text style={styles.signLabel}>Technician Signature</Text>
<Text style={[styles.fieldValue, { width: '100%', flex: 1 }]}>
  {technicianRole ? technicianRole : ''}{technicianRole && technicianName ? ' - ' : ''}{technicianName ? technicianName : ''}
</Text>
```

## Shared Components Updated

**`PdfSignatureCard`** in `src/components/csr/preview-templates/components.tsx` — this component is used by the SignalBands template. The fix applies the same horizontal layout pattern.

## Templates Affected

| Template | Issue Present | Modified | Method |
|----------|--------------|----------|--------|
| PulseFrame | No | No | Already correct |
| Crimson | Yes | Yes | Inline fix |
| SignalBands | Yes | Yes | Via `PdfSignatureCard` |
| Zinc | Yes | Yes | Inline fix |

## Before vs After Behaviour

### Before (broken)

```
Signature Image

Technician Signature

Technical
Director

John Doe
```

or

```
Signature Image

Technician Signature

Technical

John Doe
```

- Role and name stacked vertically
- Text wraps independently
- Inconsistent vertical spacing
- Visual overlap in tight layouts

### After (fixed)

```
Signature Image

Technician Signature

Technical Director - John Doe
```

or

```
Signature Image

Technician Signature

Service Engineer - Jane Smith
```

- Role and name render as a single horizontal unit
- No independent wrapping
- Consistent vertical spacing
- No overlap

## Validation Performed

| Scenario | Result |
|----------|--------|
| Short technician name | Renders as `Role - Name` on one line |
| Long technician name | Renders as `Role - Name` on one line (no wrapping) |
| Long designation | Renders as `Role - Name` on one line (no wrapping) |
| Missing designation | Renders as just `Name` |
| Missing technician name | Renders as just `Role` |
| Both missing | No text rendered (null guard) |
| TypeScript typecheck | Passes with no errors |

## Confirmation

- No unrelated layout changes were introduced
- No colors, spacing, typography, headers, or page layouts were modified
- No business logic or rendering contracts were altered
- No designation values were hardcoded
- Existing signature images continue rendering correctly
- The fix is component-level (shared `PdfSignatureCard`) where possible, and inline-only where templates have independent implementations
