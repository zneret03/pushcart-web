// Removes anonymous customer accounts (and the carts they created) from the
// database.
//
// The "shop without an account" flow calls supabase.auth.signInAnonymously()
// and then inserts an 'active' cart for that user (see app/api/auth/model/auth.ts).
// Shoppers who never come back leave those throwaway accounts behind, so they
// accumulate every time the flow is exercised.
//
// Carts reference profiles, which reference auth.users with ON DELETE CASCADE,
// so deleting the auth user cleans up the cart too. The carts are deleted
// explicitly first anyway, so the script also behaves correctly if that
// cascade is ever changed.
//
// Uses the service role key, which bypasses RLS, so it can see and delete every
// user. That key must never be shipped to the browser.
//
// Usage:
//   node scripts/cleanup-anonymous-users.mjs             # delete
//   node scripts/cleanup-anonymous-users.mjs --dry-run   # list only
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);

/** Minimal .env reader: KEY=value per line, ignoring comments and blank lines. */
function loadEnvFile(file) {
  if (!existsSync(file)) {
    return {};
  }

  const values = {};

  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);

    if (!match || match[2] === '') {
      continue;
    }

    let value = match[2];

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    values[match[1]] = value;
  }

  return values;
}

/** Lists every auth user, following pagination. */
async function listAllUsers(supabase) {
  const users = [];
  const perPage = 1000;

  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      throw new Error(`Could not list users: ${error.message}`);
    }

    users.push(...data.users);

    if (data.users.length < perPage) {
      return users;
    }
  }
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');

  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(
      'Usage: node scripts/cleanup-anonymous-users.mjs [--dry-run]\n\n' +
        '  --dry-run  List the anonymous users that would be deleted, changing nothing.',
    );
    return;
  }

  const env = { ...loadEnvFile(path.join(projectRoot, '.env')), ...process.env };
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.NEXT_PUBLIC_SUPABASE_SERVICE_SECRET_KEY;

  if (!url || !serviceKey) {
    console.error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_SERVICE_SECRET_KEY.\n' +
        'Set them in .env (see `make run-dev`) or export them before running this script.',
    );
    process.exitCode = 1;
    return;
  }

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const users = await listAllUsers(supabase);
  const anonymousUsers = users.filter((user) => user.is_anonymous);

  if (anonymousUsers.length === 0) {
    console.log(
      `No anonymous users to clean up (checked ${users.length} user${users.length === 1 ? '' : 's'}).`,
    );
    return;
  }

  console.log(
    `${dryRun ? 'Found' : 'Cleaning up'} ${anonymousUsers.length} anonymous user${
      anonymousUsers.length === 1 ? '' : 's'
    } of ${users.length} total:`,
  );

  const ids = anonymousUsers.map((user) => user.id);
  const { data: carts, error: cartsError } = await supabase
    .from('carts')
    .select('id')
    .in('user_id', ids);

  if (cartsError) {
    throw new Error(`Could not read carts: ${cartsError.message}`);
  }

  for (const user of anonymousUsers) {
    console.log(`  - ${user.id} (created ${user.created_at})`);
  }

  console.log(`${carts?.length ?? 0} cart(s) belong to those users.`);

  if (dryRun) {
    console.log('\nDry run: nothing was deleted.');
    return;
  }

  if (carts && carts.length > 0) {
    const { error } = await supabase
      .from('carts')
      .delete()
      .in(
        'id',
        carts.map((cart) => cart.id),
      );

    if (error) {
      throw new Error(`Could not delete carts: ${error.message}`);
    }
  }

  let deleted = 0;

  for (const user of anonymousUsers) {
    const { error } = await supabase.auth.admin.deleteUser(user.id);

    if (error) {
      console.error(`  ! Failed to delete ${user.id}: ${error.message}`);
      process.exitCode = 1;
      continue;
    }

    deleted += 1;
  }

  console.log(
    `\nDeleted ${deleted}/${anonymousUsers.length} anonymous user(s) and ${carts?.length ?? 0} cart(s).`,
  );
}

main().catch((error) => {
  console.error(`\nCleanup failed: ${error.message}`);
  process.exitCode = 1;
});
