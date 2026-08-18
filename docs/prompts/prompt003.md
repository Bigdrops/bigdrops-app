OFFLINE SYNC — DEFERRED

Do not implement or repair offline synchronization in this pass.

The existing quotation/CSR offline-sync modules are not currently a
working production feature and must not block the final multi-tenancy
cutover.

Create a concise technical ticket/report documenting:

- Current quotation offline-sync implementation.
- Current CSR offline-sync implementation.
- Where they are invoked.
- Why the current bootstrap/context architecture is unsuitable for
  reliable tenant-scoped offline synchronization.
- Any current public-schema dependencies.
- What tenant identity/context must be persisted with queued operations.
- Requirements for a future proper offline architecture.
- Required handling of offline create/update/delete, retry, ordering,
  conflict resolution, rollback, authentication, and tenant switching.
- Explicit requirement that future offline synchronization MUST never
  write entity-scoped business data to public schema.

Do NOT modify the offline-sync implementation.

Do NOT spend implementation time making offline work.

The final tenancy cutover must proceed without depending on offline sync.

If the existing offline modules constitute public business-table access,
document them as DEFERRED OFFLINE DEBT and exclude them from the final
application cutover only if they are unreachable/non-functional in the
current production application.

Do not invent claims about offline behavior. Verify the current code and
document exactly what exists.


follow agents.md protocol 
then save ticket here  docs/tickets