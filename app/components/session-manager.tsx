'use client';

import { useSessionRefresh } from '@/app/hooks/use-session-refresh';

export function SessionManager() {
  // This component just uses the hook to enable session refresh
  useSessionRefresh();
  
  // No UI - this is a background service
  return null;
}