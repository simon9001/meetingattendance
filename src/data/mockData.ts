export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'hr' | 'organizer';
  department: string;
  status: 'active' | 'disabled';
  lastLogin?: string;
  mustChangePassword?: boolean;
}

export interface Meeting {
  id: string;
  title: string;
  description: string;
  type: 'physical' | 'virtual' | 'hybrid';
  venue: string;
  virtualLink?: string;
  date: string;
  startTime: string;
  endTime: string;
  attendanceOpenTime: string;
  attendanceCloseTime: string;
  department: string;
  organizerEmail: string;
  pin: string;
  status: 'active' | 'closed';
  submittedToHR: boolean;
  submittedAt?: string;
}

export interface Attendance {
  id: string;
  meetingId: string;
  type: 'staff' | 'visitor';
  name: string;
  designation?: string; // staff only
  department?: string; // staff only
  company?: string; // visitor only
  position?: string; // visitor only
  purpose?: 'Guest' | 'Consultant' | 'Contractor' | 'Partner' | 'Trainer' | 'Auditor' | 'Other'; // visitor only
  signature: string; // base64 representation of drawing canvas
  timestamp: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  email: string;
  action: string;
  details: string;
  ip: string;
}

export const DEPARTMENTS = [
  'ICT Department',
  'Human Resource & Administration',
  'Design & Construction',
  'Highway Planning',
  'Operations & Maintenance',
  'Finance & Accounting',
  'Legal Services',
  'Public Communications'
];

// Initial mock data seeds
const INITIAL_USERS: User[] = [
  {
    id: 'u1',
    name: 'ICT Admin User',
    email: 'admin@kenha.co.ke',
    role: 'admin',
    department: 'ICT Department',
    status: 'active',
    mustChangePassword: false
  },
  {
    id: 'u2',
    name: 'Jane Harrison',
    email: 'hr.officer@kenha.co.ke',
    role: 'hr',
    department: 'Human Resource & Administration',
    status: 'active',
    mustChangePassword: false
  },
  {
    id: 'u3',
    name: 'John Mwangi',
    email: 'john.mwangi@kenha.co.ke',
    role: 'organizer',
    department: 'Highway Planning',
    status: 'active',
    mustChangePassword: true // Forces password change on first login
  },
  {
    id: 'u4',
    name: 'Sarah Koech',
    email: 'sarah.koech@kenha.co.ke',
    role: 'organizer',
    department: 'Design & Construction',
    status: 'active',
    mustChangePassword: false
  }
];

const INITIAL_MEETINGS: Meeting[] = [
  {
    id: 'm1',
    title: 'A8 Road Expansion Stakeholders Induction',
    description: 'Briefing session with community partners and consultants on the environmental impacts and timelines of the A8 highway project expansion.',
    type: 'hybrid',
    venue: 'KeNHA HQ Boardroom 3 & MS Teams',
    virtualLink: 'https://teams.microsoft.com/l/meetup-join/kenha-expansion-meeting',
    date: '2026-07-15',
    startTime: '09:00',
    endTime: '12:00',
    attendanceOpenTime: '08:30',
    attendanceCloseTime: '13:00',
    department: 'Design & Construction',
    organizerEmail: 'john.mwangi@kenha.co.ke',
    pin: '8492',
    status: 'active',
    submittedToHR: false
  },
  {
    id: 'm2',
    title: 'Q2 Performance and Training Evaluation',
    description: 'Internal evaluation of employee training program outcomes, certifications completed, and planning for the upcoming quarter.',
    type: 'physical',
    venue: 'HR Training Room A',
    date: '2026-07-14',
    startTime: '14:00',
    endTime: '16:30',
    attendanceOpenTime: '13:45',
    attendanceCloseTime: '17:00',
    department: 'Human Resource & Administration',
    organizerEmail: 'sarah.koech@kenha.co.ke',
    pin: '2351',
    status: 'closed',
    submittedToHR: true,
    submittedAt: '2026-07-14T17:05:00.000Z'
  }
];

const INITIAL_ATTENDANCE: Attendance[] = [
  {
    id: 'a1',
    meetingId: 'm2',
    type: 'staff',
    name: 'David Cheruiyot',
    designation: 'Senior HR Specialist',
    department: 'Human Resource & Administration',
    signature: 'data:image/svg+xml;utf8,<svg viewBox="0 0 100 30" xmlns="http://www.w3.org/2000/svg"><path d="M10,20 Q30,5 50,20 T90,15" fill="none" stroke="black" stroke-width="2"/></svg>',
    timestamp: '2026-07-14T13:50:12.000Z'
  },
  {
    id: 'a2',
    meetingId: 'm2',
    type: 'staff',
    name: 'Grace Mutua',
    designation: 'ICT Helpdesk lead',
    department: 'ICT Department',
    signature: 'data:image/svg+xml;utf8,<svg viewBox="0 0 100 30" xmlns="http://www.w3.org/2000/svg"><path d="M5,15 C25,5 30,25 60,10 S85,5 95,25" fill="none" stroke="black" stroke-width="2"/></svg>',
    timestamp: '2026-07-14T13:58:45.000Z'
  },
  {
    id: 'a3',
    meetingId: 'm2',
    type: 'visitor',
    name: 'Dr. Arthur Pendelton',
    company: 'Nexus Consulting East Africa',
    position: 'Chief Training Assessor',
    purpose: 'Trainer',
    signature: 'data:image/svg+xml;utf8,<svg viewBox="0 0 100 30" xmlns="http://www.w3.org/2000/svg"><path d="M10,25 L30,5 L50,25 L70,10 L90,20" fill="none" stroke="black" stroke-width="2"/></svg>',
    timestamp: '2026-07-14T14:02:11.000Z'
  }
];

