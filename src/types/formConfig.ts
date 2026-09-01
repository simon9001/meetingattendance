// =====================================================================
// Form Configuration & Dynamic Column Types
// =====================================================================

export type FieldType = 'text' | 'number' | 'email' | 'tel' | 'select';
export type FieldTarget = 'all' | 'staff' | 'visitor';

export interface CustomField {
  id: string;
  label: string; // e.g. "ID / Passport No.", "Phone Number", "Station / Region"
  key: string; // unique slug e.g. "id_number", "phone_number"
  type: FieldType;
  required: boolean;
  appliesTo: FieldTarget;
  options?: string[]; // for select dropdown
  placeholder?: string;
}

export interface MeetingFormConfig {
  // Standard fields toggle (on/off)
  includeDesignation: boolean; // default: true
  includeDepartment: boolean; // default: true
  includeOrganization: boolean; // default: true (visitor)
  includePosition: boolean; // default: true (visitor)
  includePurpose: boolean; // default: true (visitor)
  includeSignature: boolean; // default: true (digital signature)

  // Visitor / external participant access
  allowVisitors: boolean; // default: true — when false, only staff may sign in

  // Multi-Day Meeting Schedule Configuration
  isMultiDay?: boolean; // default: false
  sessionDates?: string[]; // e.g. ['23/02/2026', '24/02/2026', '25/02/2026', '26/02/2026', '27/02/2026']
  activeSessionDate?: string; // current active date e.g. '24/02/2026'
  sendDailyReminders?: boolean; // automated daily email reminders via Resend
  participantEmails?: string[]; // email addresses to receive daily reminder PIN & link

  // Unique custom fields created by organizer
  customFields: CustomField[];
}

export const DEFAULT_MEETING_FORM_CONFIG: MeetingFormConfig = {
  includeDesignation: true,
  includeDepartment: false, // Default false for single department meetings (auto-activated if multi-department)
  includeOrganization: true,
  includePosition: true,
  includePurpose: true,
  includeSignature: true,
  allowVisitors: true,
  isMultiDay: false,
  sessionDates: [],
  activeSessionDate: '',
  sendDailyReminders: false,
  participantEmails: [],
  customFields: [],
};

// Preset suggestions for quick adding unique fields
export const PRESET_CUSTOM_FIELDS: Array<Omit<CustomField, 'id'>> = [
  {
    label: 'Phone / Mobile No.',
    key: 'phone_number',
    type: 'tel',
    required: false,
    appliesTo: 'all',
    placeholder: 'e.g. +254 700 000 000',
  },
  {
    label: 'National ID / Passport No.',
    key: 'id_number',
    type: 'text',
    required: false,
    appliesTo: 'all',
    placeholder: 'e.g. 12345678',
  },
  {
    label: 'Station / Regional Office',
    key: 'station_office',
    type: 'text',
    required: false,
    appliesTo: 'all',
    placeholder: 'e.g. Machakos Corridor / Nairobi HQ',
  },
  {
    label: 'County of Residence / Duty',
    key: 'county',
    type: 'text',
    required: false,
    appliesTo: 'all',
    placeholder: 'e.g. Nairobi, Kiambu, Nakuru',
  },
  {
    label: 'Vehicle Reg No.',
    key: 'vehicle_reg',
    type: 'text',
    required: false,
    appliesTo: 'all',
    placeholder: 'e.g. KDA 001A',
  },
  {
    label: 'Email Address',
    key: 'email_address',
    type: 'email',
    required: false,
    appliesTo: 'all',
    placeholder: 'e.g. user@organization.com',
  },
  {
    label: 'Dietary Preference',
    key: 'dietary_preference',
    type: 'select',
    required: false,
    appliesTo: 'all',
    options: ['Standard', 'Vegetarian', 'Vegan', 'Halal', 'Gluten Free'],
    placeholder: 'Select dietary preference',
  },
];

/**
 * Serializes form config cleanly inside meeting description or metadata tag
 */
export function serializeMeetingDescription(userDescription: string, config: MeetingFormConfig): string {
  const jsonStr = JSON.stringify(config);
  const clean = (userDescription || '').replace(/<!--KMTAMS_FORM_CONFIG:.*?-->/gs, '').trim();
  return `${clean}\n\n<!--KMTAMS_FORM_CONFIG:${jsonStr}-->`;
}

/**
 * Parses form config from meeting object or description
 */
