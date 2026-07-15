import React, { useEffect, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { FolderClosed, FolderPlus, Inbox, Lock, Pencil, Trash2, Users } from 'lucide-react';
import Modal from '../erp/Modal';
import { FOLDER_COLORS } from '../../services/taskFolderService';
import type { TaskFolder, TaskFolderColor } from '../../types';
import '../../styles/task-folders.css';

/**
 * لوحة مجلدات المهام — قسم في العمود الجانبي لصفحة المهام.
 * تنظيم ظاهري بحت: مشترك للمكتب (أيقونة Users) أو شخصي (أيقونة Lock).
 * كل رقاقة مجلد هدف إفلات (dnd-kit droppable id = `folder-<id>`)،
 * ورقاقة «العام» هدف إفلات لإخراج المهمة من مجلدها (id = `folder-none`).
 */

interface FolderChipProps {
  folder: TaskFolder;
  active: boolean;
  dragging: boolean;
  canEdit: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const FolderChip: React.FC<FolderChipProps> = ({ folder, active, dragging, canEdit, onSelect, onEdit, onDelete }) => {
  const { isOver, setNodeRef } = useDroppable({ id: `folder-${folder.id}` });
  const ScopeIcon = folder.scope === 'shared' ? Users : Lock;

  return (
    <div
      ref={setNodeRef}
      className={`tf-chip tf-color-${folder.color}${active ? ' active' : ''}${dragging ? ' tf-droppable' : ''}${isOver ? ' tf-drop-over' : ''}`}
      onClick={onSelect}
      role="button"
      title={folder.scope === 'shared' ? 'مجلد مشترك — يراه كل المكتب' : 'مجلد شخصي — يظهر لك فقط'}
    >
      <FolderClosed size={14} className="tf-chip__folder-icon" />
      <span className="tf-chip__name">{folder.name}</span>
      <ScopeIcon size={11} className="tf-chip__scope-icon" />
      <span className="tf-chip__count">{folder.active_tasks_count ?? 0}</span>
      {canEdit && (
        <span className="tf-chip__actions" onClick={(e) => e.stopPropagation()}>
          <button type="button" title="تعديل المجلد" onClick={onEdit}><Pencil size={11} /></button>
          <button type="button" title="حذف المجلد (تعود مهامه للعام)" onClick={onDelete}><Trash2 size={11} /></button>
        </span>
      )}
    </div>
  );
};

interface TaskFoldersPanelProps {
  folders: TaskFolder[];
  canManageShared: boolean;
  activeFolderId: number | null;
  dragging: boolean;
  onSelect: (folderId: number | null) => void;
  onCreate: () => void;
  onEdit: (folder: TaskFolder) => void;
  onDelete: (folder: TaskFolder) => void;
}

export const TaskFoldersPanel: React.FC<TaskFoldersPanelProps> = ({
  folders, canManageShared, activeFolderId, dragging, onSelect, onCreate, onEdit, onDelete,
}) => {
  // «العام» هدف إفلات لإخراج المهمة من مجلدها
  const { isOver: overGeneral, setNodeRef: generalRef } = useDroppable({ id: 'folder-none' });

  const shared = folders.filter(f => f.scope === 'shared');
  const personal = folders.filter(f => f.scope === 'personal');

  return (
    <div className="panel-section tf-panel">
      <h4 className="panel-section-title">
        <span>المجلدات</span>
        <button type="button" className="tf-add-btn" title="مجلد جديد" onClick={onCreate}>
          <FolderPlus size={14} />
        </button>
      </h4>

      <div className="tf-list">
        <div
          ref={generalRef}
          className={`tf-chip tf-general${activeFolderId === null ? ' active' : ''}${dragging ? ' tf-droppable' : ''}${overGeneral ? ' tf-drop-over' : ''}`}
          onClick={() => onSelect(null)}
          role="button"
          title={dragging ? 'أفلت هنا لإخراج المهمة من مجلدها' : 'المهام العامة (خارج المجلدات)'}
        >
          <Inbox size={14} className="tf-chip__folder-icon" />
          <span className="tf-chip__name">العام</span>
        </div>

        {shared.length > 0 && <div className="tf-group-label">مشتركة</div>}
        {shared.map(f => (
          <FolderChip
            key={f.id}
            folder={f}
            active={activeFolderId === f.id}
            dragging={dragging}
            canEdit={canManageShared}
            onSelect={() => onSelect(activeFolderId === f.id ? null : f.id)}
            onEdit={() => onEdit(f)}
            onDelete={() => onDelete(f)}
          />
        ))}

        {personal.length > 0 && <div className="tf-group-label">شخصية</div>}
        {personal.map(f => (
          <FolderChip
            key={f.id}
            folder={f}
            active={activeFolderId === f.id}
            dragging={dragging}
            canEdit
            onSelect={() => onSelect(activeFolderId === f.id ? null : f.id)}
            onEdit={() => onEdit(f)}
            onDelete={() => onDelete(f)}
          />
        ))}

        {folders.length === 0 && (
          <div className="tf-empty">لا توجد مجلدات بعد — أنشئ مجلداً لتنظيم مهامك</div>
        )}
      </div>
    </div>
  );
};

/** مودال إنشاء/تعديل مجلد — ERP Dense */
interface TaskFolderModalProps {
  open: boolean;
  folder: TaskFolder | null; // null = إنشاء
  canManageShared: boolean;
  saving: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; color: TaskFolderColor; scope: 'shared' | 'personal' }) => void;
}

