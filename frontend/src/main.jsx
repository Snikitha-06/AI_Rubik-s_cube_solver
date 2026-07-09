// Import StrictMode to activate runtime checks and warnings for the React application
import { StrictMode } from 'react'
// Import createRoot to enable the new React 18 client-side rendering engine
import { createRoot } from 'react-dom/client'
// Import global styling layout
import './index.css'
// Import the root App component
import App from './App.jsx'

// Find the HTML root element and render the React application within StrictMode
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
