import test from 'node:test';
import assert from 'node:assert/strict';
import { formatLeadHeadline } from '../../src/utils/newLeadAlerts.js';
import { areaLabel, propertyTypeLabel } from '../../src/utils/placeLabels.js';

test('CRM alert headlines name the area and property type in Arabic', () => {
  const seller = formatLeadHeadline({ name: 'عميل 2', type: 'seller', details: { area: 'west', propertyType: 'villa', size: '200' } });
  assert.equal(seller, '💰 عرض بيع: بيت أو فيلا في غرب سوهاج (200م²) — عميل 2');
  const land = formatLeadHeadline({ name: 'عميل 9', type: 'seller', area: 'new_sohag', propertyType: 'land' });
  assert.equal(land, '💰 عرض بيع: أرض في سوهاج الجديدة — عميل 9');
  const buyer = formatLeadHeadline({ name: 'عميل 10', type: 'buyer', propertyType: 'retail', budget: '2,500,000' });
  assert.equal(buyer, '🎯 طلب شراء: محل (ميزانية: 2,500,000 ج.م) — عميل 10');
  const noBudget = formatLeadHeadline({ name: 'x', type: 'buyer', budget: 'مفتوحة' });
  assert.match(noBudget, /ميزانية: مفتوحة/);
  assert.ok(!/NaN/.test(noBudget));
});

test('labels fall back to what was stored, and use districts added in the CRM', () => {
  assert.equal(propertyTypeLabel('office'), 'مكتب أو عيادة');
  assert.equal(propertyTypeLabel('شقة دوبلكس'), 'شقة دوبلكس');
  assert.equal(areaLabel('cairo_zayed'), 'الشيخ زايد');
  assert.equal(areaLabel('custom_1', true, [{ id: 'custom_1', name_ar: 'المنشية' }]), 'المنشية');
  assert.equal(areaLabel('east', false), 'East Sohag');
});
