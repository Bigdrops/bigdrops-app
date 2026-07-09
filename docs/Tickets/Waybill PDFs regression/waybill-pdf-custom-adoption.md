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