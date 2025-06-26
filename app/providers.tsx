'use client';

import { PlanProvider } from './contexts/plan-context';
import { AuthProvider } from './contexts/auth-context';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <PlanProvider>
        {children}
      </PlanProvider>
    </AuthProvider>
  );
}