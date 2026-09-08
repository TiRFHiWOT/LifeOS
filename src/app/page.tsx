import { getUser } from '@/lib/auth';
import Navbar from '@/components/Navbar';
import Dashboard from '@/components/Dashboard';
import { cookies } from 'next/headers';

export default async function Home() {
  const user = await getUser();
  const cookieStore = await cookies();
  const googleAccessToken = cookieStore.get('google_access_token')?.value;

  return (
    <div className="min-h-screen flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      <Navbar userEmail={user?.email} isGoogleConnected={!!googleAccessToken} />
      <main className="flex-1">
        <Dashboard />
      </main>
      <footer className="border-t border-white/[0.08] bg-[#090d16]/60 backdrop-blur-md px-6 py-5 text-center text-xs text-slate-400 font-medium">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>LifeOS &copy; {new Date().getFullYear()} &mdash; Personal AI Administrative Assistant</span>
          <span className="text-[11px] text-slate-500 font-mono">v2.0 Visual Engine</span>
        </div>
      </footer>
    </div>
  );
}
