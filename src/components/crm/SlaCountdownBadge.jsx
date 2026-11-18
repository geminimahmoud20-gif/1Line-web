// src/components/crm/SlaCountdownBadge.jsx
// 1Line OS Luxury SLA Countdown Badge with Live Timer & Departmental Escalation Indicator
import { useState, useEffect } from 'react';
import { Clock, AlertTriangle, ShieldAlert } from 'lucide-react';
import { calculateSlaStatus, formatSlaCountdown, evaluateTaskEscalation, ESCALATION_TIERS } from '../../services/slaEngine';

export default function SlaCountdownBadge({
  createdAt,
  slaHours = 0.25,
  task = null,
  lead = {},
  isBusinessHoursOnly = true,
  isAr = true,
  showIcon = true,
  size = 'md'
}) {
  const [slaStatus, setSlaStatus] = useState(() =>
    calculateSlaStatus(createdAt || new Date(), slaHours, { isBusinessHoursOnly })
  );

  useEffect(() => {
    // Live tick every 30 seconds
    const interval = setInterval(() => {
      setSlaStatus(calculateSlaStatus(createdAt || new Date(), slaHours, { isBusinessHoursOnly }));
    }, 30000);

    return () => clearInterval(interval);
  }, [createdAt, slaHours, isBusinessHoursOnly]);

  const badgeFormat = formatSlaCountdown(slaStatus, isAr ? 'ar' : 'en');
  const escalation = task ? evaluateTaskEscalation(task, lead) : null;

  const fontSizes = {
    sm: 'var(--crm-text-xs, 0.72rem)',
    md: 'var(--crm-text-xs, 0.78rem)',
    lg: 'var(--crm-text-sm, 0.85rem)'
  };

  const paddings = {
    sm: '2px 7px',
    md: '4px 10px',
    lg: '6px 12px'
  };

  return (
    <div
      title={escalation ? `${isAr ? 'حالة التصعيد:' : 'Escalation:'} ${escalation.supervisorTitle}` : ''}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: paddings[size] || paddings.md,
        borderRadius: '8px',
        background: badgeFormat.bg,
        border: `1px solid ${badgeFormat.color}`,
        color: badgeFormat.color,
        fontSize: fontSizes[size] || fontSizes.md,
        fontWeight: 700,
        boxShadow: slaStatus.tier === ESCALATION_TIERS.TIER_3_CRITICAL ? '0 0 10px rgba(239, 68, 68, 0.3)' : 'none',
        transition: 'all 0.2s ease',
        cursor: 'default'
      }}
    >
      {showIcon && (
        slaStatus.tier === ESCALATION_TIERS.TIER_3_CRITICAL ? (
          <ShieldAlert size={13} style={{ flexShrink: 0 }} />
        ) : slaStatus.tier === ESCALATION_TIERS.TIER_2_BREACHED ? (
          <AlertTriangle size={13} style={{ flexShrink: 0 }} />
        ) : (
          <Clock size={13} style={{ flexShrink: 0 }} />
        )
      )}

      <span>{badgeFormat.text}</span>

      {escalation && escalation.isBreached && (
        <span
          style={{
            fontSize: 'var(--crm-text-xs)',
            opacity: 0.85,
            borderRight: isAr ? '1px solid currentColor' : 'none',
            borderLeft: !isAr ? '1px solid currentColor' : 'none',
            paddingRight: isAr ? '5px' : 0,
            paddingLeft: !isAr ? '5px' : 0,
            fontWeight: 800
          }}
        >
          {escalation.targetDepartment === 'founder'
            ? (isAr ? 'المؤسس' : 'Founder')
            : (isAr ? 'مدير العمليات' : 'Manager')}
        </span>
      )}
    </div>
  );
}
