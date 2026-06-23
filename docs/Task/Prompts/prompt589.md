# ROLE

You are a Senior React + @react-pdf/renderer Engineer working on the BIGDROPS CSR module.

Before doing ANY work:

1. Read the skills index located at:
   docs/PROJECTSKIILINDEX.md

2. Load every skill relevant to PDF rendering, React layout, TypeScript and component editing.
and using - superpowers 

3. If a skill fails to load, go back to the index, locate the skill's file path, and read the skill file directly.

4. If you cannot read a required skill, STOP IMMEDIATELY.
The task is considered FAILED.

After completion, write a detailed implementation report to:

Task/reports/csr-signature-layout-fix.md

---

# TASK

This is NOT a redesign.

This is a layout correction only.

The CSR signature section has become visually broken on multiple templates.

Your job is to inspect the implementation and correct ONLY the signature layout.

Do NOT modify unrelated sections.

Do NOT redesign templates.

Do NOT change colours, spacing, typography, headers or page layout except where absolutely necessary to correct the signature section.

---

# AFFECTED TEMPLATES

Inspect all four CSR templates.

Apply fixes ONLY where the issue exists.

Current observation:

• PulseFrame appears correct.
• Crimson has the issue.
• SignalBands has the issue.
• Zinc has the issue.

Verify this before making changes.

---

# PROBLEM

The current layout stacks the designation and technician name vertically.

Example of the current behaviour:

(Signature Image)

Signature

Technical
Director

John Doe

or

(Signature Image)

Signature

Technical

John Doe

This causes text wrapping, overlapping and inconsistent vertical spacing.

The role and technician name must NEVER become separate stacked blocks.

---

# REQUIRED RESULT

The signature section should render as:

(Signature Image)

____________________

Signature

Technical Director - John Doe

or

Service Engineer - Jane Smith

The designation and technician name must behave as ONE horizontal unit.

They should not wrap independently.

They should not overlap other text.

They should not increase the height of the signature block.

---

# REQUIREMENTS

Inspect how technician names and roles are currently rendered.

Determine why they wrap vertically.

Fix the layout at the component level instead of adding template-specific hacks wherever possible.

If a shared signature component exists, update it there.

If the templates have independent implementations, update each implementation consistently.

Do NOT hardcode any designation.

Continue using the existing role and technician data.

Do NOT alter signature image sizing unless absolutely required to prevent overlap.

Do NOT modify business logic or rendering contracts.

---

# VALIDATION

Verify:

• Short technician name
• Long technician name
• Long designation
• Missing designation
• Missing technician name

Ensure:

• No overlapping text
• No vertical stacking
• No increase in signature section height
• No new page breaks introduced
• Existing signature images continue rendering correctly

---

# REPORT

Create:

Task/reports/csr-signature-layout-fix.md

Include:

- Root cause
- Files inspected
- Files modified
- Shared components updated (if any)
- Templates affected
- Before vs After behaviour
- Validation performed
- Confirmation that no unrelated layout changes were introduced