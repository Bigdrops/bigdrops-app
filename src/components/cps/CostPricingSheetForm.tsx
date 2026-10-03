/*
 * BIGDROPS - Cost & Pricing Sheet - mobile/fold form.
 * SINGLE-FILE EDITION: column contract, types, formatters, row helpers,
 * sample model, SVG icons, presentation components, local state,
 * callbacks, JSX, and the form CSS all live in this one file. There is
 * no separate CSS, component, helper, type, utility, or asset file.
 *
 * Converted 1:1 from cost-price-sheet-form-candidate-v1-mobile-fold.html
 * (design-direction prototype). This is a fidelity conversion:
 * layout, spacing, gutters, widths, heights, typography hierarchy,
 * controls, field order, group/row presentation, CP/SP, TCP/TSP/Profit,
 * sub-descriptions, toolbar, header, and responsive behavior match the
 * source. The form CSS is preserved as CPS_FORM_CSS and renders from the
 * <style> element at the top of the component tree. The only external
 * dependency is react.
 *
 * Prototype popup/overlay UI (client picker sheet, column settings,
 * JSON import, instant markup, confirm dialogs) has been removed. The
 * toolbar triggers remain in place but are inert. Do not build a
 * replacement popup until the real workflow is designed.
 *
 * Application logic stays in the host application. The table below maps
 * each form control to the callback prop or local state that replaces it.
 *
 *   Form control                              TSX surface
 *   ----------------------------------------  ------------------------------------------
 *   Back button (toast "Back to sheets")      onBack?: () => void
 *   Save (top bar, section CTA, phone FAB)    onSave?: (payload: CpsSavePayload) => void
 *   save() checks (no, client, desc/qty/sp)   local state: doc, rowsRaw, client, errId,
 *                                             badge (demo badge + toasts run without a
 *                                             callback)
 *   Theme toggle (data-theme on <html>)       theme? / defaultTheme? / onToggleTheme?
 *   Client field + clear                      clients? / initialClient? / onClientChange?;
 *                                             local state: client
 *   Column visibility (label, show, order)    initialColumns? / onColumnsChange?;
 *                                             local state: columns
 *   Photo attach (addPhoto / removePhoto)     onRequestPhoto?: (rowId) => image URL;
 *                                             the local file-to-dataURL path runs when
 *                                             the callback is absent
 *   Row ops (add line item, add group, move,  local state handlers on rowsRaw. Purely
 *   duplicate, insert, remove)                presentational. No persistence.
 *   Field edits (title, number, date, site,   local state: doc and rowsRaw. NumField
 *   notes, desc, sub, make, unit, qty, cp, sp) keeps the live reformat.
 *   Toast, Draft/Saved badge, layout chip     local state: toast, badge (modeLabel?
 *                                             override), bp
 *
 * PROTOTYPE MATH NOTE: row and total displays use float math rounded
 * to 2dp, exactly like the source. Production MUST use the
 * authoritative Decimal path before ship.
 */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, ReactNode } from 'react';

/* ------------------------------------------------------------------ */
/* Prototype CSS (verbatim from the source <style> block).            */
/* ------------------------------------------------------------------ */

