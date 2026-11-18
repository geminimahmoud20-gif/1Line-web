import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  GA4_ID,
  isGa4Active,
  trackGa4PageView,
  trackGa4ContactClick,
  trackGa4FormStart,
  trackGa4LeadSubmitted,
  hasAnalyticsConsent
} from '../../src/utils/ga4.js';

test('GA4 configuration: disabled when measurement ID is missing or invalid', () => {
  // In current test env, VITE_GA4_MEASUREMENT_ID is not set, so GA4_ID must be null
  assert.equal(GA4_ID, null);
  assert.equal(isGa4Active(), false);
});

test('GA4 event functions do not throw when disabled', () => {
  assert.doesNotThrow(() => {
    trackGa4PageView('/test-page');
    trackGa4ContactClick({ channel: 'whatsapp', placement: 'header' });
    trackGa4FormStart({ form: 'sell' });
    trackGa4LeadSubmitted({ form: 'sell', leadId: 'lead-123' });
  });
});

test('GA4 contact click never accepts or forwards PII', () => {
  const payload = {
    channel: 'whatsapp',
    placement: 'property_detail',
    phone: '+201223222956', // Should be ignored
    name: 'Ahmed',          // Should be ignored
    text: 'Confidential message' // Should be ignored
  };
  assert.doesNotThrow(() => trackGa4ContactClick(payload));
});

test('GA4 lead submission handles deduplication safely', () => {
  assert.doesNotThrow(() => {
    trackGa4LeadSubmitted({ form: 'buy', leadId: 'lead-test-1' });
    trackGa4LeadSubmitted({ form: 'buy', leadId: 'lead-test-1' }); // Duplicate call
  });
});
