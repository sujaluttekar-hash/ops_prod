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

    // Try by ID first (correct path)
    let { data: profile } = await sb.from('profiles').select('*').eq('id', user.id).single();

    // Fall back to email lookup (handles mismatched UUIDs)
    if (!profile && user.email) {
      const { data: byEmail } = await sb.from('profiles').select('*').eq('email', user.email).single();
      if (byEmail) {
        // Fix the ID mismatch in the background
        await sb.from('profiles').update({ id: user.id }).eq('email', user.email);
        profile = { ...byEmail, id: user.id };
      }
    }

    if (!profile) {
      // No profile at all — create one with butler role
      const name = user.email?.split('@')[0] ?? 'Butler';
      const { data: newProfile } = await sb.from('profiles').insert({
        id: user.id,
        name,
        email: user.email,
        role: 'butler',
        is_active: true,
      }).select().single();
      profile = newProfile;
    }

    if (!profile) return null;

    return {
      id: user.id,
      name: profile.name,
      email: profile.email ?? user.email ?? '',
      role: profile.role,
      squad: profile.squad,
      initials: profile.name.slice(0, 2).toUpperCase(),
    };
  } catch (e) {
    console.error('getCurrentUser error:', e);
    return null;
  }
}

export function isAdmin(role: AppRole) { return role === 'super_admin'; }
export function isSupervisor(role: AppRole) { return role === 'ops_manager' || role === 'super_admin'; }
export function isButler(role: AppRole) { return role === 'butler'; }

export function getRoleLabel(role: AppRole) {
  const map: Record<AppRole, string> = {
    super_admin: 'Admin',
    ops_manager: 'Supervisor',
    butler: 'Butler',
    trainer: 'Trainer',
  };
  return map[role] ?? role;
}
