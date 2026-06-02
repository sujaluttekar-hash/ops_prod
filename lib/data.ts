export const BUTLERS = [
  { id: 'b1', name: 'Manoj Valmiki',    initials: 'MV', property: 'Villa Serenity', score: 91, tasks: 94, quizScore: 88, attendance: 100 },
  { id: 'b2', name: 'Kalpesh Ther',     initials: 'KT', property: 'Casa Azure',     score: 86, tasks: 89, quizScore: 83, attendance: 92  },
  { id: 'b3', name: 'Kohinoor Shinde',  initials: 'KS', property: 'The Hillside',   score: 78, tasks: 80, quizScore: 76, attendance: 85  },
  { id: 'b4', name: 'Atish Tandkar',    initials: 'AT', property: 'Villa Bloom',    score: 73, tasks: 75, quizScore: 71, attendance: 79  },
  { id: 'b5', name: 'Arbaj Shaikh',     initials: 'AS', property: 'Casa Azure',     score: 62, tasks: 64, quizScore: 60, attendance: 70  },
  { id: 'b6', name: 'Vishal',           initials: 'VI', property: 'The Hillside',   score: 83, tasks: 85, quizScore: 81, attendance: 88  },
  { id: 'b7', name: 'Vinayak Kharade',  initials: 'VK', property: 'Villa Serenity', score: 79, tasks: 82, quizScore: 76, attendance: 83  },
  { id: 'b8', name: 'Nimish',           initials: 'NI', property: 'Casa Azure',     score: 88, tasks: 90, quizScore: 86, attendance: 94  },
];

export const butlers = BUTLERS;

export const properties = [
  { id: 'vs', name: 'Villa Serenity', location: 'Lonavala', butlers: 4, status: 'occupied' },
  { id: 'ca', name: 'Casa Azure',     location: 'Alibaug',  butlers: 6, status: 'occupied' },
  { id: 'th', name: 'The Hillside',   location: 'Karjat',   butlers: 5, status: 'partial'  },
  { id: 'vb', name: 'Villa Bloom',    location: 'Nashik',   butlers: 4, status: 'vacant'   },
  { id: 'cp', name: 'Casa Paradiso',  location: 'Pune',     butlers: 5, status: 'occupied' },
];

export const PROPERTY_NAMES = properties.map(p => p.name);

// Task submissions by butlers
export type Submission = {
  id: string;
  butlerId: string;
  butlerName: string;
  taskType: 'Arrival selfie' | 'Guest welcome' | 'Table layout' | 'Exit selfie';
  property: string;
  dateOfService: string;
  submittedAt: string;
  notes: string;
  photoLabel?: string;
  status: 'pending' | 'approved';
};

export const initialSubmissions: Submission[] = [
  { id: 's1', butlerId: 'b1', butlerName: 'Manoj Valmiki',   taskType: 'Arrival selfie', property: 'Villa Serenity', dateOfService: '2026-06-02', submittedAt: '2026-06-02 07:32', notes: '', photoLabel: 'arrival_mv_jun2.jpg', status: 'approved' },
  { id: 's2', butlerId: 'b2', butlerName: 'Kalpesh Ther',    taskType: 'Guest welcome',  property: 'Casa Azure',     dateOfService: '2026-06-02', submittedAt: '2026-06-02 10:15', notes: 'Sharma family — 4 guests', photoLabel: 'welcome_kt_jun2.jpg', status: 'approved' },
  { id: 's3', butlerId: 'b3', butlerName: 'Kohinoor Shinde', taskType: 'Table layout',   property: 'The Hillside',   dateOfService: '2026-06-02', submittedAt: '2026-06-02 11:50', notes: 'Dinner for 8', photoLabel: undefined, status: 'pending' },
  { id: 's4', butlerId: 'b5', butlerName: 'Arbaj Shaikh',    taskType: 'Exit selfie',    property: 'Villa Bloom',    dateOfService: '2026-06-01', submittedAt: '2026-06-01 14:10', notes: '', photoLabel: 'exit_as_jun1.jpg', status: 'pending' },
  { id: 's5', butlerId: 'b8', butlerName: 'Nimish',          taskType: 'Guest welcome',  property: 'Casa Azure',     dateOfService: '2026-06-02', submittedAt: '2026-06-02 09:05', notes: 'Patel couple — anniversary', photoLabel: 'welcome_ni_jun2.jpg', status: 'approved' },
];