export function parseMeetingFormConfig(meetingOrDesc: any): MeetingFormConfig {
  if (!meetingOrDesc) return { ...DEFAULT_MEETING_FORM_CONFIG };

  // 1. Direct form_config object on meeting object
  if (typeof meetingOrDesc === 'object' && meetingOrDesc !== null) {
    if (meetingOrDesc.form_config) {
      if (typeof meetingOrDesc.form_config === 'object') {
        return {
          ...DEFAULT_MEETING_FORM_CONFIG,
          ...meetingOrDesc.form_config,
          customFields: meetingOrDesc.form_config.customFields || (Array.isArray(meetingOrDesc.custom_fields) ? meetingOrDesc.custom_fields : []),
        };
      }
      if (typeof meetingOrDesc.form_config === 'string' && meetingOrDesc.form_config.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(meetingOrDesc.form_config);
          return {
            ...DEFAULT_MEETING_FORM_CONFIG,
            ...parsed,
            customFields: parsed.customFields || (Array.isArray(meetingOrDesc.custom_fields) ? meetingOrDesc.custom_fields : []),
          };
        } catch {}
      }
    }
  }

  // 2. Check HTML comment in description
  const desc = typeof meetingOrDesc === 'string' ? meetingOrDesc : (meetingOrDesc?.description || '');
  if (typeof desc === 'string' && desc.includes('<!--KMTAMS_FORM_CONFIG:')) {
    const match = desc.match(/<!--KMTAMS_FORM_CONFIG:(.*?)-->/s);
    if (match && match[1]) {
      try {
        const parsed = JSON.parse(match[1]);
        return {
          ...DEFAULT_MEETING_FORM_CONFIG,
          ...parsed,
          customFields: parsed.customFields || (Array.isArray(meetingOrDesc?.custom_fields) ? meetingOrDesc.custom_fields : []),
        };
      } catch {}
    }
  }

  // 3. Check custom_fields array on object if present
  if (typeof meetingOrDesc === 'object' && Array.isArray(meetingOrDesc?.custom_fields) && meetingOrDesc.custom_fields.length > 0) {
    return {
      ...DEFAULT_MEETING_FORM_CONFIG,
      customFields: meetingOrDesc.custom_fields,
    };
  }

  return { ...DEFAULT_MEETING_FORM_CONFIG };
}

/**
 * Strips metadata tags to return user-facing meeting description
 */
export function getCleanMeetingDescription(description?: string | null): string {
  if (!description) return '';
  return description.replace(/<!--KMTAMS_FORM_CONFIG:.*?-->/gs, '').trim();
}

/**
 * Resolves a meeting's department for display: a single picked
 * department (via the `departments` relation) takes priority, then a
 * free-text label (for meetings spanning multiple/no specific
 * department), then the caller-supplied fallback.
 */
export function resolveDepartmentDisplay(
  meeting: { departments?: { name?: string } | null; department_label?: string | null } | null | undefined,
  fallback: string
): string {
  return meeting?.department_label || meeting?.departments?.name || fallback;
}

export interface RegisterColumn {
  key: string;
  header: string;
  widthPercent: number;
  getValue: (attendee: any) => string;
}

/**
 * Dynamically computes columns for Attendance Register Table
 */
export function getDynamicRegisterColumns(
  config: MeetingFormConfig,
  attendeeScope: 'all' | 'staff' | 'visitors' = 'all'
): RegisterColumn[] {
  const cols: RegisterColumn[] = [];

  // 1. Name is always column 1
  cols.push({
    key: 'name',
    header: 'NAME',
    widthPercent: 26,
    getValue: a => a.full_name || '',
  });

  // 2. Designation / Position
  const showDesignation =
    (attendeeScope === 'staff' && Boolean(config.includeDesignation)) ||
    (attendeeScope === 'visitors' && Boolean(config.includePosition)) ||
    (attendeeScope === 'all' && Boolean(config.includeDesignation || config.includePosition));

  if (showDesignation) {
    cols.push({
      key: 'designation',
      header: attendeeScope === 'visitors' ? 'POSITION / TITLE' : 'DESIGNATION',
      widthPercent: 20,
      getValue: a => ('designation' in a ? a.designation : a.position_title || 'Visitor') || '',
    });
  }

  // 3. Department / Organization
  const showDeptOrg =
    (attendeeScope === 'staff' && Boolean(config.includeDepartment)) ||
    (attendeeScope === 'visitors' && Boolean(config.includeOrganization)) ||
    (attendeeScope === 'all' && Boolean(config.includeDepartment || config.includeOrganization));

  if (showDeptOrg) {
    cols.push({
      key: 'department_org',
      header: attendeeScope === 'visitors' ? 'ORGANIZATION' : 'DEPARTMENT / ORG',
      widthPercent: 20,
      getValue: a => ('departments' in a ? a.departments?.name || 'Internal' : a.organization || 'External') || '',
    });
  }

  // 4. Purpose (if visitors and enabled)
  if (attendeeScope === 'visitors' && config.includePurpose) {
    cols.push({
      key: 'purpose',
      header: 'PURPOSE',
      widthPercent: 14,
      getValue: a => (a.purpose ? String(a.purpose).toUpperCase() : 'GUEST'),
    });
  }

  // 5. Custom unique fields matching current scope
  (config.customFields || []).forEach(cf => {
    if (
      cf.appliesTo === 'all' ||
      (attendeeScope === 'staff' && cf.appliesTo === 'staff') ||
      (attendeeScope === 'visitors' && cf.appliesTo === 'visitor')
    ) {
      cols.push({
        key: `custom_${cf.key}`,
        header: cf.label.toUpperCase(),
        widthPercent: 16,
        getValue: a => {
          if (a.custom_responses && a.custom_responses[cf.key] !== undefined) {
            return String(a.custom_responses[cf.key]);
          }
          if (a[cf.key] !== undefined) {
            return String(a[cf.key]);
          }
          return '';
        },
      });
    }
  });

  return cols;
}