const CPS_FORM_CSS = `
/*
 * BIGDROPS - Cost & Pricing Sheet - mobile/fold form template.
 * Verbatim CSS extracted from cost-price-sheet-form-candidate-v1-mobile-fold.html.
 * Source of truth: the prototype <style> block. Do not approximate.
 * The Google Fonts @import mirrors the prototype's <link> tags.
 *
 * Note: class names are kept exactly as the prototype (generic names
 * such as .item, .sec, .fld). This copy is embedded as CPS_FORM_CSS and
 * renders once with the form; isolate it if your app has colliding
 * global class names.
 */
@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500;600&family=Manrope:wght@400;600;700;800&display=swap');
.cps-form-root{
  --ink:#0f172a; --sub:#475569; --faint:#8b9ab0;
  --line:rgba(15,23,42,.10); --line-strong:rgba(15,23,42,.20);
  --bg:#eef2f7; --card:#ffffff; --soft:#f6f9fc;
  --accent:#1e3a5f; --accent-soft:rgba(30,58,95,.13); --accent-ink:#ffffff;
  --red:#dc2626; --red-soft:rgba(220,38,38,.09);
  --green:#15803d; --green-soft:rgba(21,128,61,.10);
  --rail:rgba(15,23,42,.22);
  --mono:'DM Mono',monospace;
  --cost:#b45309; --cost-soft:rgba(180,83,9,.10);
  --sell:#15803d; --sell-soft:rgba(21,128,61,.10);
  --loss:#b91c1c;
  --group-line:rgba(30,58,95,.38); --group-spine:#1e3a5f; --group-soft:rgba(30,58,95,.07);
  --group-head:linear-gradient(115deg,#0f172a,#1e3a5f 58%,#334155);
  --group-on:#f8fafc;
  --shadow-ear:0 3px 9px rgba(15,23,42,.16);
  --bg-bd-button-primary-bg:#1e3a5f;
  --bd-button-primary-text:#f1f5f9;
  --gutter:14px;
}
.cps-form-root[data-theme="dark"]{
  --ink:#f1f5f9; --sub:#cbd5e1; --faint:#7d8da5;
  --line:rgba(148,163,184,.18); --line-strong:rgba(148,163,184,.32);
  --bg:#0b1220; --card:#16233a; --soft:#111d31;
  --accent:#38bdf8; --accent-soft:rgba(56,189,248,.16); --accent-ink:#06131f;
  --red:#f87171; --red-soft:rgba(248,113,113,.13);
  --green:#34d399; --green-soft:rgba(52,211,153,.14);
  --rail:rgba(148,163,184,.32);
  --cost:#fbbf24; --cost-soft:rgba(251,191,36,.14);
  --sell:#34d399; --sell-soft:rgba(52,211,153,.14);
  --loss:#f87171;
  --group-line:rgba(56,189,248,.34); --group-spine:#38bdf8; --group-soft:rgba(56,189,248,.10);
  --group-head:linear-gradient(115deg,#16233a,#1c3550);
  --group-on:#e2e8f0;
  --shadow-ear:0 3px 9px rgba(0,0,0,.45);
  --bg-bd-button-primary-bg:#2563eb;
  --bd-button-primary-text:#f8fafc;
}
:where(.cps-form-root),:where(.cps-form-root) *{box-sizing:border-box;margin:0;padding:0}
.cps-form-root{background:var(--bg);color:var(--ink);font-family:'Manrope',sans-serif;font-size:16px;line-height:normal;text-size-adjust:auto;-webkit-text-size-adjust:auto;-webkit-font-smoothing:antialiased}
:where(.cps-form-root) :where(button,input,select,textarea){font:inherit;color:inherit}
:where(.cps-form-root) :where(button){cursor:pointer;-webkit-tap-highlight-color:transparent;background:none;border:0}
:where(.cps-form-root) :where(input,select,textarea){outline:none}
:where(.cps-form-root) :where(svg){display:block;flex-shrink:0}
.mono{font-family:var(--mono)}
.wrap{max-width:430px;margin:0 auto;padding:8px var(--gutter) calc(112px + env(safe-area-inset-bottom))}
.topbar{position:sticky;top:0;z-index:40;display:flex;align-items:center;gap:6px;padding:6px 0 8px;background:var(--bg);border-bottom:1px solid var(--line)}
.tb-btn{width:40px;height:40px;border-radius:11px;border:1px solid var(--line);background:var(--card);color:var(--sub);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.tb-btn:active{transform:scale(.93)}
.tb-btn svg{width:17px;height:17px}
.tb-title{flex:1;min-width:0;padding:0 2px}
.tb-title h1{font-family:'Manrope',sans-serif!important;font-size:13.5px!important;font-weight:800!important;letter-spacing:-.02em!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tb-meta{display:flex;align-items:center;gap:5px;margin-top:2px;font-size:8px;font-weight:800;letter-spacing:.09em;text-transform:uppercase;color:var(--faint)}
.tb-meta .badge{color:var(--accent)}
.tb-meta .sep{opacity:.55}
.sec{margin-top:20px}
.sec + .sec{margin-top:22px;padding-top:16px;border-top:1px solid var(--line)}
.sec-head{display:flex;align-items:center;gap:8px;margin-bottom:12px}
.secno{font-family:var(--mono);font-size:10.5px;font-weight:700;color:var(--accent);flex-shrink:0}
.sec-head h2{font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;white-space:nowrap}
.sec-head .rule{flex:1;height:1px;background:var(--line);min-width:12px}
.sec-head .meta{font-family:var(--mono);font-size:8.5px;font-weight:500;color:var(--faint);white-space:nowrap}
.lb{display:block;font-family:'Manrope',sans-serif!important;font-size:8.5px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--faint);margin-bottom:5px}
.req{color:var(--red)}
.fld{width:100%;min-height:42px;padding:0 12px;border-radius:11px;border:1px solid var(--line);background:var(--card);font-size:12px;font-weight:600}
.fld::placeholder{color:var(--faint);font-weight:600}
.fld:focus{border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-soft)}
textarea.fld{min-height:60px;padding:10px 12px;resize:none;font-weight:600;font-size:12.5px;line-height:1.45}
.dgrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.dgrid .full{grid-column:1/-1}
.dgrid .wide{grid-column:1/-1}
/* ============ CLIENT PICKER (Invoice ClientSelector pattern) ============ */
.clientpick{display:flex;align-items:center;gap:10px;width:100%;min-height:52px;padding:8px 12px;border-radius:12px;border:1px dashed var(--line-strong);background:var(--card);text-align:left;cursor:pointer}
.clientpick.filled{border-style:solid}
.clientpick:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.clientpick .ci{width:34px;height:34px;border-radius:9px;background:var(--soft);color:var(--sub);display:flex;align-items:center;justify-content:center;flex-shrink:0;border:1px solid var(--line)}
.clientpick .ci svg{width:16px;height:16px}
.clientpick .ct{flex:1;min-width:0}
.clientpick .ct b{display:block;font-size:12.5px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.clientpick .ct small{display:block;margin-top:1px;font-size:8px;font-weight:800;letter-spacing:.06em;color:var(--faint);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.clientpick .cx{flex-shrink:0;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:var(--faint)}
.clientpick .cx svg{width:13px;height:13px}
.clientpick .chev{flex-shrink:0;color:var(--faint);display:flex}
.clientpick .chev svg{width:15px;height:15px}
.itemtools{display:flex;align-items:center;gap:8px;flex-wrap:wrap;row-gap:8px;margin-bottom:14px}
.itbn{height:36px;padding:0 12px;border-radius:10px;border:1px solid var(--line);background:var(--card);font-size:8.5px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;display:flex;align-items:center;gap:6px;color:var(--sub)}
.itbn svg{width:11px;height:11px}
.itbn:active{transform:scale(.96)}
.itbn.hot{border-color:var(--accent);color:var(--accent)}
.itbn.danger{margin-left:auto;border-color:transparent;background:none;color:var(--red);padding:0 8px}
#items{display:flex;flex-direction:column}
#items > .item,#items > .gwrap{margin-top:18px}
#items > .item:first-child,#items > .gwrap:first-child{margin-top:0}
.item{position:relative;padding-top:14px}
.item::before{content:'';position:absolute;top:0;left:0;right:26px;height:1px;background:var(--line)}
#items > .item:first-child::before,.gbody > .item:first-child::before{display:none}
.item.err{background:var(--red-soft);border-radius:12px}
.ear{position:absolute;top:0;right:0;width:26px;height:26px;border-radius:8px 3px 8px 8px;background:var(--card);border:1px solid var(--line-strong);color:var(--sub);display:flex;align-items:center;justify-content:center;box-shadow:var(--shadow-ear);z-index:6}
.ear svg{width:11px;height:11px}
.ear:active{transform:scale(.9)}
.ihead{display:grid;grid-template-columns:34px minmax(0,1fr);column-gap:10px;align-items:stretch}
.rail{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:space-between;gap:8px;padding:2px 0}
.rail::before{content:'';position:absolute;left:50%;top:17px;bottom:17px;width:1px;background:var(--rail);transform:translateX(-50%);z-index:0}
.rail>*{position:relative;z-index:1;flex-shrink:0}
.idx{width:34px;height:34px;border-radius:10px;background:var(--card);border:1px solid var(--line);color:var(--ink);font-family:var(--mono);font-size:10.5px;font-weight:500;display:flex;align-items:center;justify-content:center}
.rmid{display:flex;flex-direction:column;gap:8px}
.rbtn{position:relative;width:34px;height:34px;border-radius:10px;border:1px solid var(--line);background:var(--card);color:var(--sub);display:flex;align-items:center;justify-content:center}
.rbtn svg{width:12px;height:12px}
.rbtn:active{transform:scale(.92)}
.rbtn:disabled{opacity:.32;pointer-events:none}
.idesc{display:flex;flex-direction:column;gap:8px;min-width:0}
.desc{min-height:64px}
.subrow{display:flex;flex-direction:column;gap:6px;padding-left:10px;border-left:2px solid var(--line)}
.subrow.has{border-left-color:var(--accent)}
.subtog{display:flex;align-items:flex-start;gap:6px;width:100%;min-height:34px;padding:7px 0;text-align:left;font-size:9px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:var(--faint)}
.subtog.sub-add{align-items:center}
.stog-icon{width:15px;height:15px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.stog-icon svg{width:12px;height:12px}
.stog-label{flex:1;min-width:0;text-transform:none;letter-spacing:0}
.stog-chev{width:12px;height:12px;flex-shrink:0;color:var(--faint)}
.stog-chev svg{width:12px;height:12px}
.subrow.open .stog-chev{transform:rotate(180deg)}
.sub-prev-text{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font-size:10.5px;font-weight:600;line-height:1.45;color:var(--sub)}
.subfield{min-height:58px}
.idata{margin-top:12px;display:flex;flex-direction:column;gap:8px}
.meta-stack{display:flex;flex-direction:column;gap:8px}
.fgrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.fgrid>*:last-child:nth-child(odd){grid-column:1/-1}
.comm-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.comm-grid>*:last-child:nth-child(odd){grid-column:1/-1}
.cfield{display:block;min-width:0}
.cf-lab{display:flex;align-items:center;gap:4px;margin:0 0 5px 2px;font-size:8.5px;font-weight:800;letter-spacing:.09em;text-transform:uppercase}
.cf-lab svg{width:10px;height:10px}
.cf-hint{display:none;font-weight:700;letter-spacing:.06em;opacity:.75}
.cfield.cost .cf-lab{color:var(--cost)}
.cfield.sell .cf-lab{color:var(--sell)}
.cfield.cost .fld{border-left:3px solid var(--cost)}
.cfield.sell .fld{border-left:3px solid var(--sell)}
/* ============ ROW FINANCIALS: TCP | TSP | Profit + margin ============
   One coherent close-out per row: unit economics (CP/SP/Qty inputs
   above) resolve into row economics below. Margin is secondary. */
.fin3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:8px}
.fcell{border:1px solid var(--line);border-radius:10px;background:var(--card);padding:7px 8px;min-width:0}
.fcell small{display:block;font-size:7.5px;font-weight:800;letter-spacing:.08em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--faint)}
.fcell.tcp small{color:var(--cost)}
.fcell.tsp small{color:var(--sell)}
.fcell b{display:block;margin-top:2px;font-family:var(--mono);font-size:11px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fcell.pf.pos{background:var(--green-soft)}
.fcell.pf.neg{background:var(--red-soft)}
.finm{margin-top:6px;font-family:var(--mono);font-size:9px;color:var(--sub);text-align:right}
.ins{position:relative;display:flex;align-items:center;gap:6px;height:20px;margin-top:10px;color:var(--faint);font-size:8.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;text-align:left}
.cam{position:relative;align-self:flex-start;display:flex;align-items:center;gap:8px;height:40px;padding:0 12px 0 11px;border-radius:11px;border:1px dashed var(--line-strong);background:var(--card);color:var(--faint);font-size:9px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}
.cam svg{width:16px;height:16px}
.has-photo .cam{display:none}
.thumb,.foldthumb{display:none}
.has-photo .thumb{display:flex;position:relative;align-self:flex-end;width:60px;height:60px;border-radius:12px;overflow:hidden;background:var(--soft);border:1px solid var(--line)}
.thumb img,.foldthumb img{width:100%;height:100%;object-fit:cover}
.thumb .px,.foldthumb .px{position:absolute;top:2px;right:2px;width:18px;height:18px;border-radius:50%;background:var(--red);color:#fff;display:flex;align-items:center;justify-content:center}
.thumb .px svg,.foldthumb .px svg{width:8px;height:8px}
@media (min-width:600px){
  .has-photo .thumb{display:none}
  .has-photo .foldthumb{display:flex;position:relative;width:64px;height:64px;margin-top:2px;border-radius:12px;overflow:hidden;background:var(--soft);border:1px solid var(--line)}
}
.gwrap{display:flex;flex-direction:column}
.gwrap{width:calc(100% + 2*var(--gutter));margin-left:calc(-1*var(--gutter));margin-right:calc(-1*var(--gutter));border-top:1px solid var(--group-line);border-bottom:1px solid var(--group-line);border-left:6px solid var(--group-spine);background:var(--card)}
.ghdr{display:flex;align-items:center;gap:8px;min-height:52px;padding:8px var(--gutter);background:var(--group-head)}
.gtitle{flex:1;min-width:0;background:none;border:0;padding:0;color:var(--group-on);font-size:12.5px;font-weight:700}
.gtitle::placeholder{color:rgba(248,250,252,.55)}
.gcount{font-family:var(--mono);font-size:8.5px;color:rgba(248,250,252,.75);white-space:nowrap;flex-shrink:0}
.gbtn{position:relative;width:34px;height:34px;border-radius:10px;border:1px solid rgba(255,255,255,.24);background:rgba(255,255,255,.12);color:var(--group-on);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.gbtn svg{width:13px;height:13px}
.gbtn:active{transform:scale(.94)}
.gbody{display:flex;flex-direction:column;padding:0 var(--gutter)}
.gbody>.item{padding-top:14px;margin-top:6px}
.gbody>.item:first-child{margin-top:0;padding-top:14px}
.gbody>.item:last-child .ins{display:none}
.gempty{margin:14px 0 2px;padding:16px 12px;text-align:center;font-size:10px;font-weight:700;line-height:1.5;color:var(--faint);border:1px dashed var(--group-line);border-radius:11px}
.gfoot{margin-top:8px;padding:8px var(--gutter) 12px;border-top:2px solid var(--group-soft)}
.gadd{width:100%;min-height:42px;border-radius:11px;border:1px dashed var(--group-line);background:transparent;color:var(--accent);font-size:9px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;display:flex;align-items:center;justify-content:center;gap:6px}
.gadd svg{width:11px;height:11px}
.createpair{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:18px}
.cbtn{min-height:46px;border-radius:12px;font-size:9px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;display:flex;align-items:center;justify-content:center;gap:6px}
.cbtn svg{width:12px;height:12px}
.cbtn:active{transform:scale(.97)}
.cbtn.primary{background:var(--accent);border:1px solid var(--accent);color:var(--accent-ink)}
.cbtn.ghost{background:var(--card);border:1px dashed var(--line-strong);color:var(--ink)}
.empty{margin-top:2px;padding:20px 16px;text-align:center;font-size:10px;font-weight:700;line-height:1.6;color:var(--faint);border:1px dashed var(--line);border-radius:12px}
/* ============ DOCUMENT CLOSE-OUT: the commercial result ============
   Distinct from item rows by framing, not size: accent top edge
   with a slow travelling highlight, tonal wash, eyebrow heading,
   and a hero profit figure. Item trio CSS is untouched. */
.totals{position:relative;border:1px solid var(--line-strong);border-radius:16px;
  background:linear-gradient(180deg,var(--accent-soft),rgba(0,0,0,0) 42%),var(--card);
  padding:0 12px 12px;overflow:hidden}
.close-top{height:3px;background:var(--accent);margin:0 -12px 2px;position:relative;overflow:hidden}
.close-top i{position:absolute;top:0;bottom:0;width:90px;
  background:linear-gradient(90deg,rgba(0,0,0,0),rgba(255,255,255,.8),rgba(0,0,0,0));
  animation:sheen 14s linear infinite}
@keyframes sheen{from{left:-90px}to{left:100%}}
.close-eyebrow{display:flex;justify-content:space-between;align-items:baseline;gap:8px;
  padding:8px 0 2px;font-size:8.5px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--accent)}
.close-eyebrow span{font-family:var(--mono);font-weight:500;color:var(--faint);letter-spacing:0}
.totals .sumtotal b{font-size:22px}
/* gateway + aggregate narrative: the close-out reads as one instrument */
.gateway{display:flex;align-items:center;gap:10px;margin:24px 0 12px}
.gateway::before,.gateway::after{content:'';flex:1;height:1px;background:var(--line-strong)}
.gateway b{font-family:var(--mono);font-size:9px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--faint);white-space:nowrap}
.totals .sumline{position:relative;padding-left:12px}
.totals .sumline::before{content:'';position:absolute;left:0;top:9px;bottom:9px;width:3px;border-radius:2px;background:var(--line-strong)}
.totals .sumline.cost::before{background:var(--cost)}
.totals .sumline.sell::before{background:var(--sell)}
.mathnote{grid-column:1/-1;margin-top:9px;font-family:var(--mono);font-size:8.5px;color:var(--faint);text-align:center;letter-spacing:.02em}
.sumtotal .right b{display:inline-block;background:var(--soft);border:1px solid var(--line);border-radius:99px;padding:4px 12px;font-size:12px}
.totals-grid{display:grid;grid-template-columns:1fr;gap:0}
.sumline{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:7px 0;font-size:11px;font-weight:600;color:var(--sub);border-bottom:1px solid var(--line)}
.sumline b{font-family:var(--mono);font-size:11.5px;font-weight:500;color:var(--ink)}
.sumtotal{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin-top:10px;padding-top:10px;border-top:2px solid var(--line-strong)}
.sumtotal small{display:block;font-size:8px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--faint)}
.sumtotal b{font-family:var(--mono);font-size:18px;font-weight:500;color:var(--accent)}
.sumtotal .right{text-align:right}
#tProfit.neg,#tMargin.neg{color:var(--loss)}
#tProfit.pos,#tMargin.pos{color:var(--sell)}
.words{margin-top:10px;padding:9px 11px;border:1px dashed var(--line);border-radius:10px;background:var(--soft);font-size:9.5px;font-style:italic;color:var(--sub);line-height:1.55}
.savebar{margin-top:18px}
.save-cta{min-height:50px;font-size:10px}
.tb-save{display:none;height:36px;padding:0 14px;border-radius:11px;background:var(--bg-bd-button-primary-bg);color:var(--bd-button-primary-text);font-size:9px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;align-items:center;gap:6px;flex-shrink:0}
.tb-save svg{width:13px;height:13px;stroke-width:2}
.fab{position:fixed;right:16px;bottom:calc(82px + env(safe-area-inset-bottom));width:50px;height:50px;border-radius:18px;border:0;background:var(--bg-bd-button-primary-bg);color:var(--bd-button-primary-text);box-shadow:0 10px 15px -3px rgb(0 0 0/.1),0 4px 6px -4px rgb(0 0 0/.1);display:flex;align-items:center;justify-content:center;z-index:50}
.fab svg{width:20px;height:20px;stroke-width:2}
.fab:active{transform:scale(.95)}
.toast{position:fixed;bottom:148px;left:50%;transform:translateX(-50%);z-index:70;max-width:86vw;padding:9px 14px;border-radius:12px;background:var(--ink);color:var(--bg);font-size:9.5px;font-weight:700;box-shadow:0 18px 40px rgba(0,0,0,.3);display:none}
.toast.show{display:block}
.toast.err{border:1px solid var(--red)}
@media (prefers-reduced-motion:reduce){
  .cps-form-root,.cps-form-root *,.cps-form-root *::before,.cps-form-root *::after{animation:none!important;transition:none!important}
}
@media (min-width:430px){
  .cps-form-root{--gutter:18px}
  .wrap{max-width:560px;padding:10px var(--gutter) calc(112px + env(safe-area-inset-bottom))}
  .desc{min-height:72px}
  .createpair{gap:12px}
}
@media (min-width:600px){
  .cps-form-root{--gutter:24px}
  .wrap{max-width:820px;padding:14px var(--gutter) calc(112px + env(safe-area-inset-bottom))}
  .tb-save{display:flex}
  .fab{display:none}
  .dgrid{grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
  .dgrid .wide{grid-column:span 1}
  .item{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(280px,1fr);column-gap:20px}
  .ihead{grid-column:1;grid-row:1}
  .idata{grid-column:2;grid-row:1;margin-top:0;padding-left:18px;border-left:1px solid var(--line)}
  .ins{grid-column:1/-1;grid-row:2}
  .desc{min-height:92px}
  .cf-hint{display:inline}
  .totals-grid{grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:0 22px}
  .sumtotal{margin-top:0}
}
`;

