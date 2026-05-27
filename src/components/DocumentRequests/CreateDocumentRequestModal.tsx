import React, { useState } from 'react';
import { Plus, Trash2, Loader2, Send, FileText } from 'lucide-react';
import { toast } from 'react-toastify';
import Modal from '../Modal';
import { useCreateDocumentRequest } from '../../hooks/useDocumentRequests';
import {
  EXPECTED_DOCUMENT_TYPES,
  PRIORITY_LABELS,
  type CreateItemPayload,
  type DocumentRequestPriority,
  type ExpectedDocumentType,
} from '../../types/documentRequests';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  caseId: number;
  clientId: number;
  clientName?: string;
  onCreated?: (requestId: number) => void;
}

interface ItemFormState extends CreateItemPayload {
  _key: string;
}

const newItem = (order: number): ItemFormState => ({
  _key: `item-${Date.now()}-${order}`,
  title: '',
  expected_document_type: undefined,
  client_message: '',
  is_required: true,
  min_files: 1,
  max_files: 1,
});

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '6px 8px',
  fontSize: '13px',
  border: '1px solid var(--color-border)',
  borderRadius: '3px',
  background: 'var(--color-surface)',
  color: 'var(--color-text)',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  color: 'var(--color-text-secondary)',
  marginBottom: '4px',
  fontWeight: 500,
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: 600,
  color: 'var(--color-text)',
  marginBottom: '8px',
};

