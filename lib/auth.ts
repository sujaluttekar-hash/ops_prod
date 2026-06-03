import { getSupabase } from './supabase';

export type AppRole = 'super_admin' | 'ops_manager' | 'butler' | 'trainer';

export type AppUser = {
  id: string;
  name: string;
  email: string;
  role: AppRole;
  squad: string | null;
  initials: string;
};

export async function getCurrentUser(): Promise<AppUser | null> {
  try {
    const sb = getSupabase();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return null;

    const { data: profile } = await sb.from('profiles').select('*').eq('id', user.id).single();
    if (!profile) return null;

    return {
      id: profile.id,
      name: profile.name,
      email: profile.email ?? user.email ?? '',
      role: profile.role,
      squad: profile.squad,
      initials: profile.name.slice(0, 2).toUpperCase(),
    };
  } catch {
    return null;
  }
}

export function isAdmin(role: AppRole) {
  return role === 'super_admin';
}

export function isSupervisor(role: AppRole) {
  return role === 'ops_manager' || role === 'super_admin';
}

export function isButler(role: AppRole) {
  return role === 'butler';
}

export function getRoleLabel(role: AppRole) {
  const map: Record<AppRole, string> = {
    super_admin: 'Admin',
    ops_manager: 'Supervisor',
    butler: 'Butler',
    trainer: 'Trainer',
  };
  return map[role] ?? role;
}
