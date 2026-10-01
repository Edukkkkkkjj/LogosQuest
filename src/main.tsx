import '@fontsource-variable/figtree'
import '@fontsource-variable/fraunces'
import '@fontsource-variable/fraunces/wght-italic.css'
import '@fontsource/gentium-plus/400.css'
import '@fontsource/gentium-plus/700.css'
import '@fontsource/noto-serif-hebrew/400.css'
import '@fontsource/noto-serif-hebrew/700.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
