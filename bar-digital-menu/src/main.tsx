import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import App from './App';
import { BarProvider } from './lib/bar-context';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <BarProvider>
        <App />
        <Toaster
          position="top-center"
          richColors
          closeButton
          toastOptions={{
            style: {
              background: '#1D1922',
              border: '1px solid rgba(255,255,255,.1)',
              color: '#F5F3F7',
              fontFamily: 'Karla, sans-serif',
            },
          }}
        />
      </BarProvider>
    </BrowserRouter>
  </StrictMode>,
);
