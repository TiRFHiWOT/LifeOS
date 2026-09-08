import { getUser } from '@/lib/auth';
import Navbar from '@/components/Navbar';
import Dashboard from '@/components/Dashboard';
import { cookies } from 'next/headers';

export default async function Home() {
  const user = await getUser();
  const cookieStore = await cookies();
  const googleAccessToken = cookieStore.get('google_access_token')?.value;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar userEmail={user?.email} isGoogleConnected={!!googleAccessToken} />
      <main className="flex-1">
        <Dashboard />
      </main>
      <footer className="border-t border-slate-900 px-6 py-4 text-center text-xs text-slate-500">
        LifeOS &copy; {new Date().getFullYear()} &mdash; Personal AI Administrative Assistant
      </footer>
    </div>
  );
}
