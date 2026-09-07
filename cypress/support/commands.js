// cypress/support/commands.js
// Custom commands for 1Line Real Estate CRM

// --- Login Command ---
Cypress.Commands.add('loginAsCrmAdmin', (email, password) => {
  const adminEmail = email || Cypress.env('CRM_EMAIL') || 'admin@oneline.com';
  const adminPass = password || Cypress.env('CRM_PASSWORD') || 'testPassword123';

  cy.get('[data-testid="login-email"]').clear().type(adminEmail);
  cy.get('[data-testid="login-password"]').clear().type(adminPass);
  cy.contains(/Login to CRM|دخول لوحة التحكم/i).click();
});

// --- Wait for CRM Dashboard to Load ---
Cypress.Commands.add('waitForDashboard', () => {
  cy.get('.enterprise-crm-hub', { timeout: 10000 }).should('be.visible');
});

// --- Navigate to CRM Tab by data-testid ---
Cypress.Commands.add('navigateToCrmTab', (tabId) => {
  cy.get(`[data-testid="nav-pill-${tabId}"]`).click();
});

// --- Assert No Console Errors ---
Cypress.Commands.add('assertNoConsoleErrors', () => {
  cy.window().then((win) => {
    // Only check for errors logged after page load
    expect(win.console.error).to.have.callCount(0);
  });
});
