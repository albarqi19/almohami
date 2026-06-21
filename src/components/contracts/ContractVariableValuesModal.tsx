import React from 'react';
import { X, RotateCcw, Pencil, Check } from 'lucide-react';
import { CONTRACT_VARIABLES, VARIABLE_CATEGORIES } from '../../hooks/useContractVariables';

interface ContractVariableValuesModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** مفاتيح المتغيّرات المستخدمة فعلاً في نصّ العقد (بلا أقواس) */
  usedKeys: string[];
  /** القيم الأصلية المحسوبة من السجلّ (العميل/القضية/المكتب) */
  computedValues: Record<string, string>;
  /** القيم التي عدّلها المستخدم يدوياً (overrides) */
  overrides: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
}

const meta = (key: string) => CONTRACT_VARIABLES.find((v) => v.key === key);
const labelFor = (key: string) => meta(key)?.label || key;
const categoryFor = (key: string) => VARIABLE_CATEGORIES[meta(key)?.category || ''] || 'أخرى';

const ContractVariableValuesModal: React.FC<ContractVariableValuesModalProps> = ({
  isOpen,
  onClose,
  usedKeys,
  computedValues,
  overrides,
  onChange,
}) => {
  if (!isOpen) return null;

  const setValue = (key: string, value: string) => {
    onChange({ ...overrides, [key]: value });
  };

  const resetValue = (key: string) => {
    const next = { ...overrides };
    delete next[key];
    onChange(next);
  };

  // تجميع المتغيّرات المستخدمة حسب التصنيف للعرض المنظّم
  const groups = usedKeys.reduce<Record<string, string[]>>((acc, key) => {
    const cat = categoryFor(key);
    (acc[cat] = acc[cat] || []).push(key);
    return acc;
  }, {});

  const overriddenCount = usedKeys.filter((k) => k in overrides).length;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        padding: '24px 20px',
        direction: 'rtl',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--dashboard-card, #fff)',
          borderRadius: '8px',
          width: '100%',
          maxWidth: '720px',
          maxHeight: 'calc(100vh - 48px)',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid var(--color-border)',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 16px',
            borderBottom: '1px solid var(--color-border)',
            flexShrink: 0,
          }}
        >
          <Pencil size={16} style={{ color: 'var(--law-navy, #0f172a)', flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--color-text)' }}>
              تعديل قيم العقد
            </h2>
            <span style={{ fontSize: '11.5px', color: 'var(--color-text-secondary)' }}>
              القيم الأصلية معبّأة — عدّل ما تريد لهذا العقد
              {overriddenCount > 0 ? ` · عُدِّل ${overriddenCount}` : ''}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '5px',
              border: 'none',
              background: 'transparent',
              color: 'var(--color-text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '4px 16px 12px', overflowY: 'auto', flex: 1 }}>
          {usedKeys.length === 0 ? (
            <div
              style={{
                padding: '32px 20px',
                textAlign: 'center',
                color: 'var(--color-text-secondary)',
                fontSize: '13px',
              }}
            >
              لا توجد متغيّرات قابلة للتعديل في نصّ هذا العقد.
            </div>
          ) : (
            Object.entries(groups).map(([cat, keys]) => (
              <div key={cat} style={{ marginTop: '10px' }}>
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: 'var(--color-text-secondary)',
                    margin: '0 0 4px',
                  }}
                >
                  {cat}
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                    gap: '4px 12px',
                  }}
                >
                  {keys.map((key) => {
                    const isOverridden = key in overrides;
                    const value = isOverridden ? overrides[key] : computedValues[key] ?? '';
                    return (
                      <div
                        key={key}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        <label
                          title={`{{${key}}}`}
                          style={{
                            width: '92px',
                            flexShrink: 0,
                            fontSize: '12px',
                            fontWeight: 500,
                            color: 'var(--color-text)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {labelFor(key)}
                        </label>
                        <input
                          type="text"
                          value={value}
                          onChange={(e) => setValue(key, e.target.value)}
                          placeholder={computedValues[key] || '—'}
                          style={{
                            flex: 1,
                            minWidth: 0,
                            padding: '5px 8px',
                            borderRadius: '5px',
                            border: `1px solid ${isOverridden ? 'var(--law-gold, #c5a059)' : 'var(--color-border)'}`,
                            background: 'var(--color-surface, transparent)',
                            color: 'var(--color-text)',
                            fontSize: '12.5px',
                          }}
                        />
                        {isOverridden && (
                          <button
                            onClick={() => resetValue(key)}
                            title="استرجاع القيمة الأصلية"
                            style={{
                              width: '26px',
                              height: '26px',
                              flexShrink: 0,
                              borderRadius: '5px',
                              border: '1px solid var(--color-border)',
                              background: 'transparent',
                              color: 'var(--color-text)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <RotateCcw size={13} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '8px',
            padding: '10px 16px',
            borderTop: '1px solid var(--color-border)',
            flexShrink: 0,
          }}
        >
          <button
            onClick={onClose}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '7px 16px',
              borderRadius: '5px',
              border: 'none',
              background: 'var(--law-navy, #0f172a)',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 500,
            }}
          >
            <Check size={15} /> تم
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContractVariableValuesModal;
