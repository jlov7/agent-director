import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource/ibm-plex-mono/300.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import '@fontsource/space-grotesk/400.css';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/600.css';
import '@fontsource/space-grotesk/700.css';
import '@fontsource/unbounded/500.css';
import '@fontsource/unbounded/600.css';
import '@fontsource/unbounded/700.css';
import RouteReadyShell from './routes';
import './styles/main.css';

type VisualBootstrapConfig = {
  seed: number | null;
  staticMode: boolean;
};

function parseVisualBootstrapConfig(): VisualBootstrapConfig {
  if (typeof window === 'undefined') {
    return { seed: null, staticMode: false };
  }
  const params = new URLSearchParams(window.location.search);
  const seedRaw = params.get('seed');
  const seed = seedRaw && /^-?\d+$/.test(seedRaw) ? Number(seedRaw) : null;
  return {
    seed,
    staticMode: params.get('static') === '1',
  };
}

function createSeededRandom(seed: number) {
  let state = seed % 2147483647;
  if (state <= 0) state += 2147483646;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

const visualBootstrap = parseVisualBootstrapConfig();

if (typeof window !== 'undefined' && visualBootstrap.seed !== null) {
  const seededRandom = createSeededRandom(visualBootstrap.seed);
  Math.random = () => seededRandom();
}

if (typeof document !== 'undefined' && visualBootstrap.staticMode) {
  document.documentElement.dataset.visualStatic = '1';
  if (!document.getElementById('visual-static-style')) {
    const style = document.createElement('style');
    style.id = 'visual-static-style';
    style.textContent = '* { animation: none !important; transition: none !important; }';
    document.head.appendChild(style);
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouteReadyShell />
  </React.StrictMode>
);

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js');
  });
}