/*
 * BIGDROPS - Cost & Pricing Sheet - mobile/fold form template.
 * Converted 1:1 from:
 *   docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/form/cps/
 *   cost-price-sheet-form-candidate-v1-mobile-fold.html
 *
 * Shared types, column constants, formatters, row helpers, and the
 * prototype sample model.
 *
 * PROTOTYPE MATH NOTE (carried from the source prototype): the display
 * math in this template uses float math rounded to 2dp. Production MUST
 * use the authoritative Decimal path before ship.
 */

/* ------------------------------------------------------------------ */
/* Column contract                                                     */
/* ------------------------------------------------------------------ */

export type CpsColumnKey =
  | 'description'
  | 'specification'
  | 'unit'
  | 'quantity'
  | 'make'
  | 'cp'
  | 'sp';

export interface CpsColumn {
  key: CpsColumnKey;
  label: string;
  visible: boolean;
}

export const CPS_CANONICAL_ORDER: CpsColumnKey[] = [
  'description',
  'specification',
  'unit',
  'quantity',
  'make',
  'cp',
  'sp',
];

export const CPS_DEFAULT_VISIBLE: Record<CpsColumnKey, boolean> = {
  description: true,
  specification: false,
  unit: true,
  quantity: true,
  make: true,
  cp: true,
  sp: true,
};

export const CPS_LABELS: Record<CpsColumnKey, string> = {
  description: 'Description',
  specification: 'Sub Description',
  unit: 'Unit',
  quantity: 'Qty',
  make: 'Make / Brand',
  cp: 'CP (Cost Price)',
  sp: 'SP (Selling Price)',
};

export function defaultCpsColumns(): CpsColumn[] {
  return CPS_CANONICAL_ORDER.map((k) => ({
    key: k,
    label: CPS_LABELS[k],
    visible: CPS_DEFAULT_VISIBLE[k],
  }));
}

