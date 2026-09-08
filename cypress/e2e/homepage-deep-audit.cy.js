// cypress/e2e/homepage-deep-audit.cy.js
// Exhaustive Defect & Quality Audit for Homepage

describe('Homepage Exhaustive Deep Audit', () => {
  const consoleErrors = [];
  const consoleWarnings = [];

  beforeEach(() => {
    consoleErrors.length = 0;
    consoleWarnings.length = 0;

    cy.visit('/', {
      onBeforeLoad(win) {
        cy.stub(win.console, 'error').callsFake((...args) => {
          consoleErrors.push(args.join(' '));
        });
        cy.stub(win.console, 'warn').callsFake((...args) => {
          consoleWarnings.push(args.join(' '));
        });
      }
    });
  });

  it('1. Zero Console Errors & Clean Hydration', () => {
    cy.wait(1500);
    cy.then(() => {
      // Filter out benign React dev warnings if any, but catch actual errors
      const criticalErrors = consoleErrors.filter(err => 
        !err.includes('download the React DevTools') &&
        !err.includes('favicon')
      );
      if (criticalErrors.length > 0) {
        cy.log('Critical Console Errors found:', criticalErrors);
      }
      expect(criticalErrors).to.have.length(0);
    });
  });

  it('2. Image Integrity: Zero Broken Images on Homepage', () => {
    cy.get('img').each(($img) => {
      cy.wrap($img).should('be.visible').and(($el) => {
        // "naturalWidth" should be > 0 if image loaded successfully
        expect($el[0].naturalWidth, `Image source "${$el[0].src}" failed to load`).to.be.greaterThan(0);
      });
    });
  });

  it('3. Link Integrity: All Links have Valid non-empty Hrefs', () => {
    cy.get('a').each(($a) => {
      const href = $a.attr('href');
      // Should not be undefined or empty
      expect(href, 'Anchor tag has missing or empty href').to.exist;
      expect(href.trim()).to.not.equal('');
      expect(href.trim()).to.not.equal('#');
    });
  });

  it('4. Universal Search Omnibox & Suggestions Dropdown', () => {
    // Type in keyword search
    cy.get('.hero-search-inputs-row input[type="text"]')
      .should('be.visible')
      .type('سوهاج');

    // Suggestions dropdown should appear
    cy.get('.hero-live-suggestions-dropdown').should('be.visible');

    // Clear button should work
    cy.get('.hero-clear-input-btn').should('be.visible').click();
    cy.get('.hero-search-inputs-row input[type="text"]').should('have.value', '');
    cy.get('.hero-live-suggestions-dropdown').should('not.exist');
  });

  it('5. Marketplace Tabs Switching (Properties vs Cash Demands)', () => {
    // Tab 1 (Properties) active by default
    cy.get('.marketplace-tab-btn').contains(/العقارات|Properties/).should('have.class', 'active');
    cy.get('.properties-grid-4').should('exist');

    // Switch to Tab 2 (Demands)
    cy.get('.marketplace-tab-btn').contains(/طلبات المشترين|Demands/).click();
    cy.get('.demands-metrics-strip').should('be.visible');
    cy.get('.demands-grid-compact').should('be.visible');

    // Switch back to Tab 1
    cy.get('.marketplace-tab-btn').contains(/العقارات|Properties/).click();
    cy.get('.properties-grid-4').should('be.visible');
  });

  it('6. District Filter Chips in Marketplace Tab', () => {
    // Click on a specific district chip
    cy.get('.filter-chip-btn').contains(/شرق سوهاج|East Sohag/).click();
    cy.get('.filter-chip-btn').contains(/شرق سوهاج|East Sohag/).should('have.class', 'active');

    // Click on All
    cy.get('.filter-chip-btn').contains(/الكل|All/).click();
    cy.get('.filter-chip-btn').contains(/الكل|All/).should('have.class', 'active');
  });

  it('7. Property Card Interactive Features & Action Triggers', () => {
    // Test favorite button on first card
    cy.get('.property-card-modern').first().within(() => {
      cy.get('.card-circle-btn').first().click();
      cy.get('.card-circle-btn').first().should('have.class', 'favorite-active');
      // Un-favorite
      cy.get('.card-circle-btn').first().click();
      cy.get('.card-circle-btn').first().should('not.have.class', 'favorite-active');

      // Check WhatsApp button has valid protocol
      cy.contains('button', /واتساب|WhatsApp/).should('exist');

      // Check Details link
      cy.get('.btn-view-details').should('have.attr', 'href').and('include', '/properties/');
    });
  });

  it('8. Financial Simulator & Founder Tab Switcher', () => {
    // Calculator active by default
    cy.get('#mortgage-calculator').should('exist');
    cy.get('button').contains(/حاسبة التمويل|Mortgage/).should('exist');

    // Switch to Founder & Certified Security tab
    cy.get('button').contains(/عن 1Line|Founder/).click();
    cy.get('#about-us, [class*="founder"], [class*="about"]').should('exist');

    // Switch back to Calculator
    cy.get('button').contains(/حاسبة التمويل|Mortgage/).click();
  });

  it('9. Responsive Viewports & Zero Horizontal Overflow', () => {
    const viewports = [
      { name: 'Desktop HD', width: 1440, height: 900 },
      { name: 'Laptop', width: 1024, height: 768 },
      { name: 'Tablet iPad', width: 768, height: 1024 },
      { name: 'Mobile iPhone X', width: 375, height: 812 },
      { name: 'Small Mobile', width: 320, height: 568 }
    ];

    viewports.forEach((vp) => {
      cy.viewport(vp.width, vp.height);
      cy.wait(400);

      // Inspect and log all elements causing horizontal overflow if any
      cy.window().then((win) => {
        const doc = win.document;
        const windowWidth = doc.documentElement.clientWidth;
        const bodyWidth = doc.body.scrollWidth;

        if (bodyWidth > windowWidth + 5) {
          const offending = [];
          doc.querySelectorAll('*').forEach((el) => {
            const rect = el.getBoundingClientRect();
            if (rect.right > windowWidth + 10 || el.scrollWidth > windowWidth + 10) {
              offending.push({
                tag: el.tagName,
                className: String(el.className).substring(0, 50),
                id: el.id,
                right: Math.round(rect.right),
                scrollWidth: el.scrollWidth,
                clientWidth: el.clientWidth
              });
            }
          });
          cy.log(`⚠️ Overflow on ${vp.name}: body ${bodyWidth} > win ${windowWidth}`, offending.slice(0, 10));
          console.warn(`⚠️ Overflow on ${vp.name}: body ${bodyWidth} > win ${windowWidth}`, offending.slice(0, 10));
        }

        expect(
          bodyWidth,
          `Horizontal overflow detected on ${vp.name} (${vp.width}x${vp.height}): body width ${bodyWidth}px > viewport ${windowWidth}px`
        ).to.be.at.most(windowWidth + 5);
      });
    });
  });

  it('10. BiDi & Brand Typography Integrity (1 LINE not inverted)', () => {
    // Verify brand text has dir="ltr"
    cy.get('.brand-title').should('exist').and('have.attr', 'dir', 'ltr');
    cy.get('.brand-one').should('have.text', '1');
    cy.get('.brand-line').should('have.text', 'LINE');
  });

  it('11. Dark Mode Toggle Visual Consistency', () => {
    // Find theme toggle button and click
    cy.get('button[class*="theme"], button[title*="مظهر"], button[title*="Theme"], button[aria-label*="theme"]').then(($btn) => {
      if ($btn.length > 0) {
        cy.wrap($btn.first()).click();
        cy.get('html, body').should(($el) => {
          const theme = $el.attr('data-theme') || $el.attr('class');
          expect(theme).to.include('dark');
        });
        // Switch back to light
        cy.wrap($btn.first()).click();
      }
    });
  });
});
