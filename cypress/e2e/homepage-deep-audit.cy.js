// cypress/e2e/homepage-deep-audit.cy.js
// Homepage quality audit — current hero/marketplace design plus the Upper Egypt suite
// (currency switcher, remote inspection, family hub). Never writes to production Firestore.

describe('Homepage Exhaustive Deep Audit', () => {
  const consoleErrors = [];

  beforeEach(() => {
    consoleErrors.length = 0;
    // Block every Firestore write channel: tests must not create leads/requests in production
    cy.intercept({ url: /firestore\.googleapis\.com\/.*(Write|commit)/ }, { forceNetworkError: true });

    cy.visit('/', {
      onBeforeLoad(win) {
        win.localStorage.setItem('oneline_consent_v1', 'declined');
        // WhatsApp hand-offs open a new tab; keep the test in this window
        cy.stub(win, 'open').as('winOpen');
        cy.stub(win.console, 'error').callsFake((...args) => {
          consoleErrors.push(args.join(' '));
        });
      }
    });
  });

  it('1. Zero Console Errors & Clean Hydration', () => {
    cy.wait(1500);
    cy.then(() => {
      const criticalErrors = consoleErrors.filter((err) =>
        !err.includes('download the React DevTools') &&
        !err.includes('favicon') &&
        // Offline/blocked Firestore channels are expected in CI
        !/Firestore|firebase/i.test(err)
      );
      if (criticalErrors.length > 0) cy.log('Critical Console Errors found:', criticalErrors);
      expect(criticalErrors).to.have.length(0);
    });
  });

  it('2. Image Integrity: Zero Broken Images on Homepage', () => {
    // Look each image up again by index: sections re-render their images while they scroll into
    // view, so a wrapped element from the first query can be detached by the time it is checked.
    cy.get('img').its('length').then((count) => {
      for (let i = 0; i < count; i += 1) {
        cy.get('img').then(($imgs) => {
          if (i >= $imgs.length) return; // a lazy section swapped its images out
          cy.get('img').eq(i).scrollIntoView({ duration: 150 });
          cy.get('img').eq(i).should(($el) => {
            expect($el[0].naturalWidth, `Image source "${$el[0].src}" failed to load`).to.be.greaterThan(0);
          });
        });
      }
    });
  });

  it('3. Link Integrity: All Links have Valid non-empty Hrefs', () => {
    cy.get('a').each(($a) => {
      const href = $a.attr('href');
      expect(href, 'Anchor tag has missing or empty href').to.exist;
      expect(href.trim()).to.not.equal('');
      expect(href.trim()).to.not.equal('#');
    });
  });

  it('4. Hero Smart Search & Suggestions Dropdown', () => {
    cy.get('.hx-field--keyword input').should('be.visible').type('سوهاج', { force: true });
    cy.get('.hero-live-suggestions-dropdown').should('be.visible');
    cy.get('.hero-clear-input-btn').should('be.visible').click();
    cy.get('.hx-field--keyword input').should('have.value', '');
    cy.get('.hero-live-suggestions-dropdown').should('not.exist');
  });

  it('5. Marketplace Tabs Switching (Properties vs Cash Demands)', () => {
    cy.get('.hx-seg-btn').first().should('have.attr', 'aria-selected', 'true');
    cy.get('.properties-grid-4').should('exist');
    cy.get('.hx-seg-btn').eq(1).click();
    // Metrics show once real demands are published; until then an invitation replaces the zeros
    cy.get('.demands-metrics-strip, .demands-empty-invite').should('be.visible');
    cy.get('.demands-grid-compact .demand-card-box').should('have.length.at.least', 1);
    // Sample cards never carry "urgent"/"serious buyer" badges
    cy.get('.demand-card-box.is-sample .urgency-badge').should('not.exist');
    cy.get('.hx-seg-btn').first().click();
    cy.get('.properties-grid-4').should('be.visible');
  });

  it('6. Hero discovery pills point at real listing filters', () => {
    cy.get('.hx-pill').should('have.length.at.least', 3).each(($pill) => {
      expect($pill.attr('href')).to.match(/^\/properties\?/);
    });
  });

  it('7. Property Card: details link, WhatsApp and "معاينة الغربة"', () => {
    cy.get('.property-card-modern').first().scrollIntoView().within(() => {
      cy.get('.pcx-btn-main').should('have.attr', 'href').and('include', '/properties/');
      cy.contains('button', /واتساب|WhatsApp/).should('exist');
      cy.get('.pcx-chip--remote').click({ force: true });
    });
    // The remote-inspection modal is rendered at app level
    cy.get('.xs-modal[role="dialog"]').should('be.visible');
    cy.get('.xs-country').should('have.length.at.least', 6);
    cy.get('.xs-cover').should('have.length', 2); // live video + street footage (no drone)
    // Validation: submitting without a name is refused and nothing opens
    cy.get('.xs-modal button[type="submit"]').click();
    cy.get('.xs-error').should('be.visible');
    cy.get('@winOpen').should('not.have.been.called');
    cy.get('body').type('{esc}');
    cy.get('.xs-modal').should('not.exist');
  });

  it('8. Family hub: categories and cost-split calculator', () => {
    cy.get('.xs-family-tile').should('have.length', 4).first().should('have.attr', 'href').and('include', '/properties?family=');
    cy.get('.xs-family-calc-toggle').scrollIntoView().click();
    cy.get('.xs-fam-member').should('have.length', 3);
    cy.get('.xs-stepper button').last().click();
    cy.get('.xs-fam-member').should('have.length', 4);
  });

  it('9. Currency switcher lists the six display currencies', () => {
    cy.get('.xs-cur-trigger').first().click();
    cy.get('.xs-cur-menu').should('be.visible');
    cy.get('.xs-cur-opt').should('have.length', 6);
    cy.contains('.xs-cur-head', /الجنيه المصري|EGP/);
    cy.get('body').type('{esc}');
    cy.get('.xs-cur-menu').should('not.exist');
  });

  it('10. Responsive Viewports & Zero Horizontal Overflow', () => {
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
      cy.window().then((win) => {
        const doc = win.document;
        const windowWidth = doc.documentElement.clientWidth;
        const bodyWidth = doc.body.scrollWidth;
        expect(bodyWidth, `Horizontal overflow on ${vp.name}: body ${bodyWidth}px > viewport ${windowWidth}px`).to.be.at.most(windowWidth + 5);
      });
    });
  });

  it('11. BiDi & Brand Typography Integrity (1 LINE not inverted)', () => {
    cy.get('.header-brand-title').should('exist').and('have.attr', 'dir', 'ltr');
    cy.get('.header-brand-one').should('have.text', '1');
  });

  it('12. Dark Mode Toggle Visual Consistency', () => {
    cy.get('.theme-toggle-btn').first().click();
    cy.get('html').should('have.attr', 'data-theme', 'dark');
    cy.get('.theme-toggle-btn').first().click();
    cy.get('html').should('have.attr', 'data-theme', 'light');
  });
});
