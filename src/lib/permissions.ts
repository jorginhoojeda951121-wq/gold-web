import { getSupabase } from './supabase';
import { getCurrentUserId } from './userStorage';

export type UserRole = 'owner' | 'admin' | 'manager' | 'staff';

export interface UserPermissions {
  canEditBusinessSettings: boolean;
  canEditPaymentSettings: boolean;
  canManageStaff: boolean;
  canViewAnalytics: boolean;
  canManageInventory: boolean;
  canProcessSales: boolean;
  canDeleteData: boolean;
}

const rolePermissions: Record<UserRole, UserPermissions> = {
  owner: {
    canEditBusinessSettings: true,
    canEditPaymentSettings: true,
    canManageStaff: true,
    canViewAnalytics: true,
    canManageInventory: true,
    canProcessSales: true,
    canDeleteData: true,
  },
  admin: {
    canEditBusinessSettings: true,
    canEditPaymentSettings: true,
    canManageStaff: true,
    canViewAnalytics: true,
    canManageInventory: true,
    canProcessSales: true,
    canDeleteData: true,
  },
  manager: {
    canEditBusinessSettings: false,
    canEditPaymentSettings: false,
    canManageStaff: true,
    canViewAnalytics: true,
    canManageInventory: true,
    canProcessSales: true,
    canDeleteData: false,
  },
  staff: {
    canEditBusinessSettings: false,
    canEditPaymentSettings: false,
    canManageStaff: false,
    canViewAnalytics: false,
    canManageInventory: true,
    canProcessSales: true,
    canDeleteData: false,
  },
};

let cachedRole: UserRole | null = null;
let cachedUserId: string | null = null;

export const getUserRole = async (): Promise<UserRole> => {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return 'staff';
    
    // Check cache first
    if (cachedUserId === userId && cachedRole) {
      return cachedRole;
    }
    
    // Check localStorage for cached role
    try {
      const storedRole = localStorage.getItem(`user_role_${userId}`);
      if (storedRole && ['owner', 'admin', 'manager', 'staff'].includes(storedRole)) {
        cachedRole = storedRole as UserRole;
        cachedUserId = userId;
        return cachedRole;
      }
    } catch (e) {
      // Ignore localStorage errors
    }
    
    // Try to fetch user role from database (with error handling)
    const supabase = getSupabase();
    let roleFromDb: UserRole | null = null;
    
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle(); // Use maybeSingle() instead of single() to avoid errors when no record exists
      
      if (!error && data && data.role) {
        roleFromDb = data.role as UserRole;
      }
    } catch (dbError: any) {
      // If query fails (406, RLS issue, etc.), handle gracefully
      console.warn('Could not fetch role from staff table:', dbError?.message || 'Unknown error');
      
      // Try to check if user is owner by checking if they're the first user
      try {
        const { data: session } = await supabase.auth.getSession();
        if (session?.session?.user) {
          // For now, assume first logged-in user is owner
          // This is a fallback when staff table is not accessible
          const isFirstUser = !localStorage.getItem('has_seen_first_user');
          if (isFirstUser) {
            localStorage.setItem('has_seen_first_user', 'true');
            roleFromDb = 'owner';
          }
        }
      } catch (e) {
        // Ignore errors
      }
    }
    
    // If we got a role from DB, use it
    if (roleFromDb) {
      cachedRole = roleFromDb;
      cachedUserId = userId;
      // Cache in localStorage for offline use
      try {
        localStorage.setItem(`user_role_${userId}`, roleFromDb);
      } catch (e) {
        // Ignore localStorage errors
      }
      return roleFromDb;
    }
    
    // Default to staff if no role found
    const defaultRole: UserRole = 'staff';
    cachedRole = defaultRole;
    cachedUserId = userId;
    return defaultRole;
  } catch (error) {
    console.error('Error getting user role:', error);
    return 'staff';
  }
};

export const hasPermission = async (permission: keyof UserPermissions): Promise<boolean> => {
  const role = await getUserRole();
  return rolePermissions[role][permission];
};

export const requirePermission = async (
  permission: keyof UserPermissions,
  onDenied?: () => void
): Promise<boolean> => {
  const hasAccess = await hasPermission(permission);
  if (!hasAccess && onDenied) {
    onDenied();
  }
  return hasAccess;
};

export const clearRoleCache = () => {
  cachedRole = null;
  cachedUserId = null;
  // Also clear localStorage cache
  try {
    const userId = localStorage.getItem('current_user_id');
    if (userId) {
      localStorage.removeItem(`user_role_${userId}`);
    }
    // Clear all role caches
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('user_role_')) {
        localStorage.removeItem(key);
      }
    });
  } catch (e) {
    // Ignore errors
  }
};

/**
 * Set user role manually (useful when creating staff records)
 */
export const setUserRole = async (role: UserRole): Promise<boolean> => {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return false;
    
    // Update cache
    cachedRole = role;
    cachedUserId = userId;
    
    // Update localStorage
    try {
      localStorage.setItem(`user_role_${userId}`, role);
    } catch (e) {
      // Ignore localStorage errors
    }
    
    return true;
  } catch (error) {
    console.error('Error setting user role:', error);
    return false;
  }
};

