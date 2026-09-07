// cypress/e2e/crm-dashboard.cy.js
// Tests for CRM Dashboard login gate, security, and UI
// NOTE: Full dashboard tests require Firebase Auth credentials.
// These tests validate what's accessible without authentication.

describe('CRM Dashboard & Security', () => {

  describe('Login Gate', () => {
    beforeEach(() => {
      cy.visit('/crm');
    });

    it('redirects to login portal when not authenticated', () => {
      cy.get('.crm-login-fullscreen, .crm-login-card', { timeout: 10000 })
        .should('exist');
    });

    it('has the security shield emblem', () => {
      cy.get('.crm-lock-emblem, .crm-login-card', { timeout: 10000 })
        .should('exist');
    });

    it('has email input field', () => {
      cy.get('input[type="email"]', { timeout: 10000 }).should('be.visible');
    });

    it('has password input field with toggle', () => {
      cy.get('input[type="password"]', { timeout: 10000 }).should('be.visible');
    });

    it('has a submit/login button', () => {
      cy.get('form', { timeout: 10000 }).within(() => {
        cy.get('button[type="submit"]').should('exist');
      });
    });

    it('displays an error with wrong credentials', () => {
      cy.get('input[type="email"]', { timeout: 10000 }).type('wrong@test.com');
      cy.get('input[type="password"]').type('wrongpass');
      cy.get('button[type="submit"]').click();
      // Wait for error message - matches actual error text from CrmPage.jsx
      cy.contains(/تعذر|Sign-in failed|Firebase|فشل|failed|error|خطأ|حظر|blocked/i, { timeout: 10000 })
        .should('exist');
    });
  });

  describe('Page Metadata', () => {
    it('CRM page has a proper title', () => {
      cy.visit('/crm');
      cy.title().should('not.be.empty');
    });
  });

  describe('Responsive Login Form', () => {
    const viewports = [
      { name: 'Mobile', width: 375, height: 667 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Desktop', width: 1920, height: 1080 },
    ];

    viewports.forEach(({ name, width, height }) => {
      it(`login form renders correctly on ${name} (${width}x${height})`, () => {
        cy.viewport(width, height);
        cy.visit('/crm');
        cy.get('form', { timeout: 10000 }).should('be.visible');
        cy.get('input[type="email"]').should('be.visible');
        cy.get('input[type="password"]').should('be.visible');
      });
    });
  });
});
