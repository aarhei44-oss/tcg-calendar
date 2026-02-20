
// /app/app/admin/actions.ts
'use server';

// Placeholder action signature for later wiring.
// In next step of PR‑2, this will call the repository’s enableProfilesAndSeedData()
// with selected install IDs and optional parameters.


import { enableProfilesAndSeedData } from '../data/prismaRepo';

export async function adminEnableProfiles(installs: string[], options?: unknown) {
  await enableProfilesAndSeedData(installs, options);
  return { ok: true };
}
