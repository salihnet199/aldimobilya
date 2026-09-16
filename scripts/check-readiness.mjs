#!/usr/bin/env node
/**
 * Aldi Mobilya — production readiness / data integrity check.
 *
 * NON-MUTATING BY CONSTRUCTION
 *   * Every database read happens inside a single interactive transaction whose
 *     first statement is `SET TRANSACTION READ ONLY`. The script then proves the
 *     flag is actually on (`SHOW transaction_read_only`) and aborts if it is not.
 *   * No INSERT/UPDATE/DELETE/DDL, no `prisma migrate`, no `db push`, no seed,
 *     no deployment, no user creation, no public HTTP GET of the running site.
 *   * The only outbound network call is a Cloudinary *read* (`api.upload_preset`)
 *     and only when the corresponding upload preset env var is configured.
 *   * Writes exactly two kinds of files, both under outputs/.
 *
 * PRIVACY
 *   * Never prints or persists credentials, password hashes, phone numbers or
 *     e-mail addresses. `users` is read as `id` + `role` only.
 *   * Env reporting is presence booleans + variable *names*; values are only
 *     compared in-memory (as digests) to detect cross-file conflicts and are
 *     never written out.
 *   * Site settings are hashed as whole rows but only their media *hostnames*
 *     and counts appear in the output.
 *
 * USAGE (run with an absolute node path)
 *   node scripts/check-readiness.mjs
 *       -> reads the database read-only, writes outputs/data-baseline.json
 *   node scripts/check-readiness.mjs --compare outputs/data-baseline.json
 *       -> re-reads read-only, compares against the baseline (never overwrites
 *          it) and writes outputs/data-final.json
 *
 * EXIT CODES
 *   0  baseline written, or compare matched
 *   2  blocker (missing/unreachable database, read-only not enforced)
 *   3  compare mode: drift detected between baseline and current data
 */

import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, '..');

const OUTPUTS_DIR = path.join(ROOT, 'outputs');
const DEFAULT_BASELINE = path.join(OUTPUTS_DIR, 'data-baseline.json');
const FINAL_PATH = path.join(OUTPUTS_DIR, 'data-final.json');

const DB_PKG = path.join(ROOT, 'packages', 'db');
const PRISMA_SCHEMA = path.join(DB_PKG, 'prisma', 'schema.prisma');
const PRISMA_CLI = path.join(
  ROOT,
  'node_modules',
  '.pnpm',
  'prisma@5.22.0',
  'node_modules',
  'prisma',
  'build',
  'index.js',
);

/** Volatile counters are excluded from the content fingerprint so a visitor
 *  count cannot masquerade as a content change. They are still counted. */
const FINGERPRINT_EXCLUDES = ['rooms.viewCount', 'videos.viewCount'];

/** Env files, in load order. Later files win (process.loadEnvFile overwrites). */
const ENV_FILES = [
  { label: 'root', file: path.join(ROOT, '.env.local') },
  { label: 'web', file: path.join(ROOT, 'apps', 'web', '.env') },
  { label: 'admin', file: path.join(ROOT, 'apps', 'admin', '.env') },
  { label: 'db', file: path.join(DB_PKG, '.env') },
];

/** Required variable names per app. Names only — never values. */
const REQUIRED_ENV = {
  web: [
    'DATABASE_URL',
    'DIRECT_URL',
    'NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
  ],
  admin: [
    'DATABASE_URL',
    'DIRECT_URL',
    'AUTH_SECRET',
    'NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
  ],
  db: ['DATABASE_URL', 'DIRECT_URL'],
};

/** NextAuth v5 reads AUTH_SECRET and falls back to the v4 NEXTAUTH_SECRET. */
const AUTH_SECRET_NAMES = ['AUTH_SECRET', 'NEXTAUTH_SECRET'];

const AUTH_SECRET_PLACEHOLDERS = new Set([
  'replace-with-a-long-random-string',
  'your-secret-key-change-this-in-production',
  'your-secret-key',
  'changeme',
  'change-me',
  'secret',
  'test',
  'dev',
]);

const MIN_AUTH_SECRET_LENGTH = 32;

/** Cloudinary provider-side limits the signed presets must carry. */
const CLOUDINARY_PRESETS = {
  image: {
    envVar: 'CLOUDINARY_IMAGE_UPLOAD_PRESET',
    expectedMaxFileSize: 10 * 1024 * 1024, // 10 MB
  },
  video: {
    envVar: 'CLOUDINARY_VIDEO_UPLOAD_PRESET',
    expectedMaxFileSize: 100 * 1024 * 1024, // 100 MB
  },
};

