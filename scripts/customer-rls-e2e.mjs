// Run with the project's .env loaded; uses only local Supabase, never a cloud project.
/* global fetch */
import assert from 'node:assert/strict';
import { URL } from 'node:url';
import { randomUUID } from 'node:crypto';
const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
assert(['localhost', '127.0.0.1', '[::1]'].includes(new URL(base).hostname), 'Local Supabase required');
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secret = process.env.SUPABASE_SECRET_KEY;
const users = [];
let product;
let passed = 0;
const failures = [];
async function request(path, token, method = 'GET', body, service = false) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { apikey: service ? secret : key, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, data: text ? JSON.parse(text) : null };
}
const rest = (path, token, method, body, service) => request(`/rest/v1/${path}`, token, method, body, service);
function check(name, condition) {
  if (condition) { passed++; console.log(`PASS ${name}`); }
  else { failures.push(name); console.log(`FAIL ${name}`); }
}
const hidden = r => r.status === 200 && Array.isArray(r.data) && r.data.length === 0;
const blocked = r => r.status === 401 || r.status === 403 || (Array.isArray(r.data) && r.data.length === 0);
try {
  for (let i = 0; i < 2; i++) {
    const auth = await request('/auth/v1/signup', key, 'POST', {});
    assert.equal(auth.status, 200, 'Anonymous signup must work');
    users.push({ id: auth.data.user.id, token: auth.data.access_token });
  }
  const [a, b] = users;
  product = (await rest('products', secret, 'POST', { name: 'RLS isolated probe', price: 1, stock_quantity: 100 }, true)).data[0].id;
  const cart = (await rest('carts', a.token, 'POST', { customer_id: a.id, user_id: a.id, status: 'active' })).data[0];
  const registered = [];
  for (const role of ['user', 'admin']) {
    const email = `rls-${role}-${randomUUID()}@example.test`;
    const password = randomUUID() + 'Aa1!';
    const created = await request('/auth/v1/admin/users', secret, 'POST', { email, password, email_confirm: true }, true);
    assert.equal(created.status, 200);
    const id = created.data.id;
    users.push({ id });
    await rest(`profiles?id=eq.${id}`, secret, 'PATCH', { role }, true);
    const login = await request('/auth/v1/token?grant_type=password', key, 'POST', { email, password });
    assert.equal(login.status, 200);
    registered.push({ id, token: login.data.access_token });
  }
  const [cashier, admin] = registered;
  const item = (await rest('cart_items', secret, 'POST', { cart_id: cart.id, product_id: product, quantity: 1 }, true)).data[0];
  check('own cart visible', (await rest(`carts?id=eq.${cart.id}`, a.token)).data?.length === 1);
  check('own item visible', (await rest(`cart_items?id=eq.${item.id}`, a.token)).data?.length === 1);
  check('foreign cart hidden', hidden(await rest(`carts?id=eq.${cart.id}`, b.token)));
  check('foreign item hidden', hidden(await rest(`cart_items?id=eq.${item.id}`, b.token)));
  check('foreign profile hidden', hidden(await rest(`profiles?id=eq.${a.id}`, b.token)));
  check('own profile visible', (await rest(`profiles?id=eq.${b.id}`, b.token)).data?.length === 1);
  check('foreign cart update blocked', blocked(await rest(`carts?id=eq.${cart.id}`, b.token, 'PATCH', { status: 'unpaid' })));
  check('foreign item update blocked', blocked(await rest(`cart_items?id=eq.${item.id}`, b.token, 'PATCH', { quantity: 2 })));
  check('foreign item insertion blocked', blocked(await rest('cart_items', b.token, 'POST', { cart_id: cart.id, product_id: product, quantity: 1 })));
  check('foreign item deletion blocked', blocked(await rest(`cart_items?id=eq.${item.id}`, b.token, 'DELETE')));
  check('foreign-owned cart creation blocked', blocked(await rest('carts', b.token, 'POST', { customer_id: a.id, user_id: b.id, status: 'active' })));
  check('own item update allowed', (await rest(`cart_items?id=eq.${item.id}`, a.token, 'PATCH', { quantity: 1 })).data?.length === 1);
  check('own profile name update allowed', (await rest(`profiles?id=eq.${a.id}`, a.token, 'PATCH', { first_name: 'Own probe' })).data?.length === 1);
  check('foreign ownership transfer blocked', blocked(await rest(`carts?id=eq.${cart.id}`, a.token, 'PATCH', { customer_id: b.id })));
  check('anonymous cashier assignment blocked', blocked(await rest(`carts?id=eq.${cart.id}`, a.token, 'PATCH', { user_id: b.id })));
  check('registered cashier assignment allowed', (await rest(`carts?id=eq.${cart.id}`, a.token, 'PATCH', { user_id: cashier.id })).data?.length === 1);
  check('assigned cashier can read cart', (await rest(`carts?id=eq.${cart.id}`, cashier.token)).data?.length === 1);
  check('admin can read customer cart', (await rest(`carts?id=eq.${cart.id}`, admin.token)).data?.length === 1);
  check('admin can read customer profile', (await rest(`profiles?id=eq.${a.id}`, admin.token)).data?.length === 1);
  check('unassigned customer still cannot read assigned cart', hidden(await rest(`carts?id=eq.${cart.id}`, b.token)));
  check('own direct payment bypass blocked', blocked(await rest(`carts?id=eq.${cart.id}`, a.token, 'PATCH', { status: 'paid' })));
  check('foreign profile update blocked', blocked(await rest(`profiles?id=eq.${a.id}`, b.token, 'PATCH', { first_name: 'foreign' })));
  check('self promotion blocked', blocked(await rest(`profiles?id=eq.${b.id}`, b.token, 'PATCH', { role: 'admin' })));
  // Reset the pre-fix promotion so later probes still run as an ordinary customer.
  await rest(`profiles?id=eq.${b.id}`, secret, 'PATCH', { role: 'user' }, true);
  check('foreign order insertion blocked', blocked(await rest('orders', b.token, 'POST', { cart_id: cart.id, user_id: b.id, subtotal: 0, vat_amount: 0, total_amount: 0 })));
  await rest(`orders?cart_id=eq.${cart.id}`, secret, 'DELETE', undefined, true);
  await rest(`carts?id=eq.${cart.id}`, secret, 'PATCH', { status: 'active' }, true);
  const order = await rest('orders', secret, 'POST', { cart_id: cart.id, user_id: a.id, subtotal: 1, vat_amount: 0, total_amount: 1 }, true);
  assert.equal(order.status, 201);
  check('foreign order hidden', hidden(await rest(`orders?cart_id=eq.${cart.id}`, b.token)));
  check('own order visible', (await rest(`orders?cart_id=eq.${cart.id}`, a.token)).data?.length === 1);
  check('paid cart cannot be reopened by customer', blocked(await rest(`carts?id=eq.${cart.id}`, a.token, 'PATCH', { status: 'active' })));
  check('paid cart items cannot be added by customer', blocked(await rest('cart_items', a.token, 'POST', { cart_id: cart.id, product_id: product, quantity: 1 })));
  check('service cart access retained', (await rest(`carts?id=eq.${cart.id}`, secret, undefined, undefined, true)).data?.length === 1);
  console.log(`PASS=${passed} FAIL=${failures.length}`);
} finally {
  // Deletes are scoped exclusively to newly created test users/product.
  for (const user of users) {
    await rest(`orders?user_id=eq.${user.id}`, secret, 'DELETE', undefined, true);
    await rest(`carts?or=(user_id.eq.${user.id},customer_id.eq.${user.id})`, secret, 'DELETE', undefined, true);
    await request(`/auth/v1/admin/users/${user.id}`, secret, 'DELETE', undefined, true);
  }
  if (product) await rest(`products?id=eq.${product}`, secret, 'DELETE', undefined, true);
}
if (failures.length) process.exitCode = 1;
