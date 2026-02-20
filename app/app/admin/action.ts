
// /app/app/admin/actions.ts
'use server';

// Placeholder action signature for later wiring.
// In next step of PR‑2, this will call the repository’s enableProfilesAndSeedData()
// with selected install IDs and optional parameters.

export async function adminEnableProfiles(installs: string[], options?: unknown) {
  // Intentionally no call yet to avoid invoking "Not implemented" stubs.
  // Implementation will look like:
  // await enableProfilesAndSeedData(installs, options);
  return { ok: true };
}
