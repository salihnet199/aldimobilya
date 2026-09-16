/**
 * Unit tests for persisted room spec handling.
 *
 *   node --test apps/admin/lib/room-specs.test.mjs
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildSpecsPayload,
  extractUnknownSpecs,
  readSpecString,
} from './room-specs.ts';

function fields(overrides = {}) {
  return {
    material: '',
    dimensions: '',
    style: '',
    colors: '',
    warranty: '',
    ...overrides,
  };
}

describe('readSpecString', () => {
  it('reads strings and joins arrays', () => {
    assert.equal(readSpecString({ material: 'Meşe' }, 'material'), 'Meşe');
    assert.equal(readSpecString({ colors: ['Krem', 'Ceviz'] }, 'colors'), 'Krem, Ceviz');
  });

  it('returns an empty string for missing or unusable values', () => {
    for (const specs of [null, undefined, 'nope', [], 7, { material: 12 }, { material: [] }]) {
      assert.equal(readSpecString(specs, 'material'), '', `for ${JSON.stringify(specs)}`);
    }
  });
});

describe('extractUnknownSpecs', () => {
  it('keeps only entries the form does not render', () => {
    const specs = {
      material: 'Meşe',
      dimensions: '180x200',
      style: 'Modern',
      colors: ['Krem'],
      warranty: '2 Yıl',
      legHeight: '15 cm',
      finish: ['Lake', 'Mat'],
    };
    assert.deepEqual(extractUnknownSpecs(specs), {
      legHeight: '15 cm',
      finish: ['Lake', 'Mat'],
    });
  });

  it('drops unusable unknown values rather than breaking the save', () => {
    assert.deepEqual(extractUnknownSpecs({ extra: 42, empty: '   ', ok: 'değer' }), { ok: 'değer' });
    assert.deepEqual(extractUnknownSpecs(null), {});
  });
});

describe('buildSpecsPayload', () => {
  it('returns null when nothing is filled in', () => {
    assert.equal(buildSpecsPayload(fields(), {}), null);
    assert.equal(buildSpecsPayload(fields(), null), null);
  });

  it('writes the edited fields', () => {
    assert.deepEqual(buildSpecsPayload(fields({ material: '  Meşe  ' }), {}), { material: 'Meşe' });
  });

  it('never drops unknown spec keys on edit', () => {
    const original = { material: 'Meşe', legHeight: '15 cm' };
    const payload = buildSpecsPayload(fields({ material: 'Ceviz' }), original);
    assert.deepEqual(payload, { material: 'Ceviz', legHeight: '15 cm' });
  });

  it('keeps a stored array when the edited text is unchanged', () => {
    const original = { colors: ['Krem', 'Ceviz'] };
    assert.deepEqual(buildSpecsPayload(fields({ colors: 'Krem, Ceviz' }), original), {
      colors: ['Krem', 'Ceviz'],
    });
  });

  it('rewrites a stored array into a string once it is edited', () => {
    const original = { colors: ['Krem', 'Ceviz'] };
    assert.deepEqual(buildSpecsPayload(fields({ colors: 'Krem, Antrasit' }), original), {
      colors: 'Krem, Antrasit',
    });
  });

  it('clears a field the user emptied, but keeps the rest', () => {
    const original = { material: 'Meşe', dimensions: '180x200' };
    assert.deepEqual(buildSpecsPayload(fields({ dimensions: '180x200' }), original), {
      dimensions: '180x200',
    });
  });
});
