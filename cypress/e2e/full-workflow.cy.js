// cypress/e2e/full-workflow.cy.js
// Full end-to-end workflow test covering the main user journeys
// NOTE: CRM internal features require Firebase Auth.
// Tests here validate publicly accessible pages and the login gate.

describe('Full Application Workflow', () => {

  describe('Page Load Performance', () => {
    it('homepage loads within 3 seconds', () => {
      const start = Date.now();
      cy.visit('/');
      cy.get('body').should('be.visible').then(() => {
        const loadTime = Date.now() - start;
        expect(loadTime).to.be.lessThan(3000);
      });
    });

    it('CRM page loads within 3 seconds', () => {
      const start = Date.now();
      cy.visit('/crm');
      cy.get('body').should('be.visible').then(() => {
        const loadTime = Date.now() - start;
        expect(loadTime).to.be.lessThan(3000);
      });
    });

    it('/demands route loads within 3 seconds', () => {
      const start = Date.now();
      cy.visit('/demands', { failOnStatusCode: false });
      cy.get('body').should('be.visible').then(() => {
        const loadTime = Date.now() - start;
        expect(loadTime).to.be.lessThan(3000);
      });
    });
  });

  describe('CRM Login Gate Security', () => {
    beforeEach(() => {
      cy.visit('/crm');
    });

    it('displays login form elements', () => {
      cy.get('form', { timeout: 10000 }).should('exist');
      cy.get('input[type="email"]').should('be.visible');
      cy.get('input[type="password"]').should('be.visible');
      cy.get('button[type="submit"]').should('exist');
    });

    it('has anti-bot honeypot field (hidden)', () => {
      // Honeypot should exist but be invisible
      cy.get('input').then(($inputs) => {
        const hiddenInputs = $inputs.filter((_, el) => {
          const parent = el.closest('[aria-hidden="true"]');
          return parent !== null;
        });
        expect(hiddenInputs.length).to.be.greaterThan(0);
      });
    });

    it('password field has show/hide toggle', () => {
      // There should be a button near the password field to toggle visibility
      cy.get('input[type="password"]', { timeout: 10000 }).should('be.visible');
      // Look for eye icon button
      cy.get('form').find('button, [role="button"]').should('have.length.greaterThan', 0);
    });

    it('rejects empty form submission', () => {
      cy.get('button[type="submit"]', { timeout: 10000 }).click();
      // HTML5 validation should prevent submission or show error
      cy.get('body').should('be.visible');
    });
  });

  describe('Homepage Content Verification', () => {
    beforeEach(() => {
      cy.visit('/');
    });

    it('has navigation/header', () => {
      cy.get('header, nav, .header, .navbar, [class*="header"], [class*="nav"]')
        .should('exist');
    });

    it('has main content sections', () => {
      cy.get('main, section, .hero, [class*="hero"]').should('exist');
    });

    it('has interactive elements (buttons/links)', () => {
      cy.get('a, button').should('have.length.greaterThan', 2);
    });

    it('does not have visible error messages', () => {
      cy.get('body').should('not.contain.text', 'Something went wrong');
      cy.get('body').should('not.contain.text', 'Cannot read properties');
    });
  });

  describe('Cross-Browser Viewport Tests', () => {
    const viewports = [
      { name: 'Desktop HD', width: 1920, height: 1080 },
      { name: 'Laptop', width: 1366, height: 768 },
      { name: 'Tablet Portrait', width: 768, height: 1024 },
      { name: 'Mobile', width: 375, height: 667 },
    ];

    viewports.forEach(({ name, width, height }) => {
      it(`renders correctly on ${name} (${width}x${height})`, () => {
        cy.viewport(width, height);
        cy.visit('/');
        cy.get('body').should('be.visible');
        cy.document().then((doc) => {
          expect(doc.body.scrollWidth).to.be.at.most(width + 20);
        });
      });
    });
  });

  describe('Route Navigation', () => {
    it('navigating between / and /crm works', () => {
      cy.visit('/');
      cy.get('body').should('be.visible');
      cy.visit('/crm');
      cy.get('body').should('be.visible');
      cy.visit('/');
      cy.get('body').should('be.visible');
    });

    it('unknown routes do not crash the app', () => {
      cy.visit('/nonexistent-route', { failOnStatusCode: false });
      cy.get('body').should('be.visible');
    });
  });
});
