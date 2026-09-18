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
try {
  Object.defineProperty(globalThis.navigator, 'connection', {
    value: { saveData: false, effectiveType: '4g' },
    configurable: true
  });
} catch (e) {}
globalThis.localStorage = globalThis.window.localStorage;

import { MemoryRouter } from 'react-router-dom';

async function run() {
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'custom'
  });

  const routesToTest = [
    '/',
    '/properties',
    '/financing',
    '/projects',
    '/portals',
    '/crm',
    '/property/prop-1',
    '/property/non-existent-id'
  ];

  const storageScenarios = [
    { name: 'Empty localStorage', data: {} },
    { name: 'Invalid Currency', data: { 'oneline_currency': 'XYZ_UNKNOWN' } },
    { name: 'Corrupt properties in storage', data: { 'oneline_properties': JSON.stringify([{}, { id: 'bad' }, null]) } },
    { name: 'Corrupt projects in storage', data: { 'oneline_mega_projects': JSON.stringify([{}, null]) } },
    { name: 'Malformed JSON in founder CMS', data: { 'oneline_founder_cms_settings': '{invalid_json' } },
    { name: 'Stale CMS with nulls', data: { 'oneline_founder_cms_settings': JSON.stringify({ heroVideoClips: null, stats: null, pillars: null, goldStandards: null }) } }
  ];

  try {
    const { default: App } = await vite.ssrLoadModule('/src/App.jsx');

    for (const scenario of storageScenarios) {
      console.log(`\n--- Testing Scenario: ${scenario.name} ---`);
      globalThis.window.localStorage = {
        getItem: (k) => scenario.data[k] || null,
        setItem: () => {},
        removeItem: () => {},
        clear: () => {}
      };
      globalThis.localStorage = globalThis.window.localStorage;

      for (const route of routesToTest) {
        try {
          const html = renderToString(
            React.createElement(MemoryRouter, { initialEntries: [route] },
              React.createElement(App)
            )
          );
          // Check if error boundary text is in the rendered html
          if (html.includes('حدث خطأ غير متوقع')) {
            console.error(`❌ CRASH on route ${route} under scenario "${scenario.name}"!`);
          } else {
            // console.log(`✓ ${route} OK`);
          }
        } catch (routeErr) {
          console.error(`💥 EXCEPTION on route ${route} under scenario "${scenario.name}":`, routeErr.message);
          console.error(routeErr.stack);
        }
      }
      console.log(`✓ Scenario ${scenario.name} completed.`);
    }

  } catch (err) {
    console.error('CRASH DETECTED:', err);
  } finally {
    await vite.close();
  }
}

run();
