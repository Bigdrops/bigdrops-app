---
name: waybill-template-debug
description: Investigate and fix defects in waybill PDF templates. Use when debugging waybill layout issues, signature overflow, date labels, tagline placement, footer architecture, or sequence consumption bugs. Follows a mandatory investigation-first protocol before code changes.
---

# Waybill Template Debugging Skill

This skill guides the process of investigating and fixing defects in waybill PDF templates. It enforces an investigation-first approach to prevent premature code changes.

## Mandatory Pre-Work Protocol

Before any code changes, execute this sequence:

1. **Read mandatory files** (in order):
   - `docs/PROJECTSKIILINDEX.md` - skill index
   - `AGENTS.md` - project rules and architecture
   - `src/components/waybill/waybillMinimalStyles.ts` - style definitions
   - `src/components/waybill/blankWaybillTemplate.tsx` - blank waybill template
   - `src/components/waybill/WaybillPDF.tsx` - main PDF renderer
   - `src/pages/NewWaybill.tsx` - waybill creation page

2. **Load relevant skills**:
   - `pdf-rendering-correctness` - PDF pipeline rules
   - `Karpathy` - coding discipline
   - `react-pdf` - PDF generation patterns

## Defect Investigation Methodology

### Step 1: Classify the Defect

Categorize the defect type:
- **P1 (Data Integrity)**: Sequence consumption, number generation, financial calculations
- **P2 (Layout)**: Signature overflow, footer placement, header metadata
- **P3 (Visual)**: Date labels, tagline placement, typography

### Step 2: Trace the Data Flow

For each defect, trace the complete data flow:

1. **Source**: Where does the data originate?
2. **Transformation**: How is it transformed?
3. **Rendering**: How is it rendered in the PDF?
4. **Constraints**: What business rules apply?

### Step 3: Identify Root Cause

Common root causes in waybill templates:
- **Sequence bugs**: `blank_waybill_logs` query/insert timing
- **Layout overflow**: Fixed heights, absolute positioning, flex allocation
- **Style conflicts**: Multiple style objects with conflicting properties
- **Missing constraints**: Business rules not enforced in code

## Common Defect Patterns

### 1. Signature Overflow to Page 2

**Symptom**: Signature cards and footer spill to page 2
**Investigation**:
- Check `blankWaybillTemplate.tsx` for signature card heights
- Verify flex allocation in signature zone
- Check for fixed heights causing overflow

**Fix Pattern**:
```tsx
// Use flex allocation instead of fixed heights
<View style={signatureZone}>
  <View style={styles.signatureCard}> {/* flex: 1 */}
  <View style={styles.signatureCard}> {/* flex: 1 */}
</View>
```

### 2. Date Label Missing

**Symptom**: Date field lacks visible "Date" label
**Investigation**:
- Check if label was incorrectly removed (Phone/Email/Address bans)
- Verify date field structure in template

**Fix Pattern**:
```tsx
<View style={styles.dateField}>
  <Text style={styles.dateLabel}>Date</Text>
  <View style={styles.dateInput} />
</View>
```

### 3. Tagline Placement Wrong

**Symptom**: Tagline appears between company name and address
**Investigation**:
- Check brand identity section order
- Verify tagline position relative to address/contact

**Fix Pattern**:
```tsx
// Order: Company Name → Address → Contact → Tagline
<Text style={styles.companyName}>{companyName}</Text>
<Text style={styles.address}>{address}</Text>
<Text style={styles.contact}>{contactLine}</Text>
<Text style={styles.tagline}>{tagline}</Text>
```

### 4. Footer Architecture Wrong

**Symptom**: Footer is centered instead of left/right layout
**Investigation**:
- Check footer component structure
- Verify flex direction and justification

**Fix Pattern**:
```tsx
<View style={styles.footer}>
  <Text style={styles.companyName}>{companyName}</Text> {/* left */}
  <Text style={styles.waybillNumber}>{waybillNumber}</Text> {/* right */}
</View>
// Style: flexDirection: 'row', justifyContent: 'space-between'
```

### 5. Sequence Consumption Bug

**Symptom**: Blank waybill downloads always produce same number
**Investigation**:
- Trace `blank_waybill_logs` query in `src/pages/NewWaybill.tsx`
- Check if log insert happens before/after generation
- Verify transaction rollback scenarios

**Investigation Steps**:
1. Search for `blank_waybill_logs` in codebase
2. Trace the download flow in `NewWaybill.tsx`
3. Check if sequence is consumed before rendering
4. Verify error handling doesn't skip consumption

## Verification Protocol

After fixing defects, run verification:

1. **Type Check**: `bun run typecheck`
2. **Lint**: `bun run lint`
3. **Manual Verification**: Download 3 blank waybills confirming incrementing numbers (001, 002, 003)
4. **Layout Check**: Verify single-page A4 constraint holds

## Contract Constraints

These are non-negotiable constraints for waybill templates:

- **Single Page**: Blank waybill must fit on one portrait A4 page
- **No Absolute Positioning**: Avoid `position: absolute` or fixed heights
- **Flex Allocation**: Use flex for dynamic content zones
- **Date Label**: "Date" label is required (unlike Phone/Email/Address)
- **Tagline Position**: After address and contact, not between
- **Footer Layout**: Company name left, waybill number right, center empty

## Reporting

After completing fixes, save a report to:
`docs/Task/Reports/waybill-layout-fix-[defect-type].md`

Include:
- Defect classification
- Root cause analysis
- Changes made
- Verification results
- Any remaining issues