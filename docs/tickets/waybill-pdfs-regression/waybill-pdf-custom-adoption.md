# Waybill PDF Regression Ticket — Minimal/Thermal Download Crash & Premium Waybill Number Overflow

**Status:** Open  
**Priority:** High (Non-blocking)  
**Component:** Waybill PDF Rendering  
**Affected Templates:** Minimal, Thermal, Premium

---

# Background

During the PDF Customization Engine integration (Phase 2.x), the Waybill rendering pipeline was successfully migrated to the shared customization engine.

The majority of functionality is now working correctly:

- ✅ Ink Font propagation
- ✅ Ink Colour propagation
- ✅ Template customization persistence
- ✅ Classic template
- ✅ Evergreen template
- ✅ Premium template (except issue below)

To avoid delaying the broader PDF customization rollout, the remaining regressions are intentionally deferred to this ticket.

---

# Issue 1 — Minimal & Thermal PDF Download Crash

## Severity

High

## Current Behaviour

Generating or downloading PDFs using:

- Minimal
- Thermal

fails at runtime.

The PDF is not generated.

Runtime error:

```text
Cannot read properties of null
```

This occurs regardless of customization state.

The crash happens whether:

- Ink Font override is ON
- Ink Font override is OFF
- Ink Colour override is ON
- Ink Colour override is OFF

Therefore the regression is **not** caused by the switch UX.

---

## Expected Behaviour

Minimal and Thermal templates should generate PDFs successfully under all customization states.

No runtime exceptions.

---

## Investigation Notes

This appears to be a rendering-path issue rather than a customization-state issue.

Likely causes include:

- null style reference
- null preset reference
- bridge mapping returning an unexpected value
- unresolved template data
- null object accessed during React PDF rendering

Do **not** assume the customization engine is at fault.

Trace the complete rendering path.

---

## Recommended Investigation

Audit:

- MinimalTemplate
- ThermalTemplate

Trace:

ResolvedPdfCustomization

↓

bridgeToDesignPreset()

↓

WaybillPDF

↓

Template Props

↓

React PDF renderer

Locate the first null reference instead of patching symptoms.

---

# Issue 2 — Premium Waybill Number Overflow

## Severity

Medium

## Current Behaviour

Premium template still does not correctly accommodate long Waybill numbers.

Only part of the value remains visible.

Example:

```text
WAYBILL-2026-0000123456789
```

renders with the trailing digits visible while the beginning of the identifier is clipped.

The previous font-size reduction was insufficient.

---

## Expected Behaviour

The complete Waybill number should always remain visible.

No clipping.

No bleeding outside the allocated area.

No truncation.

---

## Acceptable Solutions

The implementation is free to choose the most appropriate approach.

Possible solutions include:

- responsive font scaling
- width-aware text fitting
- container resizing
- layout adjustment
- repositioning

The visual integrity of the Premium template should be preserved.

---

# Out of Scope

This ticket must **not**:

- modify the PDF Customization Engine
- modify resolver logic
- modify customization persistence
- modify capability declarations
- redesign any Waybill template
- introduce unrelated refactors

---

# Acceptance Criteria

## Minimal

- PDF downloads successfully
- No runtime exceptions
- All existing rendering preserved

## Thermal

- PDF downloads successfully
- No runtime exceptions
- All existing rendering preserved

## Premium

- Complete Waybill number always visible
- No clipping
- No overflow
- No truncation
- Layout remains visually balanced

---

# Notes

These regressions were intentionally deferred so that the completed PDF Customization Engine rollout could continue without blocking subsequent document-family migrations.

This ticket should be resolved independently without affecting the now-stable customization architecture.




error:


PS C:\Users\DELL> cd desktop\bigdrops-app
PS C:\Users\DELL\Desktop\bigdrops-app> bun run typecheck
$ tsc --noEmit
src/components/waybill/MinimalTemplate.tsx:368:55 - error TS2304: Cannot find name 'fillableBold'.

368               <Text style={{ fontSize: 9, fontFamily: fillableBold, color: fillableColor, marginTop: 2 }}>{model.parties.clientName || ''}</Text>
                                                          ~~~~~~~~~~~~

src/components/waybill/MinimalTemplate.tsx:368:76 - error TS2304: Cannot find name 'fillableColor'.

368               <Text style={{ fontSize: 9, fontFamily: fillableBold, color: fillableColor, marginTop: 2 }}>{model.parties.clientName || ''}</Text>
                                                                               ~~~~~~~~~~~~~

src/components/waybill/MinimalTemplate.tsx:384:55 - error TS2304: Cannot find name 'fillableBold'.

384               <Text style={{ fontSize: 9, fontFamily: fillableBold, color: fillableColor }}>{model.logistics.deliveryLocation || ''}</Text>
                                                          ~~~~~~~~~~~~

