import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { supabase } from './supabase.js'

// Test Supabase connection
supabase.from('clients').select('*').then(({ data, error }) => {
  console.log('TEST - data:', data)
  console.log('TEST - error:', error)
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)