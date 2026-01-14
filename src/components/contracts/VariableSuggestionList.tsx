import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from 'react';
import { CONTRACT_VARIABLES, CATEGORY_COLORS } from '../../hooks/useContractVariables';

export interface VariableSuggestionListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

interface VariableSuggestionListProps {
  items: typeof CONTRACT_VARIABLES;
  command: (props: { id: string; label: string }) => void;
}

const VariableSuggestionList = forwardRef<
  VariableSuggestionListRef,
  VariableSuggestionListProps
>((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectItem = (index: number) => {
    const item = props.items[index];
    if (item) {
      props.command({ id: item.key, label: item.label });
    }
  };

  const upHandler = () => {
    setSelectedIndex(
      (selectedIndex + props.items.length - 1) % props.items.length
    );
  };

  const downHandler = () => {
    setSelectedIndex((selectedIndex + 1) % props.items.length);
  };

  const enterHandler = () => {
    selectItem(selectedIndex);
  };

  useEffect(() => setSelectedIndex(0), [props.items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === 'ArrowUp') {
        upHandler();
        return true;
      }

      if (event.key === 'ArrowDown') {
        downHandler();
        return true;
      }

      if (event.key === 'Enter') {
        enterHandler();
        return true;
      }

      return false;
    },
  }));

  if (props.items.length === 0) {
    return (
      <div
        style={{
          padding: '12px 16px',
          color: '#6b7280',
          fontSize: '14px',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e5e7eb',
        }}
      >
        لا توجد متغيرات مطابقة
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e5e7eb',
        overflow: 'hidden',
        maxHeight: '300px',
        overflowY: 'auto',
        minWidth: '250px',
      }}
    >
      {props.items.map((item, index) => (
        <button
          key={item.key}
          onClick={() => selectItem(index)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            width: '100%',
            padding: '10px 14px',
            border: 'none',
            backgroundColor:
              index === selectedIndex ? '#f3f4f6' : 'transparent',
            cursor: 'pointer',
            textAlign: 'right',
            direction: 'rtl',
            transition: 'background-color 0.15s',
          }}
          onMouseEnter={() => setSelectedIndex(index)}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: CATEGORY_COLORS[item.category] || '#6b7280',
              flexShrink: 0,
            }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span
                style={{
                  fontSize: '14px',
                  color: '#111827',
                  fontWeight: 500,
                }}
              >
                {item.label}
              </span>
              <code
                style={{
                  fontSize: '11px',
                  color: '#6b7280',
                  backgroundColor: '#f3f4f6',
                  padding: '1px 4px',
                  borderRadius: '3px',
                  fontFamily: 'monospace',
                }}
              >
                {item.key}
              </code>
            </div>
            {item.description && (
              <div
                style={{
                  fontSize: '12px',
                  color: '#9ca3af',
                  marginTop: '2px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {item.description}
              </div>
            )}
          </div>
        </button>
      ))}
    </div>
  );
});

VariableSuggestionList.displayName = 'VariableSuggestionList';

export default VariableSuggestionList;
