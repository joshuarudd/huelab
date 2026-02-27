import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ProjectProvider } from './store.js';
import { App } from './App.js';
import './app.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ProjectProvider>
      <App />
    </ProjectProvider>
  </StrictMode>
);
