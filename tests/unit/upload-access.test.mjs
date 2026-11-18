import test from 'node:test';
import assert from 'node:assert/strict';
import { canUploadMedia } from '../../src/utils/accessModel.js';
import { canEditProperties } from '../../src/utils/rbacRules.js';

test('listing photos follow the listing permission, whatever the role is called', () => {
  // A "viewer" role given «إضافة وتعديل العقارات» on the roles screen
  assert.equal(canUploadMedia({ role: 'viewer', staff: true, perms: ['ld.all', 'inv.edit'] }, 'image'), true);
  assert.equal(canUploadMedia({ role: 'viewer', staff: true, perms: ['ld.all', 'inv.edit'] }, 'thumb'), true);
  // A sales manager whose listing permission was taken away
  assert.equal(canUploadMedia({ role: 'sales_manager', staff: true, perms: ['ld.all'] }, 'image'), false);
  // Older accounts keep their role's fixed list, as in firestore.rules
  assert.equal(canUploadMedia({ role: 'property_manager' }, 'image'), true);
  assert.equal(canUploadMedia({ role: 'viewer' }, 'image'), false);
  assert.equal(canUploadMedia({}, 'image'), false);
});

test('the homepage video stays admin-only', () => {
  assert.equal(canUploadMedia({ role: 'viewer', staff: true, perms: ['inv.edit'] }, 'video'), false);
  assert.equal(canUploadMedia({ admin: true }, 'video'), true);
  assert.equal(canUploadMedia({ role: 'super_admin' }, 'video'), true);
});

test('the CRM offers «عقار جديد» exactly when the database will accept it', () => {
  assert.equal(canEditProperties('viewer', ['ld.all', 'inv.edit']), true);
  assert.equal(canEditProperties('sales_manager', ['ld.all']), false);
  assert.equal(canEditProperties('super_admin', []), true);
  assert.equal(canEditProperties('property_manager'), true);
});
