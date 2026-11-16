// Explicit manual delivery only. Reads secrets from .env.local through Node's --env-file flag.
if (!process.argv.includes('--send')) {
  console.error('This sends due, opted-in reply emails from your connected database. Add --send to confirm.');
  process.exit(1);
}
for (const key of ['CRON_SECRET','BREVO_API_KEY','DISCUSSION_EMAIL_FROM','DISCUSSION_EMAIL_REPLY_TO','NEXT_PUBLIC_SUPABASE_URL']) {
  if (!process.env[key]) { console.error(`Missing ${key} in .env.local`); process.exit(1); }
}
if (!(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)) {
  console.error('Missing SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) in .env.local'); process.exit(1);
}
try {
  const response=await fetch('http://localhost:3000/api/cron/discussion-emails',{
    method:'POST',headers:{authorization:`Bearer ${process.env.CRON_SECRET}`},signal:AbortSignal.timeout(65000),
  });
  const text=await response.text();console.log(`Delivery response ${response.status}: ${text}`);
  if(!response.ok)process.exitCode=1;
} catch {console.error('Could not reach the local delivery route. Check npm run dev is running on port 3000.');process.exitCode=1;}
