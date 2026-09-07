// cypress/e2e/crm-dashboard.cy.js
// Tests for CRM Dashboard tabs, shortcuts, and navigation

describe('CRM Dashboard & Tab Navigation', () => {
  beforeEach(() => {
    cy.visit('/crm');
  });

  it('shows the CRM login gate when not authenticated', () => {
    // Login form should be visible
    cy.get('[data-testid="login-email"]').should('be.visible');
    cy.get('[data-testid="login-password"]').should('be.visible');
  });

  it('displays error for invalid credentials', () => {
    cy.get('[data-testid="login-email"]').type('wrong@example.com');
    cy.get('[data-testid="login-password"]').type('wrongpass');
    cy.contains(/Login to CRM|دخول لوحة التحكم/i).click();
    // Should show an error message
    cy.get('[class*="error"], [style*="rose"], [style*="red"]', { timeout: 5000 })
      .should('exist');
  });

  // Skipped by default – requires valid Firebase credentials
  it.skip('logs in successfully with valid credentials', () => {
    cy.loginAsCrmAdmin();
    cy.waitForDashboard();
    // Executive dashboard tab should be active
    cy.get('[data-testid="nav-pill-dashboard"]').should('exist');
  });

  // The following tests assume CRM is authenticated (mock or real)
  describe('Authenticated CRM Navigation', () => {
    beforeEach(() => {
      // Use sessionStorage to bypass login for testing
      cy.window().then((win) => {
        win.sessionStorage.setItem('crm_auth', 'true');
      });
      cy.visit('/crm');
    });

    it('displays the executive dashboard by default', () => {
      cy.get('.enterprise-crm-hub').should('exist');
    });

    it('shows navigation pill strip with all tabs', () => {
      const expectedTabs = [
        'dashboard', 'kanban', 'matching', 'demands_hub',
        'properties_hub', 'areas_hub', 'leads', 'agents',
        'financials', 'retargeting', 'visitor_intelligence',
        'founder_cms', 'automation'
      ];
      expectedTabs.forEach((tabId) => {
        cy.get(`[data-testid="nav-pill-${tabId}"]`).should('exist');
      });
    });

    it('navigates to Kanban pipeline tab', () => {
      cy.get('[data-testid="nav-pill-kanban"]').click();
      // Kanban content should appear
      cy.get('.enterprise-crm-hub').should('exist');
    });

    it('navigates to leads tab', () => {
      cy.get('[data-testid="nav-pill-leads"]').click();
      cy.get('.enterprise-crm-hub').should('exist');
    });

    it('shortcut button for buyer demands is clickable', () => {
      cy.get('[data-testid="shortcut-demand"]').should('be.visible').click();
    });

    it('shortcut button for properties is clickable', () => {
      cy.get('[data-testid="shortcut-properties"]').should('be.visible').click();
    });

    it('shortcut button for areas/districts is clickable', () => {
      cy.get('[data-testid="shortcut-areas"]').should('be.visible').click();
    });

    it('is responsive on tablet viewport', () => {
      cy.viewport('ipad-2');
      cy.get('.enterprise-crm-hub').should('exist');
    });
  });
});
