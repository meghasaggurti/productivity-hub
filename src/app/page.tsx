'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { ensureHubAndHome } from '@/lib/bootstrap';
import { auth } from '@/lib/firebaseDb';

export default function HomePage() {
  const router = useRouter();
  const { user, loading, login } = useAuth(); // login() should Google sign-in via popup

  async function open() {
    try {
      // If signed out, sign in first
      if (!auth.currentUser) {
        await login?.(); // your AuthProvider.login should use GoogleAuthProvider + signInWithPopup
      }
      const uid = auth.currentUser?.uid;
      if (!uid) return;

      const { wsId, pageId } = await ensureHubAndHome(uid);
      router.push(`/w/${wsId}/p/${pageId}`);
    } catch (e) {
      console.error(e);
      alert('Could not open your Hub. Please try again.');
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-[#F8F5EF] font-sans">
      <div className="w-full max-w-md rounded-xl border bg-white p-6 shadow">
        <div className="text-lg font-medium">Welcome to Hub</div>
        <p className="text-sm opacity-70 mt-1">
          Create or open your workspace. You’ll start on the Home page.
        </p>

        <div className="mt-5 space-y-2">
          {!user ? (
            <button
              onClick={open}
              disabled={loading}
              className="w-full px-3 py-2 rounded border hover:bg-neutral-50"
            >
              {loading ? 'Loading…' : 'Sign in with Google & Open'}
            </button>
          ) : (
            <button
              onClick={open}
              className="w-full px-3 py-2 rounded border hover:bg-neutral-50"
            >
              Open my Hub
            </button>
          )}
        </div>
      </div>
    </div>
  );
}









