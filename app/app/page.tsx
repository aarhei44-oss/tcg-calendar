
// /app/app/page.tsx (add or update content non-destructively)
import Link from 'next/link';

export default function Home() {
  return (
    <main className="p-6">
      <h1 className="text-xl font-semibold">TCG Release Calendar</h1>
      <p className="text-sm text-gray-500">Welcome. Health route is /api/health.</p>
      <div className="mt-4">
        <Link href="/calendar" className="text-blue-600 underline">
          Go to Calendar
        </Link>
      </div>
    </main>
  );
}



