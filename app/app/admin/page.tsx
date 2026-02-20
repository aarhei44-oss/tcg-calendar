
// /app/app/admin/page.tsx
import { prisma } from '../lib/prisma';
import { enableProfilesAndSeedData } from '../data/prismaRepo';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';


async function seedSelected(formData: FormData): Promise<void> {
  'use server';
  // NOTE: form actions must return void | Promise<void>;
  // use redirect() for feedback and revalidatePath() to refresh data.
  const installs = formData.getAll('install').map(String).filter(Boolean);
  if (installs.length === 0) {
    redirect('/admin?error=No%20installs%20selected');
  }

  await enableProfilesAndSeedData(installs, { seed: true });
  revalidatePath('/calendar');
  revalidatePath('/admin');
  redirect('/admin?ok=1');
}


function firstStr(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function AdminPage({
  searchParams,
}: {
  // Next.js 15+ validator expects searchParams to be a Promise
  searchParams?: Promise<Record<string, string | string[]>>;
}) {
  const sp = (searchParams ? await searchParams : undefined) ?? {};
  const ok = firstStr(sp.ok) === '1';
  const error = firstStr(sp.error);

  const installs = await prisma.tcgProfileInstall.findMany({
    select: { id: true, enabled: true, packageId: true },
    orderBy: { id: 'asc' },
  });

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Admin — Enable Profiles & Seed</h1>

      {ok && (
        <div className="border border-green-300 bg-green-50 text-green-800 px-3 py-2 text-sm rounded">
          Seed completed.
        </div>
      )}
      {error && (
        <div className="border border-red-300 bg-red-50 text-red-800 px-3 py-2 text-sm rounded">
          {error}
        </div>
      )}

      <form action={seedSelected} className="space-y-3">
        <ul className="space-y-2">
          {installs.map((inst) => (
            <li key={inst.id} className="flex items-center gap-2">
              <input type="checkbox" name="install" value={inst.id} id={`inst-${inst.id}`} />
              <label htmlFor={`inst-${inst.id}`}>
                <span className="font-mono">{inst.id}</span>{' '}
                <span className="text-xs text-gray-500">
                  pkg={inst.packageId} enabled={String(inst.enabled)}
                </span>
              </label>
            </li>
          ))}
        </ul>
        <div>
          <button type="submit" className="border px-3 py-1">Enable &amp; Seed</button>
        </div>
      </form>

      <p className="text-sm text-gray-500">
        This triggers the existing seed helper to create ProductSets/ReleaseEvents for the selected installs.
      </p>
    </main>
  );
}
