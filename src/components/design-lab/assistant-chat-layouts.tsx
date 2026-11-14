import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Monitor, PanelRight, Settings2, Smartphone, Tablet, BookOpen, Wifi, SignalHigh, BatteryFull, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { AssistantMark } from './assistant-chat-parts'
import { AssistantRail } from './assistant-chat-rail'

export type ViewportId = 'fold-closed' | 'fold-open' | 'tablet' | 'desktop'

export const VIEWPORTS: {
  id: ViewportId
  label: string
  short: string
  width: number
  height: number
  icon: LucideIcon
  hint: string
}[] = [
  {
    id: 'fold-closed',
    label: 'Fold closed',
    short: '390',
    width: 392,
    height: 812,
    icon: Smartphone,
    hint: 'One column, sheets for context and settings',
  },
  {
    id: 'fold-open',
    label: 'Fold open',
    short: '828',
    width: 828,
    height: 700,
    icon: BookOpen,
    hint: 'Chat and live invoice side by side',
  },
  {
    id: 'tablet',
    label: 'Tablet',
    short: '1024',
    width: 1024,
    height: 740,
    icon: Tablet,
    hint: 'Thread rail, chat stream, context drawer',
  },
  {
    id: 'desktop',
    label: 'Desktop',
    short: '1280',
    width: 1280,
    height: 800,
    icon: Monitor,
    hint: 'Workspace rail, chat canvas, artifact panel',
  },
]

type WorkspaceProps = {
  viewport: ViewportId
  modelPill: ReactNode
  thread: ReactNode
  composer: ReactNode
  panel: ReactNode
  settings: ReactNode
  clerk: ReactNode
  clerkDock: ReactNode | null
  clerkOpen: boolean
  onCloseClerk: () => void
  panelOpen: boolean
  settingsOpen: boolean
  onOpenPanel: () => void
  onClosePanel: () => void
  onOpenSettings: () => void
  onCloseSettings: () => void
  railCollapsed: boolean
  onToggleRail: () => void
  activeThread: string
  onSelectThread: (id: string) => void
  onNewThread: () => void
}

export function AssistantWorkspace(props: WorkspaceProps) {
  const preset = VIEWPORTS.find((item) => item.id === props.viewport) ?? VIEWPORTS[0]
  const { holderRef, scale } = useStageScale(preset.width)

  return (
    <div className="ac-stage-block">
      <div className="ac-stage-wrap" ref={holderRef} style={{ height: preset.height * scale }}>
        <div
          className="ac-stage"
          data-viewport={preset.id}
          style={{ width: preset.width, height: preset.height, transform: `translateX(-50%) scale(${scale})` }}
        >
          {preset.id === 'fold-closed' ? <FoldClosed {...props} /> : null}
          {preset.id === 'fold-open' ? <FoldOpen {...props} /> : null}
          {preset.id === 'tablet' ? <TabletShell {...props} /> : null}
          {preset.id === 'desktop' ? <DesktopShell {...props} /> : null}
        </div>
      </div>
      <p className="ac-stage-caption">
        <span>
          {preset.width} × {preset.height}
        </span>
        {preset.hint}
      </p>
    </div>
  )
}

/** Fits the current viewport into the page width without changing the layout. */
function useStageScale(targetWidth: number) {
  const holderRef = useRef<HTMLDivElement | null>(null)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const node = holderRef.current
    if (!node) return
    const update = () => {
      const available = node.clientWidth - 8
      setScale(Math.min(1, Math.max(0.3, available / targetWidth)))
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(node)
    return () => observer.disconnect()
  }, [targetWidth])

  return { holderRef, scale }
}

function AssistantHeader({
  modelPill,
  onOpenSettings,
  onOpenContext,
  contextOpen,
  showContext,
  subtitle,
}: {
  modelPill: ReactNode
  onOpenSettings: () => void
  onOpenContext: () => void
  contextOpen: boolean
  showContext: boolean
  subtitle: string
}) {
  return (
    <header className="ac-head">
      <AssistantMark size={32} tone="solid" />
      <div className="ac-head-id">
        <p className="ac-head-name">BOURXE Assistant</p>
        <p className="ac-head-sub">{subtitle}</p>
      </div>
      {modelPill}
      {showContext ? (
        <button
          type="button"
          className="ac-icon-btn ac-head-btn"
          aria-label="Invoice context"
          aria-pressed={contextOpen}
          onClick={onOpenContext}
        >
          <PanelRight className="size-4" aria-hidden="true" />
        </button>
      ) : null}
      <button type="button" className="ac-icon-btn ac-head-btn" aria-label="Provider settings" onClick={onOpenSettings}>
        <Settings2 className="size-4" aria-hidden="true" />
      </button>
    </header>
  )
}

