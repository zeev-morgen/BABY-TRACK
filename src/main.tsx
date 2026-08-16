import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { JournalProvider } from './store/JournalContext';
import { SessionProvider } from './store/SessionContext';
import { registerServiceWorker } from './lib/platform';
import './styles/global.css';
import './styles/print.css';

const container = document.getElementById('root');
if (!container) throw new Error('לא נמצא אלמנט השורש #root');

createRoot(container).render(
  <StrictMode>
    <SessionProvider>
      <JournalProvider>
        <App />
      </JournalProvider>
    </SessionProvider>
  </StrictMode>,
);

registerServiceWorker();
