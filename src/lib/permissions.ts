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
  canManageBranches: boolean;
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
    canManageBranches: true,
  },
  admin: {
    canEditBusinessSettings: true,
    canEditPaymentSettings: true,
    canManageStaff: true,
    canViewAnalytics: true,
    canManageInventory: true,
    canProcessSales: true,
    canDeleteData: true,
    canManageBranches: true,
  },
  manager: {
    canEditBusinessSettings: false,
    canEditPaymentSettings: false,
    canManageStaff: true,
    canViewAnalytics: true,
    canManageInventory: true,
    canProcessSales: true,
    canDeleteData: false,
    canManageBranches: false,
  },
  staff: {
    canEditBusinessSettings: false,
    canEditPaymentSettings: false,
    canManageStaff: false,
    canViewAnalytics: false,
    canManageInventory: true,
    canProcessSales: true,
    canDeleteData: false,
    canManageBranches: false,
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
        console.log(`✅ Found role from staff table: ${roleFromDb}`);
      } else if (error) {
        console.warn('⚠️ Staff table query error:', error.message);
      } else {
        console.log('ℹ️ No staff record found for user');
      }
    } catch (dbError: any) {
      // If query fails (406, RLS issue, etc.), handle gracefully
      console.warn('Could not fetch role from staff table:', dbError?.message || 'Unknown error');
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
    
    // Fallback: Check if user is the first user or if no staff record exists
    // Default to admin for authenticated users without a staff record
    // This handles the case where admin users haven't been added to staff table yet
    try {
      const { data: session } = await supabase.auth.getSession();
      if (session?.session?.user) {
        // Check if this is the first user (no other users exist)
        const isFirstUser = !localStorage.getItem('has_seen_first_user');
        
        // If no staff record exists and user is authenticated, default to admin
        // This allows admins to access settings even if not in staff table
        const defaultRoleForAuthenticatedUser: UserRole = isFirstUser ? 'owner' : 'admin';
        
        console.log(`ℹ️ No staff record found, defaulting to: ${defaultRoleForAuthenticatedUser}`);
        
        if (isFirstUser) {
          localStorage.setItem('has_seen_first_user', 'true');
        }
        
        cachedRole = defaultRoleForAuthenticatedUser;
        cachedUserId = userId;
        
        // Cache in localStorage
        try {
          localStorage.setItem(`user_role_${userId}`, defaultRoleForAuthenticatedUser);
        } catch (e) {
          // Ignore localStorage errors
        }
        
        return defaultRoleForAuthenticatedUser;
      }
    } catch (e) {
      console.warn('Error checking session for fallback role:', e);
    }
    
    // Last resort: Default to staff if no role found and not authenticated
    const defaultRole: UserRole = 'staff';
    cachedRole = defaultRole;
    cachedUserId = userId;
    console.warn('⚠️ Defaulting to staff role - no role found and user may not be authenticated');
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

