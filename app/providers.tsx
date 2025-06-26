'use client';

import { PlanProvider } from './contexts/plan-context';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PlanProvider>
      {children}
    </PlanProvider>
  );
}