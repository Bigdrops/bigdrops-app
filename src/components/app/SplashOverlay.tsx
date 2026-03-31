type SplashOverlayProps = {
  visible: boolean
  tip: string
}

export default function SplashOverlay({ visible, tip }: SplashOverlayProps) {
  return (
    <div
      aria-hidden={!visible}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(180deg, #fafaf9 0%, #f5f5f4 100%)',
        opacity: visible ? 1 : 0,
        visibility: visible ? 'visible' : 'hidden',
        pointerEvents: visible ? 'auto' : 'none',
        transition: 'opacity 260ms ease, visibility 260ms ease',
      }}
    >
      <div
        style={{
          width: 'min(92vw, 390px)',
          padding: '28px 24px 24px',
          borderRadius: '28px',
          background: 'rgba(255,255,255,0.84)',
          border: '1px solid rgba(24,24,27,0.06)',
          boxShadow: '0 18px 50px rgba(24,24,27,0.07)',
          backdropFilter: 'blur(10px)',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            position: 'relative',
            height: '148px',
            marginBottom: '18px',
            overflow: 'hidden',
            borderRadius: '22px',
            background: 'linear-gradient(180deg, #ffffff 0%, #f8f8f7 100%)',
            border: '1px solid rgba(24,24,27,0.05)',
          }}
        >
          {/* Paper and runner animations omitted for brevity */}
        </div>
        <div
          style={{
            fontSize: 24,
            fontWeight: 650,
            letterSpacing: '-0.02em',
            color: '#18181b',
            marginBottom: 8,
          }}
        >
          BigDrops
        </div>
        <div
          style={{
            fontSize: 13,
            lineHeight: 1.6,
            color: '#71717a',
            minHeight: 42,
            maxWidth: 260,
            margin: '0 auto',
          }}
        >
          {tip}
        </div>
      </div>
    </div>
  )
}
