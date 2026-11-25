import { useId, useState, useMemo } from 'react';
import { Modal, Button, Input, Badge } from '../ui';
import { buildTask, dayKeyFrom, KINDS, dueFromPreset } from '../../utils/tasks';
import { suggestNextStep, composeDue } from '../../utils/nextStep';
import { isSellerLead, localDayKey, lostReasonsFor } from '../../utils/crmLeadViews';
import { boardStagesFor } from '../../utils/leadPipeline';
import { addTask } from '../../firebaseLazy';
import { MessageSquare, Phone, Calendar, Building, FileText } from 'lucide-react';

const CONTACT_CHANNELS = [
  { id: 'whatsapp', label_ar: 'واتساب', label_en: 'WhatsApp', icon: <MessageSquare size={14} /> },
  { id: 'call', label_ar: 'اتصال هاتف', label_en: 'Phone Call', icon: <Phone size={14} /> },
  { id: 'visit', label_ar: 'معاينة ميدانية', label_en: 'Viewing', icon: <Calendar size={14} /> },
  { id: 'meeting', label_ar: 'اجتماع في المكتب', label_en: 'Office Meeting', icon: <Building size={14} /> },
  { id: 'note', label_ar: 'ملاحظة داخلية', label_en: 'Internal Note', icon: <FileText size={14} /> }
];

const STAGE_ORDER = ['new', 'contacted', 'site_visit', 'negotiating', 'closed'];

