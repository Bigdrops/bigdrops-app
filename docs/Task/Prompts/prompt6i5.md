READ-ONLY AUDIT ONLY — NO FIXES

Goal: Identify EXACTLY how column definitions are created and how Supabase data may be leaking into Table Settings schema.

==================================================
SYSTEM A — TABLE SETTINGS
==================================================

Focus ONLY on:
- where columnVisibility is initialized
- where customColumns is initialized
- where state is merged with persisted data

Answer:

A1. What is the single source of truth for Table Settings state?
A2. How are default columns defined at initialization?
A3. Is ANY state derived from waybill.items or custom_data? (critical)
A4. Is there any function that scans keys of objects to build columns?
A5. Where is persistence handled (Supabase/localStorage)?
A6. What function mutates column definitions after load?

==================================================
SYSTEM B — JSON IMPORT
==================================================

Focus ONLY on:
- prompt generation
- apply/normalize pipeline
- any schema mutation behavior

Answer:

B1. Does import EVER modify column definitions?
B2. Does import EVER write to custom_fields.columnVisibility or customColumns?
B3. What happens when unknown keys appear in JSON?
B4. Are new keys appended anywhere automatically?

==================================================
SYSTEM C — DATA MODEL LEAKAGE

Focus ONLY on:
- custom_data usage
- items[] processing
- item normalization

Answer:

C1. Is item.custom_data ever iterated to generate UI schema?
C2. Is item_id stripped anywhere consistently?
C3. Does any mapping function convert item keys → columns?

==================================================
CRITICAL QUESTION

D1. Show EXACT code path where a Supabase value can become a UI column.
If none exists, explicitly confirm: "no schema inference from data exists".