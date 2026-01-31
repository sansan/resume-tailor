import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { ThemeProvider } from '@/components/theme-provider'
import { AIStatusProvider } from '@/components/ai-status-provider'
import { Toaster } from '@/components/ui/sonner'
import '@/styles/globals.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider defaultTheme="dark" storageKey="resume-tailor-theme">
      <AIStatusProvider>
        <App />
        <Toaster />
      </AIStatusProvider>
    </ThemeProvider>
  </React.StrictMode>,
)
