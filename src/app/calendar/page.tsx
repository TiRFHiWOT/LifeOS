import { getUser, isUserGoogleConnected } from '@/lib/auth';
import Navbar from '@/components/Navbar';
import CalendarView from '@/components/CalendarView';
import { cookies } from 'next/headers';

export default async function CalendarPage() {
  const user = await getUser();
  const cookieStore = await cookies();
  const googleAccessToken = cookieStore.get('google_access_token')?.value;
  const isGoogleConnected = isUserGoogleConnected(user, googleAccessToken);

  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-950 text-slate-100">
      <Navbar userEmail={user?.email} isGoogleConnected={isGoogleConnected} />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        <CalendarView />
      </main>
    </div>
  );
}
