import { getUser, isUserGoogleConnected } from '@/lib/auth';
import Navbar from '@/components/Navbar';
import NoteListWrapper from '@/components/NoteListWrapper';
import { cookies } from 'next/headers';

export default async function NotesPage() {
  const user = await getUser();
  const cookieStore = await cookies();
  const googleAccessToken = cookieStore.get('google_access_token')?.value;
  const isGoogleConnected = isUserGoogleConnected(user, googleAccessToken);

  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-950 text-slate-100">
      <Navbar userEmail={user?.email} isGoogleConnected={isGoogleConnected} />
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Notes</h1>
            <p className="text-xs text-slate-400 mt-1">Stored quick thoughts, ideas, and detailed notes.</p>
          </div>
        </div>
        <NoteListWrapper />
      </main>
    </div>
  );
}
