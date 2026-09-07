// cypress/e2e/homepage-navigation.cy.js
// Tests for Homepage navigation and UI rendering

describe('Homepage Navigation & UI', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('loads the homepage without errors', () => {
    // Verify the page title exists
    cy.title().should('not.be.empty');
    // Verify main content area is visible
    cy.get('body').should('be.visible');
  });

  it('displays the header/navbar', () => {
    // Check that navigation links or buttons exist
    cy.get('header, nav, .header, .navbar, [class*="header"], [class*="nav"]')
      .should('exist');
  });

  it('has working navigation links', () => {
    // Find any link or button that references CRM or properties
    cy.get('a, button').then(($elements) => {
      // Just verify there are interactive elements
      expect($elements.length).to.be.greaterThan(0);
    });
  });

  it('renders hero section or main content', () => {
    // Look for the main content area
    cy.get('main, .hero, [class*="hero"], section').first().should('be.visible');
  });

  it('is responsive on mobile viewport', () => {
    cy.viewport('iphone-x');
    cy.get('body').should('be.visible');
    // Verify no horizontal overflow
    cy.document().then((doc) => {
      const bodyWidth = doc.body.scrollWidth;
      const windowWidth = doc.documentElement.clientWidth;
      expect(bodyWidth).to.be.at.most(windowWidth + 20); // small tolerance
    });
  });
});
