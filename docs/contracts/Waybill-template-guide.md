```markdown
# React-PDF Template Binding Guide

Below is a template binding guide for safely consuming the `WaybillPrintModel` without reintroducing business logic, column leaks, or layout-side computation. This is written to be strictly “render-only” compliant with the engine contract.

---

## 1. Core Rule (Non-Negotiable)
Templates **MUST NOT** interpret, transform, filter, or enrich data.

* **Allowed:** Render strings, render arrays of pre-shaped rows/columns, apply static layout (styles, flex, borders), use React-PDF primitives (`Text`, `View`, `Image`).
* **Forbidden:** Compute totals, merge quantity + unit, decide visible columns, infer missing fields, normalize data, handle pagination logic beyond React-PDF built-ins.

> **👉 If logic is needed → it belongs in the engine.**

---

## 2. Input Contract
```typescript
type WaybillPrintModel = {
  branding: Branding;
  header: Header;
  parties: Parties;
  logistics: Logistics;
  table: Table;
  notes: string;
  signatures: Signatures;
  footer: Footer;
  pagination: Pagination;
};

```
## 3. Rendering Philosophy
Think in “sections only”. Templates should mirror structure exactly:
<Page> <Header /> <Parties /> <Logistics /> <Table /> <Notes /> <Signatures /> <Footer /> </Page>
## 4. Safe Field Usage Rules
### 4.1 Empty Values Rule (CRITICAL)
Engine guarantees null, undefined, or missing become "".
 * **Correct:** <Text>{model.header.poNumber}</Text>
 * **Forbidden:** <Text>{model.header.poNumber || "N/A"}</Text> ❌
### 4.2 Blank Space Preservation Rule
Blank fields are intentional for printing/manual filling. Never collapse layout.
 * **Correct:** <Text>{model.logistics.driverName}</Text>
 * **Forbidden:** {model.logistics.driverName && ( <Text>...</Text> )} ❌
## 5. Table Rendering Contract
### 5.1 Column Rules
 * **NEVER** filter, reorder, or hide columns in the template.
 * **Correct:** ```jsx
   {model.table.columns.map(col => (
   <Text key={col.key}>{col.label}</Text>
   ))}
```

### 5.2 Row Rendering
* **Render rule:**
```jsx
{model.table.rows.map((row, i) => ( 
  <View key={i} style={styles.row}> 
    {model.table.columns.map(col => ( 
      <Text key={col.key}>{row.cells[col.key]}</Text> 
    ))}
  </View> 
))}

```
### 5.3 Critical Safety Rule
**DO NOT** access raw item objects, custom_data, DB keys, or recompute qty/unit. Use only cells[col.key].
## 6. Signatures Contract
If null → render empty box. Never fallback or scale dynamically.
```jsx
{model.signatures.sender ? ( 
  <Image src={model.signatures.sender.url} /> 
) : ( 
  <View style={styles.signatureBox} /> 
)}

```
## 7. Pagination Rules (React-PDF ONLY)
 * **Page numbers:** MUST use React-PDF native renderer:
   <Text render={({ pageNumber, totalPages }) => \${pageNumber} / ${totalPages}`} />`
 * **Header repetition:** If repeatTableHeader = true, use <View wrap={false}> <TableHeader /> </View>.
 * **Forbidden:** DO NOT compute page breaks, measure content height, or split arrays manually.
## 8. Footer Contract
Footer is static per page.
 * **Structure:** [LEFT] page number | [CENTER] waybillNumber | [RIGHT] companyName
## 9. Notes Rendering
Notes are pre-sanitized and flattened. Render directly:
<Text>{model.notes}</Text>
## 10. Branding Section
Static render only. No conditional formatting, no fallback labels.
## 11. What Templates MUST NEVER DO
 * **Business logic:** qty/unit merging, condition interpretation, column selection.
 * **Data access:** custom_data, DB fields, raw Supabase payload, original waybill object.
 * **Layout logic:** pagination splitting, measuring overflow, conditional column hiding.
## 12. Mental Model
Think of the template as **“A printer that only knows how to draw what it is given.”** * Not a UI renderer.
 * Not a data transformer.
 * Not a layout engine.
 * Not a fallback system.
## 13. Contract Stability Guarantee
 * If engine changes: templates do NOT change.
 * If Table Settings changes: templates do NOT change.
 * If DB changes: templates do NOT change.
 * **Only change allowed:** Engine output contract version bump.
## 14. Golden Rule Summary
 1. **Engine** decides meaning.
 2. **Template** decides placement.
 3. **React-PDF** decides pagination.
```

```