function LiquidGlassBackground() {
  return (
    <div className="ac-liquid-bg" aria-hidden="true">
      <div className="lg-orb lg-orb--1" />
      <div className="lg-orb lg-orb--2" />
      <div className="lg-orb lg-orb--3" />
      <div className="lg-frost" />
    </div>
  )
}

function PhoneStatusBar() {
  return (
    <div className="ac-statusbar" aria-hidden="true">
      <span>9:41</span>
      <span className="ac-statusbar-icons">
        <SignalHigh className="size-3" />
        <Wifi className="size-3" />
        <BatteryFull className="size-4" />
      </span>
    </div>
  )
}

function FoldClosed(props: WorkspaceProps) {
  const sheet = props.settingsOpen ? 'settings' : props.panelOpen ? 'panel' : null
  const close = props.settingsOpen ? props.onCloseSettings : props.onClosePanel

  return (
    <div className="ac-frame">
      <div className="ac-screen">
        <LiquidGlassBackground />
        <PhoneStatusBar />
        <span className="ac-island" aria-hidden="true" />
        <AssistantHeader
          modelPill={props.modelPill}
          subtitle="Invoice drafting · reads the form"
          onOpenSettings={props.onOpenSettings}
          onOpenContext={props.onOpenPanel}
          contextOpen={props.panelOpen}
          showContext
        />
        {props.thread}
        {props.composer}
        <div className="ac-clerk-anchor ac-clerk-anchor--phone">{props.clerk}</div>

        {sheet ? (
          <>
            <button
              type="button"
              className="ac-sheet-scrim"
              aria-label="Close the sheet"
              onClick={close}
            />
            <div className="ac-sheet" role="dialog" aria-modal="true" aria-label={sheet === 'settings' ? 'Providers and models' : 'Invoice context'}>
              <span className="ac-sheet-grab" aria-hidden="true" />
              {props.settingsOpen ? null : (
                <button type="button" className="ac-sheet-close ac-icon-btn" aria-label="Close" onClick={close}>
                  <X className="size-4" aria-hidden="true" />
                </button>
              )}
              <div className="ac-sheet-body">{props.settingsOpen ? props.settings : props.panel}</div>
            </div>
          </>
        ) : null}

        {props.clerkOpen && props.clerkDock ? (
          <>
            <button
              type="button"
              className="ac-sheet-scrim"
              aria-label="Close the clerk"
              onClick={props.onCloseClerk}
            />
            <div
              className="ac-sheet ac-clerk-sheet"
              role="dialog"
              aria-modal="true"
              aria-label="BOURXE digital clerk"
            >
              <span className="ac-sheet-grab" aria-hidden="true" />
              <div className="ac-sheet-body">{props.clerkDock}</div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}

function FoldOpen(props: WorkspaceProps) {
  return (
    <div className="ac-fold">
      <div className="ac-screen ac-screen--fold">
        <LiquidGlassBackground />
        <span className="ac-fold-hinge" aria-hidden="true" />
        <div className="ac-fold-chat">
          <AssistantHeader
            modelPill={props.modelPill}
            subtitle="Dual pane · form stays live"
            onOpenSettings={props.onOpenSettings}
            onOpenContext={props.onOpenPanel}
            contextOpen
            showContext={false}
          />
          {props.thread}
          {props.composer}
          <div className="ac-clerk-anchor ac-clerk-anchor--side">
            {props.clerkOpen ? props.clerkDock : null}
            {props.clerk}
          </div>
        </div>
        <div className="ac-fold-side">
          <div className="ac-side-bar">
            <p>Live document</p>
            <span className="ac-tag">Auto</span>
          </div>
          <div className="ac-side-body">{props.panel}</div>
        </div>
        {props.settingsOpen ? (
          <WideSettingsOverlay onClose={props.onCloseSettings}>
            {props.settings}
          </WideSettingsOverlay>
        ) : null}
      </div>
    </div>
  )
}

function TabletShell(props: WorkspaceProps) {
  const drawerOpen = props.panelOpen || props.settingsOpen
  return (
    <div className="ac-tablet">
      <span className="ac-tablet-camera" aria-hidden="true" />
      <div className="ac-screen ac-screen--tablet">
        <LiquidGlassBackground />
        <AssistantRail
          collapsed={props.railCollapsed}
          activeThread={props.activeThread}
          onToggle={props.onToggleRail}
          onSelect={props.onSelectThread}
          onNew={props.onNewThread}
        />

        <div className="ac-main">
          <AssistantHeader
            modelPill={props.modelPill}
            subtitle="Invoice INV-000131 · draft"
            onOpenSettings={props.onOpenSettings}
            onOpenContext={props.onOpenPanel}
            contextOpen={drawerOpen}
            showContext
          />
          {props.thread}
          {props.composer}
          <div className="ac-clerk-anchor ac-clerk-anchor--tablet">
            {props.clerkOpen ? props.clerkDock : null}
            {props.clerk}
          </div>
        </div>

        {drawerOpen ? (
          <div className="ac-drawer-wrap">
            <button
              type="button"
              className="ac-sheet-scrim"
              aria-label="Close the drawer"
              onClick={props.settingsOpen ? props.onCloseSettings : props.onClosePanel}
            />
            <aside className="ac-drawer" role="dialog" aria-modal="true" aria-label="Context drawer">
              <div className="ac-drawer-bar">
                <p>{props.settingsOpen ? 'Providers & models' : 'Context'}</p>
                <button
                  type="button"
                  className="ac-icon-btn"
                  aria-label="Close the drawer"
                  onClick={props.settingsOpen ? props.onCloseSettings : props.onClosePanel}
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </div>
              <div className="ac-drawer-body">{props.settingsOpen ? props.settings : props.panel}</div>
            </aside>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function DesktopShell(props: WorkspaceProps) {
  return (
    <div className="ac-window">
      <div className="ac-window-bar">
        <span className="ac-window-dots" aria-hidden="true">
          <i /> <i /> <i />
        </span>
        <p className="ac-window-title">BOURXE — Assistant</p>
        <span className="ac-window-tag">Design Lab</span>
      </div>
      <div className="ac-screen ac-screen--desktop">
        <LiquidGlassBackground />
        <AssistantRail
          collapsed={props.railCollapsed}
          activeThread={props.activeThread}
          onToggle={props.onToggleRail}
          onSelect={props.onSelectThread}
          onNew={props.onNewThread}
        />

        <div className="ac-main ac-main--canvas">
          <AssistantHeader
            modelPill={props.modelPill}
            subtitle="Workspace assistant · invoice INV-000131"
            onOpenSettings={props.onOpenSettings}
            onOpenContext={props.onOpenPanel}
            contextOpen
            showContext={false}
          />
          <div className="ac-canvas">{props.thread}</div>
          <div className="ac-canvas-composer">{props.composer}</div>
          <div className="ac-clerk-anchor ac-clerk-anchor--desktop">
            {props.clerkOpen ? props.clerkDock : null}
            {props.clerk}
          </div>
        </div>

        <aside className="ac-artifact">
          <div className="ac-side-bar">
            <p>Artifact</p>
            <span className="ac-tag">Live</span>
          </div>
          <div className="ac-side-body">{props.panel}</div>
        </aside>
        {props.settingsOpen ? (
          <WideSettingsOverlay onClose={props.onCloseSettings}>
            {props.settings}
          </WideSettingsOverlay>
        ) : null}
      </div>
    </div>
  )
}

function WideSettingsOverlay({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <div className="ac-settings-overlay">
      <button
        type="button"
        className="ac-settings-overlay-scrim"
        aria-label="Close provider settings"
        onClick={onClose}
      />
      <aside className="ac-settings-drawer" role="dialog" aria-modal="true" aria-label="Providers and models">
        <div className="ac-settings-drawer-bar">
          <p>Providers &amp; models</p>
          <button type="button" className="ac-icon-btn" aria-label="Close provider settings" onClick={onClose}>
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
        <div className="ac-settings-drawer-body">{children}</div>
      </aside>
    </div>
  )
}
