import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { usePageMetadata } from '@/lib/seo'

const PAGE_METADATA = {
  title: 'Page not found',
  description:
    'The page you are looking for does not exist. Return to the dashboard or explore other sections.',
} as const

// Ported from docs/prd/Technical-SEO-AND-Metadata-Hardening-PRD/Temps/404-v1.html
// (".n4-eclipse" design, scoped with the n4- prefix). Container-query units need
// a sized container, so the root keeps container-type: size.
const styles = `
  .n4-eclipse {
    --accent: #f5c77e;
    --k: 1;
    position: fixed;
    inset: 0;
    z-index: 0;
    overflow: hidden;
    container-type: size;
    display: grid;
    place-items: center;
    background: radial-gradient(90% 70% at 50% 42%, #0d0c14, #000 70%);
    color: #f5f5f7;
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", "Segoe UI", system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
    text-align: center;
    line-height: 1.4;
  }

  .n4-eclipse *, .n4-eclipse *::before, .n4-eclipse *::after {
    box-sizing: border-box;
  }

  .n4-copy {
    position: relative;
    z-index: 5;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.6cqmin;
    width: 100%;
    max-width: 680px;
    padding: 0 6cqw;
  }

  .n4-title {
    margin: 0;
    font-size: clamp(17px, 4.2cqmin, 36px);
    font-weight: 600;
    letter-spacing: -.02em;
    line-height: 1.15;
    text-wrap: balance;
    animation: n4-eclipse-fade calc(1s / var(--k)) calc(.5s / var(--k)) cubic-bezier(.2, .7, .2, 1) both;
  }

  .n4-sub {
    margin: 0;
    max-width: 34em;
    font-size: clamp(13px, 2.4cqmin, 18px);
    color: #a1a1a6;
    text-wrap: balance;
    animation: n4-eclipse-fade calc(1s / var(--k)) calc(.5s / var(--k)) cubic-bezier(.2, .7, .2, 1) both;
  }

  .n4-num {
    margin: 0 0 1cqmin;
    display: flex;
    align-items: center;
    font-size: clamp(84px, 30cqmin, 300px);
    font-weight: 700;
    letter-spacing: -.05em;
    line-height: .9;
  }

  .n4-num b {
    background: linear-gradient(180deg, #fff 15%, #57575c 95%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    animation: n4-eclipse-rise calc(1.4s / var(--k)) cubic-bezier(.2, .7, .2, 1) both;
  }

  .n4-num b:last-child {
    animation-delay: calc(.15s / var(--k));
  }

  .n4-moon {
    position: relative;
    width: .7em;
    height: .7em;
    margin: 0 .06em;
    border-radius: 50%;
    background: radial-gradient(circle at 42% 38%, #121214, #000 60%);
    box-shadow: 0 0 0 .006em rgba(255, 255, 255, .95),
      0 0 .04em .012em #fff,
      0 0 .14em .03em color-mix(in srgb, var(--accent) 80%, #fff),
      0 0 .5em .12em color-mix(in srgb, var(--accent) 40%, transparent),
      0 0 1.1em .35em color-mix(in srgb, var(--accent) 16%, transparent);
    animation: n4-eclipse-glow calc(6s / var(--k)) ease-in-out infinite;
  }

  .n4-moon::before {
    content: "";
    position: absolute;
    inset: -.22em;
    border-radius: 50%;
    background: conic-gradient(from 20deg, transparent 0 6%, color-mix(in srgb, var(--accent) 55%, #fff) 10%, transparent 18% 40%, rgba(255, 255, 255, .55) 47%, transparent 55% 72%, color-mix(in srgb, var(--accent) 45%, #fff) 80%, transparent 88%);
    -webkit-mask: radial-gradient(circle, transparent 54%, #000 57%, transparent 76%);
    mask: radial-gradient(circle, transparent 54%, #000 57%, transparent 76%);
    filter: blur(.018em);
    opacity: .9;
    animation: n4-eclipse-spin calc(18s / var(--k)) linear infinite;
  }

  .n4-moon::after {
    content: "";
    position: absolute;
    top: 9%;
    right: 11%;
    width: .05em;
    height: .05em;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 0 .05em .03em #fff, 0 0 .22em .06em color-mix(in srgb, var(--accent) 70%, #fff);
    animation: n4-eclipse-diamond calc(5s / var(--k)) ease-in-out infinite;
  }

  .n4-stars, .n4-stars2 {
    position: absolute;
    inset: -4%;
    pointer-events: none;
  }

  .n4-stars {
    background-image: radial-gradient(1px 1px at 8% 12%, #fff 60%, transparent), radial-gradient(1px 1px at 22% 68%, #fff 60%, transparent), radial-gradient(1.5px 1.5px at 35% 24%, #fff 60%, transparent), radial-gradient(1px 1px at 48% 82%, #fff 60%, transparent), radial-gradient(1px 1px at 57% 9%, #fff 60%, transparent), radial-gradient(1.5px 1.5px at 66% 44%, #fff 60%, transparent), radial-gradient(1px 1px at 74% 72%, #fff 60%, transparent), radial-gradient(1px 1px at 86% 18%, #fff 60%, transparent), radial-gradient(1.5px 1.5px at 93% 58%, #fff 60%, transparent), radial-gradient(1px 1px at 14% 42%, #fff 60%, transparent), radial-gradient(1px 1px at 40% 55%, #fff 60%, transparent), radial-gradient(1px 1px at 81% 90%, #fff 60%, transparent), radial-gradient(1px 1px at 4% 88%, #fff 60%, transparent), radial-gradient(1px 1px at 62% 30%, #fff 60%, transparent);
    opacity: .75;
    animation: n4-eclipse-tw calc(5s / var(--k)) ease-in-out infinite alternate;
  }

  .n4-stars2 {
    background-image: radial-gradient(2px 2px at 18% 30%, rgba(255, 255, 255, .9) 50%, transparent), radial-gradient(1.5px 1.5px at 72% 20%, rgba(255, 255, 255, .8) 50%, transparent), radial-gradient(2px 2px at 30% 85%, rgba(255, 255, 255, .7) 50%, transparent), radial-gradient(1.5px 1.5px at 88% 70%, rgba(255, 255, 255, .8) 50%, transparent), radial-gradient(2px 2px at 52% 60%, rgba(255, 255, 255, .6) 50%, transparent), radial-gradient(1.5px 1.5px at 6% 55%, rgba(255, 255, 255, .8) 50%, transparent);
    opacity: .55;
    animation: n4-eclipse-tw calc(7s / var(--k)) ease-in-out infinite alternate-reverse;
  }

  .n4-cta {
    margin-top: 1.8cqmin;
    animation: n4-eclipse-fade calc(1s / var(--k)) calc(.5s / var(--k)) cubic-bezier(.2, .7, .2, 1) both;
  }

  @keyframes n4-eclipse-tw {
    from { opacity: .3; }
  }

  @keyframes n4-eclipse-spin {
    to { transform: rotate(1turn); }
  }

  @keyframes n4-eclipse-fade {
    from { opacity: 0; transform: translateY(10px); }
  }

  @keyframes n4-eclipse-rise {
    from { opacity: 0; transform: translateY(.12em); filter: blur(.04em); }
  }

  @keyframes n4-eclipse-glow {
    50% { filter: brightness(1.25); }
  }

  @keyframes n4-eclipse-diamond {
    0%, 100% { opacity: .2; transform: scale(.5); }
    45%, 55% { opacity: 1; transform: scale(1.6); }
  }

  @media (prefers-reduced-motion: reduce) {
    .n4-eclipse *, .n4-eclipse *::before, .n4-eclipse *::after {
      animation: none !important;
      transition: none !important;
    }
  }
`

export default function NotFound() {
  usePageMetadata(PAGE_METADATA)

  return (
    <main className="n4-eclipse">
      <style>{styles}</style>
      <div className="n4-stars" aria-hidden="true" />
      <div className="n4-stars2" aria-hidden="true" />
      <div className="n4-copy">
        <p className="n4-num" aria-hidden="true">
          <b>4</b>
          <span className="n4-moon" />
          <b>4</b>
        </p>
        <h1 className="n4-title">A total eclipse of this page</h1>
        <p className="n4-sub">
          What you were looking for has slipped behind the Moon. It will be back, just not here.
        </p>
        <Button
          asChild
          className="n4-cta inline-flex h-auto w-auto items-center gap-2 rounded-full border-0 bg-[#f5f5f7] px-6 py-3.5 text-[clamp(13px,2.2cqmin,16px)] font-semibold text-black no-underline shadow-none transition-[transform,box-shadow] duration-300 [transition-timing-function:cubic-bezier(.25,.1,.25,1)] hover:bg-[#f5f5f7] hover:text-black hover:shadow-[0_12px_32px_-10px_#f5c77e] hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-[#f5c77e]"
        >
          <Link to="/">Back to home</Link>
        </Button>
      </div>
    </main>
  )
}
