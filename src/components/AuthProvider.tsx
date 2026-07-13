'use client';

import { SessionProvider } from 'next-auth/react';

/** Client wrapper so any component can read the Google session via useSession. */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
