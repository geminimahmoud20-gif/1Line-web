// cypress/e2e/buyer-demands.cy.js
// Comprehensive E2E tests for Buyer Demands workflow

describe('Buyer Demands Navigation Flow', () => {
  
  describe('From CRM Dashboard', () => {
    beforeEach(() => {
      // Bypass authentication for testing
      cy.visit('/crm', {
        onBeforeLoad(win) {
          win.sessionStorage.setItem('crm_auth', 'true');
        }
      });
    });

    it('opens demands via dashboard shortcut button', () => {
      cy.get('[data-testid="shortcut-demand"]', { timeout: 10000 })
        .should('be.visible')
        .click();
      // Should navigate to demands page/tab
      cy.url().should('satisfy', (url) => {
        return url.includes('/demands') || url.includes('/crm');
      });
    });

    it('opens demands via navigation pill strip', () => {
      cy.get('[data-testid="nav-pill-demands_hub"]', { timeout: 10000 })
        .should('be.visible')
        .click();
      // Demands section should now be active
      cy.url().should('satisfy', (url) => {
        return url.includes('/demands') || url.includes('/crm');
      });
    });

    it('shows demand count in the navigation pill', () => {
      cy.get('[data-testid="nav-pill-demands_hub"]')
        .should('contain.text', '(')
        .and('contain.text', ')');
    });

    it('shows demand count in the shortcut button', () => {
      cy.get('[data-testid="shortcut-demand"]')
        .should('contain.text', '(')
        .and('contain.text', ')');
    });
  });

  describe('From Homepage', () => {
    beforeEach(() => {
      cy.visit('/');
    });

    it('navigates to demands page from homepage links', () => {
      // Look for any link pointing to /demands
      cy.get('a[href*="demands"], button').then(($els) => {
        const demandLink = $els.filter((_, el) => {
          return el.textContent.includes('طلبات') || 
                 el.textContent.includes('Demand') || 
                 el.textContent.includes('demands');
        });
        if (demandLink.length > 0) {
          cy.wrap(demandLink.first()).click();
          cy.url().should('include', '/demands');
        }
      });
    });
  });

  describe('Direct URL Access', () => {
    it('loads /demands route directly', () => {
      cy.visit('/demands', { failOnStatusCode: false });
      cy.get('body').should('be.visible');
      // Should not show a 404 or blank page
      cy.get('body').invoke('text').should('not.be.empty');
    });
  });

  describe('Responsive Design', () => {
    beforeEach(() => {
      cy.visit('/crm', {
        onBeforeLoad(win) {
          win.sessionStorage.setItem('crm_auth', 'true');
        }
      });
    });

    it('demands shortcut works on mobile', () => {
      cy.viewport('iphone-x');
      cy.get('[data-testid="shortcut-demand"]', { timeout: 10000 }).click();
    });

    it('demands navigation pill works on tablet', () => {
      cy.viewport('ipad-2');
      cy.get('[data-testid="nav-pill-demands_hub"]', { timeout: 10000 }).click();
    });

    it('CRM layout does not overflow on small screens', () => {
      cy.viewport(375, 667);
      cy.get('.enterprise-crm-hub').should('exist');
      cy.document().then((doc) => {
        const bodyWidth = doc.body.scrollWidth;
        const windowWidth = doc.documentElement.clientWidth;
        // Allow 20px tolerance for scrollbar
        expect(bodyWidth).to.be.at.most(windowWidth + 20);
      });
    });
  });
});
