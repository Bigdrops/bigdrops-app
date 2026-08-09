# Invoice & Quotation PDF Customization Settings Do Not Persist OFF State

## Type
Bug

## Priority
High

## Modules
- Invoice View → PDF Customization
- Quotation View → PDF Customization

## Description

The PDF customization toggles for Invoice and Quotation do not correctly persist an explicitly saved OFF state.

Custom Colors and Custom Fonts are currently ON by default. When either toggle is turned OFF and saved, the modal closes successfully, but reopening the customization modal immediately shows the toggle as ON again.

This behavior is specific to Invoice and Quotation.

### Working Control Cases

Waybill and CSR customization settings were tested and behave correctly:

- Waybill left ON → remains ON after reopening.
- Waybill turned OFF → remains OFF after reopening.
- CSR turned ON → remains ON after reopening.

Therefore, this does not appear to be a generic customization persistence problem.

## Reproduction

1. Open an Invoice or Quotation View page.
2. Open PDF customization.
3. Observe Custom Colors and/or Custom Fonts is ON.
4. Turn the toggle OFF.
5. Click Save.
6. The modal closes.
7. Reopen PDF customization.

### Current Behavior

The toggle has reverted to ON.

Example:

```text
Initial:
Custom Colors → ON

Action:
Custom Colors → OFF
Save

Reopen:
Custom Colors → ON