import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';

import './i18n'; // initialise i18next before anything renders
import './index.css';

import { router } from './router';
import { ModalProvider } from './components/modal/ModalProvider';

// Dev-only preview seed: when URL has `?preview` query param, freezes the
// network and injects mock wallet/auth state so the app browses without a BE.
// Production builds tree-shake this whole block via Vite's DEV guard.
if (import.meta.env.DEV) {
  import('./dev/preview-seed').then(({ bootPreviewSeed }) => bootPreviewSeed());
}

// ─── Scroll-pause for continuous animations ──────────────────────────────────
// Continuous CSS animations (box-shadow / opacity / etc.) get promoted to
// their own GPU compositor layer, which can desync from the document scroll
// — causing elements like the quota-bar fill and period-stop dot to visually
// "detach" from their parent card mid-scroll. We toggle a `.is-scrolling`
// class on <html> so CSS can pause all continuous animations while scrolling.
// Animations resume 180ms after the last scroll event.
{
  let scrollTimer = 0;
  const root = document.documentElement;
  window.addEventListener(
    'scroll',
    () => {
      if (!root.classList.contains('is-scrolling')) {
        root.classList.add('is-scrolling');
      }
      clearTimeout(scrollTimer);
      scrollTimer = window.setTimeout(() => {
        root.classList.remove('is-scrolling');
      }, 180);
    },
    { passive: true, capture: true },
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Global modal — rendered once, controlled via useModalStore */}
    <ModalProvider />
    <RouterProvider router={router} />
  </StrictMode>
);