const INITIAL_AUDIT: AuditLog[] = [
  {
    id: 'l1',
    timestamp: '2026-07-14T08:30:15.000Z',
    email: 'admin@kenha.co.ke',
    action: 'USER_LOGIN',
    details: 'Administrator successfully logged in',
    ip: '10.150.12.44'
  },
  {
    id: 'l2',
    timestamp: '2026-07-14T14:15:30.000Z',
    email: 'sarah.koech@kenha.co.ke',
    action: 'MEETING_CREATE',
    details: 'Created meeting: Q2 Performance and Training Evaluation',
    ip: '10.150.14.92'
  },
  {
    id: 'l3',
    timestamp: '2026-07-14T17:05:00.000Z',
    email: 'sarah.koech@kenha.co.ke',
    action: 'REPORT_SUBMIT_HR',
    details: 'Finalized attendance report for "Q2 Performance and Training Evaluation" submitted to HR repository',
    ip: '10.150.14.92'
  }
];

// Helper to interact with LocalStorage
export const getStorageData = <T>(key: string, initialData: T): T => {
  const data = localStorage.getItem(`kmtams_${key}`);
  if (!data) {
    localStorage.setItem(`kmtams_${key}`, JSON.stringify(initialData));
    return initialData;
  }
  try {
    return JSON.parse(data) as T;
  } catch (e) {
    return initialData;
  }
};

export const setStorageData = <T>(key: string, data: T): void => {
  localStorage.setItem(`kmtams_${key}`, JSON.stringify(data));
};

// Database interface class
export const MockDb = {
  getUsers: (): User[] => getStorageData('users', INITIAL_USERS),
  setUsers: (users: User[]) => setStorageData('users', users),
  
  getMeetings: (): Meeting[] => getStorageData('meetings', INITIAL_MEETINGS),
  setMeetings: (meetings: Meeting[]) => setStorageData('meetings', meetings),
  
  getAttendance: (): Attendance[] => getStorageData('attendance', INITIAL_ATTENDANCE),
  setAttendance: (attendance: Attendance[]) => setStorageData('attendance', attendance),
  
  getAuditLogs: (): AuditLog[] => getStorageData('audit_logs', INITIAL_AUDIT),
  setAuditLogs: (logs: AuditLog[]) => setStorageData('audit_logs', logs),

  addAuditLog: (email: string, action: string, details: string) => {
    const logs = MockDb.getAuditLogs();
    const newLog: AuditLog = {
      id: `l_${Date.now()}`,
      timestamp: new Date().toISOString(),
      email,
      action,
      details,
      ip: `10.150.25.${Math.floor(Math.random() * 254) + 1}`
    };
    MockDb.setAuditLogs([newLog, ...logs].slice(0, 200)); // Cap logs at 200 items
  },

  // Auth Operations
  getUserByEmail: (email: string): User | undefined => {
    return MockDb.getUsers().find(u => u.email.toLowerCase() === email.toLowerCase());
  },

  updateUserPasswordFlag: (email: string, mustChange: boolean) => {
    const users = MockDb.getUsers().map(u => {
      if (u.email.toLowerCase() === email.toLowerCase()) {
        return { ...u, mustChangePassword: mustChange };
      }
      return u;
    });
    MockDb.setUsers(users);
  },

  updateUserStatus: (id: string, status: 'active' | 'disabled') => {
    const users = MockDb.getUsers().map(u => {
      if (u.id === id) {
        return { ...u, status };
      }
      return u;
    });
    MockDb.setUsers(users);
  },

  createUser: (user: Omit<User, 'id'>): User => {
    const users = MockDb.getUsers();
    const newUser: User = {
      ...user,
      id: `u_${Date.now()}`
    };
    MockDb.setUsers([...users, newUser]);
    return newUser;
  },

  // Meeting Operations
  createMeeting: (meeting: Omit<Meeting, 'id' | 'status' | 'submittedToHR'>): Meeting => {
    const meetings = MockDb.getMeetings();
    const newMeeting: Meeting = {
      ...meeting,
      id: `m_${Date.now()}`,
      status: 'active',
      submittedToHR: false
    };
    MockDb.setMeetings([newMeeting, ...meetings]);
    return newMeeting;
  },

  updateMeetingStatus: (id: string, status: 'active' | 'closed') => {
    const meetings = MockDb.getMeetings().map(m => {
      if (m.id === id) {
        return { ...m, status };
      }
      return m;
    });
    MockDb.setMeetings(meetings);
  },

  submitMeetingToHR: (id: string) => {
    const meetings = MockDb.getMeetings().map(m => {
      if (m.id === id) {
        return { ...m, submittedToHR: true, submittedAt: new Date().toISOString() };
      }
      return m;
    });
    MockDb.setMeetings(meetings);
  },

  // Attendance Operations
  submitAttendance: (attendance: Omit<Attendance, 'id' | 'timestamp'>): Attendance => {
    const list = MockDb.getAttendance();
    const newAttendance: Attendance = {
      ...attendance,
      id: `a_${Date.now()}`,
      timestamp: new Date().toISOString()
    };
    MockDb.setAttendance([...list, newAttendance]);
    return newAttendance;
  }
};
