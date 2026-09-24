/**
 * Row (snake_case, as returned by Supabase) <-> domain type (camelCase, as
 * defined in `@/types`) mapping, plus the approver-routing shape that
 * replaces the old `theme.ts` manager-email constants.
 */

import type { Department, Employee, PTORequest, UserAccount } from '@/types';
import { supabase } from './supabaseClient';

export interface ApproverRouting {
  jobTitleManagerEmail: Record<string, string>;
  departmentManagerEmail: Partial<Record<Department, string>>;
  willEmail: string;
  princesEmail: string;
}

export function mapEmployeeRow(row: Record<string, unknown>): Employee {
  return {
    id: row.id as string,
    sheetNo: row.sheet_no as number,
    name: row.name as string,
    email: row.email as string,
    jobTitle: row.job_title as string,
    department: row.department as Department,
    hireDate: row.hire_date as string,
    annualPtoAllowance: Number(row.annual_pto_allowance),
    ptoRegion: (row.pto_region as Employee['ptoRegion']) ?? 'PH',
    fixedPtoDays: row.fixed_pto_days == null ? undefined : Number(row.fixed_pto_days),
    eligibilityDateOverride: (row.eligibility_date_override as string) ?? undefined,
    appRole: row.app_role as Employee['appRole'],
    avatarUrl: (row.avatar_url as string) ?? undefined,
    active: row.active as boolean,
  };
}

export function mapAccountRow(row: Record<string, unknown>): UserAccount {
  return {
    id: row.id as string,
    email: row.email as string,
    fullName: row.full_name as string,
    appRole: row.app_role as UserAccount['appRole'],
    jobTitle: row.job_title as string,
    department: row.department as Department,
    hireDate: row.hire_date as string,
    annualPtoAllowance: Number(row.annual_pto_allowance),
    status: row.status as UserAccount['status'],
    createdAt: row.created_at as string,
    mustChangePassword: row.must_change_password as boolean,
    employeeId: (row.employee_id as string) ?? undefined,
  };
}

export function mapRequestRow(row: Record<string, unknown>): PTORequest {
  return {
    id: row.id as string,
    employeeId: row.employee_id as string,
    requestDate: row.request_date as string,
    leaveType: row.leave_type as PTORequest['leaveType'],
    startDate: row.start_date as string,
    endDate: row.end_date as string,
    durationType: row.duration_type as PTORequest['durationType'],
    startTime: (row.start_time as string) ?? undefined,
    endTime: (row.end_time as string) ?? undefined,
    totalHours: row.total_hours != null ? Number(row.total_hours) : undefined,
    days: Number(row.days),
    status: row.status as PTORequest['status'],
    payStatus: row.pay_status as PTORequest['payStatus'],
    coverage: row.coverage as string,
    reason: row.reason as string,
    notes: row.notes as string,
    rejectionReason: (row.rejection_reason as string) ?? undefined,
    approvalComment: (row.approval_comment as string) ?? undefined,
    reviewedBy: (row.reviewed_by as string) ?? undefined,
    reviewedAt: (row.reviewed_at as string) ?? undefined,
    cancelledAt: (row.cancelled_at as string) ?? undefined,
    timeline: (row.timeline as PTORequest['timeline']) ?? [],
  };
}

/** Loads the approver-routing config that used to be hardcoded in `lib/theme.ts`. */
export async function loadApproverRouting(): Promise<ApproverRouting> {
  const [{ data: routingRows, error: routingError }, { data: settingsRows, error: settingsError }] =
    await Promise.all([
      supabase.from('pto_approver_routing').select('match_type, match_value, approver_email'),
      supabase.from('pto_settings').select('key, value'),
    ]);
  if (routingError) throw routingError;
  if (settingsError) throw settingsError;

  const jobTitleManagerEmail: Record<string, string> = {};
  const departmentManagerEmail: Partial<Record<Department, string>> = {};
  for (const row of routingRows ?? []) {
    if (row.match_type === 'job_title') jobTitleManagerEmail[row.match_value] = row.approver_email;
    else departmentManagerEmail[row.match_value as Department] = row.approver_email;
  }

  const settings = new Map((settingsRows ?? []).map((r) => [r.key, r.value]));
  return {
    jobTitleManagerEmail,
    departmentManagerEmail,
    willEmail: settings.get('default_approver_1') ?? '',
    princesEmail: settings.get('default_approver_2') ?? '',
  };
}
