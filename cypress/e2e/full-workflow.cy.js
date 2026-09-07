// cypress/e2e/full-workflow.cy.js
// Full end-to-end workflow test covering the main user journeys

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
  });

  describe('CRM Toolbar & Actions', () => {
    beforeEach(() => {
      cy.visit('/crm', {
        onBeforeLoad(win) {
          win.sessionStorage.setItem('crm_auth', 'true');
        }
      });
    });

    it('displays the connection status badge', () => {
      // Cloud Active or Local Storage badge should exist
      cy.get('.enterprise-crm-hub').within(() => {
        cy.contains(/Cloud|السحابة|Local|محلي/i).should('exist');
      });
    });

    it('has AI Copywriter button', () => {
      cy.contains(/AI Copywriter|كاتب الإعلانات/i).should('be.visible');
    });

    it('has Contract Studio button', () => {
      cy.contains(/Contract Studio|استوديو العقود/i).should('be.visible');
    });

    it('has Export CSV button', () => {
      cy.contains(/Export CSV|تصدير/i).should('be.visible');
    });

    it('has Backup button', () => {
      cy.contains(/Backup|نسخ احتياطي/i).should('be.visible');
    });
  });

  describe('Navigation Between Sections', () => {
    beforeEach(() => {
      cy.visit('/crm', {
        onBeforeLoad(win) {
          win.sessionStorage.setItem('crm_auth', 'true');
        }
      });
    });

    it('can navigate to all main tabs without errors', () => {
      const tabIds = [
        'kanban', 'matching', 'leads', 'agents',
        'financials', 'retargeting', 'visitor_intelligence',
        'founder_cms', 'automation', 'dashboard'
      ];

      tabIds.forEach((tabId) => {
        cy.get(`[data-testid="nav-pill-${tabId}"]`).click();
        // Should not show any error overlay
        cy.get('body').should('not.contain.text', 'Something went wrong');
        cy.get('body').should('not.contain.text', 'Error');
      });
    });

    it('returns to dashboard after navigating through tabs', () => {
      cy.get('[data-testid="nav-pill-kanban"]').click();
      cy.get('[data-testid="nav-pill-dashboard"]').click();
      // Dashboard shortcuts should be visible again
      cy.get('[data-testid="shortcut-demand"]').should('be.visible');
    });
  });

  describe('Add Lead Modal', () => {
    beforeEach(() => {
      cy.visit('/crm', {
        onBeforeLoad(win) {
          win.sessionStorage.setItem('crm_auth', 'true');
        }
      });
    });

    it('opens add lead modal from dashboard shortcut', () => {
      cy.contains(/تسجيل عميل|Register New Lead/i).click();
      // Modal should appear
      cy.get('[class*="modal"], [class*="Modal"], [role="dialog"]', { timeout: 5000 })
        .should('exist');
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
        // No horizontal scrollbar
        cy.document().then((doc) => {
          expect(doc.body.scrollWidth).to.be.at.most(width + 20);
        });
      });
    });
  });
});
