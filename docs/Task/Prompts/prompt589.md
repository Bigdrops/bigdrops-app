ROLE

You are a Senior React PDF Engineer working on the BIGDROPS project.

Your task is to repair the CSR PDF signature section only.

---

REQUIRED SKILL LOADING (MANDATORY)

Before writing or modifying any code:

1. Read:

"docs/PROJECTSKIILINDEX.md"

2. Load the following skills exactly as listed:

- using-superpowers
- react-pdf

3. If the skill loader cannot locate them, manually open the files using the paths provided inside "PROJECTSKIILINDEX.md".

4. If the required skills cannot be loaded, stop immediately and report the failure.

---

OBJECTIVE

Repair the technician signature section across every CSR PDF template.

Templates:

- PulseFrame
- SignalBands
- Crimson
- Zinc

This is a layout repair only.

Do not redesign any other section.

Do not modify business logic.

Do not modify calculations.

Do not modify unrelated components.

---

CURRENT BUGS

The previous implementation is incorrect.

Current behaviour:

- Signature image does not display correctly.
- Technician name occupies the signature drawing area.
- The vertical divider never appears.
- The signature box layout is broken.

This implementation must be discarded.

---

REQUIRED LAYOUT

The signature card must be ONE bordered rectangle divided into TWO equal columns.

Required visual layout:

┌──────────────────────────────────────┐
│                                      │
│  Signature Image   │   John Doe      │
│                    │                 │
│   Signature        │                 │
│                    │                 │
└──────────────────────────────────────┘

LEFT COLUMN

Contains ONLY:

- Signature image
- "Signature" label

Nothing else.

RIGHT COLUMN

Contains ONLY:

- Technician name

Nothing else.

No role.

No designation.

No "Technical Director".

No stacked labels.

No additional text.

---

REQUIRED IMPLEMENTATION

Implement the layout using a true two-column React PDF structure.

Example:

<View style={styles.signatureCard}>

  <View style={styles.leftColumn}>
    {signatureUrl ? (
      <Image
        src={signatureUrl}
        style={styles.signatureImage}
      />
    ) : null}

    <Text style={styles.signatureLabel}>
      Signature
    </Text>
  </View>

  <View style={styles.verticalDivider} />

  <View style={styles.rightColumn}>
    <Text style={styles.nameText}>
      {technicianName}
    </Text>
  </View>

</View>

Required style characteristics:

- "signatureCard"
  
  - "flexDirection: "row""

- "leftColumn"
  
  - "flex: 1"
  - centered vertically
  - centered horizontally

- "verticalDivider"
  
  - width: 1
  - visible border color
  - stretches full card height

- "rightColumn"
  
  - "flex: 1"
  - centered vertically
  - centered horizontally

The divider MUST be its own View.

Do not fake the divider using margins, borders, or nested layouts.

---

STRICT REQUIREMENTS

The following MUST all be true.

✓ Signature image renders.

✓ Technician name renders.

✓ Technician name never enters the signature area.

✓ Signature image never enters the name area.

✓ Vertical divider is visible.

✓ Both columns have equal width.

✓ Layout is identical across:

- PulseFrame
- SignalBands
- Crimson
- Zinc

---

DO NOT

Do NOT redesign the acknowledgement section.

Do NOT change spacing outside the signature card.

Do NOT remove borders.

Do NOT change page flow.

Do NOT modify any unrelated PDF component.

Do NOT modify CsrRenderModel.

Do NOT modify database logic.

---

VALIDATION

Before completion:

- Run "bun run typecheck"
- Ensure zero TypeScript errors.
- Generate and visually verify all four PDF templates.

Confirm:

- Signature image appears.
- Name appears.
- Divider is visible.
- Name and signature never overlap.
- All four templates render identically.

If any template still places the name inside the signature area, the task is NOT complete.

---

DELIVERABLE

After implementation, write a detailed implementation report.

Save it to:

"Task/reports/csr-signature-layout-repair.md"

The report must include:

- Root cause.
- Files modified.
- Components modified.
- Exact layout changes.
- Validation performed.
- Typecheck results.
- Visual verification results for all four templates.
- Confirmation that no unrelated functionality was changed.