import { appendFile, readFile } from 'node:fs/promises';
import { createECDH, randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import webpush from 'web-push';

const names = ['VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY', 'CRON_SECRET'];
const defaultFile = fileURLToPath(new URL('../.env.local', import.meta.url));

export async function readQuoteKeys(file = defaultFile) {
  const values = {};
  let text = '';
  try { text = await readFile(file, 'utf8'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?(VAPID_PUBLIC_KEY|VAPID_PRIVATE_KEY|CRON_SECRET)\s*=\s*(.*?)\s*$/);
    if (!match) continue;
    values[match[1]] = match[2].replace(/^("|')(.*)\1$/, '$2').trim();
  }
  return { text, values };
}

export async function ensureQuoteKeys(file = defaultFile) {
  const { text, values } = await readQuoteKeys(file);
  const additions = {};
  const publicKey = values.VAPID_PUBLIC_KEY, privateKey = values.VAPID_PRIVATE_KEY;
  if (!!publicKey !== !!privateKey) throw new Error('Only one VAPID key is present. Keep your existing keys and finish the pair before continuing.');
  if (publicKey && privateKey) {
    try {
      const curve = createECDH('prime256v1'); curve.setPrivateKey(Buffer.from(privateKey, 'base64url'));
      if (curve.getPublicKey().toString('base64url') !== publicKey) throw new Error();
    } catch { throw new Error('The existing VAPID keys do not match. They have not been changed.'); }
  } else {
    const pair = webpush.generateVAPIDKeys();
    additions.VAPID_PUBLIC_KEY = pair.publicKey; additions.VAPID_PRIVATE_KEY = pair.privateKey;
  }
  if (values.CRON_SECRET && values.CRON_SECRET.length < 16) throw new Error('The existing CRON_SECRET is too short. It has not been changed.');
  if (!values.CRON_SECRET) additions.CRON_SECRET = randomBytes(32).toString('hex');
  if (Object.keys(additions).length) {
    const block = '\n' + (text && !text.endsWith('\n') ? '\n' : '') + '# iSEREIN daily quote reminders — keep these keys private and stable.\n' + Object.entries(additions).map(([name, value]) => `${name}=${value}`).join('\n') + '\n';
    await appendFile(file, block, { mode: 0o600 });
  }
  return { added: Object.keys(additions) };
}

async function cli() {
  const command = process.argv[2];
  if (command === 'init') {
    const result = await ensureQuoteKeys();
    console.log(result.added.length ? `Added ${result.added.join(', ')} to .env.local. Existing settings were preserved.` : 'Reminder keys already exist and match. Nothing was changed.');
    console.log('Use the copy commands in docs/quote-reminders.md to add them to Vercel. Do not share the file or clipboard values.');
    return;
  }
  if (command === 'copy' && names.includes(process.argv[3])) {
    const name = process.argv[3]; const { values } = await readQuoteKeys();
    if (!values[name]) throw new Error('Run the init command first.');
    const result = spawnSync('pbcopy', { input: values[name], encoding: 'utf8' });
    if (result.error || result.status !== 0) throw new Error('Clipboard copy failed. Open .env.local privately in VS Code and copy the matching value into Vercel.');
    console.log(`Copied ${name}. Paste into the matching Vercel environment variable. The value was not printed.`);
    return;
  }
  throw new Error('Use: node scripts/quote-reminder-keys.mjs init OR copy VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / CRON_SECRET');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  cli().catch(error => { console.error(error.message); process.exitCode = 1; });
}
