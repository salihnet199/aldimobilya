/**
 * Unit tests for the admin role/capability matrix.
 *
 *   node --test apps/admin/lib/roles.test.mjs
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { can, capabilitiesFor, normalizeRole } from './roles.ts';

const EDITOR_ALLOWED = [
  'rooms:read',
  'rooms:write',
  'videos:read',
  'videos:write',
  'settings:read',
  'upload',
];

const ADMIN_ONLY = ['rooms:delete', 'videos:delete', 'settings:write'];

describe('normalizeRole', () => {
  it('accepts only the known roles', () => {
    assert.equal(normalizeRole('ADMIN'), 'ADMIN');
    assert.equal(normalizeRole('EDITOR'), 'EDITOR');
    for (const bad of ['admin', 'SUPERADMIN', '', null, undefined, 42, {}]) {
      assert.equal(normalizeRole(bad), null, `expected null for ${String(bad)}`);
    }
  });
});

describe('can', () => {
  it('grants every capability to ADMIN', () => {
    for (const capability of [...EDITOR_ALLOWED, ...ADMIN_ONLY]) {
      assert.equal(can('ADMIN', capability), true, `ADMIN should have ${capability}`);
    }
  });

  it('grants read/write/upload but not delete or settings writes to EDITOR', () => {
    for (const capability of EDITOR_ALLOWED) {
      assert.equal(can('EDITOR', capability), true, `EDITOR should have ${capability}`);
    }
    for (const capability of ADMIN_ONLY) {
      assert.equal(can('EDITOR', capability), false, `EDITOR must not have ${capability}`);
    }
  });

  it('fails closed for unknown, missing or malformed roles', () => {
    for (const role of [undefined, null, '', 'admin', 'OWNER', 1, {}]) {
      assert.equal(can(role, 'rooms:read'), false, `expected deny for ${String(role)}`);
      assert.equal(can(role, 'rooms:write'), false, `expected deny for ${String(role)}`);
    }
  });
});

describe('capabilitiesFor', () => {
  it('returns the full list per role', () => {
    assert.deepEqual(capabilitiesFor('EDITOR').sort(), [...EDITOR_ALLOWED].sort());
    assert.equal(capabilitiesFor('ADMIN').length, EDITOR_ALLOWED.length + ADMIN_ONLY.length);
    assert.deepEqual(capabilitiesFor('nope'), []);
  });
});
