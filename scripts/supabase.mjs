// Cross-platform launcher for the Supabase CLI.
//
// The `supabase` npm package declares its binary as `bin/supabase`, but on Windows
// it only ships `bin/supabase.exe`. Yarn resolves `yarn supabase ...` from that
// package.json `bin` field (ignoring the generated node_modules/.bin shims), so on
// Windows it ends up trying to run a non-existent file and fails with:
//
//   Error: Cannot find module '.../node_modules/supabase/bin/supabase'
//
// This wrapper picks the correct binary for the current platform and forwards
// every argument, so `yarn supabase <args>` behaves the same on Windows, macOS
// and Linux.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const binaryName = process.platform === 'win32' ? 'supabase.exe' : 'supabase';
const binaryPath = path.join(projectRoot, 'node_modules', 'supabase', 'bin', binaryName);

if (!existsSync(binaryPath)) {
  console.error(
    `Supabase CLI binary not found at:\n  ${binaryPath}\n\nRun \`yarn install\` to install it.`,
  );
  process.exit(1);
}

const { status, error } = spawnSync(binaryPath, process.argv.slice(2), {
  stdio: 'inherit',
});

if (error) {
  console.error(`Failed to run the Supabase CLI: ${error.message}`);
  process.exit(1);
}

process.exit(status ?? 1);
