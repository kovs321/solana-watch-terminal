
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Get the root element from the DOM
const rootElement = document.getElementById("root");

// Ensure the root element exists before rendering
if (!rootElement) {
  console.error("Root element not found");
} else {
  createRoot(rootElement).render(<App />);
}
