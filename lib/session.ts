// Simple in-memory session — replaced by Supabase Auth later
export type Role = 'admin' | 'butler';

export type SessionUser = {
  id: string;
  name: string;
  initials: string;
  role: Role;
  property?: string;
};

export const SESSIONS: Record<string, SessionUser> = {
  admin: { id: 'admin', name: 'Aditi Sharma', initials: 'AD', role: 'admin' },
  b1: { id: 'b1', name: 'Manoj Valmiki',   initials: 'MV', role: 'butler', property: 'Villa Serenity' },
  b2: { id: 'b2', name: 'Kalpesh Ther',    initials: 'KT', role: 'butler', property: 'Casa Azure'     },
  b3: { id: 'b3', name: 'Kohinoor Shinde', initials: 'KS', role: 'butler', property: 'The Hillside'   },
  b4: { id: 'b4', name: 'Atish Tandkar',   initials: 'AT', role: 'butler', property: 'Villa Bloom'    },
  b5: { id: 'b5', name: 'Arbaj Shaikh',    initials: 'AS', role: 'butler', property: 'Casa Azure'     },
  b6: { id: 'b6', name: 'Vishal',          initials: 'VI', role: 'butler', property: 'The Hillside'   },
  b7: { id: 'b7', name: 'Vinayak Kharade', initials: 'VK', role: 'butler', property: 'Villa Serenity' },
  b8: { id: 'b8', name: 'Nimish',          initials: 'NI', role: 'butler', property: 'Casa Azure'     },
};
