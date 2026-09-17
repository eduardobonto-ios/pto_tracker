/**
 * Thin wrappers around the Supabase RPC functions defined in
 * `supabase/schema.sql` — request lifecycle + email action tokens. Kept
 * separate from `AppContext` so the context stays focused on state.
 */

import { supabase } from './supabaseClient';
import { mapRequestRow } from './supabaseMappers';
import type { NotificationPayload } from './notifications';
import type { PTORequest } from '@/types';

export interface SubmitRequestInput {
  employeeId: string;
  leaveType: PTORequest['leaveType'];
  startDate: string;
  endDate: string;
  durationType: PTORequest['durationType'];
  days: number;
  payStatus: PTORequest['payStatus'];
  coverage: string;
  reason: string;
  startTime?: string;
  endTime?: string;
  totalHours?: number;
  status: PTORequest['status'];
}

export async function submitRequestRpc(input: SubmitRequestInput): Promise<PTORequest> {
  const { data, error } = await supabase.rpc('pto_submit_request', {
    p_employee_id: input.employeeId,
    p_leave_type: input.leaveType,
    p_start_date: input.startDate,
    p_end_date: input.endDate,
    p_duration_type: input.durationType,
    p_days: input.days,
    p_pay_status: input.payStatus,
    p_coverage: input.coverage,
    p_reason: input.reason,
    p_start_time: input.startTime ?? null,
    p_end_time: input.endTime ?? null,
    p_total_hours: input.totalHours ?? null,
    p_status: input.status,
  });
  if (error) throw error;
  return mapRequestRow(data[0]);
}

export async function approveRequestRpc(
  requestId: string,
  adminName: string,
  comment?: string,
): Promise<PTORequest | undefined> {
  const { data, error } = await supabase.rpc('pto_approve_request', {
    p_request_id: requestId,
    p_admin_name: adminName,
    p_comment: comment ?? null,
  });
  if (error) throw error;
  return data?.[0] ? mapRequestRow(data[0]) : undefined;
}

export async function rejectRequestRpc(
  requestId: string,
  adminName: string,
  rejectionReason: string,
): Promise<PTORequest | undefined> {
  const { data, error } = await supabase.rpc('pto_reject_request', {
    p_request_id: requestId,
    p_admin_name: adminName,
    p_rejection_reason: rejectionReason,
  });
  if (error) throw error;
  return data?.[0] ? mapRequestRow(data[0]) : undefined;
}

export async function cancelRequestRpc(
  requestId: string,
  actorName: string,
  reason?: string,
): Promise<PTORequest | undefined> {
  const { data, error } = await supabase.rpc('pto_cancel_request', {
    p_request_id: requestId,
    p_actor_name: actorName,
    p_reason: reason ?? null,
  });
  if (error) throw error;
  return data?.[0] ? mapRequestRow(data[0]) : undefined;
}

export async function mintActionToken(
  requestId: string,
  action: 'approve' | 'reject',
  approverEmail: string,
): Promise<string> {
  const { data, error } = await supabase.rpc('pto_mint_action_token', {
    p_request_id: requestId,
    p_action: action,
    p_approver_email: approverEmail,
  });
  if (error) throw error;
  return data as string;
}

export type TokenReason = 'ok' | 'not_found' | 'expired' | 'used' | 'already_handled';

export interface TokenResolution {
  valid: boolean;
  reason: TokenReason;
  action: 'approve' | 'reject' | null;
  requestId: string | null;
  employeeName: string | null;
  leaveType: string | null;
  startDate: string | null;
  endDate: string | null;
  days: number | null;
  status: PTORequest['status'] | null;
}

function mapTokenRow(row: Record<string, unknown>): TokenResolution {
  return {
    valid: row.valid as boolean,
    reason: row.reason as TokenReason,
    action: (row.action as TokenResolution['action']) ?? null,
    requestId: (row.request_id as string) ?? null,
    employeeName: (row.employee_name as string) ?? null,
    leaveType: (row.leave_type as string) ?? null,
    startDate: (row.start_date as string) ?? null,
    endDate: (row.end_date as string) ?? null,
    days: row.days != null ? Number(row.days) : null,
    status: (row.status as PTORequest['status']) ?? null,
  };
}

/** Read-only — safe to call as soon as the /respond page loads, before the visitor confirms anything. */
export async function resolveActionToken(token: string): Promise<TokenResolution> {
  const { data, error } = await supabase.rpc('pto_resolve_action_token', { p_token: token });
  if (error) throw error;
  return mapTokenRow(data[0]);
}

/** Burns the token and performs the approve/reject. Only call once the visitor confirms. */
export async function consumeActionToken(token: string, reason?: string): Promise<TokenResolution> {
  const { data, error } = await supabase.rpc('pto_consume_action_token', {
    p_token: token,
    p_reason: reason ?? null,
    p_actor_name: 'Email link',
  });
  if (error) throw error;
  return mapTokenRow(data[0]);
}

export interface LoginResult {
  accountId: string;
  employeeId: string;
  mustChangePassword: boolean;
}

/** Returns null for any invalid combination (wrong password, unknown/Revoked email, no credentials set) — never distinguishes which. */
export async function verifyLoginRpc(email: string, password: string): Promise<LoginResult | null> {
  const { data, error } = await supabase.rpc('pto_verify_login', { p_email: email, p_password: password });
  if (error) throw error;
  const row = data?.[0];
  if (!row) return null;
  return { accountId: row.account_id, employeeId: row.employee_id, mustChangePassword: row.must_change_password };
}

/** Admin-initiated (create account / reset password) — sets a password directly, no current-password check. */
export async function setPasswordRpc(
  accountId: string,
  newPassword: string,
  forceChange = true,
): Promise<void> {
  const { error } = await supabase.rpc('pto_set_password', {
    p_account_id: accountId,
    p_new_password: newPassword,
    p_force_change: forceChange,
  });
  if (error) throw error;
}

/** Self-service change (first-login screen) — verifies the current password first. Returns false if it doesn't match. */
export async function changePasswordRpc(
  accountId: string,
  currentPassword: string,
  newPassword: string,
): Promise<boolean> {
  const { data, error } = await supabase.rpc('pto_change_password', {
    p_account_id: accountId,
    p_current_password: currentPassword,
    p_new_password: newPassword,
  });
  if (error) throw error;
  return data as boolean;
}

/** Fire-and-forget audit log entry — mirrors what `sendNotification` already sent. */
export function logNotification(payload: NotificationPayload) {
  void supabase
    .from('pto_notifications')
    .insert({
      id: payload.id,
      kind: payload.kind,
      request_id: payload.requestId,
      to_emails: payload.to,
      cc_emails: payload.cc,
      subject: payload.subject,
      sent_at: payload.sentAt,
      data: payload.data,
    })
    .then(({ error }) => {
      if (error) {
        // eslint-disable-next-line no-console
        console.error('[PTO Tracker] failed to log notification to pto_notifications:', error);
      }
    });
}
