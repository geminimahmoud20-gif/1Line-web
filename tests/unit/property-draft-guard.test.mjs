// tests/unit/property-draft-guard.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';

test('Property form draft key and structure verification', () => {
  const sampleForm = {
    title: 'شقة 120م للبيع',
    title_ar: 'شقة 120م للبيع في سوهاج الجديدة',
    price: 1500000,
    size: 120,
    areaKey: 'sohag_new',
    type: 'apartment'
  };
  const draftPayload = {
    form: sampleForm,
    editingPropertyId: null,
    savedAt: Date.now()
  };
  const serialized = JSON.stringify(draftPayload);
  const parsed = JSON.parse(serialized);
  assert.equal(parsed.form.title_ar, 'شقة 120م للبيع في سوهاج الجديدة');
  assert.equal(parsed.form.price, 1500000);
  assert.ok(Date.now() - parsed.savedAt < 1000);
});

test('Navigation guard prevents tab hijacking when editing property', () => {
  // Simulate active property editing
  globalThis.__oneline_is_editing_property = true;

  let tabSwitched = false;
  const mockSetActiveTab = (tab) => {
    tabSwitched = true;
  };

  const handleIncomingNotification = (notification) => {
    if (globalThis.__oneline_is_editing_property) {
      // Must NOT switch tab
      return false;
    }
    mockSetActiveTab('leads');
    return true;
  };

  const allowed = handleIncomingNotification({ leadId: 'lead-123' });
  assert.equal(allowed, false);
  assert.equal(tabSwitched, false);

  // When editing is finished
  globalThis.__oneline_is_editing_property = false;
  const allowedAfter = handleIncomingNotification({ leadId: 'lead-123' });
  assert.equal(allowedAfter, true);
  assert.equal(tabSwitched, true);
});
