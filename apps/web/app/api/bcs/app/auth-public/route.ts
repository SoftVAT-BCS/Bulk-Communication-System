import { response } from '../../../../../src/server/app-service';
import { authConfig } from '../../../../../src/server/supabase-auth';
export const runtime = 'nodejs';
// The URL and publishable key are public values, not privileged database credentials.
export const GET = () => response(async () => {
  if (process.env.NODE_ENV !== 'development') return { configured: false };
  const { url, key } = authConfig();
  return { configured: true, url, key };
});
