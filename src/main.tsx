import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './i18n'; // We'll create this next

// Bundle version to force clients to refresh and drop old service worker caches
const BUNDLE_VERSION = 'opsnest-20250215';
const versionKey = 'opsnest_bundle_version';
const storedVersion = localStorage.getItem(versionKey);
if (storedVersion !== BUNDLE_VERSION) {
  localStorage.setItem(versionKey, BUNDLE_VERSION);
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((reg) => reg.unregister());
    }).finally(() => {
      // Force a reload to pick up the fresh bundle once SW is cleared
      window.location.reload();
    });
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

