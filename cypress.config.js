// cypress.config.js
import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:5173',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'cypress/support/e2e.js',
    viewportWidth: 1280,
    viewportHeight: 720,
    defaultCommandTimeout: 8000,
    video: true,
    screenshotOnRunFailure: true,
    setupNodeEvents(on, config) {
      // cy.task('log', …) prints to the terminal (CI log), e.g. the browser errors a spec collected
      on('task', { log(message) { console.log(typeof message === 'string' ? message : JSON.stringify(message, null, 2)); return null; } });
      return config;
    },
  },
});
