import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import ColdLaunchPreview from './src/pages/ColdLaunchPreview'

const THEMES: Record<string, Record<string, string>> = {
  amber: {
    '--primary': '36 93% 51%',
    '--primary-bright': '45 96% 56%',
    '--secondary': '24 96% 60%',
    '--attention': '0 84% 63%',
  },
  teal: {
    '--primary': '174 72% 44%',
    '--primary-bright': '172 66% 52%',
    '--secondary': '196 82% 52%',
    '--attention': '12 84% 62%',
  },
}

function applyTheme(name: string) {
  const tokens = THEMES[name]
  for (const [key, value] of Object.entries(tokens)) {
    document.documentElement.style.setProperty(key, value)
  }
}

applyTheme('amber')

function Harness() {
  return (
    <MemoryRouter initialEntries={['/cold-launch-preview']}>
      <ColdLaunchPreview />
      <div
        style={{
          position: 'fixed',
          right: 10,
          bottom: 10,
          zIndex: 90,
          display: 'flex',
          gap: 6,
        }}
      >
        <button type="button" id="theme-amber" onClick={() => applyTheme('amber')}>
          amber theme
        </button>
        <button type="button" id="theme-teal" onClick={() => applyTheme('teal')}>
          teal theme
        </button>
      </div>
    </MemoryRouter>
  )
}

createRoot(document.getElementById('root')!).render(<Harness />)
