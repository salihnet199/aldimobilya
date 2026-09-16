/**
 * Unit tests for credential input bounds.
 *
 *   node --test apps/admin/lib/credentials.test.mjs
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  MAX_EMAIL_LENGTH,
  MAX_PASSWORD_LENGTH,
  isAcceptableCredentialInput,
} from './credentials.ts';

describe('isAcceptableCredentialInput', () => {
  it('accepts normal credentials', () => {
    assert.equal(isAcceptableCredentialInput('admin@example.com', 'correct horse battery'), true);
  });

  it('rejects missing, empty and non-string values', () => {
    for (const [email, password] of [
      ['', 'x'],
      ['a@example.com', ''],
      [null, 'x'],
      ['a@example.com', undefined],
      [42, 'x'],
      ['a@example.com', {}],
    ]) {
      assert.equal(isAcceptableCredentialInput(email, password), false);
    }
  });

  it('enforces the documented length bounds', () => {
    const longEmail = `${'a'.repeat(MAX_EMAIL_LENGTH - '@example.com'.length)}@example.com`;
    assert.equal(longEmail.length, MAX_EMAIL_LENGTH);
    assert.equal(isAcceptableCredentialInput(longEmail, 'x'), true);
    assert.equal(isAcceptableCredentialInput(`${longEmail}x`, 'x'), false);

    assert.equal(isAcceptableCredentialInput('a@example.com', 'p'.repeat(MAX_PASSWORD_LENGTH)), true);
    assert.equal(
      isAcceptableCredentialInput('a@example.com', 'p'.repeat(MAX_PASSWORD_LENGTH + 1)),
      false,
    );
  });

  it('keeps the password cap above the bcrypt 72-byte truncation point', () => {
    assert.ok(MAX_PASSWORD_LENGTH > 72);
  });
});