export const TaskFolderModal: React.FC<TaskFolderModalProps> = ({
  open, folder, canManageShared, saving, onClose, onSubmit,
}) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState<TaskFolderColor>('gold');
  const [scope, setScope] = useState<'shared' | 'personal'>('personal');

  useEffect(() => {
    if (open) {
      setName(folder?.name ?? '');
      setColor(folder?.color ?? 'gold');
      setScope(folder?.scope ?? 'personal');
    }
  }, [open, folder]);

  const submit = () => {
    if (!name.trim() || saving) return;
    onSubmit({ name: name.trim(), color, scope });
  };

  return (
    <Modal
      open={open}
      onClose={() => !saving && onClose()}
      title={folder ? 'تعديل المجلد' : 'مجلد جديد'}
      icon={FolderClosed}
      size="narrow"
      footerAlign="start"
      footer={
        <>
          <button type="button" className="tf-btn-primary" disabled={saving || !name.trim()} onClick={submit}>
            {saving ? 'جارٍ الحفظ…' : folder ? 'حفظ التعديلات' : 'إنشاء المجلد'}
          </button>
          <button type="button" className="tf-btn-ghost" disabled={saving} onClick={onClose}>إلغاء</button>
        </>
      }
    >
      <div className="tf-form">
        <label className="tf-field">
          <span className="tf-field__label">اسم المجلد</span>
          <input
            autoFocus
            type="text"
            value={name}
            maxLength={100}
            placeholder="مثل: المهام العقارية، مهام المشاريع البحثية…"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
          />
        </label>

        <div className="tf-field">
          <span className="tf-field__label">اللون</span>
          <div className="tf-swatches">
            {FOLDER_COLORS.map(c => (
              <button
                key={c.key}
                type="button"
                className={`tf-swatch tf-color-${c.key}${color === c.key ? ' selected' : ''}`}
                title={c.label}
                onClick={() => setColor(c.key)}
              />
            ))}
          </div>
        </div>

        {/* النطاق يُحدَّد عند الإنشاء فقط — تحويل مجلد بين شخصي/مشترك يربك بقية الفريق */}
        {!folder && (
          <div className="tf-field">
            <span className="tf-field__label">نوع المجلد</span>
            <div className="tf-scope-toggle">
              <button
                type="button"
                className={scope === 'personal' ? 'active' : ''}
                onClick={() => setScope('personal')}
              >
                <Lock size={12} /> شخصي
              </button>
              <button
                type="button"
                className={scope === 'shared' ? 'active' : ''}
                disabled={!canManageShared}
                title={canManageShared ? 'يراه كل المكتب' : 'يتطلب صلاحية إدارة المجلدات المشتركة'}
                onClick={() => canManageShared && setScope('shared')}
              >
                <Users size={12} /> مشترك
              </button>
            </div>
            <span className="tf-field__hint">
              {scope === 'personal'
                ? 'يظهر لك وحدك — تنظيم خاص لمهامك.'
                : 'يراه كل المكتب — تُخفى مهامه من القائمة العامة للجميع.'}
            </span>
          </div>
        )}
      </div>
    </Modal>
  );
};
