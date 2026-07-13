import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Widget window is transparent — drop the rectangular body backdrop so only the
// rounded panel shows (otherwise the gradient rectangle reveals square corners).
if (new URLSearchParams(location.search).has('widget')) {
  document.documentElement.classList.add('widget')
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