/** Port of resolveCpsColumns() from the prototype. */
export function resolveCpsColumns(saved: Array<CpsColumn | null | undefined> | null | undefined): CpsColumn[] {
  if (!Array.isArray(saved) || !saved.length) return defaultCpsColumns();
  const out: CpsColumn[] = [];
  const seen = new Set<CpsColumnKey>();
  saved.forEach((c) => {
    const k = c && c.key;
    if (!k || CPS_CANONICAL_ORDER.indexOf(k) < 0 || seen.has(k)) return;
    seen.add(k);
    out.push({
      key: k,
      label: typeof c!.label === 'string' && c!.label.trim() ? c!.label : CPS_LABELS[k],
      visible: c!.visible !== false,
    });
  });
  CPS_CANONICAL_ORDER.forEach((k) => {
    if (!seen.has(k)) out.push({ key: k, label: CPS_LABELS[k], visible: CPS_DEFAULT_VISIBLE[k] });
  });
  const di = out.findIndex((c) => c.key === 'description');
  if (di > 0) {
    const d = out.splice(di, 1)[0];
    out.unshift(d);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Client contract                                                     */
/* ------------------------------------------------------------------ */

export interface CpsClient {
  id: string;
  name: string;
  person?: string;
  phone?: string;
  email?: string;
  addr?: string;
}

/* ------------------------------------------------------------------ */
/* Row contract                                                        */
/* ------------------------------------------------------------------ */

export interface CpsItemRow {
  id: number;
  type: 'item';
  gid: number | null;
  desc: string;
  sub: string;
  subOpen: boolean;
  qty: number;
  unit: string;
  make: string;
  cp: number;
  sp: number;
  image?: string | null;
}

export interface CpsGroupRow {
  id: number;
  type: 'group';
  title: string;
}

export type CpsRow = CpsItemRow | CpsGroupRow;

export function isItemRow(r: CpsRow): r is CpsItemRow {
  return r.type === 'item';
}

/* ------------------------------------------------------------------ */
/* Document contract                                                   */
/* ------------------------------------------------------------------ */

export interface CpsDocumentFields {
  title: string;
  sheetNumber: string;
  issueDate: string;
  site: string;
  notes: string;
}

export interface CpsSavePayload extends CpsDocumentFields {
  client: CpsClient | null;
  rows: CpsRow[];
  columns: CpsColumn[];
}

/* ------------------------------------------------------------------ */
/* Formatters (prototype float math, rounded to 2dp)                   */
/* ------------------------------------------------------------------ */

export const naira = (n: number | null | undefined): string =>
  '₦' + Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmtGroup = (n: number): string =>
  Number(n).toLocaleString('en-US', { maximumFractionDigits: 20 });

export const fmtMoney = (n: number): string => fmtGroup(Math.round((Number(n) || 0) * 100) / 100);

export const fmtQty = (n: number): string => fmtGroup(Number(n));

/** Port of words() from the prototype. */
export function words(num: number): string {
  if (!num) return 'ZERO NAIRA ONLY';
  const a = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];
  const b = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];
  const c = (x: number): string =>
    x < 20
      ? a[x]
      : x < 100
        ? b[Math.floor(x / 10)] + (x % 10 ? ' ' + a[x % 10] : '')
        : x < 1000
          ? a[Math.floor(x / 100)] + ' HUNDRED' + (x % 100 ? ' ' + c(x % 100) : '')
          : x < 1e6
            ? c(Math.floor(x / 1000)) + ' THOUSAND' + (x % 1000 ? ' ' + c(x % 1000) : '')
            : x < 1e9
              ? c(Math.floor(x / 1e6)) + ' MILLION' + (x % 1e6 ? ' ' + c(x % 1e6) : '')
              : c(Math.floor(x / 1e9)) + ' BILLION' + (x % 1e9 ? ' ' + c(x % 1e9) : '');
  const w = Math.floor(num);
  const k = Math.round((num - w) * 100);
  return c(w) + ' NAIRA' + (k ? ' AND ' + c(k) + ' KOBO' : '') + ' ONLY';
}

/* ------------------------------------------------------------------ */
/* Row financial helpers (row display math)                           */
/* ------------------------------------------------------------------ */

export const tcpOf = (r: CpsItemRow): number => Number(r.cp || 0) * Number(r.qty || 0);
export const tspOf = (r: CpsItemRow): number => Number(r.sp || 0) * Number(r.qty || 0);
export const profitOf = (r: CpsItemRow): number => tspOf(r) - tcpOf(r);

export const marginOf = (r: CpsItemRow): number | null => {
  const tsp = tspOf(r);
  return tsp ? (profitOf(r) / tsp) * 100 : null;
};

/** Items that belong to a group, in rows order. */
export const membersOf = (rows: CpsRow[], gid: number): CpsItemRow[] =>
  rows.filter((r): r is CpsItemRow => r.type === 'item' && r.gid === gid);

/**
 * Sibling set used by move up/down and the disabled rail states.
 * Port of siblings() from the prototype (ungrouped items share their
 * list with groups).
 */
export const siblingsOf = (rows: CpsRow[], r: CpsItemRow): CpsRow[] =>
  r.gid != null
    ? rows.filter((x): x is CpsItemRow => x.type === 'item' && x.gid === r.gid)
    : rows.filter((x) => x.type === 'group' || x.gid == null);

/** Items whose group no longer exists become ungrouped. */
export function sanitizeRows(rs: CpsRow[]): CpsRow[] {
  return rs.map((r) => {
    if (r.type === 'item' && r.gid != null && !rs.some((g) => g.type === 'group' && g.id === r.gid)) {
      return { ...r, gid: null };
    }
    return r;
  });
}

/** Port of blank() from the prototype. */
export function makeBlankRow(seq: number, gid: number | null): CpsItemRow {
  return { id: seq, type: 'item', gid, desc: '', sub: '', subOpen: false, qty: 1, unit: '', make: '', cp: 0, sp: 0 };
}

/** Port of bp() from the prototype: Phone / Large phone / Fold. */
export function layoutBreakpoint(): 'Phone' | 'Large phone' | 'Fold' {
  if (typeof window === 'undefined') return 'Phone';
  const w = window.innerWidth;
  return w < 430 ? 'Phone' : w < 600 ? 'Large phone' : 'Fold';
}

/* ------------------------------------------------------------------ */
/* Prototype sample model (fictional, internally consistent)           */
/* ------------------------------------------------------------------ */

export const SAMPLE_CLIENTS: CpsClient[] = [
  { id: 'wellspring', name: 'Wellspring Homes Ltd', person: 'Adaeze Okonkwo', phone: '0803 555 0192', email: 'adaeze@wellspring.ng', addr: 'Plot 14, Lekki Phase 1, Lagos' },
  { id: 'pinnacle', name: 'Pinnacle Towers Ltd', person: 'Tunde Bello', phone: '0805 441 2077', email: 't.bello@pinnacle.ng', addr: 'Ozumba Mbadiwe, VI, Lagos' },
  { id: 'cordelia', name: 'Cordelia Electricals Ltd', person: 'Ngozi Eze', phone: '0702 118 8845', email: 'sales@cordelia.ng', addr: 'Alausa, Ikeja, Lagos' },
];

export const SAMPLE_DOCUMENT: CpsDocumentFields = {
  title: 'Duplex Build — Cost & Pricing',
  sheetNumber: 'CPS-2026-0001',
  issueDate: '2026-09-17',
  site: 'Lekki Phase 1 — Plot 14',
  notes: 'Rates include supply to site. Labour priced separately on request.',
};

export const SAMPLE_ROWS: CpsRow[] = [
  { id: 8, type: 'item', gid: null, desc: 'Preliminaries, site supervision and setting out', sub: 'Site establishment, setting out of works, site supervision and general preliminaries for the duration of the works.', subOpen: false, qty: 1, unit: 'lot', make: '', cp: 150000, sp: 185000 },
  { id: 1, type: 'group', title: 'Group A — Civil Works' },
  { id: 2, type: 'item', gid: 1, desc: 'Portland cement, grade 42.5R', sub: '', subOpen: false, qty: 400, unit: 'bags', make: 'Dangote 3X', cp: 5200, sp: 6100 },
  { id: 3, type: 'item', gid: 1, desc: 'Reinforcement steel, high yield T12', sub: '', subOpen: false, qty: 120, unit: 'lengths', make: 'African Foundries', cp: 9800.75, sp: 11500 },
  { id: 4, type: 'item', gid: 1, desc: 'Sharp sand, river dredged', sub: 'Delivered, tested and compacted in approved layers per engineer’s instruction, including waste allowance and carting away of surplus material.', subOpen: false, qty: 30, unit: 'trips', make: 'Local', cp: 28000, sp: 0 },
  { id: 5, type: 'group', title: 'Group B — Finishes' },
  { id: 6, type: 'item', gid: 5, desc: 'Emulsion paint, 20L pail', sub: 'Two coats over prepared surface.', subOpen: false, qty: 18, unit: 'pails', make: 'Dulux', cp: 41000, sp: 48500 },
  { id: 7, type: 'item', gid: null, desc: 'Provisional sum — drainage works (rates pending)', sub: '', subOpen: false, qty: 1, unit: 'sum', make: '', cp: 0, sp: 0 },
];

/* ------------------------------------------------------------------ */
/* Component props contract                                            */
/* ------------------------------------------------------------------ */