export const guestDelights = [
  { id: '1', guest: 'Sharma family',  initials: 'SK', property: 'Villa Serenity', butler: 'Manoj Valmiki',   category: 'Birthday',    status: 'completed', date: 'Jun 2',  notes: 'Arranged flower surprise + cake' },
  { id: '2', guest: 'Mr & Mrs Patel', initials: 'PA', property: 'Casa Azure',     butler: 'Nimish',          category: 'Anniversary', status: 'pending',   date: 'Jun 3',  notes: 'Rose petals + champagne setup' },
  { id: '3', guest: 'Gupta group',    initials: 'GG', property: 'The Hillside',   butler: 'Kohinoor Shinde', category: 'Welcome',     status: 'completed', date: 'Jun 5',  notes: 'Welcome basket with local snacks' },
  { id: '4', guest: 'Joshi & party',  initials: 'RJ', property: 'Villa Bloom',    butler: 'Atish Tandkar',   category: 'Honeymoon',   status: 'overdue',   date: 'Jun 7',  notes: 'Pool decoration pending' },
  { id: '5', guest: 'Singh family',   initials: 'SF', property: 'Casa Azure',     butler: 'Kalpesh Ther',    category: 'Kids special',status: 'completed', date: 'Jun 9',  notes: 'Welcome kit for kids arranged' },
  { id: '6', guest: 'Kapoor couple',  initials: 'KC', property: 'Villa Serenity', butler: 'Manoj Valmiki',   category: 'Surprise',    status: 'pending',   date: 'Jun 10', notes: 'Stargazing setup requested' },
];

export const tasks = [
  { id: '1', type: 'Arrival selfie', property: 'Villa Serenity', butler: 'Manoj Valmiki',   initials: 'MV', status: 'completed', time: '07:32 AM', dueTime: '08:00 AM' },
  { id: '2', type: 'Guest welcome',  property: 'Casa Azure',     butler: 'Kalpesh Ther',    initials: 'KT', status: 'completed', time: '10:15 AM', dueTime: '10:30 AM' },
  { id: '3', type: 'Table layout',   property: 'The Hillside',   butler: 'Kohinoor Shinde', initials: 'KS', status: 'pending',   time: '',         dueTime: '12:00 PM' },
  { id: '4', type: 'Exit selfie',    property: 'Villa Bloom',    butler: 'Arbaj Shaikh',    initials: 'AS', status: 'delayed',   time: '',         dueTime: '02:00 PM' },
  { id: '5', type: 'Table layout',   property: 'Casa Azure',     butler: 'Nimish',          initials: 'NI', status: 'completed', time: '11:50 AM', dueTime: '12:00 PM' },
  { id: '6', type: 'Guest welcome',  property: 'Villa Serenity', butler: 'Manoj Valmiki',   initials: 'MV', status: 'pending',   time: '',         dueTime: '03:00 PM' },
  { id: '7', type: 'Arrival selfie', property: 'The Hillside',   butler: 'Vishal',          initials: 'VI', status: 'completed', time: '06:45 AM', dueTime: '07:00 AM' },
];

export const rosterData = [
  { butler: 'Manoj Valmiki',   initials: 'MV', property: 'Villa Serenity', mon: 'M',   tue: 'M',   wed: 'E',   thu: 'E',   fri: 'M',   sat: 'Off', sun: 'Off' },
  { butler: 'Kalpesh Ther',    initials: 'KT', property: 'Casa Azure',     mon: 'E',   tue: 'M',   wed: 'M',   thu: 'Off', fri: 'E',   sat: 'M',   sun: 'Off' },
  { butler: 'Kohinoor Shinde', initials: 'KS', property: 'The Hillside',   mon: 'N',   tue: 'N',   wed: 'Off', thu: 'M',   fri: 'M',   sat: 'E',   sun: 'E'   },
  { butler: 'Atish Tandkar',   initials: 'AT', property: 'Villa Bloom',    mon: 'M',   tue: 'Off', wed: 'M',   thu: 'E',   fri: 'E',   sat: 'Off', sun: 'N'   },
  { butler: 'Arbaj Shaikh',    initials: 'AS', property: 'Casa Azure',     mon: 'Off', tue: 'E',   wed: 'E',   thu: 'M',   fri: 'Off', sat: 'N',   sun: 'N'   },
  { butler: 'Vishal',          initials: 'VI', property: 'The Hillside',   mon: 'M',   tue: 'E',   wed: 'M',   thu: 'Off', fri: 'M',   sat: 'Off', sun: 'M'   },
  { butler: 'Vinayak Kharade', initials: 'VK', property: 'Villa Serenity', mon: 'E',   tue: 'M',   wed: 'Off', thu: 'M',   fri: 'E',   sat: 'M',   sun: 'Off' },
  { butler: 'Nimish',          initials: 'NI', property: 'Casa Azure',     mon: 'M',   tue: 'Off', wed: 'M',   thu: 'M',   fri: 'Off', sat: 'E',   sun: 'E'   },
];

export const huddles = [
  { id: '1', team: 'Lonavala team huddle',    date: '08', month: 'Jun', time: '10:00 AM', participants: 8,  status: 'scheduled', attendance: null },
  { id: '2', team: 'Alibaug team huddle',     date: '22', month: 'Jun', time: '11:00 AM', participants: 8,  status: 'tbc',       attendance: null },
  { id: '3', team: 'Karjat team huddle',      date: '24', month: 'May', time: '10:00 AM', participants: 8,  status: 'completed', attendance: 88 },
  { id: '4', team: 'All-hands butler huddle', date: '10', month: 'May', time: '09:00 AM', participants: 8,  status: 'completed', attendance: 88 },
];

