import { createServer } from 'vite';
import React from 'react';
import { renderToString } from 'react-dom/server';

// Setup minimal browser globals for SSR simulation
globalThis.window = {
  location: { href: 'http://localhost:5173/', hash: '', search: '', pathname: '/' },
  matchMedia: (q) => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }),
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => {},
  innerWidth: 1200,
  innerHeight: 800,
  scrollTo: () => {},
  localStorage: {
    getItem: (k) => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {}
  }
};
globalThis.document = {
  title: '',
  querySelector: () => null,
  querySelectorAll: () => [],
  getElementById: () => null,
  createElement: () => ({ setAttribute: () => {}, appendChild: () => {}, style: {} }),
  head: { appendChild: () => {} },
  body: { appendChild: () => {}, style: {} }
};
globalThis.navigator = {
  userAgent: 'Mozilla/5.0',
  connection: { saveData: false, effectiveType: '4g' }
};
globalThis.localStorage = globalThis.window.localStorage;

async function run() {
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'custom'
  });

  try {
    console.log('Loading /src/App.jsx via Vite SSR...');
    const { default: App } = await vite.ssrLoadModule('/src/App.jsx');
    const { MemoryRouter } = await vite.ssrLoadModule('react-router-dom');

    console.log('Rendering App in MemoryRouter...');
    const html = renderToString(
      React.createElement(MemoryRouter, { initialEntries: ['/'] },
        React.createElement(App)
      )
    );
    console.log('SUCCESS! Rendered length:', html.length);
  } catch (err) {
    console.error('CRASH DETECTED DURING RENDER:');
    console.error(err);
  } finally {
    await vite.close();
  }
}

run();
