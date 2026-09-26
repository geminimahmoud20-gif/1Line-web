import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search, X, UserPlus, Building, Zap, Calendar, Target,
  Sparkles, FileText, Moon, Sun, ArrowRight, ArrowLeft,
  ChevronRight, Phone, DollarSign, Command
} from 'lucide-react';
import { usePreferences } from '../../context/PreferencesContext';

export default function CrmCommandPalette({
  isOpen,
  onClose,
  leads = [],
  properties = [],
  demands = [],
  onSelectLead,
  onSelectProperty,
  onSelectDemand,
  onAction,
  isAr = true
}) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const { theme, toggleTheme } = usePreferences();

  // Focus input whenever opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Static action commands
  const quickActions = useMemo(() => [
    {
      id: 'act_add_lead',
      title_ar: 'إضافة عميل جديد ➕',
      title_en: 'Add New Lead ➕',
      category: 'actions',
      shortcut: 'L',
      action: () => onAction?.('add_lead')
    },
    {
      id: 'act_add_prop',
      title_ar: 'إضافة عقار جديد بالمحفظة 🏢',
      title_en: 'Add New Property 🏢',
      category: 'actions',
      shortcut: 'P',
      action: () => onAction?.('add_property')
    },
    {
      id: 'act_add_demand',
      title_ar: 'إضافة طلب مشتري معتمد ⚡',
      title_en: 'Add Buyer Demand ⚡',
      category: 'actions',
      shortcut: 'D',
      action: () => onAction?.('add_demand')
    },
    {
      id: 'act_kanban',
      title_ar: 'فتح مسار الصفقات (Kanban Deals)',
      title_en: 'Open Deals Pipeline (Kanban)',
      category: 'actions',
      shortcut: 'K',
      action: () => onAction?.('switch_tab', 'kanban')
    },
    {
      id: 'act_matching',
      title_ar: 'المطابقات الذكية التلقائية (AI Match)',
      title_en: 'Open Smart AI Matching',
      category: 'actions',
      shortcut: 'M',
      action: () => onAction?.('switch_tab', 'matching')
    },
    {
      id: 'act_contracts',
      title_ar: 'استوديو العقود والشهادات الرسمية (PDF)',
      title_en: 'Open Contract Studio (PDF)',
      category: 'actions',
      shortcut: 'C',
      action: () => onAction?.('open_contract_studio')
    },
    {
      id: 'act_theme',
      title_ar: theme === 'dark' ? 'التحويل للوضع النهاري ☀️' : 'التحويل للوضع الليلي الفاخر 🌙',
      title_en: theme === 'dark' ? 'Switch to Light Mode ☀️' : 'Switch to Dark Mode 🌙',
      category: 'actions',
      shortcut: 'T',
      action: () => toggleTheme?.()
    }
  ], [onAction, theme, toggleTheme]);

  // Filtered results calculation
  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return quickActions;
    }

    const filteredActions = quickActions.filter(a =>
      (a.title_ar && a.title_ar.toLowerCase().includes(q)) ||
      (a.title_en && a.title_en.toLowerCase().includes(q))
    );

    const filteredLeads = leads
      .filter(l =>
        (l.name && l.name.toLowerCase().includes(q)) ||
        (l.phone && l.phone.includes(q)) ||
        (l.area && l.area.toLowerCase().includes(q))
      )
      .slice(0, 5)
      .map(l => ({
        id: `lead_${l.id}`,
        title_ar: `${l.name} (${l.phone || ''})`,
        title_en: `${l.name} (${l.phone || ''})`,
        sub_ar: `${l.budget ? l.budget + ' ج.م' : ''} • ${l.status || 'new'}`,
        sub_en: `${l.budget ? l.budget + ' EGP' : ''} • ${l.status || 'new'}`,
        category: 'leads',
        data: l,
        action: () => onSelectLead?.(l)
      }));

    const filteredProperties = properties
      .filter(p =>
        (p.title_ar && p.title_ar.toLowerCase().includes(q)) ||
        (p.id && String(p.id).toLowerCase().includes(q)) ||
        (p.locationName_ar && p.locationName_ar.toLowerCase().includes(q))
      )
      .slice(0, 4)
      .map(p => ({
        id: `prop_${p.id}`,
        title_ar: `${String(p.id).toUpperCase()} — ${p.title_ar}`,
        title_en: `${String(p.id).toUpperCase()} — ${p.title_en || p.title_ar}`,
        sub_ar: `${p.price?.toLocaleString()} ج.م • ${p.locationName_ar || p.areaKey}`,
        sub_en: `${p.price?.toLocaleString()} EGP • ${p.locationName_ar || p.areaKey}`,
        category: 'properties',
        data: p,
        action: () => onSelectProperty?.(p)
      }));

    const filteredDemands = demands
      .filter(d =>
        (d.clientName && d.clientName.toLowerCase().includes(q)) ||
        (d.text_ar && d.text_ar.toLowerCase().includes(q)) ||
        (d.phone && d.phone.includes(q))
      )
      .slice(0, 3)
      .map(d => ({
        id: `demand_${d.id}`,
        title_ar: `طلب مشتري: ${d.clientName || d.text_ar}`,
        title_en: `Buyer Demand: ${d.clientName || d.text_ar}`,
        sub_ar: `ميزانية: ${d.budget} ج.م`,
        sub_en: `Budget: ${d.budget} EGP`,
        category: 'demands',
        data: d,
        action: () => onSelectDemand?.(d)
      }));

    return [
      ...filteredActions,
      ...filteredLeads,
      ...filteredProperties,
      ...filteredDemands
    ];
  }, [query, quickActions, leads, properties, demands, onSelectLead, onSelectProperty, onSelectDemand]);

  // Keyboard navigation inside list
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < searchResults.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : searchResults.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const current = searchResults[selectedIndex];
      if (current?.action) {
        current.action();
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="crm-command-backdrop"
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(7, 14, 26, 0.72)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 12000,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '12vh 16px 24px',
        animation: 'fadeIn 0.18s ease'
      }}
    >
      <div
        className="crm-command-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={isAr ? 'لوحة الأوامر والبحث' : 'Command palette'}
        dir={isAr ? 'rtl' : 'ltr'}
        style={{
          width: '100%',
          maxWidth: '640px',
          background: 'var(--crm-card, #ffffff)',
          border: '1px solid var(--crm-line, #e2e8f0)',
          borderRadius: '16px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.08)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          color: 'var(--crm-ink, #0f172a)'
        }}
      >
        {/* Search Input Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '16px 20px',
          borderBottom: '1px solid var(--crm-line, #e2e8f0)',
          background: 'var(--crm-subtle, #f9f8f5)'
        }}>
          <Search size={20} style={{ color: 'var(--crm-accent, #A9824A)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder={isAr ? 'ابحث في العملاء، العقارات، الأوامر السريعة (Ctrl+K)...' : 'Type a command or search (Ctrl+K)...'}
            aria-label={isAr ? 'ابحث في العملاء والعقارات والأوامر' : 'Search leads, properties and commands'}
            role="combobox"
            aria-expanded={searchResults.length > 0}
            aria-controls="crm-cmdk-list"
            aria-autocomplete="list"
            aria-activedescendant={searchResults[selectedIndex] ? `crm-cmdk-opt-${selectedIndex}` : undefined}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: '1rem',
              color: 'var(--crm-ink, #0f172a)',
              fontFamily: 'inherit'
            }}
          />
          <kbd style={{
            fontSize: 'var(--crm-text-xs)',
            padding: '3px 7px',
            borderRadius: '6px',
            background: 'var(--crm-card, #ffffff)',
            border: '1px solid var(--crm-line, #e2e8f0)',
            color: 'var(--crm-muted, #64748b)',
            fontWeight: 700
          }}>
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div
          ref={listRef}
          id="crm-cmdk-list"
          role="listbox"
          aria-label={isAr ? 'النتائج' : 'Results'}
          style={{
            maxHeight: '380px',
            overflowY: 'auto',
            padding: '8px'
          }}
        >
          {searchResults.length === 0 ? (
            <div style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--crm-muted, #64748b)' }}>
              <Search size={32} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
              <p style={{ margin: 0, fontSize: 'var(--crm-text-base)' }}>
                {isAr ? `لم يتم العثور على نتائج تطابق "${query}"` : `No results found for "${query}"`}
              </p>
            </div>
          ) : (
            searchResults.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const isAction = item.category === 'actions';
              const isLead = item.category === 'leads';
              const isProp = item.category === 'properties';
              const isDemand = item.category === 'demands';

              return (
                <div
                  key={item.id}
                  id={`crm-cmdk-opt-${idx}`}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    item.action?.();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    background: isSelected ? 'var(--crm-subtle-2, #f2f0ea)' : 'transparent',
                    border: isSelected ? '1px solid var(--crm-line, #e2e8f0)' : '1px solid transparent',
                    transition: 'all 0.1s ease',
                    marginBottom: '2px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      background: isAction ? 'rgba(169, 130, 74, 0.12)' : isLead ? 'rgba(59, 130, 246, 0.12)' : isProp ? 'rgba(16, 185, 129, 0.12)' : 'rgba(234, 179, 8, 0.12)',
                      color: isAction ? 'var(--crm-accent)' : isLead ? '#2563eb' : isProp ? '#059669' : '#d97706'
                    }}>
                      {isAction ? <Command size={16} /> : isLead ? <Phone size={16} /> : isProp ? <Building size={16} /> : <Zap size={16} />}
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <div style={{
                        fontSize: 'var(--crm-text-base)',
                        fontWeight: 700,
                        color: 'var(--crm-ink)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {isAr ? item.title_ar : item.title_en}
                      </div>
                      {(item.sub_ar || item.sub_en) && (
                        <div style={{
                          fontSize: 'var(--crm-text-xs)',
                          color: 'var(--crm-muted)',
                          marginTop: '2px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {isAr ? item.sub_ar : item.sub_en}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    {item.shortcut && (
                      <kbd style={{
                        fontSize: 'var(--crm-text-xs)',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: 'var(--crm-subtle, #f9f8f5)',
                        border: '1px solid var(--crm-line, #e2e8f0)',
                        color: 'var(--crm-muted, #64748b)',
                        fontWeight: 700
                      }}>
                        {item.shortcut}
                      </kbd>
                    )}
                    {isSelected && (
                      <span style={{ fontSize: 'var(--crm-text-xs)', color: 'var(--crm-accent)', fontWeight: 700 }}>
                        {isAr ? 'اضغط Enter ↵' : 'Enter ↵'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts hint */}
        <div style={{
          padding: '10px 18px',
          borderTop: '1px solid var(--crm-line, #e2e8f0)',
          background: 'var(--crm-subtle, #f9f8f5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 'var(--crm-text-xs)',
          color: 'var(--crm-muted, #64748b)'
        }}>
          <div style={{ display: 'flex', gap: '14px' }}>
            <span><kbd style={{ fontWeight: 700 }}>↑↓</kbd> للتنقل</span>
            <span><kbd style={{ fontWeight: 700 }}>↵</kbd> للاختيار</span>
            <span><kbd style={{ fontWeight: 700 }}>ESC</kbd> للإغلاق</span>
          </div>
          <span style={{ fontWeight: 600 }}>1Line Operating System</span>
        </div>
      </div>
    </div>
  );
}
