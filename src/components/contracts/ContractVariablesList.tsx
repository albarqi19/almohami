import React, { useState, useMemo } from 'react';
import { Search, ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { useContractVariables, VARIABLE_CATEGORIES, CATEGORY_COLORS } from '../../hooks/useContractVariables';
import type { ContractVariable } from '../../types/contracts';

export interface ContractVariablesListProps {
  onInsert?: (variable: string) => void;
  onInsertVariable?: (variable: string) => void; // alias for onInsert
  usedVariables?: string[];
  compact?: boolean;
}

const ContractVariablesList: React.FC<ContractVariablesListProps> = ({
  onInsert: onInsertProp,
  onInsertVariable,
  usedVariables = [],
  compact = false,
}) => {
  // Support both onInsert and onInsertVariable
  const onInsert = onInsertProp || onInsertVariable || (() => {});
  const { groupedVariables, formatVariableForInsert } = useContractVariables();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<string[]>(
    Object.keys(VARIABLE_CATEGORIES)
  );

  // فلترة المتغيرات حسب البحث
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return groupedVariables;

    const lowerQuery = searchQuery.toLowerCase();
    const filtered: Record<string, ContractVariable[]> = {};

    Object.entries(groupedVariables).forEach(([category, variables]) => {
      const matchingVars = variables.filter(
        (v) =>
          v.key.toLowerCase().includes(lowerQuery) ||
          v.label.toLowerCase().includes(lowerQuery) ||
          v.description?.toLowerCase().includes(lowerQuery)
      );
      if (matchingVars.length > 0) {
        filtered[category] = matchingVars;
      }
    });

    return filtered;
  }, [groupedVariables, searchQuery]);

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const handleInsert = (variable: ContractVariable) => {
    onInsert(formatVariableForInsert(variable.key));
  };

  return (
    <div
      className="contract-variables-list"
      style={{
        backgroundColor: 'var(--color-surface, #fff)',
        borderRadius: '8px',
        border: '1px solid var(--color-border, #e5e7eb)',
        overflow: 'hidden',
      }}
    >
      {/* عنوان */}
      <div
        style={{
          padding: compact ? '12px' : '16px',
          borderBottom: '1px solid var(--color-border, #e5e7eb)',
          backgroundColor: 'var(--color-background, #f9fafb)',
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: compact ? '14px' : '16px',
            fontWeight: 600,
            color: 'var(--color-text, #111827)',
            marginBottom: '12px',
          }}
        >
          المتغيرات المتاحة
        </h3>

        {/* البحث */}
        <div
          style={{
            position: 'relative',
          }}
        >
          <Search
            size={16}
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--color-text-light, #6b7280)',
            }}
          />
          <input
            type="text"
            placeholder="ابحث عن متغير..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              paddingRight: '36px',
              border: '1px solid var(--color-border, #e5e7eb)',
              borderRadius: '6px',
              fontSize: '14px',
              outline: 'none',
              direction: 'rtl',
            }}
          />
        </div>
      </div>

      {/* قائمة المتغيرات */}
      <div
        style={{
          maxHeight: compact ? '300px' : '400px',
          overflowY: 'auto',
        }}
      >
        {Object.entries(filteredGroups).map(([category, variables]) => (
          <div key={category}>
            {/* رأس التصنيف */}
            <button
              onClick={() => toggleCategory(category)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: compact ? '8px 12px' : '12px 16px',
                backgroundColor: 'var(--color-background, #f9fafb)',
                border: 'none',
                borderBottom: '1px solid var(--color-border, #e5e7eb)',
                cursor: 'pointer',
                textAlign: 'right',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: CATEGORY_COLORS[category] || '#6b7280',
                  }}
                />
                <span
                  style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: 'var(--color-text, #111827)',
                  }}
                >
                  {VARIABLE_CATEGORIES[category] || category}
                </span>
                <span
                  style={{
                    fontSize: '12px',
                    color: 'var(--color-text-light, #6b7280)',
                  }}
                >
                  ({variables.length})
                </span>
              </div>
              {expandedCategories.includes(category) ? (
                <ChevronUp size={16} color="var(--color-text-light, #6b7280)" />
              ) : (
                <ChevronDown size={16} color="var(--color-text-light, #6b7280)" />
              )}
            </button>

            {/* قائمة المتغيرات في التصنيف */}
            {expandedCategories.includes(category) && (
              <div>
                {variables.map((variable) => {
                  const isUsed = usedVariables.includes(variable.key);
                  return (
                    <div
                      key={variable.key}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: compact ? '8px 12px' : '10px 16px',
                        borderBottom: '1px solid var(--color-border-light, #f3f4f6)',
                        backgroundColor: isUsed
                          ? 'rgba(16, 185, 129, 0.05)'
                          : 'transparent',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                          }}
                        >
                          <code
                            style={{
                              fontSize: '12px',
                              backgroundColor: 'var(--color-background, #f3f4f6)',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              color: CATEGORY_COLORS[category] || '#6b7280',
                              fontFamily: 'monospace',
                            }}
                          >
                            {`{{${variable.key}}}`}
                          </code>
                          {isUsed && (
                            <span
                              style={{
                                fontSize: '10px',
                                backgroundColor: '#10B981',
                                color: 'white',
                                padding: '1px 4px',
                                borderRadius: '4px',
                              }}
                            >
                              مستخدم
                            </span>
                          )}
                        </div>
                        <div
                          style={{
                            fontSize: '13px',
                            color: 'var(--color-text, #374151)',
                            marginTop: '4px',
                          }}
                        >
                          {variable.label}
                        </div>
                        {variable.description && !compact && (
                          <div
                            style={{
                              fontSize: '11px',
                              color: 'var(--color-text-light, #9ca3af)',
                              marginTop: '2px',
                            }}
                          >
                            {variable.description}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleInsert(variable)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '28px',
                          height: '28px',
                          border: '1px solid var(--color-border, #e5e7eb)',
                          borderRadius: '6px',
                          backgroundColor: 'white',
                          cursor: 'pointer',
                          color: 'var(--color-primary, #3b82f6)',
                          transition: 'all 0.2s',
                          flexShrink: 0,
                          marginRight: '8px',
                        }}
                        title="إدراج المتغير"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}

        {Object.keys(filteredGroups).length === 0 && (
          <div
            style={{
              padding: '24px',
              textAlign: 'center',
              color: 'var(--color-text-light, #6b7280)',
            }}
          >
            لا توجد متغيرات مطابقة للبحث
          </div>
        )}
      </div>
    </div>
  );
};

export default ContractVariablesList;