const MAX_REF_LENGTH = 2048;
const CONTROL_CHARS = /[\u0000-\u001f\u007f\\<>"']/;
const PLACEHOLDER_DB_MARKERS = ['[PASSWORD]', '[PROJECT]', 'user:password@host', 'your-', '<'];

const blockers = [];

function addBlocker(code, detail) {
  blockers.push({ code, detail });
}

function sha256(value) {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

/** Deterministic JSON: object keys sorted recursively, so equal content hashes
 *  to an equal digest regardless of key insertion order. */
function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
}

function hashRows(rows, stripKeys = []) {
  const canonical = rows
    .map((row) => {
      const copy = { ...row };
      for (const key of stripKeys) delete copy[key];
      return copy;
    })
    .sort((a, b) => String(a.id).localeCompare(String(b.id)));
  return sha256(stableStringify(canonical));
}

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------

function parseEnvFileKeys(text) {
  const keys = new Map();
  for (const line of text.split(/\r?\n/)) {
    const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/.exec(line);
    if (!match) continue;
    const name = match[1];
    let raw = match[2].trim();
    if (
      (raw.startsWith('"') && raw.endsWith('"')) ||
      (raw.startsWith("'") && raw.endsWith("'"))
    ) {
      raw = raw.slice(1, -1);
    }
    keys.set(name, raw);
  }
  return keys;
}

/**
 * Loads every existing .env with process.loadEnvFile (as instructed) and, from
 * the file text alone, records which names each file declares. Raw values never
 * leave this function — only digests used for conflict detection.
 */
function loadEnvironment() {
  const files = [];
  const digestsByKey = new Map();
  const canLoad = typeof process.loadEnvFile === 'function';

  for (const entry of ENV_FILES) {
    if (!existsSync(entry.file)) {
      files.push({ label: entry.label, exists: false, declaredNames: [] });
      continue;
    }

    let text = '';
    try {
      text = readFileSync(entry.file, 'utf8');
    } catch (err) {
      addBlocker('env-read-failed', `${entry.label}: ${err.code ?? 'unknown'}`);
      files.push({ label: entry.label, exists: true, declaredNames: [] });
      continue;
    }

    const parsed = parseEnvFileKeys(text);

    for (const [name, value] of parsed) {
      if (!value) continue;
      if (!digestsByKey.has(name)) digestsByKey.set(name, new Set());
      digestsByKey.get(name).add(sha256(value).slice(0, 16));
    }

    if (canLoad) {
      try {
        process.loadEnvFile(entry.file);
      } catch (err) {
        addBlocker('env-load-failed', `${entry.label}: ${err.code ?? 'unknown'}`);
      }
    }

    files.push({
      label: entry.label,
      exists: true,
      declaredNames: [...parsed.keys()].sort(),
    });
  }

  // A variable declared with two different values in two files is an integrity
  // risk: which deployment wins depends on the loader. Reported as a boolean.
  const conflicting = [...digestsByKey.entries()]
    .filter(([, set]) => set.size > 1)
    .map(([name]) => name)
    .sort();

  return {
    loadEnvFileAvailable: canLoad,
    files,
    declaredConflicts: conflicting,
  };
}

function envValue(name) {
  const value = process.env[name];
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

function isPlaceholderDatabaseUrl(value) {
  if (!value) return true;
  if (!/^postgres(ql)?:\/\//i.test(value)) return true;
  const lowered = value.toLowerCase();
  return PLACEHOLDER_DB_MARKERS.some((marker) => lowered.includes(marker.toLowerCase()));
}

function assessAuthSecret() {
  let name = null;
  let value = null;
  for (const candidate of AUTH_SECRET_NAMES) {
    const found = envValue(candidate);
    if (found) {
      name = candidate;
      value = found;
      break;
    }
  }

  if (!value) {
    return {
      convention: AUTH_SECRET_NAMES.join(' | '),
      resolvedFrom: null,
      present: false,
      weakOrDefaultOrMissing: true,
      reason: 'missing',
    };
  }

  if (AUTH_SECRET_PLACEHOLDERS.has(value.toLowerCase())) {
    return {
      convention: AUTH_SECRET_NAMES.join(' | '),
      resolvedFrom: name,
      present: true,
      weakOrDefaultOrMissing: true,
      reason: 'known-placeholder',
    };
  }

  if (value.length < MIN_AUTH_SECRET_LENGTH) {
    return {
      convention: AUTH_SECRET_NAMES.join(' | '),
      resolvedFrom: name,
      present: true,
      weakOrDefaultOrMissing: true,
      reason: `shorter-than-${MIN_AUTH_SECRET_LENGTH}`,
    };
  }

  return {
    convention: AUTH_SECRET_NAMES.join(' | '),
    resolvedFrom: name,
    present: true,
    weakOrDefaultOrMissing: false,
    reason: 'ok',
  };
}

// ---------------------------------------------------------------------------
// Media reference integrity (structural — no remote fetches)
// ---------------------------------------------------------------------------

function classifyMediaRef(value) {
  if (value === null || value === undefined) return { state: 'missing', host: null };
  if (typeof value !== 'string') return { state: 'invalid', host: null };

  const raw = value.trim();
  if (!raw) return { state: 'missing', host: null };
  if (raw.length > MAX_REF_LENGTH) return { state: 'invalid', host: null };
  if (CONTROL_CHARS.test(raw)) return { state: 'invalid', host: null };

  if (raw.startsWith('/')) {
    return raw.startsWith('//')
      ? { state: 'invalid', host: null }
      : { state: 'ok', host: '(local)' };
  }

  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' || url.username || url.password) {
      return { state: 'invalid', host: null };
    }
    return { state: 'ok', host: url.hostname.toLowerCase() };
  } catch {
    return { state: 'invalid', host: null };
  }
}

/**
 * Collects every stored media reference and classifies it. A reference is
 * "broken" when a required field is empty, or when any populated field is not a
 * usable https:// or root-relative location. Existence of the remote object is
 * deliberately NOT probed: that would mean issuing public requests.
 */
function analyseMedia(data) {
  const refs = [];

  for (const room of data.rooms) {
    refs.push({ kind: 'room.heroImage', required: true, value: room.heroImage });
    refs.push({ kind: 'room.video', required: false, value: room.video });
  }
  for (const image of data.roomImages) {
    refs.push({ kind: 'roomImage.url', required: true, value: image.url });
  }
  for (const video of data.videos) {
    refs.push({ kind: 'video.url', required: true, value: video.url });
    refs.push({ kind: 'video.thumbnail', required: false, value: video.thumbnail });
  }
  for (const settings of data.siteSettings) {
    refs.push({ kind: 'siteSettings.heroImage', required: false, value: settings.heroImage });
    refs.push({ kind: 'siteSettings.heroVideo', required: false, value: settings.heroVideo });
    const heroImages = Array.isArray(settings.heroImages) ? settings.heroImages : [];
    for (const entry of heroImages) {
      refs.push({ kind: 'siteSettings.heroImages[]', required: false, value: entry });
    }
  }

  const hosts = {};
  const brokenByKind = {};
  const totalByKind = {};
  let brokenTotal = 0;
  let checkedTotal = 0;

  for (const ref of refs) {
    const { state, host } = classifyMediaRef(ref.value);
    const isPopulated = state !== 'missing';
    const isBroken = isPopulated ? state === 'invalid' : ref.required;

    if (isPopulated || ref.required) {
      checkedTotal += 1;
      totalByKind[ref.kind] = (totalByKind[ref.kind] ?? 0) + 1;
    }

    if (host) hosts[host] = (hosts[host] ?? 0) + 1;

    if (isBroken) {
      brokenTotal += 1;
      brokenByKind[ref.kind] = (brokenByKind[ref.kind] ?? 0) + 1;
    }
  }

  const roomIds = new Set(data.rooms.map((room) => room.id));
  const orphanRoomImages = data.roomImages.filter((image) => !roomIds.has(image.roomId)).length;

  const imagesByRoom = new Map();
  for (const image of data.roomImages) {
    imagesByRoom.set(image.roomId, (imagesByRoom.get(image.roomId) ?? 0) + 1);
  }
  const roomsWithoutImages = data.rooms.filter(
    (room) => (imagesByRoom.get(room.id) ?? 0) === 0,
  ).length;
  const visibleRoomsWithoutImages = data.rooms.filter(
    (room) => room.isVisible && (imagesByRoom.get(room.id) ?? 0) === 0,
  ).length;

  return {
    method:
      'structural: required-empty or not-https/root-relative. Remote existence is not probed.',
    checkedTotal,
    brokenTotal,
    brokenByKind: Object.fromEntries(Object.entries(brokenByKind).sort()),
    totalByKind: Object.fromEntries(Object.entries(totalByKind).sort()),
    orphanRoomImages,
    roomsWithoutImages,
    visibleRoomsWithoutImages,
    mediaHosts: Object.fromEntries(Object.entries(hosts).sort(([a], [b]) => a.localeCompare(b))),
  };
}

// ---------------------------------------------------------------------------
// Cloudinary preset verification (read-only provider API)
// ---------------------------------------------------------------------------

function resolveCloudinarySdk() {
  try {
    const require = createRequire(path.join(ROOT, 'apps', 'admin', 'package.json'));
    const mod = require('cloudinary');
    return mod?.v2 ?? mod;
  } catch {
    return null;
  }
}

async function checkUploadPresets() {
  const cloudName = envValue('NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME');
  const apiKey = envValue('CLOUDINARY_API_KEY');
  const apiSecret = envValue('CLOUDINARY_API_SECRET');
  const credentialsPresent = Boolean(cloudName && apiKey && apiSecret);

  const result = {
    credentialsPresent: { cloudName: Boolean(cloudName), apiKey: Boolean(apiKey), apiSecret: Boolean(apiSecret) },
    directUploadEnabled: false,
    image: null,
    video: null,
  };

  const sdk = resolveCloudinarySdk();
  if (credentialsPresent && sdk) {
    sdk.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
  }

  for (const [kind, spec] of Object.entries(CLOUDINARY_PRESETS)) {
    const presetName = envValue(spec.envVar);
    const entry = {
      envVar: spec.envVar,
      configured: Boolean(presetName),
      expectedMaxFileSizeBytes: spec.expectedMaxFileSize,
      providerCheck: 'skipped',
      providerReachable: null,
      presetFound: null,
      unsignedIsFalse: null,
      maxFileSizeBytes: null,
      maxFileSizeMatches: null,
      compliant: false,
      issues: [],
    };

    if (!presetName) {
      entry.issues.push('env-var-absent: direct upload disabled for this kind');
      result[kind] = entry;
      continue;
    }

    if (!credentialsPresent) {
      entry.providerCheck = 'skipped-missing-credentials';
      entry.issues.push('cloudinary-credentials-incomplete');
      result[kind] = entry;
      continue;
    }

    if (!sdk) {
      entry.providerCheck = 'skipped-sdk-unavailable';
      entry.issues.push('cloudinary-sdk-not-resolvable');
      result[kind] = entry;
      continue;
    }

    try {
      const preset = await new Promise((resolve, reject) => {
        sdk.api.upload_preset(presetName, (error, value) => {
          if (error) reject(error);
          else resolve(value);
        });
      });

      entry.providerCheck = 'ok';
      entry.providerReachable = true;
      entry.presetFound = true;
      entry.unsignedIsFalse = preset?.unsigned === false;
      const size = Number(preset?.max_file_size);
      entry.maxFileSizeBytes = Number.isFinite(size) ? size : null;
      entry.maxFileSizeMatches = entry.maxFileSizeBytes === spec.expectedMaxFileSize;

      if (!entry.unsignedIsFalse) entry.issues.push('preset-is-not-signed (unsigned != false)');
      if (!entry.maxFileSizeMatches) {
        entry.issues.push(
          `max_file_size=${entry.maxFileSizeBytes ?? 'unset'} != ${spec.expectedMaxFileSize}`,
        );
      }
      entry.compliant = entry.unsignedIsFalse === true && entry.maxFileSizeMatches === true;
    } catch (err) {
      entry.providerCheck = 'failed';
      entry.providerReachable = false;
      entry.presetFound = false;
      entry.issues.push(`provider-error: ${err?.message ?? 'unknown'}`);
    }

    result[kind] = entry;
  }

  result.directUploadEnabled = Boolean(result.image?.compliant || result.video?.compliant);
  return result;
}

// ---------------------------------------------------------------------------
// Prisma schema validation
// ---------------------------------------------------------------------------

function validateSchema() {
  if (!existsSync(PRISMA_SCHEMA)) {
    return { ran: false, valid: null, reason: 'schema-file-missing' };
  }
  if (!existsSync(PRISMA_CLI)) {
    return { ran: false, valid: null, reason: 'prisma-cli-missing' };
  }

  const run = spawnSync(
    process.execPath,
    [PRISMA_CLI, 'validate', '--schema', PRISMA_SCHEMA],
    { cwd: DB_PKG, env: process.env, encoding: 'utf8', timeout: 60_000 },
  );

  const output = `${run.stdout ?? ''}${run.stderr ?? ''}`.trim();
  return {
    ran: true,
    valid: run.status === 0,
    exitCode: run.status,
    // Prisma output can echo the schema; keep only the verdict lines.
    summary: run.status === 0 ? 'schema is valid' : output.split(/\r?\n/).slice(-6).join('\n'),
  };
}

// ---------------------------------------------------------------------------
// Read-only database snapshot
// ---------------------------------------------------------------------------

async function readSnapshot(prisma) {
  const roomSelect = {
    id: true,
    slug: true,
    nameTr: true,
    nameEn: true,
    descTr: true,
    descEn: true,
    specs: true,
    isVisible: true,
    isFeatured: true,
    heroImage: true,
    video: true,
    category: true,
    viewCount: true,
    createdAt: true,
    updatedAt: true,
  };

  return prisma.$transaction(
    async (tx) => {
      // Hard guarantee: the first statement of the transaction.
      await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');

      const readOnlyProbe = await tx.$queryRawUnsafe('SHOW transaction_read_only');
      const readOnly = Array.isArray(readOnlyProbe) ? readOnlyProbe[0] : readOnlyProbe;
      const readOnlyValue = String(readOnly?.transaction_read_only ?? '').toLowerCase();
      if (readOnlyValue !== 'on') {
        throw new Error(
          `read-only transaction not enforced (transaction_read_only=${readOnlyValue || 'unknown'})`,
        );
      }

      const rooms = await tx.room.findMany({ select: roomSelect });
      const roomImages = await tx.roomImage.findMany({
        select: { id: true, url: true, alt: true, order: true, roomId: true },
      });
      const videos = await tx.video.findMany({
        select: {
          id: true,
          title: true,
          url: true,
          thumbnail: true,
          isPublic: true,
          viewCount: true,
          createdAt: true,
        },
      });
      // Site settings are read in full so the whole row is fingerprinted, but
      // no field of it is ever copied into the report (contact data included).
      const siteSettings = await tx.siteSettings.findMany();
      // Users: identity + role only. Password hashes and e-mails are never read.
      const users = await tx.user.findMany({ select: { id: true, role: true } });

      return { readOnlyEnforced: true, rooms, roomImages, videos, siteSettings, users };
    },
    { maxWait: 15_000, timeout: 60_000 },
  );
}

function buildSnapshot(data) {
  const tables = {
    rooms: hashRows(data.rooms, ['viewCount']),
    roomImages: hashRows(data.roomImages),
    videos: hashRows(data.videos, ['viewCount']),
    siteSettings: hashRows(data.siteSettings),
    users: hashRows(data.users),
  };

  const aggregate = sha256(stableStringify(tables));

  const usersByRole = {};
  for (const user of data.users) {
    usersByRole[user.role] = (usersByRole[user.role] ?? 0) + 1;
  }

  const media = analyseMedia(data);

  return {
    fingerprint: {
      algorithm: 'sha256',
      excludes: FINGERPRINT_EXCLUDES,
      tables,
      aggregate,
    },
    counts: {
      rooms: data.rooms.length,
      roomsVisible: data.rooms.filter((room) => room.isVisible).length,
      roomsFeatured: data.rooms.filter((room) => room.isFeatured).length,
      roomImages: data.roomImages.length,
      videos: data.videos.length,
      videosPublic: data.videos.filter((video) => video.isPublic).length,
      siteSettings: data.siteSettings.length,
      users: data.users.length,
      usersByRole: Object.fromEntries(Object.entries(usersByRole).sort()),
    },
    availability: {
      roomsVisible: data.rooms.filter((room) => room.isVisible).length,
      roomsHidden: data.rooms.filter((room) => !room.isVisible).length,
      videosPublic: data.videos.filter((video) => video.isPublic).length,
      videosHidden: data.videos.filter((video) => !video.isPublic).length,
      hasSiteSettingsRow: data.siteSettings.length > 0,
      hasAdminUser: data.users.some((user) => user.role === 'ADMIN'),
    },
    visibleSlugs: data.rooms
      .filter((room) => room.isVisible)
      .map((room) => room.slug)
      .sort(),
    mediaHosts: media.mediaHosts,
    brokenReferences: {
      method: media.method,
      total: media.brokenTotal,
      checkedTotal: media.checkedTotal,
      byKind: media.brokenByKind,
      totalByKind: media.totalByKind,
      orphanRoomImages: media.orphanRoomImages,
      roomsWithoutImages: media.roomsWithoutImages,
      visibleRoomsWithoutImages: media.visibleRoomsWithoutImages,
    },
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const compareIndex = argv.indexOf('--compare');
  if (compareIndex === -1) return { mode: 'baseline', comparePath: null };
  const comparePath = argv[compareIndex + 1];
  if (!comparePath) throw new Error('--compare requires a baseline path');
  return { mode: 'compare', comparePath: path.resolve(ROOT, comparePath) };
}

function writeJson(file, payload) {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function fail(payload) {
  process.stderr.write(`${JSON.stringify(payload, null, 2)}\n`);
  process.exit(2);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const env = loadEnvironment();
  const databaseUrl = envValue('DATABASE_URL');
  const databaseUrlUsable = !isPlaceholderDatabaseUrl(databaseUrl);

  const envReport = {
    loadEnvFileAvailable: env.loadEnvFileAvailable,
    files: env.files,
    crossFileConflicts: env.declaredConflicts,
    databaseUrlPresent: Boolean(databaseUrl),
    databaseUrlLooksUsable: databaseUrlUsable,
    required: {},
  };

  for (const [app, names] of Object.entries(REQUIRED_ENV)) {
    const present = {};
    const missing = [];
    for (const name of names) {
      const ok = Boolean(envValue(name));
      present[name] = ok;
      if (!ok) missing.push(name);
    }
    envReport.required[app] = { present, missing };
  }

  const auth = { admin: assessAuthSecret() };

  if (!databaseUrl) {
    addBlocker(
      'database-url-missing',
      'DATABASE_URL is not set in any .env file or the process environment.',
    );
  } else if (!databaseUrlUsable) {
    addBlocker(
      'database-url-placeholder',
      'DATABASE_URL is still a template/placeholder value, not a real connection string.',
    );
  }

  if (!existsSync(DB_PKG)) {
    addBlocker('db-package-missing', `packages/db not found at ${DB_PKG}`);
  }

  const presetReport = await checkUploadPresets();
  const schemaValidation = validateSchema();

  const baseReport = {
    schemaVersion: 1,
    kind: 'aldimobilya-data-integrity',
    generatedAt: new Date().toISOString(),
    mode: args.mode,
    runtime: {
      node: process.version,
      nodeExecPath: process.execPath,
      cwd: ROOT,
    },
    readOnly: {
      transactionReadOnlyStatementFirst: true,
      enforcementProbe: 'SHOW transaction_read_only',
      enforced: null,
      mutationPolicy: 'no writes to database, cloud or deployed assets',
    },
    database: {
      provider: 'postgresql',
      reachable: false,
      error: null,
    },
    env: envReport,
    auth,
    cloudinary: presetReport,
    schemaValidation,
  };

  if (blockers.length > 0) {
    fail({
      ...baseReport,
      blockers,
      outcome: 'blocked',
      note: 'No baseline written: a missing/unusable database is an explicit blocker, not a success.',
    });
  }

  // Resolve Prisma from packages/db (workspace-installed client, no installs).
  let PrismaClient;
  try {
    const require = createRequire(path.join(DB_PKG, 'index.ts'));
    ({ PrismaClient } = require('@prisma/client'));
  } catch (err) {
    addBlocker('prisma-client-unavailable', err?.message ?? 'could not require @prisma/client');
    fail({ ...baseReport, blockers, outcome: 'blocked' });
  }

  const prisma = new PrismaClient({ log: ['error'] });

  let snapshot;
  try {
    const data = await readSnapshot(prisma);
    baseReport.readOnly.enforced = data.readOnlyEnforced;
    baseReport.database.reachable = true;
    snapshot = buildSnapshot(data);
  } catch (err) {
    baseReport.database.error = err?.message ?? 'unknown database error';
    addBlocker('database-unreachable', baseReport.database.error);
    fail({
      ...baseReport,
      blockers,
      outcome: 'blocked',
      note: 'No baseline written: the database could not be read read-only.',
    });
  } finally {
    await prisma.$disconnect().catch(() => {});
  }

  if (args.mode === 'baseline') {
    const payload = {
      ...baseReport,
      outcome: 'ok',
      blockers: [],
      note:
        'Baseline: content fingerprint + counts + availability only. No full rows, no personal data.',
      ...snapshot,
    };
    writeJson(DEFAULT_BASELINE, payload);

    process.stdout.write(
      `${JSON.stringify(
        {
          outcome: 'ok',
          wrote: path.relative(ROOT, DEFAULT_BASELINE),
          aggregate: snapshot.fingerprint.aggregate,
          counts: snapshot.counts,
          brokenReferences: snapshot.brokenReferences.total,
          mediaHosts: Object.keys(snapshot.mediaHosts),
          directUploadEnabled: presetReport.directUploadEnabled,
          authSecretWeakOrDefaultOrMissing: auth.admin.weakOrDefaultOrMissing,
          schemaValid: schemaValidation.valid,
          blockers: [],
        },
        null,
        2,
      )}\n`,
    );
    process.exit(0);
  }

  // --compare: read the baseline, never rewrite it, emit outputs/data-final.json.
  if (args.comparePath === DEFAULT_BASELINE) {
    // Allowed: the point is to prove we do not overwrite it.
  }

  if (!existsSync(args.comparePath)) {
    addBlocker('baseline-missing', `Baseline not found at ${args.comparePath}`);
    fail({ ...baseReport, blockers, outcome: 'blocked' });
  }

  let baseline;
  try {
    baseline = JSON.parse(readFileSync(args.comparePath, 'utf8'));
  } catch (err) {
    addBlocker('baseline-unreadable', err?.message ?? 'could not parse baseline');
    fail({ ...baseReport, blockers, outcome: 'blocked' });
  }

  const baselineTables = baseline?.fingerprint?.tables ?? {};
  const tableDiffs = {};
  for (const key of Object.keys(snapshot.fingerprint.tables)) {
    const before = baselineTables[key] ?? null;
    const after = snapshot.fingerprint.tables[key];
    tableDiffs[key] = { baseline: before, current: after, match: before === after };
  }

  const fingerprintMatch =
    baseline?.fingerprint?.aggregate === snapshot.fingerprint.aggregate &&
    Object.values(tableDiffs).every((diff) => diff.match);

  const countDeltas = {};
  for (const key of Object.keys(snapshot.counts)) {
    if (key === 'usersByRole') continue;
    const before = baseline?.counts?.[key] ?? null;
    const after = snapshot.counts[key];
    countDeltas[key] = { baseline: before, current: after, delta: before === null ? null : after - before };
  }

  const payload = {
    ...baseReport,
    outcome: fingerprintMatch ? 'match' : 'drift',
    blockers: [],
    comparedAgainst: path.relative(ROOT, args.comparePath),
    baselineGeneratedAt: baseline?.generatedAt ?? null,
    baselineOverwritten: false,
    fingerprintMatch,
    baselineAggregate: baseline?.fingerprint?.aggregate ?? null,
    currentAggregate: snapshot.fingerprint.aggregate,
    tableDiffs,
    countDeltas,
    baselineCounts: baseline?.counts ?? null,
    currentCounts: snapshot.counts,
    baselineAvailability: baseline?.availability ?? null,
    currentAvailability: snapshot.availability,
    visibleSlugs: snapshot.visibleSlugs,
    mediaHosts: snapshot.mediaHosts,
    brokenReferences: snapshot.brokenReferences,
    currentFingerprint: snapshot.fingerprint,
  };

  writeJson(FINAL_PATH, payload);

  process.stdout.write(
    `${JSON.stringify(
      {
        outcome: payload.outcome,
        wrote: path.relative(ROOT, FINAL_PATH),
        baselineOverwritten: false,
        fingerprintMatch,
        baselineAggregate: payload.baselineAggregate,
        currentAggregate: payload.currentAggregate,
        tableDiffs: Object.fromEntries(
          Object.entries(tableDiffs).map(([k, v]) => [k, v.match]),
        ),
        countDeltas: Object.fromEntries(
          Object.entries(countDeltas).map(([k, v]) => [k, v.delta]),
        ),
        blockers: [],
      },
      null,
      2,
    )}\n`,
  );

  process.exit(fingerprintMatch ? 0 : 3);
}

main().catch((err) => {
  process.stderr.write(
    `${JSON.stringify(
      { outcome: 'error', error: err?.message ?? String(err), blockers: [] },
      null,
      2,
    )}\n`,
  );
  process.exit(1);
});
