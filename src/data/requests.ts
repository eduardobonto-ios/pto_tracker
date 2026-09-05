import type { DurationType, LeaveType, PayStatus, PTORequest, PTOStatus } from '@/types';

/**
 * Mock PTO log — mirrors the "PTO Log" tab of the legacy Google Sheet.
 *
 * The approved + paid totals here reconcile exactly with the roll-up shown in
 * the spreadsheet (40.0 days used, 35.0 remaining across 11 eligible members).
 * A small number of Pending and Rejected rows have been added on top so the
 * approval workflow is demonstrable in this prototype.
 */

type Seed = {
  id: string;
  employeeId: string;
  requestDate: string;
  leaveType: LeaveType;
  startDate: string;
  endDate?: string;
  durationType?: DurationType;
  days: number;
  status: PTOStatus;
  payStatus: PayStatus;
  coverage: string;
  reason: string;
  reviewer?: string;
  rejectionReason?: string;
};

const seeds: Seed[] = [
  // ---- Q1 ------------------------------------------------------------------
  {
    id: 'PTO-2026-001',
    employeeId: 'emp-12', // Josh Kirk
    requestDate: '2026-01-05',
    leaveType: 'Vacation Leave',
    startDate: '2026-01-12',
    endDate: '2026-01-16',
    days: 5,
    status: 'Approved',
    payStatus: 'Paid',
    coverage: 'Cleon Kemp',
    reason: 'Winter break with family',
  },
  {
    id: 'PTO-2026-002',
    employeeId: 'emp-11', // Cleon Kemp
    requestDate: '2026-01-12',
    leaveType: 'Vacation Leave',
    startDate: '2026-01-19',
    endDate: '2026-01-21',
    days: 3,
    status: 'Approved',
    payStatus: 'Paid',
    coverage: 'Josh Kirk',
    reason: 'Ski trip booked before the season',
  },
  {
    id: 'PTO-2026-003',
    employeeId: 'emp-02', // Kazutomo Nishimura
    requestDate: '2026-02-10',
    leaveType: 'Personal Leave',
    startDate: '2026-02-13',
    days: 1,
    status: 'Approved',
    payStatus: 'Paid',
    coverage: 'April Lopez',
    reason: 'Bank and government errands',
  },
  {
    id: 'PTO-2026-004',
    employeeId: 'emp-13', // Dylan Lavern
    requestDate: '2026-02-23',
    leaveType: 'Vacation Leave',
    startDate: '2026-03-02',
    endDate: '2026-03-04',
    days: 3,
    status: 'Approved',
    payStatus: 'Paid',
    coverage: 'Amr Shweiky',
    reason: 'Anniversary trip',
  },
  {
    id: 'PTO-2026-005',
    employeeId: 'emp-03', // April Lopez
    requestDate: '2026-03-02',
    leaveType: 'Vacation Leave',
    startDate: '2026-03-09',
    endDate: '2026-03-12',
    days: 4,
    status: 'Approved',
    payStatus: 'Paid',
    coverage: 'Elysabel Del Rosario',
    reason: 'Family trip to Bohol',
  },
  {
    id: 'PTO-2026-006',
    employeeId: 'emp-12', // Josh Kirk
    requestDate: '2026-03-16',
    leaveType: 'Vacation Leave',
    startDate: '2026-03-23',
    endDate: '2026-03-27',
    days: 5,
    status: 'Approved',
    payStatus: 'Paid',
    coverage: 'Amr Shweiky',
    reason: 'Trip to Colorado',
  },

  // ---- Q2 ------------------------------------------------------------------
  {
    id: 'PTO-2026-007',
    employeeId: 'emp-11', // Cleon Kemp
    requestDate: '2026-04-06',
    leaveType: 'Vacation Leave',
    startDate: '2026-04-13',
    endDate: '2026-04-15',
    days: 3,
    status: 'Approved',
    payStatus: 'Paid',
    coverage: 'Amr Shweiky',
    reason: 'Family vacation',
  },
  {
    id: 'PTO-2026-008',
    employeeId: 'emp-14', // Amr Shweiky
    requestDate: '2026-04-20',
    leaveType: 'Vacation Leave',
    startDate: '2026-04-27',
    endDate: '2026-04-29',
    days: 3,
    status: 'Approved',
    payStatus: 'Paid',
    coverage: 'Dylan Lavern',
    reason: 'Family visit abroad',
  },
  {
    id: 'PTO-2026-009',
    employeeId: 'emp-06', // Veam Chavez
    requestDate: '2026-05-11',
    leaveType: 'Sick Leave',
    startDate: '2026-05-15',
    days: 1,
    status: 'Approved',
    payStatus: 'Paid',
    coverage: 'Jason Bauman',
    reason: 'Fever — advised to rest',
  },
  {
    id: 'PTO-2026-010',
    employeeId: 'emp-12', // Josh Kirk
    requestDate: '2026-05-18',
    leaveType: 'Personal Leave',
    startDate: '2026-05-25',
    endDate: '2026-05-26',
    days: 2,
    status: 'Approved',
    payStatus: 'Paid',
    coverage: 'Cleon Kemp',
    reason: 'House move',
  },
  {
    id: 'PTO-2026-011',
    employeeId: 'emp-13', // Dylan Lavern
    requestDate: '2026-06-01',
    leaveType: 'Emergency Leave',
    startDate: '2026-06-05',
    days: 1,
    status: 'Approved',
    payStatus: 'Paid',
    coverage: 'Josh Kirk',
    reason: 'Family matter',
  },
  {
    id: 'PTO-2026-012',
    employeeId: 'emp-01', // Princes Aloha Gomez
    requestDate: '2026-06-22',
    leaveType: 'Sick Leave',
    startDate: '2026-06-26',
    days: 1,
    status: 'Approved',
    payStatus: 'Paid',
    coverage: 'Kazutomo Nishimura',
    reason: 'Migraine',
  },
  {
    id: 'PTO-2026-013',
    employeeId: 'emp-11', // Cleon Kemp
    requestDate: '2026-06-29',
    leaveType: 'Half Day Leave',
    startDate: '2026-07-02',
    durationType: 'Half Day (AM)',
    days: 0.5,
    status: 'Approved',
    payStatus: 'Paid',
    coverage: 'Josh Kirk',
    reason: 'Half Day AM — dentist appointment',
  },

  // ---- Q3 ------------------------------------------------------------------
  {
    id: 'PTO-2026-014',
    employeeId: 'emp-12', // Josh Kirk
    requestDate: '2026-07-06',
    leaveType: 'Sick Leave',
    startDate: '2026-07-10',
    days: 1,
    status: 'Approved',
    payStatus: 'Paid',
    coverage: 'myself',
    reason: 'Flu',
  },
  {
    id: 'PTO-2026-015',
    employeeId: 'emp-14', // Amr Shweiky
    requestDate: '2026-07-13',
    leaveType: 'Vacation Leave',
    startDate: '2026-07-20',
    endDate: '2026-07-22',
    days: 3,
    status: 'Approved',
    payStatus: 'Paid',
    coverage: 'Cleon Kemp',
    reason: 'Summer break',
  },
  {
    id: 'PTO-2026-016',
    employeeId: 'emp-06', // Veam Chavez
    requestDate: '2026-07-28',
    leaveType: 'Vacation Leave',
    startDate: '2026-07-31',
    days: 1,
    status: 'Approved',
    payStatus: 'Paid',
    coverage: 'Jason Bauman',
    reason: 'Family Event',
  },
  {
    id: 'PTO-2026-017',
    employeeId: 'emp-03', // April Lopez
    requestDate: '2026-08-03',
    leaveType: 'Emergency Leave',
    startDate: '2026-07-30',
    days: 1,
    status: 'Approved',
    payStatus: 'Paid',
    coverage: 'N/A',
    reason: 'Power interruption',
  },
  {
    id: 'PTO-2026-018',
    employeeId: 'emp-07', // Sharlyn Bacalso
    requestDate: '2026-08-04',
    leaveType: 'Vacation Leave',
    startDate: '2026-08-06',
    days: 1,
    status: 'Approved',
    payStatus: 'Paid',
    coverage: 'Nancy/Princes',
    reason: 'Get together with a friend visiting from the US',
  },
  {
    id: 'PTO-2026-019',
    employeeId: 'emp-13', // Dylan Lavern
    requestDate: '2026-08-10',
    leaveType: 'Half Day Leave',
    startDate: '2026-08-14',
    durationType: 'Half Day (PM)',
    days: 0.5,
    status: 'Approved',
    payStatus: 'Paid',
    coverage: 'Cleon Kemp',
    reason: 'Half Day PM — school event',
  },
  {
    id: 'PTO-2026-020',
    employeeId: 'emp-09', // Justin Mar Tizon
    requestDate: '2026-08-17',
    leaveType: 'Vacation Leave',
    startDate: '2026-08-24',
    endDate: '2026-08-25',
    days: 2,
    status: 'Rejected',
    payStatus: 'Unpaid',
    coverage: 'Mabel Rojas',
    reason: 'Beach trip with friends',
    reviewer: 'Princes Aloha Gomez',
    rejectionReason:
      'Not yet eligible for paid PTO — eligibility begins 10/13/2026. Please refile closer to the date, or refile as unpaid leave with department approval.',
  },
  {
    id: 'PTO-2026-021',
    employeeId: 'emp-08', // Elysabel Del Rosario
    requestDate: '2026-08-24',
    leaveType: 'Unpaid Leave',
    startDate: '2026-09-17',
    endDate: '2026-09-18',
    days: 2,
    status: 'Approved',
    payStatus: 'Unpaid',
    coverage: 'April Lopez',
    reason: 'Family obligation — not yet PTO-eligible, filed as unpaid',
  },
  {
    id: 'PTO-2026-022',
    employeeId: 'emp-12', // Josh Kirk
    requestDate: '2026-08-26',
    leaveType: 'Half Day Leave',
    startDate: '2026-09-08',
    durationType: 'Half Day (PM)',
    days: 0.5,
    status: 'Approved',
    payStatus: 'Unpaid',
    coverage: 'myself',
    reason: 'Half Day PM — work the 2nd half of the day',
  },
  {
    id: 'PTO-2026-023',
    employeeId: 'emp-10', // Victor Joshua Estacio
    requestDate: '2026-08-28',
    leaveType: 'Unpaid Leave',
    startDate: '2026-09-25',
    days: 1,
    status: 'Approved',
    payStatus: 'Unpaid',
    coverage: 'Mabel Rojas',
    reason: 'Personal errand — not yet PTO-eligible',
  },

  // ---- Awaiting review -----------------------------------------------------
  {
    id: 'PTO-2026-024',
    employeeId: 'emp-05', // Mabel Rojas
    requestDate: '2026-09-01',
    leaveType: 'Vacation Leave',
    startDate: '2026-09-14',
    endDate: '2026-09-15',
    days: 2,
    status: 'Pending',
    payStatus: 'Paid',
    coverage: 'Justin Mar Tizon',
    reason: 'Long weekend in Baguio with family',
  },
  {
    id: 'PTO-2026-025',
    employeeId: 'emp-04', // Jlydie Bagasala
    requestDate: '2026-09-02',
    leaveType: 'Personal Leave',
    startDate: '2026-09-21',
    days: 1,
    status: 'Pending',
    payStatus: 'Paid',
    coverage: 'Mabel Rojas',
    reason: 'Passport renewal appointment',
  },
  {
    id: 'PTO-2026-026',
    employeeId: 'emp-06', // Veam Chavez
    requestDate: '2026-09-03',
    leaveType: 'Half Day Leave',
    startDate: '2026-09-11',
    durationType: 'Half Day (AM)',
    days: 0.5,
    status: 'Pending',
    payStatus: 'Paid',
    coverage: 'April Lopez',
    reason: 'Half Day AM — medical check-up',
  },
];

