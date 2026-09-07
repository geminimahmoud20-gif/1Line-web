// cypress/support/e2e.js
// This file is loaded automatically before every spec file.

import './commands';

// Prevent uncaught exceptions from failing tests
Cypress.on('uncaught:exception', (err) => {
  // Return false to prevent the error from failing the test
  // Firebase auth errors and network timeouts are expected in test env
  if (
    err.message.includes('Firebase') ||
    err.message.includes('Network') ||
    err.message.includes('auth/')
  ) {
    return false;
  }
  // Let other errors fail the test
  return true;
});
