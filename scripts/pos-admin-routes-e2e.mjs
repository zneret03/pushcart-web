// The POS admin routes answer only to an admin, over the real Next.js server.
//
// Run with the project's .env loaded and `npm run dev` up; uses only local Supabase.
//   node --env-file=.env scripts/pos-admin-routes-e2e.mjs
//
// Why this exists: those routes run with the service-role key (the POS tables have no RLS
// policies), and the /api/protected middleware only checks that *someone* is signed in. So the
// one thing standing between a customer's anonymous tablet session and the station list, the
// class mapping, every open session and the cancel button was each route's own check - which
// is what this asserts, for an anonymous customer, a registered non-admin user and an admin.
/* global fetch, setTimeout */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { URL } from 'node:url';
import { createServerClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secret = process.env.SUPABASE_SECRET_KEY;
const app = process.env.POS_APP_URL ?? 'http://localhost:3000';
assert(
  ['localhost', '127.0.0.1', '[::1]'].includes(new URL(supabaseUrl).hostname),
  'Local Supabase required',
);

let passed = 0;
const failures = [];
const cleanup = [];
function check(name, condition, detail = '') {
  if (condition) {
    passed++;
    console.log(`PASS ${name}`);
  } else {
    failures.push(name);
    console.log(`FAIL ${name}${detail ? ` (${detail})` : ''}`);
  }
}

async function admin(path, method = 'GET', body) {
  const res = await fetch(`${supabaseUrl}${path}`, {
    method,
    headers: {
      apikey: secret,
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, data: text ? JSON.parse(text) : null };
}

// Sign in through @supabase/ssr itself and keep the cookies it sets: the exact cookie the
// browser would send, in whatever format this version of the library writes.
async function cookieFor(signIn) {
  const jar = new Map();
  const client = createServerClient(supabaseUrl, key, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (list) => list.forEach(({ name, value }) => jar.set(name, value)),
    },
  });
  const { error } = await signIn(client.auth);
  assert(!error, `sign-in failed: ${error?.message}`);
  // setAll can run after the promise settles; give it a tick.
  await new Promise((r) => setTimeout(r, 50));
  return [...jar].map(([n, v]) => `${n}=${v}`).join('; ');
}

async function registered(role) {
  const email = `pos-routes-${role}-${randomUUID()}@example.test`;
  const password = `${randomUUID()}Aa1!`;
  const created = await admin('/auth/v1/admin/users', 'POST', {
    email,
    password,
    email_confirm: true,
  });
  assert.equal(created.status, 200, 'creating a test user must work');
  cleanup.push(created.data.id);
  await admin(`/rest/v1/profiles?id=eq.${created.data.id}`, 'PATCH', { role });
  return cookieFor((auth) => auth.signInWithPassword({ email, password }));
}

async function call(cookie, method, path, body) {
  const res = await fetch(`${app}${path}`, {
    method,
    headers: { cookie, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: 'manual',
  });
  return res.status;
}

const probeStation = `routes-probe-${randomUUID().slice(0, 8)}`;
// Each route the admin screen calls, with a body that would succeed for an admin. The ids are
// throwaway: a refused call must be refused before it touches them.
const ROUTES = [
  ['GET', '/api/protected/pos-stations'],
  ['POST', '/api/protected/pos-stations', { id: probeStation, name: 'probe' }],
  ['PUT', `/api/protected/pos-stations/${probeStation}`, { name: 'renamed' }],
  ['DELETE', `/api/protected/pos-stations/${probeStation}`],
  ['GET', '/api/protected/pos-mapping'],
  [
    'POST',
    '/api/protected/pos-mapping',
    { class_slug: `probe_${probeStation}`, product_id: randomUUID() },
  ],
  [
    'PUT',
    `/api/protected/pos-mapping/probe_${probeStation}`,
    { product_id: randomUUID() },
  ],
  ['DELETE', `/api/protected/pos-mapping/probe_${probeStation}`],
  ['GET', '/api/protected/pos-overview'],
  [
    'PUT',
    `/api/protected/pos-sessions/${randomUUID()}`,
    { status: 'cancelled' },
  ],
  ['GET', '/api/protected/pos-staff-pin'],
];

try {
  const customer = await cookieFor((auth) => auth.signInAnonymously());
  const user = await registered('user');
  const adminCookie = await registered('admin');

  for (const [who, cookie] of [
    ['anonymous customer', customer],
    ['registered non-admin', user],
  ]) {
    for (const [method, path, body] of ROUTES) {
      const status = await call(cookie, method, path, body);
      check(
        `${who} refused: ${method} ${path}`,
        status === 403,
        `got ${status}`,
      );
    }
  }
  // Nothing a refused call asked for may have happened.
  const leaked = await admin(`/rest/v1/stations?id=eq.${probeStation}`);
  check(
    'a refused POST created no station',
    Array.isArray(leaked.data) && leaked.data.length === 0,
  );

  // An admin still gets through: read everything, and add + remove a station.
  for (const [method, path] of ROUTES.filter(([m]) => m === 'GET')) {
    const status = await call(adminCookie, method, path);
    check(`admin allowed: ${method} ${path}`, status === 200, `got ${status}`);
  }
  const added = await call(adminCookie, 'POST', '/api/protected/pos-stations', {
    id: probeStation,
    name: 'probe',
  });
  check('admin allowed: POST a station', added === 200, `got ${added}`);
  const removed = await call(
    adminCookie,
    'DELETE',
    `/api/protected/pos-stations/${probeStation}`,
  );
  check(
    'admin allowed: DELETE that station',
    removed === 200,
    `got ${removed}`,
  );
} finally {
  await admin(`/rest/v1/stations?id=eq.${probeStation}`, 'DELETE');
  for (const id of cleanup) await admin(`/auth/v1/admin/users/${id}`, 'DELETE');
}

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) process.exit(1);