/** Expand a seed row into a full PTORequest, generating a plausible timeline. */
function hydrate(s: Seed): PTORequest {
  const timeline: PTORequest['timeline'] = [
    {
      id: `${s.id}-t1`,
      label: 'Submitted',
      at: `${s.requestDate}T09:12:00`,
      actor: 'Employee',
      note: 'Request filed through the PTO Tracker.',
    },
  ];

  if (s.status !== 'Pending') {
    timeline.push({
      id: `${s.id}-t2`,
      label: 'Reviewed',
      at: `${s.requestDate}T14:05:00`,
      actor: s.reviewer ?? 'Princes Aloha Gomez',
      note: 'Coverage and team availability checked.',
    });
    timeline.push({
      id: `${s.id}-t3`,
      label: s.status === 'Approved' ? 'Approved' : 'Rejected',
      at: `${s.requestDate}T14:22:00`,
      actor: s.reviewer ?? 'Princes Aloha Gomez',
      note: s.status === 'Rejected' ? s.rejectionReason : undefined,
    });
  }

  return {
    id: s.id,
    employeeId: s.employeeId,
    requestDate: s.requestDate,
    leaveType: s.leaveType,
    startDate: s.startDate,
    endDate: s.endDate ?? s.startDate,
    durationType: s.durationType ?? (s.days === 0.5 ? 'Half Day (AM)' : 'Full Day'),
    days: s.days,
    status: s.status,
    payStatus: s.payStatus,
    coverage: s.coverage,
    reason: s.reason,
    notes: `${s.leaveType} — ${s.reason}`,
    rejectionReason: s.rejectionReason,
    reviewedBy: s.status === 'Pending' ? undefined : (s.reviewer ?? 'Princes Aloha Gomez'),
    reviewedAt: s.status === 'Pending' ? undefined : `${s.requestDate}T14:22:00`,
    timeline,
  };
}

export const ptoRequests: PTORequest[] = seeds
  .map(hydrate)
  .sort((a, b) => b.requestDate.localeCompare(a.requestDate));