src/components/waybill/MinimalTemplate.tsx:384:76 - error TS2304: Cannot find name 'fillableColor'.

384               <Text style={{ fontSize: 9, fontFamily: fillableBold, color: fillableColor }}>{model.logistics.deliveryLocation || ''}</Text>
                                                                               ~~~~~~~~~~~~~

src/components/waybill/MinimalTemplate.tsx:392:55 - error TS2304: Cannot find name 'fillableBold'.

392               <Text style={{ fontSize: 9, fontFamily: fillableBold, color: fillableColor }}>{model.logistics.vehiclePlate || ''}</Text>
                                                          ~~~~~~~~~~~~

src/components/waybill/MinimalTemplate.tsx:392:76 - error TS2304: Cannot find name 'fillableColor'.

392               <Text style={{ fontSize: 9, fontFamily: fillableBold, color: fillableColor }}>{model.logistics.vehiclePlate || ''}</Text>
                                                                               ~~~~~~~~~~~~~

src/components/waybill/MinimalTemplate.tsx:396:55 - error TS2304: Cannot find name 'fillableBold'.

396               <Text style={{ fontSize: 9, fontFamily: fillableBold, color: fillableColor }}>{model.logistics.driverName || ''}</Text>
                                                          ~~~~~~~~~~~~

src/components/waybill/MinimalTemplate.tsx:396:76 - error TS2304: Cannot find name 'fillableColor'.

396               <Text style={{ fontSize: 9, fontFamily: fillableBold, color: fillableColor }}>{model.logistics.driverName || ''}</Text>
                                                                               ~~~~~~~~~~~~~

src/components/waybill/MinimalTemplate.tsx:486:59 - error TS2304: Cannot find name 'fillableBold'.

486                   <Text style={{ fontSize: 8, fontFamily: fillableBold, color: fillableColor }}>
                                                              ~~~~~~~~~~~~

src/components/waybill/MinimalTemplate.tsx:486:80 - error TS2304: Cannot find name 'fillableColor'.

486                   <Text style={{ fontSize: 8, fontFamily: fillableBold, color: fillableColor }}>
                                                                                   ~~~~~~~~~~~~~

src/components/waybill/MinimalTemplate.tsx:507:59 - error TS2304: Cannot find name 'fillableBold'.

507                   <Text style={{ fontSize: 8, fontFamily: fillableBold, color: fillableColor }}>
                                                              ~~~~~~~~~~~~

src/components/waybill/MinimalTemplate.tsx:507:80 - error TS2304: Cannot find name 'fillableColor'.

507                   <Text style={{ fontSize: 8, fontFamily: fillableBold, color: fillableColor }}>
                                                                                   ~~~~~~~~~~~~~

src/components/waybill/ThermalTemplate.tsx:508:44 - error TS2304: Cannot find name 'fillableBold'.

508                 <Text style={{ fontFamily: fillableBold, color: fillableColor }}>{model.notes || ''}</Text>
                                               ~~~~~~~~~~~~

src/components/waybill/ThermalTemplate.tsx:508:65 - error TS2304: Cannot find name 'fillableColor'.

508                 <Text style={{ fontFamily: fillableBold, color: fillableColor }}>{model.notes || ''}</Text>
                                                                    ~~~~~~~~~~~~~

src/components/waybill/ThermalTemplate.tsx:518:46 - error TS2304: Cannot find name 'fillableBold'.

518                   <Text style={{ fontFamily: fillableBold, color: fillableColor }}>{model.parties.senderName || model.branding.name || ''}</Text>
                                                 ~~~~~~~~~~~~

src/components/waybill/ThermalTemplate.tsx:518:67 - error TS2304: Cannot find name 'fillableColor'.

518                   <Text style={{ fontFamily: fillableBold, color: fillableColor }}>{model.parties.senderName || model.branding.name || ''}</Text>
                                                                      ~~~~~~~~~~~~~

src/components/waybill/ThermalTemplate.tsx:539:46 - error TS2304: Cannot find name 'fillableBold'.

539                   <Text style={{ fontFamily: fillableBold, color: fillableColor }}>{model.parties.receiverName || ''}</Text>
                                                 ~~~~~~~~~~~~

src/components/waybill/ThermalTemplate.tsx:539:67 - error TS2304: Cannot find name 'fillableColor'.

539                   <Text style={{ fontFamily: fillableBold, color: fillableColor }}>{model.parties.receiverName || ''}</Text>
                                                                      ~~~~~~~~~~~~~


Found 18 errors in 2 files.

Errors  Files
    12  src/components/waybill/MinimalTemplate.tsx:368
     6  src/components/waybill/ThermalTemplate.tsx:508
PS C:\Users\DELL\Desktop\bigdrops-app>