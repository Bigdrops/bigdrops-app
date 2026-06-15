Yes — here’s the full plan as it stands now, clean and locked.

1. Current app direction

You are building toward a hybrid system:

Web / PC app

online-first

global numbering

central backend authority


APK app

online first login

offline-capable after first login

local SQLite cache

device-based numbering

sync back to server


Backend

Supabase stays

ASP.NET gets added for dangerous write commands




---

2. Auth and offline policy

Login

first login must be online

after successful login, session is saved locally

app can reopen offline


Offline access window

user gets 48 hours max offline access from last successful online contact

if no internet after 48 hours:

app blocks access to business operations

user must reconnect



Sign out

sign out clears local session

timeout/re-auth policy can still apply later


Local storage split

secure storage: auth/session, last online time, expiry window

SQLite: business data, drafts, pending sync queue



---

3. Numbering policy

Web / PC

keeps global numbering

server-generated

central +1


APK

no global numbering

uses device-based numbering

number created on device is final

no automatic renumber on sync


Why

Because changing a number after user has already sent/shared a document is bad.

APK number format

Use device-coded numbers, for example:

SASINV-LA001

SASQUO-LA002

SASCSR-LA004

SASWB-LA003


Where LA is a unique device code.

Server rule

Server must recognize:

global source

device source


and must not treat APK-created numbers like central web numbers.

Manual number changes

Allowed only as override:

unique check required

audited

ideally admin-only

links must always use internal id, not number



---

4. Data/source-of-truth model

Supabase stays for

database

auth

storage

reads

simple search/list flows


ASP.NET is added for

destructive writes

multi-step business commands

validation-heavy workflows

audit-worthy operations


SQLite on APK is for

local cache

offline reads

unsynced writes

sync queue


Not for replacing backend truth.


---

5. Frontend refactor status

You already broke down ViewInvoice substantially.

Done:

action UI extraction

detail data hook

invoice view model

shared action-state resolver

shared invoice action definitions

payment section/dialog extraction

preview model extraction

invoice mutations hook extraction


Meaning:

frontend seams are now clean enough for backend command integration



---

6. Backend rollout plan

First ASP.NET command slice

Already started:

POST /api/invoices/{invoiceId}/revert-to-quotation


Next backend commands, in order

1. POST /api/payments/{paymentId}/void


2. POST /api/invoices/{invoiceId}/generate-csr


3. POST /api/invoices/{invoiceId}/generate-waybill


4. POST /api/invoices/{invoiceId}/attach-csr


5. POST /api/invoices/{invoiceId}/attach-waybill


6. later:

archive/delete/status transitions

project commands




Principle

Move dangerous writes first, not reads.


---

7. Relationship model

Already in place

invoice ↔ CSR via linked_invoice_id

invoice ↔ waybill via invoice_id

invoice/quotation source-child history partly via existing metadata


Current UI behavior

Link to Project vs View Project

Link Documents vs Linked Documents

attach existing CSR/waybill flows

linked-documents sheet


Next relationship rule

Keep using real FK-style links where possible. Do not build a giant generic lineage engine yet.


---

8. APK / offline architecture

Phase 1

wrap app with Capacitor

build Android shell

keep login online-only


Phase 2

add SQLite local store

cache core records:

clients

invoices

quotations

CSR

waybills

projects later



Phase 3

add sync queue

offline-created docs save locally with final device number

sync pushes same number to server unchanged


Phase 4

conflict handling

audit/status for synced vs pending docs



---

9. What not to do yet

Do not do these now:

full Projects refactor

repo-wide inline CSS migration

giant generic document engine

full offline for every feature

moving all reads to ASP.NET

global numbering on APK



---

10. Immediate next steps

Before GitHub upload

Push the current refactor/backend slice as-is.

After upload

Next practical order:

1. stabilize ViewInvoice crash fix on repo


2. backend parity check for revert-to-quotation


3. add void payment ASP.NET command


4. start Capacitor Android shell


5. define device-code numbering table/policy


6. add SQLite local cache design


7. then offline sync queue




---

11. Final architecture in one sentence

Web/PC stays online with global numbering; APK works offline for up to 48 hours with device-based final numbering; Supabase remains the platform backend; ASP.NET becomes the command layer for risky writes; SQLite becomes the APK local store and sync queue.

If you want, after you upload to GitHub, I’ll turn this into a proper implementation roadmap by phases and milestones.