export interface CostPricingSheetFormProps {
  /** Header title. Prototype default: "Cost & Pricing Sheet". */
  title?: string;
  /**
   * Draft badge text. When omitted, the prototype demo behavior applies:
   * the badge reads "Draft" and flips to "Saved" on a passing save.
   * Pass a value to control the badge from the host application.
   */
  modeLabel?: string;
  /** Controlled light/dark theme. Sets data-theme on documentElement. */
  theme?: 'light' | 'dark';
  /** Initial theme when the theme prop is omitted. Default: light. */
  defaultTheme?: 'light' | 'dark';
  /** Notified on every theme tap with the resulting theme. */
  onToggleTheme?: (theme: 'light' | 'dark') => void;
  /** Top-bar Back button. Without it, the prototype demo toast shows. */
  onBack?: () => void;
  /** Save CTA (top bar, section CTA, FAB). Runs prototype validation first. */
  onSave?: (payload: CpsSavePayload) => void;
  /** Initial document fields. Defaults to the prototype sample. */
  initialDocument?: Partial<CpsDocumentFields>;
  /** Initial rows. Defaults to the prototype sample. */
  initialRows?: CpsRow[];
  /** Client picker options. Defaults to the prototype sample clients. */
  clients?: CpsClient[];
  /** Initially selected client. Defaults to the first entry of clients. Pass null for none. */
  initialClient?: CpsClient | null;
  /** Fires whenever the selected client changes (including clear). */
  onClientChange?: (client: CpsClient | null) => void;
  /** Initial column configuration. Defaults to prototype defaults. */
  initialColumns?: CpsColumn[];
  /** Fires after any column toggle, label edit, move, or reset. */
  onColumnsChange?: (columns: CpsColumn[]) => void;
  /**
   * Photo attach callback (Cloudinary/upload logic lives in the host).
   * Resolve with an image URL to attach it to the row. When omitted,
   * the prototype's local file-to-dataURL path runs instead, so the
   * photo control keeps its source behavior in a standalone preview.
   */
  onRequestPhoto?: (rowId: number) => void | Promise<string | null | undefined>;
}

/*
 * BIGDROPS - Cost & Pricing Sheet - mobile/fold form template.
 * SVG icon set converted 1:1 from the prototype's inline <svg> markup
 * (cost-price-sheet-form-candidate-v1-mobile-fold.html).
 *
 * Icons set no width/height: the prototype CSS sizes every icon through
 * its parent rule (for example .tb-btn svg, .rbtn svg, .cf-lab svg).
 */

interface CpsIconProps {
  strokeWidth?: number;
}

const base = (strokeWidth: number) => ({
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth,
});