// ── Multi-Day Attendee Aggregation Helpers ──────────────────────────

export interface AggregatedAttendeeRow {
  attendance_id: string;
  full_name: string;
  designation?: string;
  department?: string;
  departments?: { name: string };
  organization?: string;
  position_title?: string;
  purpose?: string;
  participant_type: 'staff' | 'visitor';
  submitted_at: string;
  signature_data?: string;
  custom_responses?: Record<string, any>;
  signaturesByDate: Record<string, string>; // e.g. { '23/02/2026': 'data:image/png;base64,...' }
}

export function formatAttendanceDate(dateInput?: string): string {
  if (!dateInput) return '';
  const str = String(dateInput).trim();
  if (!str) return '';

  // If already in DD/MM/YYYY format, return as is
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    return str;
  }

  // Match YYYY-MM-DD or YYYY/MM/DD
  const ymdMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (ymdMatch) {
    const yyyy = ymdMatch[1];
    const mm = ymdMatch[2].padStart(2, '0');
    const dd = ymdMatch[3].padStart(2, '0');
    return `${dd}/${mm}/${yyyy}`;
  }

  // Match DD-MM-YYYY or D/M/YYYY
  const dmyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (dmyMatch) {
    const dd = dmyMatch[1].padStart(2, '0');
    const mm = dmyMatch[2].padStart(2, '0');
    const yyyy = dmyMatch[3];
    return `${dd}/${mm}/${yyyy}`;
  }

  try {
    const d = new Date(str);
    if (isNaN(d.getTime())) return str;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  } catch {
    return str;
  }
}

export function aggregateMultiDayAttendees(
  allSubmissions: any[],
  sessionDates: string[] = []
): AggregatedAttendeeRow[] {
  const map: Map<string, AggregatedAttendeeRow> = new Map();

  allSubmissions.forEach(sub => {
    if (!sub || !sub.full_name) return;
    const key = (sub.full_name || '').trim().toLowerCase();
    const dateStr = formatAttendanceDate(sub.submitted_at);

    if (!map.has(key)) {
      map.set(key, {
        attendance_id: sub.attendance_id || key,
        full_name: sub.full_name,
        designation: sub.designation || sub.position_title || '',
        department: sub.departments?.name || sub.organization || '',
        departments: sub.departments,
        organization: sub.organization || '',
        position_title: sub.position_title || '',
        purpose: sub.purpose || '',
        participant_type: sub.participant_type || ('designation' in sub ? 'staff' : 'visitor'),
        submitted_at: sub.submitted_at,
        signature_data: sub.signature_data,
        custom_responses: sub.custom_responses || {},
        signaturesByDate: {},
      });
    }

    const row = map.get(key)!;
    if (sub.signature_data) {
      if (dateStr) {
        row.signaturesByDate[dateStr] = sub.signature_data;
      }
      // Map to matching session dates
      sessionDates.forEach(sd => {
        if (dateStr === sd || sub.submitted_at?.includes(sd)) {
          row.signaturesByDate[sd] = sub.signature_data;
        }
      });
      // If only 1 session date or signature default
      if (!row.signature_data) {
        row.signature_data = sub.signature_data;
      }
    }
  });

  return Array.from(map.values());
}
