import { getUser, isUserGoogleConnected } from '@/lib/auth';
import Navbar from '@/components/Navbar';
import AssistantHome from '@/components/AssistantHome';
import LandingPage from '@/components/LandingPage';
import { cookies } from 'next/headers';

export default async function Home() {
  const user = await getUser();

  if (!user) {
    return <LandingPage />;
  }

  const cookieStore = await cookies();
  const googleAccessToken = cookieStore.get('google_access_token')?.value;
  const isGoogleConnected = isUserGoogleConnected(user, googleAccessToken);

  return (
    <div className="min-h-screen flex flex-col font-sans selection:bg-indigo-500 selection:text-white bg-[#090d16] text-slate-100">
      <Navbar userEmail={user?.email} isGoogleConnected={isGoogleConnected} />
      <main className="flex-1 flex flex-col justify-center">
        <AssistantHome />
      </main>
      <footer className="border-t border-white/[0.08] bg-[#090d16]/80 px-4 py-4 text-center text-xs text-slate-500">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <span>LifeOS Personal Assistant</span>
          <span className="text-[11px] text-slate-600 font-mono">&copy; {new Date().getFullYear()}</span>
        </div>
      </footer>
    </div>
  );
}
