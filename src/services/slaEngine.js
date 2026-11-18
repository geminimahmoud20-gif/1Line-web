// src/services/slaEngine.js
// 1Line OS SLA & Escalation Engine (نظام المهام ومصفوفة التصعيد الزمني)
// Implements 1Line Official Company Playbook rules:
// - Business Hours: 9:00 AM to 9:00 PM Cairo Time (Africa/Cairo)
// - First Response SLA: 15 minutes during business hours; overnight inquiries freeze until 9:00 AM next morning
// - Table 1-10 Inter-Departmental Task SLAs and 4-Tier Escalation Matrix:
//   Tier 0 (Normal < 75%) -> Tier 1 (Warning 75-100%) -> Tier 2 (Breached > 100% Manager) -> Tier 3 (Critical / Founder)

import { HANDOFF_DEFINITIONS } from '../models/schema.js';
import { HIGH_VALUE_DEAL_THRESHOLD } from './stateMachineEngine.js';

export const BUSINESS_HOURS = {
  startHour: 9, // 9:00 AM
  endHour: 21, // 9:00 PM
  timeZone: 'Africa/Cairo'
};

export const ESCALATION_TIERS = {
  TIER_0_NORMAL: 'normal',
  TIER_1_WARNING: 'warning',
  TIER_2_BREACHED: 'breached',
  TIER_3_CRITICAL: 'critical'
};

/**
 * Extracts Cairo local time parts (hour, minute, day, month, year) from a Date or ISO string.
 */
export function getCairoDateParts(dateInput = new Date()) {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: BUSINESS_HOURS.timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false
  });

  const parts = formatter.formatToParts(d);
  const map = {};
  for (const part of parts) {
    if (part.type !== 'literal') {
      map[part.type] = parseInt(part.value, 10);
    }
  }

  // Handle midnight 24 vs 0
  if (map.hour === 24) map.hour = 0;

  return {
    year: map.year,
    month: map.month,
    day: map.day,
    hour: map.hour,
    minute: map.minute,
    second: map.second,
    isWithinBusinessHours: map.hour >= BUSINESS_HOURS.startHour && map.hour < BUSINESS_HOURS.endHour
  };
}

/**
 * Checks whether a given timestamp is currently within business hours (9am - 9pm Cairo).
 */
export function isWithinBusinessHours(dateInput = new Date()) {
  return getCairoDateParts(dateInput).isWithinBusinessHours;
}

/**
 * Calculates deadline for business-hours tasks (e.g. 15-minute First Response SLA).
 * If submitted during off-hours, timer begins at 9:00 AM on the next business morning.
 * If submitted late in the day (e.g. 8:55 PM for a 15-min SLA), 5 minutes elapse today,
 * and the remaining 10 minutes resume at 9:00 AM the following morning.
 */
export function calculateBusinessHoursDeadline(startDateInput, durationMinutes) {
  const startDate = typeof startDateInput === 'string' ? new Date(startDateInput) : new Date(startDateInput.getTime());
  let remainingMinutes = durationMinutes;
  let cursor = new Date(startDate.getTime());

  while (remainingMinutes > 0) {
    const parts = getCairoDateParts(cursor);

    if (parts.hour < BUSINESS_HOURS.startHour) {
      // Before 9:00 AM today -> fast forward to 9:00 AM today
      const minutesTo9AM = (BUSINESS_HOURS.startHour - parts.hour) * 60 - parts.minute;
      cursor = new Date(cursor.getTime() + minutesTo9AM * 60 * 1000);
      continue;
    }

    if (parts.hour >= BUSINESS_HOURS.endHour) {
      // After 9:00 PM today -> fast forward to 9:00 AM tomorrow
      const minutesToMidnight = (24 - parts.hour) * 60 - parts.minute;
      const minutesTomorrow9AM = minutesToMidnight + (BUSINESS_HOURS.startHour * 60);
      cursor = new Date(cursor.getTime() + minutesTomorrow9AM * 60 * 1000);
      continue;
    }

    // Inside business hours: calculate minutes left until 9:00 PM today
    const minutesLeftToday = (BUSINESS_HOURS.endHour - parts.hour) * 60 - parts.minute;

    if (remainingMinutes <= minutesLeftToday) {
      // Task finishes before closing today
      cursor = new Date(cursor.getTime() + remainingMinutes * 60 * 1000);
      remainingMinutes = 0;
    } else {
      // Consumes rest of today and carries over to tomorrow 9:00 AM
      remainingMinutes -= minutesLeftToday;
      cursor = new Date(cursor.getTime() + minutesLeftToday * 60 * 1000);
    }
  }

  return cursor;
}

