import { getUser } from '@/lib/auth';
import Navbar from '@/components/Navbar';
import TaskListWrapper from '@/components/TaskListWrapper';
import { cookies } from 'next/headers';

export default async function TasksPage() {
  const user = await getUser();
  const cookieStore = await cookies();
  const googleAccessToken = cookieStore.get('google_access_token')?.value;

  return (
    <div className="min-h-screen flex flex-col font-sans">
      <Navbar userEmail={user?.email} isGoogleConnected={!!googleAccessToken} />
      <main className="flex-1 max-w-lg w-full mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h1 className="text-xl font-bold text-slate-100">Tasks</h1>
            <p className="text-xs text-slate-400 mt-0.5">Your to-do list items</p>
          </div>
        </div>
        <TaskListWrapper />
      </main>
    </div>
  );
}