export default function NextStepSheet({
  lead,
  outcomeId,
  initialChannel = 'whatsapp',
  targetStage: propTargetStage,
  stages = [],
  me,
  isAr = true,
  onSaved,
  onStageOnly,
  onSkip,
  onClose
}) {
  const formId = useId();
  const isSeller = isSellerLead(lead || {}) || lead?.type === 'seller';
  const currentStageId = lead?.status || 'new';

  const stagesList = useMemo(() => {
    if (stages && stages.length > 0) return stages;
    return boardStagesFor(lead || {});
  }, [stages, lead]);

  // Determine default target stage
  const currentIdx = STAGE_ORDER.indexOf(currentStageId);
  const defaultNextStage = propTargetStage || (currentIdx >= 0 && currentIdx < STAGE_ORDER.length - 1 ? STAGE_ORDER[currentIdx + 1] : currentStageId);

  const [selectedStage, setSelectedStage] = useState(defaultNextStage);
  const [channel, setChannel] = useState(initialChannel || 'whatsapp');
  const [contactNote, setContactNote] = useState('');

  // Lost deal state
  const [lostReason, setLostReason] = useState('price');
  const [lostNote, setLostNote] = useState('');
  const [scheduleTaskForLost, setScheduleTaskForLost] = useState(false);

  const [s] = useState(() => suggestNextStep(outcomeId, Date.now(), isSeller));
  
  // Smart default task title based on lead name and stage
  const defaultTitle = useMemo(() => {
    const firstName = String(lead?.name || '').split(' ').slice(0, 2).join(' ') || (isAr ? 'العميل' : 'Client');
    if (s?.title) return s.title;
    if (selectedStage === 'site_visit') return isAr ? `معاينة ميدانية للعقار مع ${firstName}` : `Viewing with ${firstName}`;
    if (selectedStage === 'negotiating') return isAr ? `جلسة تفاوض وعروض مع ${firstName}` : `Negotiation with ${firstName}`;
    if (selectedStage === 'closed') return isAr ? `إجراءات حجز وتعاقد ${firstName}` : `Closing for ${firstName}`;
    if (selectedStage === 'inactive') return isAr ? `متابعة وإعادة تنشيط: ${firstName}` : `Re-activate ${firstName}`;
    if (selectedStage === 'lost') return isAr ? `سجل خسارة صفقة ${firstName}` : `Lost record for ${firstName}`;
    return isAr ? `متابعة مع ${firstName}` : `Follow up with ${firstName}`;
  }, [s?.title, selectedStage, lead?.name, isAr]);

  const [title, setTitle] = useState(defaultTitle);
  const [kind, setKind] = useState(s?.kind || (selectedStage === 'site_visit' ? 'visit' : 'call'));
  const [priority] = useState(s?.priority || 'normal');
  const [day, setDay] = useState(s?.day || dueFromPreset('tomorrow'));
  const [time, setTime] = useState(s?.time || '11:00');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleClose = () => {
    if (onClose) onClose();
    else if (onSkip) onSkip();
  };

  const handlePresetDay = (presetId) => {
    if (presetId === 'month') {
      setDay(dayKeyFrom(Date.now(), 30));
    } else if (presetId === '2w') {
      setDay(dayKeyFrom(Date.now(), 14));
    } else {
      setDay(dueFromPreset(presetId));
    }
  };

  const handleStageSelect = (stId) => {
    setSelectedStage(stId);
    setError('');
    const firstName = String(lead?.name || '').split(' ').slice(0, 2).join(' ') || (isAr ? 'العميل' : 'Client');
    if (stId === 'site_visit') {
      setKind('visit');
      setTitle(isAr ? `معاينة ميدانية للعقار مع ${firstName}` : `Viewing with ${firstName}`);
    } else if (stId === 'negotiating') {
      setTitle(isAr ? `جلسة تفاوض وعروض مع ${firstName}` : `Negotiation with ${firstName}`);
    } else if (stId === 'inactive') {
      setTitle(isAr ? `متابعة وإعادة تنشيط: ${firstName}` : `Re-activate ${firstName}`);
      setDay(dayKeyFrom(undefined, 14));
    } else if (stId === 'closed') {
      setTitle(isAr ? `متابعة ما بعد التعاقد: ${firstName}` : `Post-closing follow up: ${firstName}`);
    }
  };

  const handleKindSelect = (kId) => {
    setKind(kId);
    const firstName = String(lead?.name || '').split(' ').slice(0, 2).join(' ') || (isAr ? 'العميل' : 'Client');
    if (kId === 'meeting') {
      setTitle(isAr ? `اجتماع في مقر الشركة مع ${firstName}` : `Office meeting with ${firstName}`);
    } else if (kId === 'visit') {
      setTitle(isAr ? `معاينة ميدانية للعقار مع ${firstName}` : `Viewing with ${firstName}`);
    } else if (kId === 'call') {
      setTitle(isAr ? `مكالمة متابعة مع ${firstName}` : `Follow up call with ${firstName}`);
    } else if (kId === 'whatsapp') {
      setTitle(isAr ? `إرسال عروض وتفاصيل بالواتساب لـ ${firstName}` : `WhatsApp follow up with ${firstName}`);
    }
  };

  const dueAt = composeDue(day, time, { needsTime: kind === 'visit' || kind === 'meeting' });

  // 1. Save Task AND update stage
  const save = async (e) => {
    e?.preventDefault();

    if (selectedStage === 'lost' && !lostReason) {
      setError(isAr ? 'يرجى تحديد سبب خسارة الصفقة' : 'Please select a reason for the lost deal');
      return;
    }

    let task = null;
    const shouldCreateTask = selectedStage !== 'lost' || scheduleTaskForLost;

    if (shouldCreateTask) {
      const selectedDayKey = day ? localDayKey(day) : '';
      const todayKey = localDayKey();
      if (selectedDayKey && selectedDayKey < todayKey) {
        setError(isAr ? 'تاريخ المهمة يجب أن يكون اليوم أو تاريخاً لاحقاً' : 'Task date must be today or later');
        return;
      }
      task = buildTask({ title: title || defaultTitle, dueAt, priority, kind, lead: { id: lead.id, name: lead.name }, me });
    }

    setBusy(true);

    try {
      if (task) {
        await addTask(task);
      }
      onSaved?.(task, {
        newStage: selectedStage,
        note: contactNote.trim(),
        channel,
        lostReason: selectedStage === 'lost' ? lostReason : undefined,
        lostNote: selectedStage === 'lost' ? lostNote.trim() : undefined
      });
    } catch {
      setError(isAr ? 'تعذر حفظ البيانات، جرّب مرة أخرى' : 'Failed to save');
      setBusy(false);
    }
  };

  // 2. Update stage only without task
  const handleStageOnly = () => {
    if (selectedStage === 'lost' && !lostReason) {
      setError(isAr ? 'يرجى تحديد سبب خسارة الصفقة' : 'Please select a reason for the lost deal');
      return;
    }
    setBusy(true);
    onStageOnly?.(selectedStage, {
      note: contactNote.trim(),
      channel,
      lostReason: selectedStage === 'lost' ? lostReason : undefined,
      lostNote: selectedStage === 'lost' ? lostNote.trim() : undefined
    });
  };

  const targetStageObj = stagesList.find((s) => s.id === selectedStage);
  const targetStageLabel = targetStageObj ? (isAr ? targetStageObj.label_ar : targetStageObj.label_en) : selectedStage;

  const isLostStage = selectedStage === 'lost';
  const isInactiveStage = selectedStage === 'inactive';
  const isClosedStage = selectedStage === 'closed';

  const actionEmoji = isLostStage ? '' : (isInactiveStage ? '⏸️' : (isClosedStage ? '🏆' : '🚀'));

  return (
    <Modal
      open
      dismissible
      onClose={handleClose}
      closeLabel={isAr ? 'إغلاق' : 'Close'}
      size="lg"
      title={isAr ? 'تسجيل تواصل وتحديث مسار العميل' : 'Log Contact & Update Stage'}
      description={lead?.name ? `${isAr ? 'للعميل: ' : 'For: '}${lead.name}` : ''}
      footer={(
        <div style={{
          display: 'flex',
          gap: '12px',
          width: '100%',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap-reverse'
        }}>
          <Button variant="ghost" type="button" onClick={handleClose} disabled={busy} style={{ whiteSpace: 'nowrap' }}>
            {isAr ? 'إلغاء' : 'Cancel'}
          </Button>
          <div style={{
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
            flexWrap: 'wrap',
            justifyContent: 'flex-end',
            maxWidth: '100%',
            flex: 1
          }}>
            {!isLostStage && (
              <Button
                variant="secondary"
                type="button"
                onClick={handleStageOnly}
                disabled={busy}
                style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
              >
                {isAr ? 'نقل المرحلة فقط' : 'Stage only'}
              </Button>
            )}
            <Button
              variant={isLostStage ? 'danger' : 'primary'}
              type="submit"
              form={formId}
              disabled={busy}
              style={{ minWidth: 0, maxWidth: '100%' }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {isLostStage
                  ? (isAr ? 'تأكيد تسجيل الخسارة والأرشفة ✖' : 'Confirm Deal Loss & Archive')
                  : (isAr ? `حفظ الخطوة ونقل إلى "${targetStageLabel}" ${actionEmoji}` : `Save & Move to "${targetStageLabel}" ${actionEmoji}`)}
              </span>
            </Button>
          </div>
        </div>
      )}
    >
      <form id={formId} onSubmit={save} className="crm-nextstep" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        
        {/* Section 1: What was done in contact */}
        <div style={{ background: 'var(--ui-surface-2)', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--ui-line)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: 'var(--crm-text-xs)', fontWeight: 700, color: 'var(--ui-primary)' }}>
              📞 {isAr ? 'أولاً: إيه اللي تم في التواصل؟' : '1. Contact Activity:'}
            </span>
            <span style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--ui-text-3)' }}>
              {isAr ? '(الملاحظة اختيارية)' : '(Optional note)'}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
            {CONTACT_CHANNELS.map((ch) => (
              <button
                type="button"
                key={ch.id}
                onClick={() => setChannel(ch.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '5px 10px',
                  borderRadius: '6px',
                  border: channel === ch.id ? '1px solid var(--ui-primary)' : '1px solid var(--ui-line)',
                  background: channel === ch.id ? 'var(--ui-primary)' : 'var(--ui-surface)',
                  color: channel === ch.id ? 'var(--ui-on-primary)' : 'var(--ui-text-2)',
                  fontSize: 'var(--crm-text-xs)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                {ch.icon}
                <span>{isAr ? ch.label_ar : ch.label_en}</span>
              </button>
            ))}
          </div>

          <textarea
            value={contactNote}
            onChange={(e) => setContactNote(e.target.value)}
            placeholder={isAr ? 'اكتب ملاحظة مختصرة عما تم في التواصل (اختياري)...' : 'Write what happened (optional)...'}
            rows={2}
            style={{
              width: '100%',
              padding: '7px 10px',
              borderRadius: '6px',
              border: '1px solid var(--ui-line)',
              fontSize: 'var(--crm-text-xs)',
              fontFamily: 'inherit',
              resize: 'vertical',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Section 2: Target Deal Stage Selector */}
        <div style={{ background: 'var(--ui-surface)', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--ui-line)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: 'var(--crm-text-xs)', fontWeight: 700, color: 'var(--ui-primary)' }}>
              🎯 {isAr ? 'ثانياً: نقل العميل لمرحلة جديدة (للأمام أو للخلف):' : '2. Move to Stage (Forward or Backward):'}
            </span>
            <Badge tone={isLostStage ? 'danger' : (isInactiveStage ? 'neutral' : (isClosedStage ? 'success' : 'accent'))}>
              {targetStageLabel}
            </Badge>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(95px, 1fr))',
            gap: '6px'
          }}>
            {stagesList.map((st, idx) => {
              const isSelected = selectedStage === st.id;
              const isCurrent = currentStageId === st.id;
              const isLost = st.id === 'lost';
              const isInactive = st.id === 'inactive';
              return (
                <button
                  type="button"
                  key={st.id}
                  onClick={() => handleStageSelect(st.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px',
                    padding: '7px 6px',
                    borderRadius: '8px',
                    border: isSelected
                      ? (isLost ? '1.5px solid var(--ui-danger, var(--crm-danger))' : '1.5px solid var(--ui-primary)')
                      : (isCurrent ? '1.5px dashed var(--ui-accent)' : '1px solid var(--ui-line)'),
                    background: isSelected
                      ? (isLost ? 'var(--ui-danger, var(--crm-danger))' : 'var(--ui-primary)')
                      : (isCurrent ? 'rgba(14, 165, 233, 0.08)' : (isLost ? 'rgba(239, 68, 68, 0.04)' : 'var(--ui-surface-2)')),
                    color: isSelected
                      ? 'var(--crm-on-dark)'
                      : (isLost ? 'var(--ui-danger, var(--crm-danger))' : (isInactive ? 'var(--ui-text-3)' : 'var(--ui-text-2)')),
                    fontSize: 'var(--crm-text-xs)',
                    fontWeight: isSelected ? 700 : 600,
                    cursor: 'pointer',
                    boxShadow: isSelected ? '0 2px 8px rgba(11, 28, 54, 0.2)' : 'none',
                    transition: 'all 0.15s ease',
                    minWidth: 0
                  }}
                  title={isAr ? st.label_ar : st.label_en}
                >
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    fontSize: 'var(--crm-text-xs)',
                    fontWeight: 800,
                    background: isSelected ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.06)',
                    color: isSelected ? 'var(--crm-on-dark)' : 'inherit',
                    flexShrink: 0
                  }}>
                    {idx + 1}
                  </span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {isAr ? st.label_ar : st.label_en}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 2.5: Lost reason selector if stage is lost */}
        {isLostStage && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.05)',
            padding: '12px 14px',
            borderRadius: '10px',
            border: '1.5px solid rgba(239, 68, 68, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <span style={{ fontSize: 'var(--crm-text-xs)', fontWeight: 700, color: 'var(--ui-danger, var(--crm-danger))' }}>
              ⚠️ {isAr ? 'حدد سبب خسارة الصفقة (إلزامي للتحليل والتقارير):' : 'Select reason deal was lost (Required):'}
            </span>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '6px' }}>
              {lostReasonsFor(lead).map((r) => {
                const checked = lostReason === r.id;
                return (
                  <label
                    key={r.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      background: checked ? 'rgba(239, 68, 68, 0.12)' : 'var(--ui-surface)',
                      border: checked ? '1px solid var(--ui-danger, var(--crm-danger))' : '1px solid var(--ui-line)',
                      cursor: 'pointer',
                      fontSize: 'var(--crm-text-xs)',
                      fontWeight: checked ? 700 : 500,
                      color: checked ? 'var(--ui-danger, var(--crm-danger))' : 'var(--ui-text-2)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <input
                      type="radio"
                      name="nextStepLostReason"
                      value={r.id}
                      checked={checked}
                      onChange={() => setLostReason(r.id)}
                      style={{ accentColor: 'var(--ui-danger, var(--crm-danger))', margin: 0 }}
                    />
                    <span>{isAr ? r.ar : r.en}</span>
                  </label>
                );
              })}
            </div>

            <input
              type="text"
              placeholder={isAr ? 'ملاحظة تفصيلية حول سبب الخسارة (اختياري)...' : 'Additional note on why deal was lost (optional)...'}
              value={lostNote}
              maxLength={300}
              onChange={(e) => setLostNote(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid var(--ui-line)',
                fontSize: 'var(--crm-text-xs)',
                boxSizing: 'border-box'
              }}
            />

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
              <input
                type="checkbox"
                id="scheduleLostTask"
                checked={scheduleTaskForLost}
                onChange={(e) => setScheduleTaskForLost(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <label htmlFor="scheduleLostTask" style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--ui-text-2)', cursor: 'pointer' }}>
                {isAr ? 'جدولة تذكير أو مهمة قادمة رغم إغلاق العميل كخسارة' : 'Schedule a follow-up task anyway'}
              </label>
            </div>
          </div>
        )}

        {/* Section 3: Next Event / Action (Shown for normal stages or if requested for lost leads) */}
        {(!isLostStage || scheduleTaskForLost) && (
          <div style={{ background: 'var(--ui-surface-2)', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--ui-line)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: 'var(--crm-text-xs)', fontWeight: 700, color: 'var(--ui-primary)' }}>
                🗓️ {isAr ? 'ثالثاً: تسجيل الحدث القادم (المكالمة أو المعاينة أو الاجتماع):' : '3. Next Event (Call, Viewing, Meeting):'}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
              {KINDS.map((k) => (
                <button
                  type="button"
                  key={k.id}
                  onClick={() => handleKindSelect(k.id)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '5px 10px',
                    borderRadius: '6px',
                    border: kind === k.id ? '1px solid var(--ui-primary)' : '1px solid var(--ui-line)',
                    background: kind === k.id ? 'var(--ui-primary)' : 'var(--ui-surface)',
                    color: kind === k.id ? 'var(--ui-on-primary)' : 'var(--ui-text-2)',
                    fontSize: 'var(--crm-text-xs)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  <span>{k.id === 'visit' ? '🚗' : (k.id === 'meeting' ? '🏢' : (k.id === 'call' ? '📞' : (k.id === 'whatsapp' ? '💬' : (k.id === 'docs' ? '📄' : '✨'))))}</span>
                  <span>{isAr ? k.ar : k.en}</span>
                </button>
              ))}
            </div>

            <Input
              label={isAr ? 'عنوان الخطوة القادمة' : 'Event Title'}
              value={title}
              maxLength={140}
              onChange={(e) => setTitle(e.target.value)}
              required
            />

            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--ui-text-3)' }}>{isAr ? 'الموعد السريع:' : 'Quick day:'}</span>
              <button type="button" className="ui-btn ui-btn--secondary ui-btn--xs" onClick={() => handlePresetDay('today')}>{isAr ? 'النهارده' : 'Today'}</button>
              <button type="button" className="ui-btn ui-btn--secondary ui-btn--xs" onClick={() => handlePresetDay('tomorrow')}>{isAr ? 'بكرة' : 'Tomorrow'}</button>
              <button type="button" className="ui-btn ui-btn--secondary ui-btn--xs" onClick={() => handlePresetDay('3d')}>{isAr ? 'بعد ٣ أيام' : 'In 3 days'}</button>
              <button type="button" className="ui-btn ui-btn--secondary ui-btn--xs" onClick={() => handlePresetDay('week')}>{isAr ? 'الأسبوع القادم' : 'Next week'}</button>
              <button type="button" className="ui-btn ui-btn--secondary ui-btn--xs" onClick={() => handlePresetDay('2w')}>{isAr ? 'بعد أسبوعين' : 'In 2 weeks'}</button>
              <button type="button" className="ui-btn ui-btn--secondary ui-btn--xs" onClick={() => handlePresetDay('month')}>{isAr ? 'بعد شهر' : 'In 1 month'}</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '8px' }}>
              <Input
                type="date"
                label={isAr ? 'تاريخ التنفيذ' : 'Day'}
                value={day}
                min={dayKeyFrom()}
                onChange={(e) => setDay(e.target.value)}
                required
              />
              <Input
                type="time"
                label={isAr ? 'الساعة' : 'Time'}
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>
        )}

        {error && <p style={{ color: 'var(--ui-danger)', margin: 0, fontSize: 'var(--crm-text-xs)', fontWeight: 600 }}>{error}</p>}
      </form>
    </Modal>
  );
}