/**
 * Evaluates SLA Status and Countdown for any task or lead inquiry.
 */
export function calculateSlaStatus(createdAtInput, slaHours, options = {}) {
  const createdAt = typeof createdAtInput === 'string' ? new Date(createdAtInput) : createdAtInput;
  const now = options.now ? (typeof options.now === 'string' ? new Date(options.now) : options.now) : new Date();
  const isBusinessHoursOnly = options.isBusinessHoursOnly ?? (slaHours <= 2); // SLAs <= 2 hours (e.g. 15 mins, 2 hours) follow business hours

  let dueAt;
  if (isBusinessHoursOnly) {
    const durationMinutes = Math.round(slaHours * 60);
    dueAt = calculateBusinessHoursDeadline(createdAt, durationMinutes);
  } else {
    dueAt = new Date(createdAt.getTime() + slaHours * 60 * 60 * 1000);
  }

  const totalDurationMs = Math.max(1, dueAt.getTime() - createdAt.getTime());
  const elapsedMs = Math.max(0, now.getTime() - createdAt.getTime());
  const timeRemainingMs = dueAt.getTime() - now.getTime();
  const isOverdue = timeRemainingMs <= 0;
  const overdueDurationMs = isOverdue ? Math.abs(timeRemainingMs) : 0;

  const percentageElapsed = Math.min(100, Math.round((elapsedMs / totalDurationMs) * 100));

  // Determine Urgency & Escalation Tier
  let tier = ESCALATION_TIERS.TIER_0_NORMAL;
  if (isOverdue) {
    if (overdueDurationMs > 2 * 60 * 60 * 1000 || options.isHighValue) {
      tier = ESCALATION_TIERS.TIER_3_CRITICAL;
    } else {
      tier = ESCALATION_TIERS.TIER_2_BREACHED;
    }
  } else if (percentageElapsed >= 75) {
    tier = ESCALATION_TIERS.TIER_1_WARNING;
  }

  const isFrozenOvernight = isBusinessHoursOnly && !isWithinBusinessHours(now) && !isOverdue;

  return {
    createdAt: createdAt.toISOString(),
    dueAt: dueAt.toISOString(),
    now: now.toISOString(),
    slaHours,
    isBusinessHoursOnly,
    isOverdue,
    isFrozenOvernight,
    timeRemainingMs,
    overdueDurationMs,
    elapsedMs,
    percentageElapsed,
    tier
  };
}

/**
 * Escalation Matrix Evaluator (Table 1-10)
 * Evaluates which role/person the task is currently escalated to.
 */