export const trainings = [
  { id: '1', name: 'F&B service standards',         date: 'Jun 10, 2026', type: 'Functional', enrolled: 6,  total: 8, completion: 0,   status: 'upcoming',  hasQuiz: true  },
  { id: '2', name: 'Guest communication & etiquette',date: 'Mar 15, 2026', type: 'Functional', enrolled: 8,  total: 8, completion: 100, status: 'completed', hasQuiz: true  },
  { id: '3', name: 'Property knowledge deep-dive',  date: 'Jan 20, 2026', type: 'Functional', enrolled: 7,  total: 8, completion: 88,  status: 'completed', hasQuiz: true  },
  { id: '4', name: 'Safety & emergency protocols',  date: 'Jul 15, 2026', type: 'Mandatory',  enrolled: 0,  total: 8, completion: 0,   status: 'planned',   hasQuiz: false },
];

export const quizLeaderboard = [
  { rank: 1, name: 'Manoj Valmiki',   initials: 'MV', score: 98, time: '7 min',  status: 'done'    },
  { rank: 2, name: 'Nimish',          initials: 'NI', score: 94, time: '9 min',  status: 'done'    },
  { rank: 3, name: 'Kalpesh Ther',    initials: 'KT', score: 88, time: '12 min', status: 'done'    },
  { rank: 4, name: 'Vishal',          initials: 'VI', score: 83, time: '14 min', status: 'done'    },
  { rank: 5, name: 'Kohinoor Shinde', initials: 'KS', score: 79, time: '16 min', status: 'done'    },
  { rank: 6, name: 'Vinayak Kharade', initials: 'VK', score: 0,  time: '—',      status: 'pending' },
  { rank: 7, name: 'Atish Tandkar',   initials: 'AT', score: 0,  time: '—',      status: 'pending' },
  { rank: 8, name: 'Arbaj Shaikh',    initials: 'AS', score: 0,  time: '—',      status: 'pending' },
];

export const credentials = [
  { id: '1', name: 'Villa Serenity WiFi',       type: 'wifi',   property: 'Villa Serenity', value: 'VS@Guest2026!',  expiry: 'Jun 30, 2026', expiryWarning: false },
  { id: '2', name: 'Casa Azure smart TV',       type: 'device', property: 'Casa Azure',     value: '7823',           expiry: 'No expiry',    expiryWarning: false },
  { id: '3', name: 'The Hillside gate code',    type: 'key',    property: 'The Hillside',   value: '481672',         expiry: 'Jul 1, 2026',  expiryWarning: true  },
  { id: '4', name: 'Vendor portal — Namosons',  type: 'vendor', property: 'All',            value: 'namo@vendor24',  expiry: 'Dec 31, 2026', expiryWarning: false },
  { id: '5', name: 'Villa Bloom property login',type: 'login',  property: 'Villa Bloom',    value: 'vb_admin_2026',  expiry: 'No expiry',    expiryWarning: false },
];

export const accessLog = [
  { user: 'Aditi S.', credential: 'Villa Serenity WiFi', action: 'Viewed',  time: '09:14' },
  { user: 'Aditi S.', credential: 'Casa Azure TV',       action: 'Copied',  time: '11:02' },
  { user: 'Aditi S.', credential: 'Hillside gate',       action: 'Updated', time: '14:30' },
  { user: 'Aditi S.', credential: 'Vendor portal',       action: 'Viewed',  time: '16:45' },
];

export const calendarEvents: Record<number, { label: string; color: string }[]> = {
  2:  [{ label: 'Welcome — Sharma', color: 'blue'  }],
  3:  [{ label: 'Birthday delight', color: 'coral' }, { label: 'Flowers', color: 'green' }],
  5:  [{ label: 'Turndown — Gupta', color: 'blue'  }],
  7:  [{ label: 'Honeymoon setup',  color: 'coral' }],
  9:  [{ label: 'Anniversary',      color: 'green' }],
  11: [{ label: 'Welcome — Singh',  color: 'blue'  }],
  13: [{ label: 'Pet stay',         color: 'coral' }],
  15: [{ label: 'Honeymoon',        color: 'green' }],
  17: [{ label: 'Surprise delight', color: 'coral' }],
  20: [{ label: 'Welcome basket',   color: 'blue'  }],
  22: [{ label: 'Birthday cake',    color: 'coral' }],
};

export const quizQuestions = [
  {
    id: 1,
    question: 'Which cutlery placement is correct for a formal 4-course dinner service at StayVista?',
    options: [
      'Forks on left, knives on right, soup spoon outermost right',
      'All cutlery on right side, forks innermost',
      'Knife and fork both on right, spoon on left',
      'Dessert spoon above plate, fish fork innermost left',
    ],
    correct: 0,
  },
  {
    id: 2,
    question: 'When a guest requests a dietary restriction, the butler should first:',
    options: [
      'Note it and inform the kitchen coordinator immediately',
      'Suggest the guest contact the kitchen directly',
      'Acknowledge it and log it in the guest profile within 24 hours',
      'Offer an alternative from the standard menu',
    ],
    correct: 0,
  },
  {
    id: 3,
    question: 'Standard turndown service should be completed by:',
    options: ['9:00 PM', '8:00 PM', '7:30 PM', '10:00 PM'],
    correct: 1,
  },
];
