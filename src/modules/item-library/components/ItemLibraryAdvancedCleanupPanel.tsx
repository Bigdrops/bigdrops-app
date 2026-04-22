import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import { buildFlaggedCleanupPrompt, validateFlaggedCleanupImport } from '../domain/itemCleanupExchange'
import type { CleanupImportValidationResult, FlaggedCleanupExportPayload } from '../types'
import { formatItemPrice } from './itemLibraryFormatters'

type ItemLibraryAdvancedCleanupPanelProps = {
  exportPayload: FlaggedCleanupExportPayload
}

function copyText(value: string) {
  if (navigator?.clipboard?.writeText) {
    return navigator.clipboard.writeText(value)
  }

  const textarea = document.createElement('textarea')
  textarea.value = value
  textarea.setAttribute('readonly', 'true')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  document.body.removeChild(textarea)
  return Promise.resolve()
}

function downloadJson(filename: string, value: string) {
  const blob = new Blob([value], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function SectionTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string
  title: string
  description: string
}) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#947d63]">{eyebrow}</div>
      <h2 className="mt-1 text-[18px] font-extrabold text-[#2f2419]">{title}</h2>
      <p className="mt-2 max-w-2xl text-[12px] leading-relaxed text-[#8b7863]">{description}</p>
    </div>
  )
}

function StatCard({ label, value, meta }: { label: string; value: string; meta: string }) {
  return (
    <div className="rounded-[14px] border border-[#dbc8ae] bg-[#fff9f1] p-4 shadow-[0_16px_28px_rgba(95,72,46,0.06)]">
      <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#98836c]">{label}</div>
      <div className="mt-2 font-['JetBrains_Mono'] text-[18px] font-bold text-[#2f2419]">{value}</div>
      <p className="mt-1 text-[11px] text-[#8d7963]">{meta}</p>
    </div>
  )
}