export function evaluateTaskEscalation(task, lead = {}, options = {}) {
  const handoffNumber = task.handoffNumber || 1;
  const def = HANDOFF_DEFINITIONS[handoffNumber] || {
    from: 'ops',
    to: 'sales',
    name: 'مهمة مجهولة',
    slaHours: 24
  };

  const slaHours = task.slaHours || def.slaHours;
  const isHighValue = (lead?.expectedValue || lead?.buyerProfile?.budgetMax || lead?.details?.budget || 0) >= HIGH_VALUE_DEAL_THRESHOLD;

  const slaStatus = calculateSlaStatus(task.createdAt || new Date(), slaHours, {
    now: options.now,
    isHighValue,
    isBusinessHoursOnly: slaHours <= 2
  });

  let assignedRole = def.to;
  let escalationAction = 'on_track';
  let targetDepartment = def.to;
  let supervisorTitle = null;

  switch (slaStatus.tier) {
    case ESCALATION_TIERS.TIER_0_NORMAL:
      escalationAction = 'follow_up_normal';
      supervisorTitle = 'مسؤول التنفيذ المباشر';
      break;

    case ESCALATION_TIERS.TIER_1_WARNING:
      escalationAction = 'supervisor_warning';
      supervisorTitle = 'رئيس الفريق / Desk Leader';
      break;

    case ESCALATION_TIERS.TIER_2_BREACHED:
      escalationAction = 'manager_reassign_alert';
      targetDepartment = 'operations_manager';
      supervisorTitle = 'مدير العمليات والمبيعات (تجاوز مهلة الـ SLA)';
      break;

    case ESCALATION_TIERS.TIER_3_CRITICAL:
      escalationAction = 'founder_escalation';
      targetDepartment = 'founder';
      assignedRole = 'super_admin';
      supervisorTitle = 'د. محمود الباز (تصعيد مباشر للمؤسس)';
      break;
  }

  // If task is specifically Task 5, 7, or 8, Founder is already the primary owner
  if ([5, 6, 7, 8].includes(handoffNumber)) {
    supervisorTitle = 'د. محمود الباز (اعتماد المؤسس)';
  }

  return {
    taskId: task.id || `task-${handoffNumber}`,
    handoffNumber,
    taskName: def.name,
    fromDept: def.from,
    toDept: def.to,
    currentAssignee: task.assignee,
    isHighValue,
    slaStatus,
    escalationTier: slaStatus.tier,
    targetDepartment,
    assignedRole,
    supervisorTitle,
    escalationAction,
    isBreached: slaStatus.isOverdue
  };
}

/**
 * Formats SLA Countdown for UI Badges (Arabic and English)
 */
export function formatSlaCountdown(slaStatus, lang = 'ar') {
  const isAr = lang === 'ar';

  if (slaStatus.isFrozenOvernight) {
    return {
      text: isAr ? '❄️ مجمد خارج ساعات العمل (يبدأ 9 ص)' : '❄️ Frozen Off-Hours (Resumes 9 AM)',
      color: 'var(--crm-info)',
      bg: 'var(--crm-info-soft)',
      badgeClass: 'badge-frozen'
    };
  }

  if (slaStatus.isOverdue) {
    const overdueMins = Math.round(slaStatus.overdueDurationMs / (60 * 1000));
    const hours = Math.floor(overdueMins / 60);
    const mins = overdueMins % 60;
    const durationText = hours > 0
      ? (isAr ? `${hours} س و ${mins} د` : `${hours}h ${mins}m`)
      : (isAr ? `${mins} دقيقة` : `${mins} mins`);

    return {
      text: isAr ? `⚠️ تجاوز المهلة بـ ${durationText}` : `⚠️ SLA Breached by ${durationText}`,
      color: 'var(--crm-danger)',
      bg: 'var(--crm-danger-soft)',
      badgeClass: 'badge-breached'
    };
  }

  const remMins = Math.round(slaStatus.timeRemainingMs / (60 * 1000));
  const hours = Math.floor(remMins / 60);
  const mins = remMins % 60;
  const durationText = hours > 0
    ? (isAr ? `${hours} س و ${mins} د` : `${hours}h ${mins}m`)
    : (isAr ? `${mins} دقيقة` : `${mins}m`);

  if (slaStatus.tier === ESCALATION_TIERS.TIER_1_WARNING) {
    return {
      text: isAr ? `⏳ تنبيه: متبقي ${durationText}` : `⏳ Warning: ${durationText} left`,
      color: 'var(--crm-warn)',
      bg: 'var(--crm-warn-soft)',
      badgeClass: 'badge-warning'
    };
  }

  return {
    text: isAr ? `⏱️ متبقي ${durationText}` : `⏱️ ${durationText} left`,
    color: 'var(--crm-positive)',
    bg: 'var(--crm-positive-soft)',
    badgeClass: 'badge-normal'
  };
}
