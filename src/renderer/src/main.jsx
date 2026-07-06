import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './fonts' // self-hosted code + UI fonts (must load before styles)
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
