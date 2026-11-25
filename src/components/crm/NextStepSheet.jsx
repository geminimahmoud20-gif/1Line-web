import { useId, useState, useMemo } from 'react';
import { Modal, Button, Input, Select, Badge } from '../ui';
import { buildTask, dayKeyFrom, KINDS, PRIORITIES, dueFromPreset } from '../../utils/tasks';
import { suggestNextStep, composeDue } from '../../utils/nextStep';
import { isSellerLead, localDayKey } from '../../utils/crmLeadViews';
import { addTask } from '../../firebaseLazy';
import { MessageSquare, Phone, Calendar, Building, FileText, CheckCircle2, ChevronRight, Clock, Sparkles } from 'lucide-react';

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

  // Determine default target stage
  const currentIdx = STAGE_ORDER.indexOf(currentStageId);
  const defaultNextStage = propTargetStage || (currentIdx >= 0 && currentIdx < STAGE_ORDER.length - 1 ? STAGE_ORDER[currentIdx + 1] : currentStageId);

  const [selectedStage, setSelectedStage] = useState(defaultNextStage);
  const [channel, setChannel] = useState(initialChannel || 'whatsapp');
  const [contactNote, setContactNote] = useState('');

  const [s] = useState(() => suggestNextStep(outcomeId, Date.now(), isSeller));
  
  // Smart default task title based on lead name and stage
  const defaultTitle = useMemo(() => {
    const firstName = String(lead?.name || '').split(' ').slice(0, 2).join(' ') || (isAr ? 'العميل' : 'Client');
    if (s?.title) return s.title;
    if (selectedStage === 'site_visit') return isAr ? `معاينة ميدانية للعقار مع ${firstName}` : `Viewing with ${firstName}`;
    if (selectedStage === 'negotiating') return isAr ? `جلسة تفاوض وعروض مع ${firstName}` : `Negotiation with ${firstName}`;
    if (selectedStage === 'closed') return isAr ? `إجراءات حجز وتعاقد ${firstName}` : `Closing for ${firstName}`;
    return isAr ? `متابعة مع ${firstName}` : `Follow up with ${firstName}`;
  }, [s?.title, selectedStage, lead?.name, isAr]);

  const [title, setTitle] = useState(defaultTitle);
  const [kind, setKind] = useState(s?.kind || (selectedStage === 'site_visit' ? 'visit' : 'call'));
  const [priority, setPriority] = useState(s?.priority || 'normal');
  const [day, setDay] = useState(s?.day || dueFromPreset('tomorrow'));
  const [time, setTime] = useState(s?.time || '11:00');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleClose = () => {
    if (onClose) onClose();
    else if (onSkip) onSkip();
  };

  const handlePresetDay = (presetId) => {
    setDay(dueFromPreset(presetId));
  };

  const handleStageSelect = (stId) => {
    setSelectedStage(stId);
    const firstName = String(lead?.name || '').split(' ').slice(0, 2).join(' ') || (isAr ? 'العميل' : 'Client');
    if (stId === 'site_visit') {
      setKind('visit');
      setTitle(isAr ? `معاينة ميدانية للعقار مع ${firstName}` : `Viewing with ${firstName}`);
    } else if (stId === 'negotiating') {
      setTitle(isAr ? `جلسة تفاوض وعروض مع ${firstName}` : `Negotiation with ${firstName}`);
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

    const selectedDayKey = day ? localDayKey(day) : '';
    const todayKey = localDayKey();
    if (selectedDayKey && selectedDayKey < todayKey) {
      setError(isAr ? 'تاريخ المهمة يجب أن يكون اليوم أو تاريخاً لاحقاً' : 'Task date must be today or later');
      return;
    }

    const task = buildTask({ title: title || defaultTitle, dueAt, priority, kind, lead: { id: lead.id, name: lead.name }, me });
    setBusy(true);

    try {
      if (task) {
        await addTask(task);
      }
      onSaved?.(task, {
        newStage: selectedStage,
        note: contactNote.trim(),
        channel
      });
    } catch {
      setError(isAr ? 'تعذر حفظ المهمة، جرّب مرة أخرى' : 'Failed to save task');
      setBusy(false);
    }
  };

  // 2. Update stage only without task
  const handleStageOnly = () => {
    setBusy(true);
    onStageOnly?.(selectedStage, {
      note: contactNote.trim(),
      channel
    });
  };

  const targetStageObj = stages.find((s) => s.id === selectedStage);
  const targetStageLabel = targetStageObj ? (isAr ? targetStageObj.label_ar : targetStageObj.label_en) : selectedStage;

  return (
    <Modal
      open
      dismissible
      onClose={handleClose}
      closeLabel={isAr ? 'إغلاق' : 'Close'}
      size="md"
      title={isAr ? 'تسجيل تواصل وتحديث مسار العميل' : 'Log Contact & Update Stage'}
      description={lead?.name ? `${isAr ? 'للعميل: ' : 'For: '}${lead.name}` : ''}
      footer={(
        <div style={{ display: 'flex', gap: '8px', width: '100%', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Button variant="primary" type="submit" form={formId} disabled={busy}>
              {isAr ? `حفظ الخطوة ونقل العميل إلى "${targetStageLabel}" 🚀` : `Save & Move to "${targetStageLabel}"`}
            </Button>
            <Button variant="secondary" type="button" onClick={handleStageOnly} disabled={busy}>
              {isAr ? 'نقل المرحلة فقط بدون مهمة' : 'Update stage only'}
            </Button>
          </div>
          <Button variant="ghost" onClick={handleClose} disabled={busy}>
            {isAr ? 'إلغاء' : 'Cancel'}
          </Button>
        </div>
      )}
    >
      <form id={formId} onSubmit={save} className="crm-nextstep" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* Section 1: What was done in contact */}
        <div style={{ background: 'var(--ui-surface-2)', padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--ui-line)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ui-primary)' }}>
              📞 {isAr ? 'أولاً: إيه اللي تم في التواصل؟' : '1. Contact Activity:'}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--ui-text-3)' }}>
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
                  fontSize: '11.5px',
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
              padding: '8px 10px',
              borderRadius: '6px',
              border: '1px solid var(--ui-line)',
              fontSize: '12px',
              fontFamily: 'inherit',
              resize: 'vertical',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Section 2: Target Deal Stage Selector */}
        <div style={{ background: 'var(--ui-surface)', padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--ui-line)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ui-primary)' }}>
              🎯 {isAr ? 'ثانياً: نقل العميل لمرحلة جديدة (للأمام أو للخلف):' : '2. Move to Stage (Forward or Backward):'}
            </span>
            <Badge tone="accent">{targetStageLabel}</Badge>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: '6px' }}>
            {stages.map((st, idx) => {
              const isSelected = selectedStage === st.id;
              const isCurrent = currentStageId === st.id;
              return (
                <button
                  type="button"
                  key={st.id}
                  onClick={() => handleStageSelect(st.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    padding: '8px 4px',
                    borderRadius: '8px',
                    border: isSelected ? '1px solid var(--ui-primary)' : '1px solid var(--ui-line)',
                    background: isSelected ? 'var(--ui-primary)' : 'var(--ui-surface-2)',
                    color: isSelected ? 'var(--ui-on-primary)' : 'var(--ui-text-2)',
                    fontSize: '11.5px',
                    fontWeight: isSelected ? 700 : 600,
                    cursor: 'pointer',
                    boxShadow: isSelected ? '0 2px 8px rgba(11, 28, 54, 0.2)' : 'none',
                    transition: 'all 0.15s ease'
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
                    fontSize: '10px',
                    fontWeight: 800,
                    background: isSelected ? 'var(--ui-accent)' : 'rgba(0, 0, 0, 0.06)',
                    color: isSelected ? 'var(--ui-primary)' : 'inherit'
                  }}>
                    {idx + 1}
                  </span>
                  <span>{isAr ? st.label_ar : st.label_en}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 3: Next Event / Action */}
        <div style={{ background: 'var(--ui-surface-2)', padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--ui-line)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ui-primary)' }}>
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
                  gap: '4px',
                  padding: '5px 10px',
                  borderRadius: '6px',
                  border: kind === k.id ? '1px solid var(--ui-primary)' : '1px solid var(--ui-line)',
                  background: kind === k.id ? 'var(--ui-primary)' : 'var(--ui-surface)',
                  color: kind === k.id ? 'var(--ui-on-primary)' : 'var(--ui-text-2)',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                <span>{k.id === 'visit' ? '🚗' : (k.id === 'meeting' ? '🏢' : (k.id === 'call' ? '📞' : (k.id === 'whatsapp' ? '💬' : '📝')))}</span>
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
            <span style={{ fontSize: '11px', color: 'var(--ui-text-3)' }}>{isAr ? 'الموعد السريع:' : 'Quick day:'}</span>
            <button type="button" className="ui-btn ui-btn--secondary ui-btn--xs" onClick={() => handlePresetDay('today')}>{isAr ? 'النهارده' : 'Today'}</button>
            <button type="button" className="ui-btn ui-btn--secondary ui-btn--xs" onClick={() => handlePresetDay('tomorrow')}>{isAr ? 'بكرة' : 'Tomorrow'}</button>
            <button type="button" className="ui-btn ui-btn--secondary ui-btn--xs" onClick={() => handlePresetDay('3d')}>{isAr ? 'بعد ٣ أيام' : 'In 3 days'}</button>
            <button type="button" className="ui-btn ui-btn--secondary ui-btn--xs" onClick={() => handlePresetDay('week')}>{isAr ? 'الأسبوع القادم' : 'Next week'}</button>
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

        {error && <p style={{ color: 'var(--ui-danger)', margin: 0, fontSize: '12px', fontWeight: 600 }}>{error}</p>}
      </form>
    </Modal>
  );
}
