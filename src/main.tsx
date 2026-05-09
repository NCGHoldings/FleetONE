import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
// Auto-issue detector DISABLED in production — it intercepts ALL fetch calls
// and writes errors back to DB, creating a death spiral when server is stressed.
// Only enable during local development.
// import { installGlobalErrorHandler } from './lib/autoIssueDetector'
// if (import.meta.env.DEV) installGlobalErrorHandler();

createRoot(document.getElementById("root")!).render(<App />);
