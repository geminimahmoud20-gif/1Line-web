// cypress/e2e/lead-journey.cy.js
// The whole path a lead takes, against the local Firestore + Auth emulators (never production):
//   a visitor sends the /buy form → the lead is stored without its phone, the phone in
//   lead_contacts → a sales manager signs in to the CRM and finds it.
// Needs a build made with VITE_FIREBASE_EMULATORS=true and the emulators running — see the
// "journey" job in .github/workflows/ci.yml for the exact commands.

const PROJECT = 'line-c9601';
const FS = `http://127.0.0.1:8080/v1/projects/${PROJECT}/databases/(default)/documents`;
const AUTH = 'http://127.0.0.1:9099';
const OWNER = { Authorization: 'Bearer owner' }; // emulator admin access, bypasses rules

const MANAGER = { email: 'manager@journey.test', password: 'journey-pass-1234' };
const LEAD_NAME = `عميل اختبار ${Date.now().toString(36)}`;
const PHONE = '01012345678';

const field = (doc, name) => {
  const v = doc.fields?.[name];
  return v && (v.stringValue ?? v.integerValue ?? v.booleanValue ?? v.timestampValue);
};

// The submitted lead as stored in the emulator, or undefined after ~15 s
const waitForLead = (attempt = 0) => cy.request({ url: `${FS}/leads?pageSize=50`, headers: OWNER }).then(({ body }) => {
  const doc = (body.documents || []).find((d) => field(d, 'name') === LEAD_NAME);
  if (!doc && attempt < 15) return cy.wait(1000).then(() => waitForLead(attempt + 1));
  return doc;
});

describe('Lead journey: public form → Firestore → CRM', () => {
  before(() => {
    // Fresh emulator state and one sales manager account (role via custom claim, like production)
    cy.request('DELETE', `http://127.0.0.1:8080/emulator/v1/projects/${PROJECT}/databases/(default)/documents`);
    cy.request('DELETE', `${AUTH}/emulator/v1/projects/${PROJECT}/accounts`);
    cy.request('POST', `${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=test`, { ...MANAGER, returnSecureToken: true })
      .then(({ body }) => cy.request({
        method: 'POST',
        url: `${AUTH}/identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:update`,
        headers: OWNER,
        body: { localId: body.localId, customAttributes: JSON.stringify({ role: 'sales_manager' }) }
      }));
  });

  it('a visitor sends the buy form', () => {
    cy.visit('/buy', {
      onBeforeLoad(win) {
        cy.stub(win, 'open').as('windowOpen'); // the form hands over to WhatsApp afterwards
        // Keep the page's errors so a failure below can print why the lead didn't arrive
        win.__journeyErrors = [];
        const keep = (orig) => (...args) => { win.__journeyErrors.push(args.map(String).join(' ').slice(0, 400)); orig.apply(win.console, args); };
        win.console.error = keep(win.console.error);
        win.console.warn = keep(win.console.warn);
      }
    });
    cy.contains('button', 'طلب سريع في خطوة واحدة', { timeout: 15000 }).click();
    cy.get('form.quick-portal-form', { timeout: 15000 }).within(() => {
      cy.get('input[placeholder*="أحمد"]').type(LEAD_NAME);
      cy.get('input[placeholder*="0101234"]').type(PHONE);
      cy.get('button[type="submit"]').click();
    });
    cy.contains('h3', 'تم استلام طلبك بنجاح', { timeout: 15000 }).should('be.visible');
    // Stay on the page until the write has landed: Cypress resets the page between tests, which
    // would cut off a Firestore write still in flight. If it never lands, print why.
    waitForLead().then((doc) => {
      if (doc) return;
      cy.window().then((win) => cy.task('log', {
        page: win.location.href,
        offlineQueue: win.localStorage.getItem('oneline_pending_leads_queue'),
        errors: win.__journeyErrors
      }));
    });
  });

  it('stores the lead without its phone, and the phone in lead_contacts', () => {
    waitForLead().then((lead) => {
      expect(lead, 'lead document').to.exist;
      const id = lead.name.split('/').pop();
      for (const f of ['phone', 'whatsapp', 'email']) expect(lead.fields, `lead.${f}`).not.to.have.property(f);
      expect(field(lead, 'assignedTo'), 'routed to a desk').to.be.a('string').and.not.be.empty;
      cy.request({ url: `${FS}/lead_contacts/${id}`, headers: OWNER }).then(({ body: contact }) => {
        expect(String(field(contact, 'phone') || field(contact, 'whatsapp'))).to.contain('1012345678');
        expect(field(contact, 'assignedTo')).to.eq(field(lead, 'assignedTo'));
      });
    });
  });

  it('a sales manager signs in to the CRM and finds the lead', () => {
    cy.visit('/crm');
    cy.get('input[type="email"]', { timeout: 15000 }).type(MANAGER.email);
    cy.get('input[type="password"]').first().type(MANAGER.password);
    cy.get('button[type="submit"]').click();
    cy.contains('العملاء والمبيعات', { timeout: 20000 }).click();
    cy.contains(LEAD_NAME, { timeout: 20000 }).should('be.visible');
  });
});
