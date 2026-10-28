import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { pairFromUrl } from './remote'
import './index.css'

// Widget window is transparent — drop the rectangular body backdrop so only the
// rounded panel shows (otherwise the gradient rectangle reveals square corners).
if (new URLSearchParams(location.search).has('widget')) {
  document.documentElement.classList.add('widget')
}

// No preload API means we are in a phone browser talking to the desktop server.
const isPhone = !window.digest
if (isPhone) document.documentElement.classList.add('phone')

async function boot() {
  if (isPhone) {
    await pairFromUrl() // QR link: ?pair=CODE
    // Needs HTTPS (or localhost); silently skipped on plain-http LAN addresses.
    if ('serviceWorker' in navigator && window.isSecureContext) {
      navigator.serviceWorker.register('./sw.js').catch(() => { /* offline shell is optional */ })
    }
  }
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
}
void boot()
