import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { installGlobalErrorHandler } from './lib/autoIssueDetector'

// Install global error interceptor for automatic issue detection
installGlobalErrorHandler();

createRoot(document.getElementById("root")!).render(<App />);
