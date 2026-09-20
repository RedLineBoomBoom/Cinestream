import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useUserProfile } from '../context/UserProfileContext';
import { isAdminUser } from '../utils/admin';

export interface AdminHookResult {
  isAdmin: boolean;
  adminEmail: string | null;
  isLoading: boolean;
}

/**
 * Hook to determine if the currently active user has administrator privileges.
 */
export function useAdmin(): AdminHookResult {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { profile } = useUserProfile();

  const isAdmin = useMemo(() => {
    return isAdminUser(user, profile as any);
  }, [user, profile]);

  return {
    isAdmin,
    adminEmail: user?.email || null,
    isLoading: isAuthLoading,
  };
}