function PreviewPill({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-[#d7c3a8] bg-[#f2e3cf] px-2.5 py-1 text-[10px] font-semibold text-[#684f37] shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]">
      {children}
    </span>
  )
}

function ValidationBanner({ result }: { result: CleanupImportValidationResult }) {
  if (!result.errors.length) return null

  return (
    <div className="rounded-[14px] border border-[#e4c3ba] bg-[#fff2ee] px-4 py-3">
      <div className="text-[12px] font-bold text-[#8f3f35]">Import result needs correction</div>
      <ul className="mt-2 space-y-1 text-[11px] leading-relaxed text-[#9a4a3f]">
        {result.errors.map((error) => (
          <li key={error}>• {error}</li>
        ))}
      </ul>
    </div>
  )
}

export function ItemLibraryAdvancedCleanupPanel({
  exportPayload,
}: ItemLibraryAdvancedCleanupPanelProps) {
  const [showPrompt, setShowPrompt] = useState(false)
  const [importText, setImportText] = useState('')
  const [copyState, setCopyState] = useState<'idle' | 'json' | 'prompt'>('idle')

  const exportJson = useMemo(() => JSON.stringify(exportPayload, null, 2), [exportPayload])
  const aiPrompt = useMemo(() => buildFlaggedCleanupPrompt(exportPayload), [exportPayload])
  const validation = useMemo(
    () => validateFlaggedCleanupImport(importText, exportPayload),
    [exportPayload, importText],
  )

  const handleCopy = async (value: string, nextState: 'json' | 'prompt') => {
    await copyText(value)
    setCopyState(nextState)
    window.setTimeout(() => setCopyState('idle'), 1800)
  }

  return (
    <div className="h-full overflow-y-auto bg-[linear-gradient(180deg,_#efe5d7_0%,_#e8dccb_100%)]">
      <div className="space-y-4 p-5">
        <section className="rounded-[18px] border border-[#d6c2a8] bg-[linear-gradient(180deg,_#fff9f1_0%,_#f7ecde_100%)] p-5 shadow-[0_20px_36px_rgba(93,68,42,0.10),inset_0_1px_0_rgba(255,255,255,0.55)]">
          <SectionTitle
            eyebrow="Advanced Cleanup"
            title="Flagged export and AI preview"
            description="Export only the flagged duplicate groups, copy the structured AI prompt, paste the AI JSON response back here, and review the proposed cleanup safely before any future apply step."
          />

          <div className="mt-4 rounded-[14px] border border-[#d9c7b0] bg-[#fcf7ef] px-4 py-3 text-[12px] font-semibold text-[#5f4b37]">
            No changes will be applied in this step.
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <StatCard
              label="Flagged groups"
              value={exportPayload.scope.group_count.toLocaleString()}
              meta="Only duplicate/problem groups are included."
            />
            <StatCard
              label="Flagged items"
              value={exportPayload.scope.item_count.toLocaleString()}
              meta="No full catalog dump is exported in this phase."
            />
            <StatCard
              label="Schema"
              value={`v${exportPayload.schema_version}`}
              meta="Stable contract for export, prompt, and preview."
            />
          </div>
        </section>

        <section className="rounded-[16px] border border-[#d8c5ad] bg-[#fff8ef] p-4 shadow-[0_16px_28px_rgba(95,72,46,0.08)]">
          <SectionTitle
            eyebrow="1. Export Flagged Data"
            title="Export flagged groups"
            description="This payload includes only the current flagged duplicate groups, their item ids, summary pricing, and known aliases."
          />

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => downloadJson(`item-library-flagged-cleanup-${new Date().toISOString().slice(0, 10)}.json`, exportJson)}
              className="rounded-[10px] border border-[#c6a175] bg-[#e7d2b4] px-4 py-2 text-[12px] font-bold text-[#523b25] shadow-[0_10px_18px_rgba(92,68,41,0.10),inset_0_1px_0_rgba(255,255,255,0.5)] transition-colors hover:bg-[#dcc39f]"
            >
              Download flagged JSON
            </button>
            <button
              type="button"
              onClick={() => void handleCopy(exportJson, 'json')}
              className="rounded-[10px] border border-[#d5c2aa] bg-[#fbf4ea] px-4 py-2 text-[12px] font-semibold text-[#6d543a] transition-colors hover:bg-[#f2e5d2]"
            >
              {copyState === 'json' ? 'Flagged JSON copied' : 'Copy flagged JSON'}
            </button>
          </div>

          <div className="mt-4 rounded-[12px] border border-[#ddd0be] bg-[#f9f2e7] p-3">
            <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9a866f]">Export shape</div>
            <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words font-['JetBrains_Mono'] text-[10px] leading-relaxed text-[#5f4a36]">
              {exportJson}
            </pre>
          </div>
        </section>

        <section className="rounded-[16px] border border-[#d8c5ad] bg-[#fff8ef] p-4 shadow-[0_16px_28px_rgba(95,72,46,0.08)]">
          <SectionTitle
            eyebrow="2. Copy AI Prompt"
            title="Copy structured prompt"
            description="Use this prompt with the exported flagged JSON outside the app. The prompt tells AI to stay strict, not invent items, and return JSON only."
          />

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleCopy(aiPrompt, 'prompt')}
              className="rounded-[10px] border border-[#c6a175] bg-[#e7d2b4] px-4 py-2 text-[12px] font-bold text-[#523b25] shadow-[0_10px_18px_rgba(92,68,41,0.10),inset_0_1px_0_rgba(255,255,255,0.5)] transition-colors hover:bg-[#dcc39f]"
            >
              {copyState === 'prompt' ? 'AI prompt copied' : 'Copy AI prompt'}
            </button>
            <button
              type="button"
              onClick={() => setShowPrompt((value) => !value)}
              className="rounded-[10px] border border-[#d5c2aa] bg-[#fbf4ea] px-4 py-2 text-[12px] font-semibold text-[#6d543a] transition-colors hover:bg-[#f2e5d2]"
            >
              {showPrompt ? 'Hide prompt' : 'Show prompt'}
            </button>
          </div>

          {showPrompt ? (
            <div className="mt-4 rounded-[12px] border border-[#ddd0be] bg-[#f9f2e7] p-3">
              <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words font-['JetBrains_Mono'] text-[10px] leading-relaxed text-[#5f4a36]">
                {aiPrompt}
              </pre>
            </div>
          ) : null}
        </section>

        <section className="rounded-[16px] border border-[#d8c5ad] bg-[#fff8ef] p-4 shadow-[0_16px_28px_rgba(95,72,46,0.08)]">
          <SectionTitle
            eyebrow="3. Paste AI Result"
            title="Import preview only"
            description="Paste the AI JSON response below. The app validates the schema, checks group and item references against the current flagged export scope, and previews only accepted proposals."
          />

          <textarea
            value={importText}
            onChange={(event) => setImportText(event.target.value)}
            placeholder="Paste flagged_cleanup_result JSON here..."
            spellCheck={false}
            className="mt-4 min-h-[180px] w-full rounded-[14px] border border-[#d4c2ad] bg-[#fbf5ec] px-4 py-3 font-['JetBrains_Mono'] text-[11px] text-[#2c2218] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] outline-none transition-all duration-150 placeholder:text-[#ad9984] focus:border-[#a07a52] focus:bg-[#fffaf2] focus:ring-[3px] focus:ring-[#b79269]/15"
          />

          <div className="mt-3 rounded-[12px] border border-[#dbc9b2] bg-[#fcf7ef] px-4 py-3 text-[11px] leading-relaxed text-[#7f6b56]">
            Validation checks include JSON shape, schema version, response type, source export type, group ids, winner
            ids, and merged item ids. Bad rows are rejected visibly rather than coerced.
          </div>
        </section>

        <section className="rounded-[16px] border border-[#d8c5ad] bg-[#fff8ef] p-4 shadow-[0_16px_28px_rgba(95,72,46,0.08)]">
          <SectionTitle
            eyebrow="4. Preview Proposed Cleanup"
            title="Preview proposed changes"
            description="Accepted proposals are shown below for review. Rejected groups and ignored groups stay visible so the workflow remains explicit and inspectable."
          />

          <div className="mt-4 space-y-3">
            <ValidationBanner result={validation} />

            {!importText.trim() ? (
              <div className="rounded-[14px] border border-dashed border-[#d9c8b2] bg-[#fcf7ef] px-4 py-8 text-center">
                <div className="text-[13px] font-semibold text-[#715d49]">No AI result pasted yet</div>
                <p className="mt-1 text-[11px] text-[#9a8873]">
                  Paste a `flagged_cleanup_result` payload to preview the proposed cleanup plan.
                </p>
              </div>
            ) : null}

            {validation.preview?.merge_groups.length ? (
              <div className="space-y-3">
                {validation.preview.merge_groups.map((group) => (
                  <article
                    key={group.group_id}
                    className="rounded-[14px] border border-[#d7c3aa] bg-[linear-gradient(180deg,_#fffaf2_0%,_#f8efe2_100%)] p-4 shadow-[0_14px_24px_rgba(96,72,45,0.08)]"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#98826a]">Accepted merge group</div>
                        <h3 className="mt-1 text-[15px] font-extrabold text-[#2f2419]">{group.canonical_name}</h3>
                        <p className="mt-1 text-[11px] text-[#8b7761]">
                          Source flagged group: {group.export_label}
                        </p>
                      </div>
                      <PreviewPill>{group.group_id}</PreviewPill>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div className="rounded-[12px] border border-[#dfcfbd] bg-[#fffaf3] p-3">
                        <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#98826a]">Primary item</div>
                        <div className="mt-2 text-[13px] font-bold text-[#2f2419]">{group.winner.name}</div>
                        <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-[#8b7761]">
                          <PreviewPill>{group.winner.item_id}</PreviewPill>
                          <PreviewPill>{group.winner.usage_count.toLocaleString()} uses</PreviewPill>
                          <PreviewPill>{formatItemPrice(group.winner.last_price, 'No price')}</PreviewPill>
                        </div>
                      </div>

                      <div className="rounded-[12px] border border-[#dfcfbd] bg-[#fffaf3] p-3">
                        <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#98826a]">Merge into primary</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {group.merged_items.map((item) => (
                            <PreviewPill key={item.item_id}>{item.name}</PreviewPill>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-[12px] border border-[#dfcfbd] bg-[#fffaf3] p-3">
                        <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#98826a]">Aliases to keep</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {group.aliases_to_keep.length ? (
                            group.aliases_to_keep.map((alias) => <PreviewPill key={alias}>{alias}</PreviewPill>)
                          ) : (
                            <span className="text-[11px] text-[#917d68]">No aliases proposed.</span>
                          )}
                        </div>
                      </div>

                      <div className="rounded-[12px] border border-[#dfcfbd] bg-[#fffaf3] p-3">
                        <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#98826a]">Aliases to retire</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {group.aliases_to_retire.length ? (
                            group.aliases_to_retire.map((alias) => <PreviewPill key={alias}>{alias}</PreviewPill>)
                          ) : (
                            <span className="text-[11px] text-[#917d68]">No retired aliases proposed.</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}

            {validation.preview?.ignored_groups.length ? (
              <div className="rounded-[14px] border border-[#dac8b1] bg-[#fcf7ef] p-4">
                <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#98826a]">Ignored groups</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {validation.preview.ignored_groups.map((group) => (
                    <PreviewPill key={group.group_id}>{group.label}</PreviewPill>
                  ))}
                </div>
              </div>
            ) : null}

            {validation.preview?.rejected_groups.length ? (
              <div className="rounded-[14px] border border-[#e4c3ba] bg-[#fff2ee] p-4">
                <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8f3f35]">Rejected groups</div>
                <div className="mt-3 space-y-2">
                  {validation.preview.rejected_groups.map((group) => (
                    <div key={`${group.group_id}-${group.reason}`} className="rounded-[10px] border border-[#ebc8bf] bg-[#fff8f5] px-3 py-2">
                      <div className="font-['JetBrains_Mono'] text-[10px] font-bold text-[#8f3f35]">{group.group_id}</div>
                      <div className="mt-1 text-[11px] text-[#9a4a3f]">{group.reason}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  )
}
