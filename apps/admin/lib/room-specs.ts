/**
 * Persisted `Room.specs` (JSON) handling for the admin room form.
 *
 * The form only surfaces five editable spec fields, but the column is free-form
 * JSON. Loading a room into the form and saving it back must therefore never
 * drop spec entries the form does not render, nor silently change a stored
 * array value into a string. Both rules live here so they can be unit tested
 * without importing React or CSS.
 *
 * Dependency-free on purpose (Node test runner friendly).
 */

export const KNOWN_SPEC_KEYS = ['material', 'dimensions', 'style', 'colors', 'warranty'] as const;

export type KnownSpecKey = (typeof KNOWN_SPEC_KEYS)[number];

/** The five editable spec fields, as held in form state. */
export type RoomSpecFields = Record<KnownSpecKey, string>;

/** A spec value that the admin API accepts (mirrors `validateSpecs`). */
export type SpecValue = string | string[];

const KNOWN_SPEC_KEY_SET: ReadonlySet<string> = new Set(KNOWN_SPEC_KEYS);

/** Upper bound the API enforces for a spec key (`MAX_SHORT_TEXT`). */
const MAX_SPEC_KEY_LENGTH = 200;

/** Normalises one persisted spec value; returns null for anything unusable. */
function normalizeSpecValue(raw: unknown): SpecValue | null {
  if (typeof raw === 'string') {
    const text = raw.trim();
    return text ? text : null;
  }

  if (Array.isArray(raw)) {
    const items: string[] = [];
    for (const entry of raw) {
      if (typeof entry !== 'string') continue;
      const text = entry.trim();
      if (text) items.push(text);
    }
    return items.length ? items : null;
  }

  return null;
}

function readEntry(specs: unknown, key: string): SpecValue | null {
  if (!specs || typeof specs !== 'object' || Array.isArray(specs)) return null;
  return normalizeSpecValue((specs as Record<string, unknown>)[key]);
}

/** Display string for a persisted spec value (arrays join with ", "). */
export function readSpecString(specs: unknown, key: string): string {
  const value = readEntry(specs, key);
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.join(', ');
  return '';
}

/**
 * Spec entries the form does not render. They are carried over verbatim on save
 * so editing a room never loses optional data.
 */
export function extractUnknownSpecs(specs: unknown): Record<string, SpecValue> {
  const out: Record<string, SpecValue> = {};
  if (!specs || typeof specs !== 'object' || Array.isArray(specs)) return out;

  for (const [key, raw] of Object.entries(specs as Record<string, unknown>)) {
    if (KNOWN_SPEC_KEY_SET.has(key)) continue;
    if (!key.trim() || key.length > MAX_SPEC_KEY_LENGTH) continue;
    const value = normalizeSpecValue(raw);
    if (value !== null) out[key] = value;
  }
  return out;
}

/**
 * Builds the `specs` payload written back on save.
 *
 * - Known keys come from the edited form; an empty field is omitted.
 * - When the stored value of a known key was an array and the edited text still
 *   matches its joined form, the array is kept as-is instead of being rewritten
 *   into a string.
 * - Unknown keys are copied over untouched.
 *
 * Returns `null` when nothing remains, so the caller can clear the column.
 */
export function buildSpecsPayload(
  edited: RoomSpecFields,
  original: unknown,
): Record<string, SpecValue> | null {
  const payload: Record<string, SpecValue> = {};

  for (const key of KNOWN_SPEC_KEYS) {
    const text = edited[key].trim();
    if (!text) continue;

    const originalValue = readEntry(original, key);
    payload[key] =
      Array.isArray(originalValue) && originalValue.join(', ') === text ? originalValue : text;
  }

  for (const [key, value] of Object.entries(extractUnknownSpecs(original))) {
    if (!(key in payload)) payload[key] = value;
  }

  return Object.keys(payload).length ? payload : null;
}
