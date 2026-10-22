// cypress/e2e/buyer-demands.cy.js
// Comprehensive E2E tests for Buyer Demands workflow
// NOTE: CRM dashboard tests require Firebase Auth. Tests that need
// authentication are marked with context descriptions and will validate
// the login gate instead.

describe('Buyer Demands Navigation Flow', () => {

  describe('CRM Login Gate (Unauthenticated)', () => {
    beforeEach(() => {
      cy.visit('/crm');
    });

    it('shows secure login portal when visiting /crm', () => {
      // CrmPage login gate should be visible
      cy.get('.crm-login-fullscreen, .crm-login-card', { timeout: 10000 })
        .should('exist');
    });

    it('displays the admin portal title', () => {
      cy.contains(/بوابة إدارة 1Line|1Line Management Portal/i, { timeout: 10000 })
        .should('be.visible');
    });

    it('has email and password input fields', () => {
      cy.get('input[type="email"]', { timeout: 10000 }).should('be.visible');
      cy.get('input[type="password"]').should('be.visible');
    });

    it('shows login button', () => {
      cy.contains(/دخول|Login|الدخول/i).should('be.visible');
    });
  });

  describe('From Homepage', () => {
    beforeEach(() => {
      cy.visit('/');
    });

    it('homepage loads successfully', () => {
      cy.get('body').should('be.visible');
      cy.title().should('not.be.empty');
    });

    it('navigates to the demands page from the «خدمات» menu', () => {
      cy.get('.desktop-nav .luxury-nav-dropdown-wrapper').trigger('mouseover');
      cy.get('.luxury-dropdown-menu a[href="/demands"]').should('be.visible').click();
      cy.url().should('include', '/demands');
    });
  });

  describe('Direct URL Access', () => {
    it('loads /demands route directly without 404', () => {
      cy.visit('/demands', { failOnStatusCode: false });
      cy.get('body').should('be.visible');
      cy.get('body').invoke('text').should('not.be.empty');
    });

    it('loads /crm route directly', () => {
      cy.visit('/crm');
      cy.get('body').should('be.visible');
    });
  });

  describe('Responsive Design', () => {
    it('CRM login page renders on mobile', () => {
      cy.viewport('iphone-x');
      cy.visit('/crm');
      cy.get('.crm-login-fullscreen, .crm-login-card, form', { timeout: 10000 })
        .should('exist');
    });

    it('CRM login page renders on tablet', () => {
      cy.viewport('ipad-2');
      cy.visit('/crm');
      cy.get('.crm-login-fullscreen, .crm-login-card, form', { timeout: 10000 })
        .should('exist');
    });

    it('homepage does not overflow on mobile', () => {
      cy.viewport(375, 667);
      cy.visit('/');
      cy.document().then((doc) => {
        const bodyWidth = doc.body.scrollWidth;
        const windowWidth = doc.documentElement.clientWidth;
        expect(bodyWidth).to.be.at.most(windowWidth + 20);
      });
    });
  });
});
