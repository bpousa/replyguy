'use client';

import { PlanProvider } from './contexts/plan-context';
import { AuthProvider } from './contexts/auth-context';
import { SessionManager } from './components/session-manager';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <SessionManager />
      <PlanProvider>
        {children}
      </PlanProvider>
    </AuthProvider>
  );
}