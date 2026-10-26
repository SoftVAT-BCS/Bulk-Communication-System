// Local configuration checks only: no database or Auth service connections.
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const { X509Certificate } = require('node:crypto');

function validate(env) {
  if (env.BCS_APPLICATION_MODE !== 'authenticated' || env.BCS_DATA_MODE !== 'database') {
    throw new Error('Authenticated startup requires BCS_APPLICATION_MODE=authenticated and BCS_DATA_MODE=database. Close synthetic preview and use a fresh CMD window.');
  }
  if (env.NODE_ENV && env.NODE_ENV !== 'development') throw new Error('This existing authenticated backend requires development mode.');
  if (env.BCS_ISOLATED_ACCEPTANCE) throw new Error('Disposable-database acceptance mode cannot be used for normal startup.');
  for (const name of ['BCS_APP_DATABASE_URL', 'BCS_DATABASE_CA_FILE', 'BCS_SUPABASE_URL', 'BCS_SUPABASE_PUBLISHABLE_KEY']) {
    if (!env[name]) throw new Error(`Missing required private configuration: ${name}.`);
  }
  let valid = false;
  try {
    const url = new URL(env.BCS_APP_DATABASE_URL);
    valid = ['postgres:', 'postgresql:'].includes(url.protocol) && /^bcs_app_backend(?:\.[a-z0-9]+)?$/.test(decodeURIComponent(url.username)) && Boolean(url.password) && url.pathname === '/postgres' && !url.search && !url.hash;
  } catch { /* Never echo connection strings. */ }
  if (!valid) throw new Error('BCS_APP_DATABASE_URL does not match the existing restricted backend contract.');
  if (!/^https:\/\/[a-z0-9]{20}\.supabase\.co$/.test(env.BCS_SUPABASE_URL)) throw new Error('Invalid BCS_SUPABASE_URL configuration.');
  let publicKey = /^sb_publishable_[A-Za-z0-9_-]+$/.test(env.BCS_SUPABASE_PUBLISHABLE_KEY);
  try { publicKey ||= JSON.parse(Buffer.from(env.BCS_SUPABASE_PUBLISHABLE_KEY.split('.')[1], 'base64url').toString()).role === 'anon'; } catch { /* Reject invalid keys below. */ }
  if (!publicKey) throw new Error('Expected a Supabase publishable or legacy anon key for sign-in.');
}

async function main() {
  const root = path.resolve(__dirname, '..');
  if (root.toLowerCase() !== 'e:\\bulk-communicatio-system' || process.cwd().toLowerCase() !== root.toLowerCase()) throw new Error('Canonical workspace verification failed.');
  if (Number(process.versions.node.split('.')[0]) !== 24) throw new Error('Use the installed project-compatible Node.js 24 runtime.');
  if (!fs.existsSync(path.join(root, 'apps/web/.env.local'))) throw new Error('Missing apps/web/.env.local private configuration.');
  try { require.resolve('next/package.json', { paths: [path.join(root, 'apps/web')] }); } catch { throw new Error('Existing Next.js dependencies are missing; nothing was installed.'); }
  // Use the same development environment precedence as Next, without logging values.
  require('@next/env').loadEnvConfig(path.join(root, 'apps/web'), true, { info() {}, error() {} });
  validate(process.env);
  try { new X509Certificate(fs.readFileSync(process.env.BCS_DATABASE_CA_FILE)); } catch { throw new Error('Configured database CA certificate is missing or invalid.'); }
  if (fs.existsSync(path.join(root, 'apps/web/.next/dev/lock'))) throw new Error('A Next development server may already be running. Stop the known BCS preview normally; no process was terminated.');
  await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', () => reject(new Error('Cannot reserve 127.0.0.1:3000. Inspect the existing listener; no process was terminated.')));
    server.listen(3000, '127.0.0.1', () => server.close(resolve));
  });
  console.log('PASS: canonical workspace, dependencies, authenticated/database configuration, CA and free local port 3000. No connectivity test performed.');
}
module.exports = { validate };
if (require.main === module) main().catch(error => { console.error(`ERROR: ${error.message}`); process.exitCode = 1; });