const CreateDocumentRequestModal: React.FC<Props> = ({
  isOpen,
  onClose,
  caseId,
  clientId,
  clientName,
  onCreated,
}) => {
  const [title, setTitle] = useState('');
  const [clientMessage, setClientMessage] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<DocumentRequestPriority>('medium');
  const [items, setItems] = useState<ItemFormState[]>([newItem(1)]);

  const createMutation = useCreateDocumentRequest(caseId);

  const resetForm = () => {
    setTitle('');
    setClientMessage('');
    setInternalNotes('');
    setDueDate('');
    setPriority('medium');
    setItems([newItem(1)]);
  };

  const handleClose = () => {
    if (createMutation.isPending) return;
    resetForm();
    onClose();
  };

  const addItem = () => {
    setItems((curr) => [...curr, newItem(curr.length + 1)]);
  };

  const removeItem = (key: string) => {
    setItems((curr) => (curr.length > 1 ? curr.filter((it) => it._key !== key) : curr));
  };

  const updateItem = <K extends keyof ItemFormState>(
    key: string,
    field: K,
    value: ItemFormState[K]
  ) => {
    setItems((curr) =>
      curr.map((it) => (it._key === key ? { ...it, [field]: value } : it))
    );
  };

  const validate = (): string | null => {
    if (!title.trim()) return 'العنوان مطلوب';
    if (items.length === 0) return 'أضف بنداً واحداً على الأقل';
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.title.trim()) return `بند رقم ${i + 1}: العنوان مطلوب`;
      if (it.min_files && it.max_files && it.min_files > it.max_files) {
        return `بند رقم ${i + 1}: الحد الأدنى أكبر من الحد الأقصى`;
      }
    }
    return null;
  };

  const handleSubmit = async (sendNow: boolean) => {
    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }

    try {
      const created = await createMutation.mutateAsync({
        case_id: caseId,
        client_id: clientId,
        title: title.trim(),
        client_message: clientMessage.trim() || undefined,
        internal_notes: internalNotes.trim() || undefined,
        due_date: dueDate || undefined,
        priority,
        items: items.map((it) => ({
          title: it.title.trim(),
          expected_document_type: it.expected_document_type,
          client_message: it.client_message?.trim() || undefined,
          is_required: it.is_required,
          min_files: it.min_files ?? 1,
          max_files: it.max_files ?? undefined,
        })),
      });

      if (sendNow) {
        // dispatch send بعد الإنشاء
        // نستخدم hook factory لإنشاء mutation ad-hoc
        await DocumentRequestService_send_inline(created.id);
        toast.success('تم إنشاء الطلب وإرساله للعميل');
      } else {
        toast.success('تم حفظ الطلب كمسودة');
      }
      onCreated?.(created.id);
      resetForm();
      onClose();
    } catch (e: unknown) {
      const err = e as { message?: string };
      toast.error(err.message || 'فشل العملية');
    }
  };

  // helper inline لتفادي double hooks (مرة عند الإنشاء + مرة عند الإرسال)
  const DocumentRequestService_send_inline = async (requestId: number) => {
    const { DocumentRequestService } = await import('../../services/documentRequestService');
    return DocumentRequestService.send(requestId);
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="طلب وثائق جديد من العميل" size="xl" zIndex={80}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* الصف 1: عنوان + أولوية + موعد */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px' }}>
          <div>
            <label style={labelStyle}>عنوان الطلب *</label>
            <input
              style={inputStyle}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: وثائق افتتاح القضية"
              maxLength={255}
            />
          </div>
          <div>
            <label style={labelStyle}>الأولوية</label>
            <select
              style={inputStyle}
              value={priority}
              onChange={(e) => setPriority(e.target.value as DocumentRequestPriority)}
            >
              {(Object.keys(PRIORITY_LABELS) as DocumentRequestPriority[]).map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_LABELS[p]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>الموعد النهائي</label>
            <input
              type="date"
              style={inputStyle}
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              min={new Date().toISOString().slice(0, 10)}
            />
          </div>
        </div>

        {/* الصف 2: رسالة للعميل + ملاحظات داخلية */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={labelStyle}>
              رسالة للعميل {clientName ? `(${clientName})` : ''}
            </label>
            <textarea
              style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }}
              value={clientMessage}
              onChange={(e) => setClientMessage(e.target.value)}
              placeholder="مرئية للعميل في بوابته وفي رسالة الواتساب"
              maxLength={2000}
            />
          </div>
          <div>
            <label style={labelStyle}>ملاحظات داخلية (مخفية عن العميل)</label>
            <textarea
              style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }}
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              placeholder="ملاحظات داخلية للمكتب فقط"
              maxLength={2000}
            />
          </div>
        </div>

        {/* البنود */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h3 style={sectionTitleStyle}>
              <FileText size={14} style={{ display: 'inline', verticalAlign: 'middle', marginLeft: '4px' }} />
              البنود المطلوبة ({items.length})
            </h3>
            <button
              type="button"
              onClick={addItem}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 10px',
                fontSize: '12px',
                background: 'var(--color-primary)',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer',
              }}
            >
              <Plus size={12} />
              إضافة بند
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: 'var(--color-surface-subtle)', textAlign: 'right' }}>
                  <th style={th(40)}>#</th>
                  <th style={th(220)}>اسم الوثيقة *</th>
                  <th style={th(180)}>نوع الوثيقة</th>
                  <th style={th(200)}>ملاحظة للعميل</th>
                  <th style={th(70)}>إجباري</th>
                  <th style={th(70)}>Min</th>
                  <th style={th(70)}>Max</th>
                  <th style={th(40)}>حذف</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={it._key} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={td}>{idx + 1}</td>
                    <td style={td}>
                      <input
                        style={{ ...inputStyle, padding: '4px 6px' }}
                        value={it.title}
                        onChange={(e) => updateItem(it._key, 'title', e.target.value)}
                        placeholder="صورة الهوية الوطنية"
                      />
                    </td>
                    <td style={td}>
                      <select
                        style={{ ...inputStyle, padding: '4px 6px' }}
                        value={it.expected_document_type ?? ''}
                        onChange={(e) =>
                          updateItem(
                            it._key,
                            'expected_document_type',
                            (e.target.value || undefined) as ExpectedDocumentType | undefined
                          )
                        }
                      >
                        <option value="">— غير محدد —</option>
                        {EXPECTED_DOCUMENT_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td style={td}>
                      <input
                        style={{ ...inputStyle, padding: '4px 6px' }}
                        value={it.client_message ?? ''}
                        onChange={(e) => updateItem(it._key, 'client_message', e.target.value)}
                        placeholder="ملاحظة قصيرة"
                      />
                    </td>
                    <td style={{ ...td, textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={it.is_required ?? true}
                        onChange={(e) => updateItem(it._key, 'is_required', e.target.checked)}
                      />
                    </td>
                    <td style={td}>
                      <input
                        type="number"
                        min={0}
                        max={20}
                        style={{ ...inputStyle, padding: '4px 6px' }}
                        value={it.min_files ?? 1}
                        onChange={(e) => updateItem(it._key, 'min_files', Number(e.target.value))}
                      />
                    </td>
                    <td style={td}>
                      <input
                        type="number"
                        min={1}
                        max={20}
                        style={{ ...inputStyle, padding: '4px 6px' }}
                        value={it.max_files ?? ''}
                        placeholder="∞"
                        onChange={(e) =>
                          updateItem(it._key, 'max_files', e.target.value ? Number(e.target.value) : null)
                        }
                      />
                    </td>
                    <td style={{ ...td, textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => removeItem(it._key)}
                        disabled={items.length === 1}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: items.length === 1 ? 'var(--color-text-muted)' : 'var(--color-error)',
                          cursor: items.length === 1 ? 'not-allowed' : 'pointer',
                          padding: '2px',
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* الأزرار */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '8px',
            paddingTop: '12px',
            borderTop: '1px solid var(--color-border)',
          }}
        >
          <button
            type="button"
            onClick={handleClose}
            disabled={createMutation.isPending}
            style={btnSecondary}
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={() => handleSubmit(false)}
            disabled={createMutation.isPending}
            style={btnGhost}
          >
            {createMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : null}
            حفظ كمسودة
          </button>
          <button
            type="button"
            onClick={() => handleSubmit(true)}
            disabled={createMutation.isPending}
            style={btnPrimary}
          >
            {createMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            إرسال للعميل
          </button>
        </div>
      </div>
    </Modal>
  );
};

const th = (width: number): React.CSSProperties => ({
  padding: '6px 8px',
  fontSize: '11px',
  fontWeight: 600,
  borderBottom: '1px solid var(--color-border)',
  width: `${width}px`,
});

const td: React.CSSProperties = {
  padding: '4px 6px',
  verticalAlign: 'middle',
};

const btnSecondary: React.CSSProperties = {
  padding: '6px 14px',
  fontSize: '12px',
  background: 'transparent',
  color: 'var(--color-text-secondary)',
  border: '1px solid var(--color-border)',
  borderRadius: '3px',
  cursor: 'pointer',
};

const btnGhost: React.CSSProperties = {
  padding: '6px 14px',
  fontSize: '12px',
  background: 'transparent',
  color: 'var(--color-primary)',
  border: '1px solid var(--color-primary)',
  borderRadius: '3px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
};

const btnPrimary: React.CSSProperties = {
  padding: '6px 14px',
  fontSize: '12px',
  background: 'var(--color-primary)',
  color: 'white',
  border: '1px solid var(--color-primary)',
  borderRadius: '3px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
};

export default CreateDocumentRequestModal;
