'use client';

import { createContext, useContext } from 'react';
import type { AuthUser } from '@/lib/types';

const SessionContext = createContext<AuthUser | null>(null);

export function SessionProvider({
  user,
  children,
}: {
  user: AuthUser | null;
  children: React.ReactNode;
}) {
  return (
    <SessionContext.Provider value={user}>{children}</SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
