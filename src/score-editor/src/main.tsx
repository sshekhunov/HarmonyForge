import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ScoreEditor } from './components/ScoreEditor';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ScoreEditor />
  </StrictMode>
);
