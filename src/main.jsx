import React from 'react'
import ReactDOM from 'react-dom/client'
import { Toaster } from 'sonner'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <Toaster
            position="top-right"
            theme="dark"
            richColors
            toastOptions={{
                style: { background: '#0f172a', border: '1px solid #334155', color: '#e2e8f0' },
            }}
        />
        <App />
    </React.StrictMode>,
)
