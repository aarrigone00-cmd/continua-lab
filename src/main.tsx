import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import { ErrorBoundary, StartupError } from './components/ErrorBoundary'

const root = createRoot(document.getElementById('root')!)

const missing = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY'].filter(
  (name) => !import.meta.env[name],
)

if (missing.length > 0) {
  // Show the problem on screen instead of a blank page.
  root.render(
    <StartupError
      message={`These settings are missing from the hosting environment: ${missing.join(', ')}. Add them in Netlify under Project configuration → Environment variables, then redeploy.`}
    />,
  )
} else {
  // Load the app only once its settings are known to exist.
  import('./App').then(({ default: App }) => {
    root.render(
      <StrictMode>
        <ErrorBoundary>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </ErrorBoundary>
      </StrictMode>,
    )
  })
}
