// tests/unit/sla-engine.test.mjs
// Unit tests for 1Line OS SLA and Escalation Engine
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  BUSINESS_HOURS,
  ESCALATION_TIERS,
  getCairoDateParts,
  isWithinBusinessHours,
  calculateBusinessHoursDeadline,
  calculateSlaStatus,
  evaluateTaskEscalation,
  formatSlaCountdown
} from '../../src/services/slaEngine.js';

test('sla-engine: getCairoDateParts parses Cairo local time accurately', () => {
  // 12:00 UTC = 14:00 or 15:00 Cairo
  const testDate = new Date('2026-10-15T12:00:00Z');
  const parts = getCairoDateParts(testDate);
  assert.ok(parts.hour >= 0 && parts.hour <= 23);
  assert.equal(typeof parts.isWithinBusinessHours, 'boolean');
});

test('sla-engine: calculateBusinessHoursDeadline computes 15-min SLA within business hours', () => {
  // 11:00 AM Cairo time
  // Using an ISO string that corresponds to 09:00 UTC (11:00 Cairo UTC+2)
  const morningDate = new Date('2026-10-15T09:00:00Z');
  const deadline = calculateBusinessHoursDeadline(morningDate, 15);
  const diffMins = Math.round((deadline.getTime() - morningDate.getTime()) / (60 * 1000));
  assert.equal(diffMins, 15);
});

test('sla-engine: calculateBusinessHoursDeadline freezes overnight when submitted after 9 PM', () => {
  // 10:00 PM Cairo (20:00 UTC on winter time)
  const nightDate = new Date('2026-10-15T20:00:00Z');
  const deadline = calculateBusinessHoursDeadline(nightDate, 15);
  const deadlineParts = getCairoDateParts(deadline);

  // Must be due at 9:15 AM the next day
  assert.equal(deadlineParts.hour, 9);
  assert.equal(deadlineParts.minute, 15);
});

test('sla-engine: calculateBusinessHoursDeadline splits time across closing boundary (e.g. 8:55 PM)', () => {
  // 8:55 PM Cairo (17:55 UTC on Cairo UTC+3 DST)
  const lateEvening = new Date('2026-10-15T17:55:00Z');
  const deadline = calculateBusinessHoursDeadline(lateEvening, 15);
  const deadlineParts = getCairoDateParts(deadline);

  // 5 mins consumed today (until 9:00 PM), remaining 10 mins resume at 9:00 AM tomorrow -> 9:10 AM
  assert.equal(deadlineParts.hour, 9);
  assert.equal(deadlineParts.minute, 10);
});

test('sla-engine: calculateSlaStatus accurately determines normal, warning, and breached tiers', () => {
  const createdAt = new Date('2026-10-15T10:00:00Z');

  // Case A: Normal (3 minutes elapsed of a 15-minute SLA = 20%)
  const nowNormal = new Date('2026-10-15T10:03:00Z');
  const statusNormal = calculateSlaStatus(createdAt, 0.25, { now: nowNormal, isBusinessHoursOnly: false });
  assert.equal(statusNormal.tier, ESCALATION_TIERS.TIER_0_NORMAL);
  assert.equal(statusNormal.isOverdue, false);

  // Case B: Warning (12 minutes elapsed of 15 minutes = 80%)
  const nowWarning = new Date('2026-10-15T10:12:00Z');
  const statusWarning = calculateSlaStatus(createdAt, 0.25, { now: nowWarning, isBusinessHoursOnly: false });
  assert.equal(statusWarning.tier, ESCALATION_TIERS.TIER_1_WARNING);
  assert.equal(statusWarning.isOverdue, false);

  // Case C: Breached (18 minutes elapsed = overdue)
  const nowBreached = new Date('2026-10-15T10:18:00Z');
  const statusBreached = calculateSlaStatus(createdAt, 0.25, { now: nowBreached, isBusinessHoursOnly: false });
  assert.equal(statusBreached.tier, ESCALATION_TIERS.TIER_2_BREACHED);
  assert.equal(statusBreached.isOverdue, true);
  assert.equal(statusBreached.overdueDurationMs, 3 * 60 * 1000);
});

test('sla-engine: evaluateTaskEscalation escalates breached tasks to Operations Manager and Founder', () => {
  const task1 = {
    id: 't-1',
    handoffNumber: 1, // Task 1: Ops -> Sales
    createdAt: new Date('2026-10-15T10:00:00Z').toISOString(),
    assignee: 'مستشار المبيعات'
  };

  // Normal evaluation
  const escNormal = evaluateTaskEscalation(task1, {}, {
    now: new Date('2026-10-15T10:05:00Z')
  });
  assert.equal(escNormal.escalationTier, ESCALATION_TIERS.TIER_0_NORMAL);
  assert.equal(escNormal.isBreached, false);

  // Overdue evaluation: Escalate to Operations Manager
  const escBreached = evaluateTaskEscalation(task1, {}, {
    now: new Date('2026-10-15T10:25:00Z') // 10 mins overdue
  });
  assert.equal(escBreached.escalationTier, ESCALATION_TIERS.TIER_2_BREACHED);
  assert.equal(escBreached.isBreached, true);
  assert.equal(escBreached.targetDepartment, 'operations_manager');

  // Critical Overdue / High-Value Deal (>= 5M) -> Direct Founder Escalation
  const highValueLead = { expectedValue: 6000000 };
  const escHighValue = evaluateTaskEscalation(task1, highValueLead, {
    now: new Date('2026-10-15T10:25:00Z')
  });
  assert.equal(escHighValue.escalationTier, ESCALATION_TIERS.TIER_3_CRITICAL);
  assert.equal(escHighValue.targetDepartment, 'founder');
  assert.ok(escHighValue.supervisorTitle.includes('محمود الباز'));
});

test('sla-engine: formatSlaCountdown produces bilingual badges for normal, warning, and breached states', () => {
  const mockNormal = {
    isOverdue: false,
    timeRemainingMs: 8 * 60 * 1000,
    tier: ESCALATION_TIERS.TIER_0_NORMAL
  };
  const badgeAr = formatSlaCountdown(mockNormal, 'ar');
  assert.ok(badgeAr.text.includes('8 دقيقة'));
  assert.equal(badgeAr.color, 'var(--crm-positive)');

  const mockWarning = {
    isOverdue: false,
    timeRemainingMs: 3 * 60 * 1000,
    tier: ESCALATION_TIERS.TIER_1_WARNING
  };
  const badgeWarn = formatSlaCountdown(mockWarning, 'ar');
  assert.ok(badgeWarn.text.includes('تنبيه'));
  assert.equal(badgeWarn.color, 'var(--crm-warn)');

  const mockBreached = {
    isOverdue: true,
    overdueDurationMs: 15 * 60 * 1000,
    tier: ESCALATION_TIERS.TIER_2_BREACHED
  };
  const badgeBreached = formatSlaCountdown(mockBreached, 'ar');
  assert.ok(badgeBreached.text.includes('تجاوز'));
  assert.equal(badgeBreached.color, 'var(--crm-danger)');
});