export function IconChevronLeft({ strokeWidth = 2.4 }: CpsIconProps) {
  return (
    <svg {...base(strokeWidth)}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}

export function IconSave({ strokeWidth = 2 }: CpsIconProps) {
  return (
    <svg {...base(strokeWidth)}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 2v3a1 1 0 0 0 1 1h5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18v-6a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v6" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 22H4a2 2 0 0 1-2-2V6" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 18a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9.172a2 2 0 0 1 1.414.586l2.828 2.828A2 2 0 0 1 22 6.828V16a2 2 0 0 1-2.01 2z" />
    </svg>
  );
}

export function IconSun({ strokeWidth = 2.2 }: CpsIconProps) {
  return (
    <svg {...base(strokeWidth)}>
      <circle cx="12" cy="12" r="4" />
      <path strokeLinecap="round" d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4l1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

export function IconMoon({ strokeWidth = 2.2 }: CpsIconProps) {
  return (
    <svg {...base(strokeWidth)}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export function IconColumns({ strokeWidth = 2 }: CpsIconProps) {
  return (
    <svg {...base(strokeWidth)}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path strokeLinecap="round" d="M9 4v16M15 4v16" />
    </svg>
  );
}

export function IconImport({ strokeWidth = 2 }: CpsIconProps) {
  return (
    <svg {...base(strokeWidth)}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 4v10m0 0l-3.5-3.5M12 14l3.5-3.5" />
    </svg>
  );
}

export function IconMarkup({ strokeWidth = 2 }: CpsIconProps) {
  return (
    <svg {...base(strokeWidth)}>
      <path strokeLinecap="round" d="M19 5L5 19" />
      <circle cx="6.5" cy="6.5" r="2.5" />
      <circle cx="17.5" cy="17.5" r="2.5" />
    </svg>
  );
}

export function IconTrash({ strokeWidth = 2.2 }: CpsIconProps) {
  return (
    <svg {...base(strokeWidth)}>
      <path strokeLinecap="round" d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2M6 7l1 13a1 1 0 001 1h8a1 1 0 001-1l1-13" />
    </svg>
  );
}

export function IconPlus({ strokeWidth = 2.6 }: CpsIconProps) {
  return (
    <svg {...base(strokeWidth)}>
      <path strokeLinecap="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}

export function IconNote({ strokeWidth = 2.2 }: CpsIconProps) {
  return (
    <svg {...base(strokeWidth)}>
      <path strokeLinecap="round" d="M4 7h16M4 12h10M4 17h7" />
    </svg>
  );
}

export function IconUp({ strokeWidth = 2.8 }: CpsIconProps) {
  return (
    <svg {...base(strokeWidth)}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
    </svg>
  );
}

export function IconDown({ strokeWidth = 2.8 }: CpsIconProps) {
  return (
    <svg {...base(strokeWidth)}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

export function IconClose({ strokeWidth = 2.6 }: CpsIconProps) {
  return (
    <svg {...base(strokeWidth)}>
      <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export function IconCopy({ strokeWidth = 2.2 }: CpsIconProps) {
  return (
    <svg {...base(strokeWidth)}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}

/** Chevron used by the sub-description toggle (svgs.chev in the prototype). */
export function IconChevronDown({ strokeWidth = 2.6 }: CpsIconProps) {
  return (
    <svg className="chev" {...base(strokeWidth)}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
    </svg>
  );
}

/** Chevron used by the client picker trigger. */
export function IconChevronDownSmall({ strokeWidth = 2.2 }: CpsIconProps) {
  return (
    <svg {...base(strokeWidth)}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l4 4 4-4" />
    </svg>
  );
}

export function IconUser({ strokeWidth = 2 }: CpsIconProps) {
  return (
    <svg {...base(strokeWidth)}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4-4v2" />
      <circle cx="9" cy="7" r="4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}

export function IconMoneyOut({ strokeWidth = 2.8 }: CpsIconProps) {
  return (
    <svg {...base(strokeWidth)}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m0 0l-5-5m5 5l5-5" />
    </svg>
  );
}

export function IconMoneyIn({ strokeWidth = 2.8 }: CpsIconProps) {
  return (
    <svg {...base(strokeWidth)}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-5 5m5-5l5 5" />
    </svg>
  );
}

export function IconCamera({ strokeWidth = 2 }: CpsIconProps) {
  return (
    <svg {...base(strokeWidth)}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h3l2-3h6l2 3h3a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Toast                                                               */
/* ------------------------------------------------------------------ */

export interface ToastViewProps {
  show: boolean;
  message: string;
  isError: boolean;
}

export function ToastView({ show, message, isError }: ToastViewProps) {
  return <div className={`toast${show ? ' show' : ''}${isError ? ' err' : ''}`}>{message}</div>;
}

/* ------------------------------------------------------------------ */
/* Numeric input with the prototype's live reformat + caret restore    */
/* ------------------------------------------------------------------ */

interface NumFieldProps {
  value: number;
  onCommit: (value: number) => void;
  format: (value: number) => string;
  className?: string;
  inputMode?: 'decimal' | 'text';
  placeholder?: string;
}

function NumField({ value, onCommit, format, className, inputMode = 'decimal', placeholder }: NumFieldProps) {
  const ref = useRef<HTMLInputElement>(null);
  const [text, setText] = useState(() => format(value));
  const pendingSel = useRef<number | null>(null);
  const formatRef = useRef(format);
  useEffect(() => {
    formatRef.current = format;
  });
  // Sync from state while the field is not being edited.
  useEffect(() => {
    const el = ref.current;
    if (el && document.activeElement !== el) setText(formatRef.current(value));
  }, [value]);
  useLayoutEffect(() => {
    if (pendingSel.current != null && ref.current) {
      const pos = pendingSel.current;
      pendingSel.current = null;
      try {
        ref.current.setSelectionRange(pos, pos);
      } catch {
        /* selection unsupported for this input type */
      }
    }
  });

  const handleInput = (e: ChangeEvent<HTMLInputElement>) => {
    const el = e.currentTarget;
    const raw = el.value.replace(/,/g, '');
    const n = Number(raw);
    const next = Number.isFinite(n) ? n : 0;
    onCommit(next);
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const hadSel = start !== el.value.length || end !== el.value.length;
    const inProgress = raw === '' || raw === '.' || /\.$/.test(raw);
    const digitsBefore = el.value.slice(0, start).replace(/[^0-9]/g, '').length;
    const formatted = inProgress ? raw : formatRef.current(next);
    setText(formatted);
    if (hadSel) {
      let pos = 0;
      let seen = 0;
      while (pos < formatted.length && seen < digitsBefore) {
        if (/[0-9]/.test(formatted[pos])) seen++;
        pos++;
      }
      pendingSel.current = pos;
    }
  };

  return (
    <input
      ref={ref}
      className={className}
      inputMode={inputMode}
      placeholder={placeholder}
      value={text}
      onChange={handleInput}
      onBlur={() => setText(formatRef.current(value))}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Row presentation                                                    */
/* ------------------------------------------------------------------ */

interface ItemRowProps {
  row: CpsItemRow;
  num: number;
  upDisabled: boolean;
  downDisabled: boolean;
  isError: boolean;
  showMake: boolean;
  showCp: boolean;
  showSp: boolean;
  onDesc: (value: string) => void;
  onUnit: (value: string) => void;
  onMake: (value: string) => void;
  onQty: (value: number) => void;
  onCp: (value: number) => void;
  onSp: (value: number) => void;
  onSubInput: (value: string) => void;
  onSubBlur: (value: string) => void;
  onToggleSub: () => void;
  onMove: (dir: -1 | 1) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onInsertBelow: () => void;
  onAttachPhoto: () => void;
  onRemovePhoto: () => void;
}

function ItemRow(props: ItemRowProps) {
  const { row, num } = props;
  const hasSub = !!(row.sub && row.sub.trim());
  const tcp = tcpOf(row);
  const tsp = tspOf(row);
  const profit = profitOf(row);
  const margin = marginOf(row);
  const pfCls = `fcell pf ${profit > 0 ? 'pos' : profit === 0 ? '' : 'neg'}`;

  return (
    <article className={`item${props.isError ? ' err' : ''}${row.image ? ' has-photo' : ''}`} data-id={row.id}>
      <button className="ear" title="Remove item" aria-label="Remove item" onClick={props.onRemove}>
        <IconClose strokeWidth={2.8} />
      </button>

      <div className="ihead">
        <div className="rail">
          <span className="idx">{String(num).padStart(2, '0')}</span>
          <div className="rmid">
            <button
              className="rbtn"
              title="Move up"
              aria-label="Move up"
              disabled={props.upDisabled}
              onClick={() => props.onMove(-1)}
            >
              <IconUp />
            </button>
            <button
              className="rbtn"
              title="Move down"
              aria-label="Move down"
              disabled={props.downDisabled}
              onClick={() => props.onMove(1)}
            >
              <IconDown />
            </button>
          </div>
          <button className="rbtn" title="Duplicate item" aria-label="Duplicate item" onClick={props.onDuplicate}>
            <IconCopy />
          </button>
        </div>

        <div className="idesc">
          <textarea
            className="fld desc"
            rows={2}
            placeholder="Item description *"
            value={row.desc}
            onChange={(e) => props.onDesc(e.target.value)}
          />
          <div className={`subrow${hasSub ? ' has' : ''}${row.subOpen ? ' open' : ''}`} data-sub={row.id}>
            <button
              className={`subtog${hasSub ? '' : ' sub-add'}`}
              aria-expanded={row.subOpen}
              onClick={props.onToggleSub}
            >
              <span className="stog-icon">{hasSub ? <IconNote /> : <IconPlus />}</span>
              {hasSub ? (
                <span className="stog-label">
                  <span className="sub-prev-text">{row.sub.trim()}</span>
                </span>
              ) : (
                <span className="stog-label">Add sub description</span>
              )}
              <span className="stog-chev"><IconChevronDown /></span>
            </button>
            {row.subOpen ? (
              <textarea
                className="fld subfield"
                rows={2}
                autoFocus
                placeholder="Sub description — extra detail under the main description..."
                value={row.sub}
                onChange={(e) => props.onSubInput(e.target.value)}
                onBlur={(e) => props.onSubBlur(e.target.value)}
              />
            ) : null}
          </div>
          {props.showMake ? (
            <input
              className="fld"
              placeholder="Make / brand"
              value={row.make}
              onChange={(e) => props.onMake(e.target.value)}
            />
          ) : null}
          {row.image ? (
            <span className="foldthumb">
              <img src={row.image} alt="Item photo" />
              <button
                type="button"
                className="px"
                title="Remove photo"
                aria-label="Remove photo"
                onClick={props.onRemovePhoto}
              >
                <IconClose strokeWidth={2.8} />
              </button>
            </span>
          ) : (
            <button type="button" className="cam" title="Attach a photo" aria-label="Attach a photo" onClick={props.onAttachPhoto}>
              <IconCamera />
              Photo
            </button>
          )}
        </div>
      </div>

      <div className="idata">
        <div className="meta-stack">
          <div className="fgrid">
            <NumField
              className="fld mono"
              placeholder="Qty *"
              value={row.qty}
              format={fmtQty}
              onCommit={props.onQty}
            />
            <input
              className="fld"
              placeholder="Unit"
              value={row.unit}
              onChange={(e) => props.onUnit(e.target.value)}
            />
          </div>
        </div>

        {props.showCp || props.showSp ? (
          <div className="comm-grid">
            {props.showCp ? (
              <label className="cfield cost">
                <span className="cf-lab">
                  <IconMoneyOut />
                  CP
                  <span className="cf-hint">money out</span>
                </span>
                <NumField className="fld mono" value={row.cp} format={fmtMoney} onCommit={props.onCp} />
              </label>
            ) : null}
            {props.showSp ? (
              <label className="cfield sell">
                <span className="cf-lab">
                  <IconMoneyIn />
                  SP
                  <span className="cf-hint">money in</span>
                </span>
                <NumField className="fld mono" value={row.sp} format={fmtMoney} onCommit={props.onSp} />
              </label>
            ) : null}
          </div>
        ) : null}

        {row.image ? (
          <span className="thumb">
            <img src={row.image} alt="Item photo" />
            <button
              type="button"
              className="px"
              title="Remove photo"
              aria-label="Remove photo"
              onClick={props.onRemovePhoto}
            >
              <IconClose strokeWidth={2.8} />
            </button>
          </span>
        ) : null}

        <div className="fin3" data-fin={row.id}>
          <div className="fcell tcp">
            <small>Total cost · TCP</small>
            <b>{naira(tcp)}</b>
          </div>
          <div className="fcell tsp">
            <small>Total selling · TSP</small>
            <b>{naira(tsp)}</b>
          </div>
          <div className={pfCls}>
            <small>Profit</small>
            <b>{naira(profit)}</b>
          </div>
        </div>
        <div className="finm" data-finm={row.id}>
          Margin {margin === null ? '—' : margin.toFixed(1) + '%'} on TSP · {row.qty} × {naira(Number(row.sp || 0) - Number(row.cp || 0))} /unit
        </div>
      </div>

      <button className="ins" onClick={props.onInsertBelow}>+ Insert below</button>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Group presentation                                                  */
/* ------------------------------------------------------------------ */

interface GroupBlockProps {
  group: CpsGroupRow;
  members: CpsItemRow[];
  renderItem: (row: CpsItemRow) => ReactNode;
  onTitleChange: (value: string) => void;
  onRemove: () => void;
  onAddItem: () => void;
}

function GroupBlock({ group, members, renderItem, onTitleChange, onRemove, onAddItem }: GroupBlockProps) {
  const label = members.length + ' item' + (members.length === 1 ? '' : 's');
  return (
    <section className="gwrap" data-gwrap={group.id}>
      <header className="ghdr">
        <button className="gbtn danger" title="Remove group (items are kept)" aria-label="Remove group" onClick={onRemove}>
          <IconClose strokeWidth={2.8} />
        </button>
        <input
          className="gtitle"
          value={group.title}
          placeholder="Group title"
          onChange={(e) => onTitleChange(e.target.value)}
        />
        <span className="gcount">{label}</span>
      </header>
      <div className="gbody">
        {members.length ? (
          members.map((m) => renderItem(m))
        ) : (
          <div className="gempty">
            No items in this group yet.
            <br />
            Use the button below to add the first one.
          </div>
        )}
      </div>
      <div className="gfoot">
        <button className="gadd" onClick={onAddItem}>
          <IconPlus /> Add item to this group
        </button>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Section head                                                        */
/* ------------------------------------------------------------------ */

function SectionHead({ no, title, meta }: { no: string; title: string; meta?: ReactNode }) {
  return (
    <div className="sec-head">
      <span className="secno">{no}</span>
      <h2>{title}</h2>
      <span className="rule" />
      {meta != null ? <span className="meta">{meta}</span> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main form                                                           */
/* ------------------------------------------------------------------ */

export function CostPricingSheetForm({
  title = 'Cost & Pricing Sheet',
  modeLabel,
  theme: controlledTheme,
  defaultTheme = 'light',
  onToggleTheme,
  onBack,
  onSave,
  initialDocument,
  initialRows,
  clients = SAMPLE_CLIENTS,
  initialClient,
  onClientChange,
  initialColumns,
  onColumnsChange,
  onRequestPhoto,
}: CostPricingSheetFormProps) {
  /* --- document state ------------------------------------------- */
  const [rowsRaw, setRowsRaw] = useState<CpsRow[]>(() => sanitizeRows(initialRows ?? SAMPLE_ROWS));
  const setRows = useCallback((next: CpsRow[] | ((prev: CpsRow[]) => CpsRow[])) => {
    setRowsRaw((prev) => sanitizeRows(typeof next === 'function' ? next(prev) : next));
  }, []);
  const seqRef = useRef<number>(Math.max(100, ...(initialRows ?? SAMPLE_ROWS).map((r) => r.id)));

  const [doc, setDoc] = useState<CpsDocumentFields>(() => ({ ...SAMPLE_DOCUMENT, ...initialDocument }));
  const setDocField = <K extends keyof CpsDocumentFields>(key: K, value: CpsDocumentFields[K]) =>
    setDoc((prev) => ({ ...prev, [key]: value }));

  const [columns, setColumns] = useState<CpsColumn[]>(() => resolveCpsColumns(initialColumns ?? null));
  const [client, setClient] = useState<CpsClient | null>(() =>
    propsInitialClient(initialClient, clients),
  );

  /* --- chrome state --------------------------------------------- */
  const [badge, setBadge] = useState('Draft');
  const [errId, setErrId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ msg: string; isErr: boolean } | null>(null);
  const [bp, setBp] = useState<'Phone' | 'Large phone' | 'Fold'>(() => layoutBreakpoint());
  const [internalTheme, setInternalTheme] = useState<'light' | 'dark'>(defaultTheme);
  const [themeIcon, setThemeIcon] = useState<'sun' | 'moon'>('sun');
  const [pendingScroll, setPendingScroll] = useState<{ id: number; key: number } | null>(null);

  const theme = controlledTheme ?? internalTheme;
  const badgeText = modeLabel ?? badge;

  /* --- refs and timers ------------------------------------------ */
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const errTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollKeyRef = useRef(0);

  const showToast = useCallback((msg: string, isErr = false) => {
    setToast({ msg, isErr });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
      if (errTimer.current) clearTimeout(errTimer.current);
    },
    [],
  );

  const toggleTheme = () => {
    const wasDark = theme === 'dark';
    const next = wasDark ? 'light' : 'dark';
    setInternalTheme(next);
    setThemeIcon(wasDark ? 'moon' : 'sun');
    onToggleTheme?.(next);
  };

  /* --- layout chip ------------------------------------------------ */
  useEffect(() => {
    const onResize = () => setBp(layoutBreakpoint());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  /* --- row operations (prototype ports) --------------------------- */
  const editItem = <K extends keyof CpsItemRow>(id: number, key: K, value: CpsItemRow[K]) => {
    setRows((prev) => prev.map((r) => (isItemRow(r) && r.id === id ? { ...r, [key]: value } : r)));
  };

  const editGroupTitle = (id: number, value: string) => {
    setRows((prev) => prev.map((r) => (r.type === 'group' && r.id === id ? { ...r, title: value } : r)));
  };

  const collapseSubIfEmpty = (id: number, value: string) => {
    if (value && value.trim()) return;
    const r = rowsRaw.find((x) => x.id === id);
    if (!r || !isItemRow(r) || r.subOpen !== true) return;
    setRows((prev) => prev.map((x) => (isItemRow(x) && x.id === id ? { ...x, sub: '', subOpen: false } : x)));
  };

  const toggleSub = (id: number) => {
    setRows((prev) => prev.map((r) => (isItemRow(r) && r.id === id ? { ...r, subOpen: !r.subOpen } : r)));
  };

  const moveRow = (id: number, dir: -1 | 1) => {
    const r = rowsRaw.find((x) => x.id === id);
    if (!r || !isItemRow(r)) return;
    const sib = siblingsOf(rowsRaw, r);
    const k = sib.findIndex((x) => x.id === r.id);
    const target = sib[k + dir];
    if (!target) return;
    const next = rowsRaw.slice();
    next.splice(
      next.findIndex((x) => x.id === r.id),
      1,
    );
    const t = next.findIndex((x) => x.id === target.id);
    next.splice(dir > 0 ? t + 1 : t, 0, r);
    setRows(next);
  };

  const dupRow = (id: number) => {
    const i = rowsRaw.findIndex((x) => x.id === id);
    if (i < 0) return;
    const src = rowsRaw[i];
    if (!isItemRow(src)) return;
    seqRef.current += 1;
    const copy: CpsItemRow = { ...src, id: seqRef.current, desc: (src.desc || '') + ' (copy)', subOpen: false };
    const next = rowsRaw.slice();
    next.splice(i + 1, 0, copy);
    setRows(next);
    showToast('Item duplicated');
  };

  const insertBelow = (id: number) => {
    const i = rowsRaw.findIndex((x) => x.id === id);
    if (i < 0) return;
    const src = rowsRaw[i];
    seqRef.current += 1;
    const row = makeBlankRow(seqRef.current, isItemRow(src) ? src.gid : null);
    const next = rowsRaw.slice();
    next.splice(i + 1, 0, row);
    setRows(next);
    showToast('Row inserted');
    scrollKeyRef.current += 1;
    setPendingScroll({ id: row.id, key: scrollKeyRef.current });
  };

  const addItem = () => {
    seqRef.current += 1;
    const row = makeBlankRow(seqRef.current, null);
    setRows((prev) => [...prev, row]);
    showToast('Line item added');
  };

  const addItemTo = (gid: number) => {
    const mem = membersOf(rowsRaw, gid);
    const last = mem[mem.length - 1];
    let at = last
      ? rowsRaw.findIndex((x) => x.id === last.id) + 1
      : rowsRaw.findIndex((x) => x.type === 'group' && x.id === gid) + 1;
    if (at < 0) at = rowsRaw.length;
    seqRef.current += 1;
    const row = makeBlankRow(seqRef.current, gid);
    const next = rowsRaw.slice();
    next.splice(at, 0, row);
    setRows(next);
    showToast('Item added to group');
  };

  const addGroup = () => {
    seqRef.current += 1;
    const row: CpsGroupRow = { id: seqRef.current, type: 'group', title: 'New Group' };
    setRows((prev) => [...prev, row]);
    showToast('Group added');
  };

  const removeRow = (id: number) => {
    const r = rowsRaw.find((x) => x.id === id);
    if (!r) return;
    if (r.type === 'group') {
      setRows((prev) =>
        prev
          .map((x) => (x.type === 'item' && x.gid === id ? { ...x, gid: null } : x))
          .filter((x) => x.id !== id),
      );
      showToast('Group removed — its items kept');
    } else {
      setRows((prev) => prev.filter((x) => x.id !== id));
      showToast((r.desc && r.desc.trim()) || Number(r.sp) > 0 ? 'Row deleted' : 'Row removed');
    }
  };


  /* --- photo (prototype local path when no callback) ---------------- */
  const photoFileRef = useRef<HTMLInputElement | null>(null);
  const photoRowRef = useRef<number | null>(null);

  const attachPhoto = (id: number) => {
    if (onRequestPhoto) {
      void Promise.resolve(onRequestPhoto(id)).then((url) => {
        if (url) {
          editItem(id, 'image', url);
          showToast('Photo attached');
        }
      });
      return;
    }
    photoRowRef.current = id;
    photoFileRef.current?.click();
  };

  /* Port of the prototype file-input + canvas resize handler. */
  const onPhotoFile = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files && e.target.files[0];
    const id = photoRowRef.current;
    e.target.value = '';
    if (!f || id == null) return;
    if (!/^image\//.test(f.type)) {
      showToast('Choose an image file', true);
      return;
    }
    const fr = new FileReader();
    fr.onerror = () => showToast('Could not read that image', true);
    fr.onload = () => {
      const im = new Image();
      im.onerror = () => showToast('Could not read that image', true);
      im.onload = () => {
        const max = 720;
        const k = Math.min(1, max / Math.max(im.width, im.height));
        const cv = document.createElement('canvas');
        cv.width = Math.round(im.width * k);
        cv.height = Math.round(im.height * k);
        const cx = cv.getContext('2d');
        if (!cx) return;
        cx.fillStyle = '#fff';
        cx.fillRect(0, 0, cv.width, cv.height);
        cx.drawImage(im, 0, 0, cv.width, cv.height);
        editItem(id, 'image', cv.toDataURL('image/jpeg', 0.8));
        showToast('Photo attached');
      };
      im.src = fr.result as string;
    };
    fr.readAsDataURL(f);
  };

  /* --- client picker ------------------------------------------------ */
  const clearClient = () => {
    setClient(null);
    showToast('Client cleared');
    onClientChange?.(null);
  };

  /* --- save (prototype validation, host persistence) --------------- */
  const save = () => {
    if (!doc.sheetNumber.trim()) {
      showToast('Save blocked: sheet number is required', true);
      return;
    }
    if (!client) {
      showToast('Save blocked: pick a client before saving', true);
      return;
    }
    const bad = rowsRaw.find(
      (r) => isItemRow(r) && (!r.desc.trim() || Number(r.qty) <= 0 || Number(r.sp) <= 0),
    );
    if (bad) {
      setErrId(bad.id);
      showToast('Save blocked: an item is missing a description, qty, or SP', true);
      scrollKeyRef.current += 1;
      setPendingScroll({ id: bad.id, key: scrollKeyRef.current });
      if (errTimer.current) clearTimeout(errTimer.current);
      errTimer.current = setTimeout(() => setErrId(null), 2600);
      return;
    }
    setBadge('Saved');
    showToast('Cost & Pricing Sheet saved');
    const payload: CpsSavePayload = { ...doc, client, rows: rowsRaw, columns };
    onSave?.(payload);
  };

  const handleBack = () => {
    if (onBack) onBack();
    else showToast('Back to sheets');
  };

  /* --- scroll targets ---------------------------------------------- */
  useEffect(() => {
    if (!pendingScroll) return;
    const el = document.querySelector(`[data-id="${pendingScroll.id}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setPendingScroll(null);
  }, [pendingScroll, rowsRaw]);

  /* --- derived display data ----------------------------------------- */
  const vis = (k: CpsColumnKey): boolean => {
    const c = columns.find((x) => x.key === k);
    return !c || c.visible;
  };

  const totals = useMemo(() => {
    let cost = 0;
    let sell = 0;
    rowsRaw.forEach((r) => {
      if (isItemRow(r)) {
        cost += tcpOf(r);
        sell += tspOf(r);
      }
    });
    const profit = sell - cost;
    return {
      cost,
      sell,
      profit,
      tone: profit > 0 ? 'pos' : profit === 0 ? 'zero' : 'neg',
      margin: sell ? Math.round((profit / sell) * 100) + '%' : '0%',
      words: words(sell),
    };
  }, [rowsRaw]);

  const nItems = rowsRaw.filter((r) => r.type === 'item').length;
  const nGroups = rowsRaw.filter((r) => r.type === 'group').length;
  const countLabel = `${nItems} items · ${nGroups} groups`;

  const nums: Record<number, number> = {};
  let numSeq = 0;
  rowsRaw.forEach((r) => {
    if (r.type === 'group') membersOf(rowsRaw, r.id).forEach((m) => { nums[m.id] = ++numSeq; });
    else if (r.gid == null) nums[r.id] = ++numSeq;
  });

  const itemNode = (r: CpsItemRow, sib: CpsRow[]): ReactNode => {
    const k = sib.findIndex((x) => x.id === r.id);
    return (
      <ItemRow
        key={r.id}
        row={r}
        num={nums[r.id] || 0}
        upDisabled={k <= 0}
        downDisabled={k >= sib.length - 1}
        isError={errId === r.id}
        showMake={vis('make')}
        showCp={vis('cp')}
        showSp={vis('sp')}
        onDesc={(v) => editItem(r.id, 'desc', v)}
        onUnit={(v) => editItem(r.id, 'unit', v)}
        onMake={(v) => editItem(r.id, 'make', v)}
        onQty={(v) => editItem(r.id, 'qty', v)}
        onCp={(v) => editItem(r.id, 'cp', v)}
        onSp={(v) => editItem(r.id, 'sp', v)}
        onSubInput={(v) => editItem(r.id, 'sub', v)}
        onSubBlur={(v) => collapseSubIfEmpty(r.id, v)}
        onToggleSub={() => toggleSub(r.id)}
        onMove={(dir) => moveRow(r.id, dir)}
        onDuplicate={() => dupRow(r.id)}
        onRemove={() => removeRow(r.id)}
        onInsertBelow={() => insertBelow(r.id)}
        onAttachPhoto={() => attachPhoto(r.id)}
        onRemovePhoto={() => editItem(r.id, 'image', null)}
      />
    );
  };

  const walk: ReactNode[] = [];
  rowsRaw.forEach((r) => {
    if (r.type === 'group') {
      const mem = membersOf(rowsRaw, r.id);
      walk.push(
        <GroupBlock
          key={r.id}
          group={r}
          members={mem}
          renderItem={(m) => itemNode(m, mem)}
          onTitleChange={(v) => editGroupTitle(r.id, v)}
          onRemove={() => removeRow(r.id)}
          onAddItem={() => addItemTo(r.id)}
        />,
      );
    } else if (r.gid == null) {
      walk.push(itemNode(r, siblingsOf(rowsRaw, r)));
    }
  });

  const clientSub = client
    ? [client.person, client.phone, client.email].filter(Boolean).join(' · ')
    : 'Bill to · Client';

  /* --- render ---------------------------------------------------------- */
  return (
    <>
      <style data-cps-form="true">{CPS_FORM_CSS}</style>
      <div className="cps-form-root wrap" data-theme={theme}>
        <header className="topbar">
          <button className="tb-btn" title="Back to sheets" aria-label="Back to sheets" onClick={handleBack}>
            <IconChevronLeft />
          </button>
          <div className="tb-title">
            <h1>{title}</h1>
            <div className="tb-meta">
              <span className="badge" id="modeBadge">{badgeText}</span>
              <span className="sep">·</span>
              <span id="layoutChip">{bp}</span>
            </div>
          </div>
          <button
            className="tb-save"
            title="Save Cost & Pricing Sheet"
            aria-label="Save Cost & Pricing Sheet"
            onClick={save}
          >
            <IconSave />
            Save CPS
          </button>
          <button className="tb-btn" id="themeBtn" title="Toggle dark mode" aria-label="Toggle dark mode" onClick={toggleTheme}>
            {themeIcon === 'sun' ? <IconSun /> : <IconMoon />}
          </button>
        </header>

        <section className="sec" style={{ marginTop: 14 }}>
          <SectionHead no="1." title="Document details" meta={<span id="cpsNoLabel">{doc.sheetNumber}</span>} />
          <div className="dgrid">
            <div className="full">
              <label className="lb" htmlFor="fTitle">Sheet Title</label>
              <input
                className="fld"
                id="fTitle"
                value={doc.title}
                placeholder="Sheet title"
                onChange={(e) => setDocField('title', e.target.value)}
              />
            </div>
            <div>
              <label className="lb" htmlFor="fNo">
                Sheet Number <span className="req">*</span>
              </label>
              <input
                className="fld mono"
                id="fNo"
                value={doc.sheetNumber}
                onChange={(e) => setDocField('sheetNumber', e.target.value)}
              />
            </div>
            <div>
              <label className="lb" htmlFor="fDate">Issue Date</label>
              <input
                className="fld mono"
                id="fDate"
                type="date"
                value={doc.issueDate}
                onChange={(e) => setDocField('issueDate', e.target.value)}
              />
            </div>
            <div className="full">
              <label className="lb" id="fClientLabel">
                Client <span className="req">*</span>
              </label>
              <div className={`clientpick${client ? ' filled' : ''}`}>
                <span className="ci" id="clientIcon"><IconUser /></span>
                <span className="ct">
                  <b id="clientName">{client ? client.name : 'Select a client'}</b>
                  <small id="clientSub">{clientSub}</small>
                </span>
                {client ? (
                  <button
                    className="cx"
                    id="clientClear"
                    title="Clear client"
                    aria-label="Clear client"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearClient();
                    }}
                  >
                    <IconClose />
                  </button>
                ) : null}
                <span className="chev"><IconChevronDownSmall /></span>
              </div>
            </div>
            <div className="full">
              <label className="lb" htmlFor="fSite">Site / Project</label>
              <input
                className="fld"
                id="fSite"
                value={doc.site}
                placeholder="Site or project"
                onChange={(e) => setDocField('site', e.target.value)}
              />
            </div>
            <div className="full">
              <label className="lb" htmlFor="fNotes">Notes</label>
              <textarea
                className="fld"
                id="fNotes"
                rows={2}
                placeholder="Optional sheet notes"
                value={doc.notes}
                onChange={(e) => setDocField('notes', e.target.value)}
              />
            </div>
          </div>
        </section>

        <section className="sec">
          <SectionHead no="2." title="Line items" meta={countLabel} />

          <div className="itemtools">
            <button
              className="itbn"
              title="Choose which fields show on rows and the PDF"
            >
              <IconColumns />
              Columns
            </button>
            <button
              className="itbn"
              title="Replace groups and line items from JSON"
            >
              <IconImport />
              Import
            </button>
            <button
              className="itbn hot"
              id="markupBtn"
              title="Derive selling prices from cost prices"
            >
              <IconMarkup />
              Markup
            </button>
            <button
              className="itbn danger"
              title="Remove every group and item row"
            >
              <IconTrash />
              Clear all
            </button>
          </div>

          <div id="items">
            {rowsRaw.length ? walk : <div className="empty">No rows yet — add a line item or a group.</div>}
          </div>

          <div className="createpair">
            <button className="cbtn primary" title="Adds an ungrouped line item" onClick={addItem}>
              <IconPlus />
              Add line item
            </button>
            <button className="cbtn ghost" title="Adds an empty group" onClick={addGroup}>
              <IconNote />
              Add group
            </button>
          </div>
        </section>

        <section className="sec">
          <SectionHead no="3." title="Totals" meta={<>No VAT · no WHT</>} />
          <div className="gateway" aria-hidden="true"><b>End of schedule · Commercial close-out</b></div>
          <div className="totals">
            <div className="close-top" aria-hidden="true"><i /></div>
            <div className="close-eyebrow">
              Cost &amp; Pricing Summary <span id="closeDocNo">{doc.sheetNumber}</span>
            </div>
            <div className="totals-grid">
              <div className="t-lines">
                <div className="sumline cost">
                  <span>Total cost (CP × Qty)</span>
                  <b id="tCost">{naira(totals.cost)}</b>
                </div>
                <div className="sumline sell">
                  <span>Schedule selling total (SP × Qty)</span>
                  <b id="tSell">{naira(totals.sell)}</b>
                </div>
              </div>
              <div className="mathnote">Schedule selling − Total cost = Gross profit · Margin on selling</div>
              <div className="sumtotal">
                <div>
                  <small>Gross profit</small>
                  <b id="tProfit" className={totals.tone}>{naira(totals.profit)}</b>
                </div>
                <div className="right">
                  <small>Margin</small>
                  <b id="tMargin" className={totals.tone}>{totals.margin}</b>
                </div>
              </div>
            </div>
            <div className="words" id="tWords">{totals.words}</div>
          </div>

          <div className="savebar">
            <button
              className="cbtn primary save-cta"
              title="Save Cost & Pricing Sheet"
              aria-label="Save Cost & Pricing Sheet"
              onClick={save}
            >
              <IconSave />
              Save CPS
            </button>
          </div>
        </section>
      </div>

      <button
        className="fab"
        title="Save Cost & Pricing Sheet"
        aria-label="Save Cost & Pricing Sheet"
        onClick={save}
      >
        <IconSave />
      </button>

      <input
        ref={photoFileRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={onPhotoFile}
      />

      <ToastView show={!!toast} message={toast ? toast.msg : ''} isError={toast ? toast.isErr : false} />
    </>
  );
}

/** initialClient: explicit null means "no client"; omitted means first of clients. */
function propsInitialClient(initialClient: CpsClient | null | undefined, clients: CpsClient[]): CpsClient | null {
  if (initialClient !== undefined) return initialClient;
  return clients.length ? clients[0] : null;
}

export default CostPricingSheetForm;
