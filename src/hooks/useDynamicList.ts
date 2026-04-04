import { useState, useCallback } from 'react';
import { toast } from 'react-toastify';

interface UseDynamicListOptions<T> {
  items: T[];
  onAdd: (item: T) => Promise<{ success: boolean; message?: string }>;
  onUpdate?: (index: number, item: Partial<T>) => Promise<{ success: boolean; message?: string }>;
  onRemove?: (index: number) => Promise<{ success: boolean; message?: string }>;
  refreshService: () => Promise<void>;
  addSuccessMessage?: string;
  removeSuccessMessage?: string;
  updateSuccessMessage?: string;
}

export function useDynamicList<T>({
  items,
  onAdd,
  onUpdate,
  onRemove,
  refreshService,
  addSuccessMessage = 'تمت الإضافة بنجاح',
  removeSuccessMessage = 'تم الحذف بنجاح',
  updateSuccessMessage = 'تم التحديث بنجاح',
}: UseDynamicListOptions<T>) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [removeLoadingIdx, setRemoveLoadingIdx] = useState<number | null>(null);
  const [updateLoadingIdx, setUpdateLoadingIdx] = useState<number | null>(null);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);

  const handleAdd = useCallback(async (item: T) => {
    setAddLoading(true);
    try {
      const res = await onAdd(item);
      if (res.success) {
        toast.success(addSuccessMessage);
        setShowAddForm(false);
        await refreshService();
      } else {
        toast.error(res.message || 'حدث خطأ أثناء الإضافة');
      }
    } catch {
      toast.error('حدث خطأ في الاتصال');
    } finally {
      setAddLoading(false);
    }
  }, [onAdd, refreshService, addSuccessMessage]);

  const handleRemove = useCallback(async (index: number) => {
    if (!onRemove) return;
    setRemoveLoadingIdx(index);
    try {
      const res = await onRemove(index);
      if (res.success) {
        toast.success(removeSuccessMessage);
        await refreshService();
      } else {
        toast.error(res.message || 'حدث خطأ أثناء الحذف');
      }
    } catch {
      toast.error('حدث خطأ في الاتصال');
    } finally {
      setRemoveLoadingIdx(null);
    }
  }, [onRemove, refreshService, removeSuccessMessage]);

  const handleUpdate = useCallback(async (index: number, data: Partial<T>) => {
    if (!onUpdate) return;
    setUpdateLoadingIdx(index);
    try {
      const res = await onUpdate(index, data);
      if (res.success) {
        toast.success(updateSuccessMessage);
        setEditingIdx(null);
        await refreshService();
      } else {
        toast.error(res.message || 'حدث خطأ أثناء التحديث');
      }
    } catch {
      toast.error('حدث خطأ في الاتصال');
    } finally {
      setUpdateLoadingIdx(null);
    }
  }, [onUpdate, refreshService, updateSuccessMessage]);

  return {
    items,
    showAddForm,
    setShowAddForm,
    addLoading,
    removeLoadingIdx,
    updateLoadingIdx,
    editingIdx,
    setEditingIdx,
    handleAdd,
    handleRemove,
    handleUpdate,
  };
}
