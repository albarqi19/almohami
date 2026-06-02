// [P4·UX-09] قوالب العقود (تحت الإعدادات) — معاينة فعلية، لا viewMode ميت، إحصاء من القائمة،
// default_vat_rate كنسبة، إغلاق خارجي للقائمة، toasts/onError، توجيه لمسارات الوحدة الجديدة.
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FileText, Plus, Edit2, Trash2, Copy, Eye, Scale, Briefcase, Percent, FileCheck,
  LayoutGrid, List, Calendar, Bookmark,
} from 'lucide-react';
import { contractTemplateService } from '../../services/contractTemplateService';
import { Modal, FilterBar, ActionMenu, StatCard, StatCardGrid } from '../../components/erp';
import { ToneBadge } from '../../components/erp/StatusBadge';
import { LoadingState, EmptyState, ErrorState } from '../../components/erp/States';
import { formatPercent } from '../../utils/money';
import type { ContractTemplate, ContractType, ScopeType } from '../../types/contracts';
import type { StatusTone } from '../../config/financeStatusConfig';

const CONTRACT_TYPES: { value: ContractType | ''; label: string }[] = [
  { value: '', label: 'جميع الأنواع' },
  { value: 'representation', label: 'تمثيل قانوني' },
  { value: 'consultation', label: 'استشارة' },
  { value: 'retainer', label: 'اشتراك شهري' },
  { value: 'contingency', label: 'نسبة من الحكم' },
  { value: 'other', label: 'أخرى' },
];

const SCOPE_TYPES: { value: ScopeType | ''; label: string }[] = [
  { value: '', label: 'جميع النطاقات' },
  { value: 'plaintiff', label: 'مدّعٍ' },
  { value: 'defendant', label: 'مدّعى عليه' },
  { value: 'both', label: 'كلاهما' },
];

const TYPE_TONE: Record<ContractType, StatusTone> = {
  representation: 'info', consultation: 'warning', contingency: 'success', retainer: 'purple', other: 'neutral',
};

const typeIcon = (type: ContractType) => {
  switch (type) {
    case 'representation': return <Scale size={14} />;
    case 'consultation': return <Briefcase size={14} />;
    case 'contingency': return <Percent size={14} />;
    default: return <FileText size={14} />;
  }
};
const typeName = (type: ContractType) => CONTRACT_TYPES.find((t) => t.value === type)?.label ?? type;
const scopeName = (scope: ScopeType) => SCOPE_TYPES.find((s) => s.value === scope)?.label ?? scope;

const ContractTemplates: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<ContractType | ''>('');
  const [scopeFilter, setScopeFilter] = useState<ScopeType | ''>('');
  const [deleteModal, setDeleteModal] = useState<ContractTemplate | null>(null);
  const [duplicateModal, setDuplicateModal] = useState<ContractTemplate | null>(null);
  const [duplicateName, setDuplicateName] = useState('');
  const [previewTemplate, setPreviewTemplate] = useState<ContractTemplate | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);

  // تخزين وضع العرض (شبكة أو قائمة) مع الحفظ في localStorage
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    return (localStorage.getItem('contract_templates_view_mode') as 'grid' | 'list') || 'grid';
  });

  const handleViewModeChange = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    localStorage.setItem('contract_templates_view_mode', mode);
  };

  const { data: templatesData, isLoading, isError, refetch } = useQuery({
    queryKey: ['contractTemplates', { search, type: typeFilter, scope_type: scopeFilter }],
    queryFn: () => contractTemplateService.getTemplates({
      search: search || undefined,
      type: typeFilter || undefined,
      scope_type: scopeFilter || undefined,
    }),
  });

  const templates: ContractTemplate[] = templatesData?.data?.data || [];

  // إحصاء من القائمة المُعادة مع حساب إجمالي العقود المنشأة
  const stats = useMemo(() => ({
    total: templates.length,
    active: templates.filter((t) => t.is_active).length,
    defaults: templates.filter((t) => t.is_default).length,
    totalUsage: templates.reduce((sum, t) => sum + (t.usage_count || 0), 0),
  }), [templates]);

  const deleteMutation = useMutation({
    mutationFn: (id: number) => contractTemplateService.deleteTemplate(id),
    onSuccess: () => { toast.success('تم حذف القالب'); queryClient.invalidateQueries({ queryKey: ['contractTemplates'] }); setDeleteModal(null); },
    onError: (e: Error) => toast.error(e.message || 'تعذّر حذف القالب'),
  });
  const duplicateMutation = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => contractTemplateService.duplicate(id, name),
    onSuccess: () => { toast.success('تم نسخ القالب'); queryClient.invalidateQueries({ queryKey: ['contractTemplates'] }); setDuplicateModal(null); setDuplicateName(''); },
    onError: (e: Error) => toast.error(e.message || 'تعذّر نسخ القالب'),
  });

  // معاينة فعلية تستهلك [P3·TPL-T05].
  const { data: previewData, isLoading: previewLoading, isError: previewError } = useQuery({
    queryKey: ['contractTemplatePreview', previewTemplate?.id],
    queryFn: () => contractTemplateService.preview(previewTemplate!.id, {}),
    enabled: !!previewTemplate,
  });

  return (
    <div className="fin-module">
      <div className="fin-topbar">
        <div className="fin-topbar__title"><FileCheck size={20} /> قوالب العقود</div>
        <button type="button" className="fin-btn fin-btn--primary" onClick={() => navigate('/settings/contract-templates/new')}>
          <Plus size={15} /> قالب جديد
        </button>
      </div>

      <div className="fin-content">
        <StatCardGrid>
          <StatCard icon={FileText} tone="neutral" value={stats.total} label="إجمالي القوالب" />
          <StatCard icon={FileCheck} tone="success" value={stats.active} label="قوالب نشطة" />
          <StatCard icon={Scale} tone="info" value={stats.defaults} label="قوالب افتراضية" />
          <StatCard icon={Briefcase} tone="purple" value={stats.totalUsage} label="إجمالي عقود الاستخدام" />
        </StatCardGrid>

        <FilterBar
          search={{ value: search, onChange: setSearch, placeholder: 'بحث في القوالب...' }}
          selects={[
            { value: typeFilter, onChange: (v) => setTypeFilter(v as ContractType | ''), options: CONTRACT_TYPES, ariaLabel: 'النوع' },
            { value: scopeFilter, onChange: (v) => setScopeFilter(v as ScopeType | ''), options: SCOPE_TYPES, ariaLabel: 'النطاق' },
          ]}
          actions={(
            <div className="view-toggles" style={{ display: 'inline-flex', background: 'var(--color-surface-subtle)', padding: 3, borderRadius: 6, border: '1px solid var(--color-border)' }}>
              <button
                type="button"
                className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
                style={{
                  padding: 6,
                  borderRadius: 4,
                  border: 'none',
                  background: viewMode === 'grid' ? 'var(--color-surface)' : 'transparent',
                  color: viewMode === 'grid' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  boxShadow: viewMode === 'grid' ? '0 1px 3px rgba(0,0,0,0.05)' : 'none'
                }}
                onClick={() => handleViewModeChange('grid')}
                title="عرض شبكة"
              >
                <LayoutGrid size={15} />
              </button>
              <button
                type="button"
                className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
                style={{
                  padding: 6,
                  borderRadius: 4,
                  border: 'none',
                  background: viewMode === 'list' ? 'var(--color-surface)' : 'transparent',
                  color: viewMode === 'list' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  boxShadow: viewMode === 'list' ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
                  marginRight: 2
                }}
                onClick={() => handleViewModeChange('list')}
                title="عرض قائمة"
              >
                <List size={15} />
              </button>
            </div>
          )}
        />

        {isLoading ? <LoadingState /> : isError ? <ErrorState onRetry={() => refetch()} /> : templates.length === 0 ? (
          <EmptyState icon={FileText} title="لا توجد قوالب" desc="ابدأ بإنشاء قالب عقد جديد.">
            <button type="button" className="fin-btn fin-btn--primary fin-btn--sm" style={{ marginTop: 8 }} onClick={() => navigate('/settings/contract-templates/new')}>
              <Plus size={14} /> إنشاء قالب
            </button>
          </EmptyState>
        ) : viewMode === 'grid' ? (
          <div className="templates-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12, padding: '12px 0' }}>
            {templates.map((template) => {
              const isMenuOpen = activeMenuId === template.id;
              return (
                <div
                  key={template.id}
                  className={`template-card ${template.is_default ? 'template-card--default' : ''}`}
                  style={{
                    position: 'relative',
                    background: 'var(--color-surface)',
                    border: template.is_default ? '1px solid var(--color-primary-soft)' : '1px solid var(--color-border)',
                    borderRadius: 6,
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: 180,
                    transition: 'all 0.2s ease',
                    zIndex: isMenuOpen ? 50 : 2,
                  }}
                >
                  {/* Watermark Background Icon Wrapper (clips the watermark but keeps card overflow visible) */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      width: 66,
                      height: 66,
                      overflow: 'hidden',
                      pointerEvents: 'none',
                      zIndex: 1,
                      borderBottomLeftRadius: 6
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        bottom: -6,
                        left: -6,
                        opacity: 0.02,
                        color: 'var(--color-primary)',
                      }}
                    >
                      {React.cloneElement(typeIcon(template.type), { size: 72 })}
                    </div>
                  </div>

                  <div style={{ zIndex: 2 }}>
                    {/* Card Header Badges */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        <ToneBadge tone={TYPE_TONE[template.type] ?? 'neutral'}>
                          <span style={{ fontSize: 10, display: 'flex', alignItems: 'center', gap: 3 }}>
                            {typeIcon(template.type)} {typeName(template.type)}
                          </span>
                        </ToneBadge>
                        <ToneBadge tone={template.is_active ? 'success' : 'neutral'}>
                          <span style={{ fontSize: 10 }}>{template.is_active ? 'نشط' : 'غير نشط'}</span>
                        </ToneBadge>
                      </div>
                      
                      <div onClick={(e) => e.stopPropagation()}>
                        <ActionMenu
                          onOpenChange={(open) => setActiveMenuId(open ? template.id : null)}
                          items={[
                            { label: 'تعديل القالب', icon: Edit2, onClick: () => navigate(`/settings/contract-templates/${template.id}`) },
                            { label: 'معاينة القالب', icon: Eye, onClick: () => setPreviewTemplate(template) },
                            { label: 'نسخ القالب', icon: Copy, onClick: () => { setDuplicateModal(template); setDuplicateName(`نسخة من ${template.name}`); } },
                            { label: 'حذف القالب', icon: Trash2, variant: 'danger', divider: true, onClick: () => setDeleteModal(template) },
                          ]}
                        />
                      </div>
                    </div>

                  {/* ID */}
                  <div style={{ fontSize: 10, color: 'var(--color-text-secondary)', marginBottom: 2, fontFamily: 'monospace' }}>
                    #TPL-{template.id.toString().padStart(3, '0')}
                  </div>

                  {/* Title */}
                  <h3
                    className="template-name"
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: 'var(--color-heading)',
                      margin: '0 0 2px 0',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                    onClick={() => navigate(`/settings/contract-templates/${template.id}`)}
                    title={template.name}
                  >
                    {template.name}
                  </h3>
                  
                  {/* Secondary name */}
                  {template.name_ar && template.name_ar !== template.name && (
                    <p
                      className="template-name-ar"
                      style={{
                        fontSize: 12,
                        color: 'var(--color-text-secondary)',
                        margin: '0 0 6px 0',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {template.name_ar}
                    </p>
                  )}

                  {/* Description */}
                  {template.description ? (
                    <p
                      className="template-description"
                      style={{
                        fontSize: 12,
                        color: 'var(--color-text-secondary)',
                        margin: '0 0 10px 0',
                        lineHeight: 1.4,
                        height: 32,
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical'
                      }}
                    >
                      {template.description}
                    </p>
                  ) : (
                    <p
                      style={{
                        fontSize: 12,
                        color: 'var(--color-text-secondary)',
                        fontStyle: 'italic',
                        margin: '0 0 10px 0',
                        lineHeight: 1.4,
                        height: 32
                      }}
                    >
                      لا يوجد وصف لهذا قالب.
                    </p>
                  )}
                </div>

                <div style={{ zIndex: 2 }}>
                  {/* Metadata Row */}
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '4px 8px',
                      padding: '8px 0',
                      borderTop: '1px solid var(--color-border)',
                      marginBottom: 10,
                      fontSize: 11,
                      color: 'var(--color-text)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Scale size={11} style={{ color: 'var(--color-text-secondary)' }} />
                      <span style={{ color: 'var(--color-text-secondary)' }}>النطاق:</span>
                      <span style={{ fontWeight: 500 }}>{scopeName(template.scope_type)}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Percent size={11} style={{ color: 'var(--color-text-secondary)' }} />
                      <span style={{ color: 'var(--color-text-secondary)' }}>الضريبة:</span>
                      <span style={{ fontWeight: 500 }}>{formatPercent(template.default_vat_rate)}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Briefcase size={11} style={{ color: 'var(--color-text-secondary)' }} />
                      <span style={{ color: 'var(--color-text-secondary)' }}>الاستخدام:</span>
                      <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
                        {template.usage_count ?? 0}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Calendar size={11} style={{ color: 'var(--color-text-secondary)' }} />
                      <span style={{ fontWeight: 500 }}>
                        {new Date(template.updated_at).toLocaleDateString('ar-SA', { year: '2-digit', month: 'numeric', day: 'numeric' })}
                      </span>
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      type="button"
                      className="fin-btn fin-btn--primary fin-btn--sm"
                      style={{ flex: 1, height: 28, fontSize: 11, padding: '0 8px' }}
                      onClick={() => navigate(`/finance/contracts/new?template=${template.id}`)}
                    >
                      <Plus size={12} /> إنشاء عقد
                    </button>
                    <button
                      type="button"
                      className="fin-btn fin-btn--ghost fin-btn--sm"
                      style={{ flex: 1, height: 28, fontSize: 11, padding: '0 8px' }}
                      onClick={() => setPreviewTemplate(template)}
                    >
                      <Eye size={12} /> معاينة
                    </button>
                  </div>
                </div>

                {/* Bookmark badge for defaults */}
                {template.is_default && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      right: 16,
                      background: 'var(--color-primary-soft)',
                      color: 'var(--color-primary)',
                      fontSize: 9,
                      fontWeight: 600,
                      padding: '3px 6px',
                      borderBottomLeftRadius: 4,
                      borderBottomRightRadius: 4,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      border: '1px solid var(--color-primary-soft)',
                      borderTop: 'none'
                    }}
                  >
                    <Bookmark size={8} fill="currentColor" /> افتراضي
                  </div>
                )}
              </div>
            );
          })}
          </div>
        ) : (
          <div className="fin-table-wrap" style={{ marginTop: 20 }}>
            <div className="fin-table-scroll">
              <table className="fin-table">
                <thead>
                  <tr>
                    <th>اسم القالب</th>
                    <th>النوع</th>
                    <th>النطاق</th>
                    <th className="fin-col--center">الضريبة الافتراضية</th>
                    <th className="fin-col--center">عدد مرات الاستخدام</th>
                    <th>الحالة</th>
                    <th>تاريخ التعديل</th>
                    <th className="fin-col--end" style={{ width: 120 }}>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {templates.map((template) => (
                    <tr key={template.id} className="is-clickable" onClick={() => navigate(`/settings/contract-templates/${template.id}`)}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 32,
                            height: 32,
                            borderRadius: 6,
                            background: 'var(--color-surface-subtle)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--color-text-secondary)'
                          }}>
                            {typeIcon(template.type)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--color-heading)' }}>
                              {template.name}
                              {template.is_default && (
                                <span style={{
                                  marginRight: 8,
                                  padding: '2px 6px',
                                  background: 'rgba(245, 158, 11, 0.1)',
                                  color: '#d97706',
                                  fontSize: 10,
                                  borderRadius: 4,
                                  fontWeight: 500
                                }}>
                                  افتراضي
                                </span>
                              )}
                            </div>
                            {template.name_ar && template.name_ar !== template.name && (
                              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>{template.name_ar}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <ToneBadge tone={TYPE_TONE[template.type] ?? 'neutral'}>
                          {typeName(template.type)}
                        </ToneBadge>
                      </td>
                      <td>{scopeName(template.scope_type)}</td>
                      <td className="fin-col--center fin-col--num">{formatPercent(template.default_vat_rate)}</td>
                      <td className="fin-col--center fin-col--num">
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: 12,
                          background: 'var(--color-surface-subtle)',
                          fontSize: 12,
                          fontWeight: 600
                        }}>
                          {template.usage_count ?? 0} عقد
                        </span>
                      </td>
                      <td>
                        <ToneBadge tone={template.is_active ? 'success' : 'neutral'}>
                          {template.is_active ? 'نشط' : 'غير نشط'}
                        </ToneBadge>
                      </td>
                      <td className="fin-col--num" style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                        {new Date(template.updated_at).toLocaleDateString('ar-SA', { year: 'numeric', month: '2-digit', day: '2-digit' })}
                      </td>
                      <td className="fin-col--end" onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                          <button
                            type="button"
                            className="fin-btn fin-btn--ghost fin-btn--sm"
                            style={{ padding: 6 }}
                            onClick={() => setPreviewTemplate(template)}
                            title="معاينة القالب"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            type="button"
                            className="fin-btn fin-btn--ghost fin-btn--sm"
                            style={{ padding: 6 }}
                            onClick={() => navigate(`/settings/contract-templates/${template.id}`)}
                            title="تعديل القالب"
                          >
                            <Edit2 size={14} />
                          </button>
                          <ActionMenu
                            items={[
                              { label: 'إنشاء عقد', icon: Plus, onClick: () => navigate(`/finance/contracts/new?template=${template.id}`) },
                              { label: 'نسخ القالب', icon: Copy, onClick: () => { setDuplicateModal(template); setDuplicateName(`نسخة من ${template.name}`); } },
                              { label: 'حذف القالب', icon: Trash2, variant: 'danger', divider: true, onClick: () => setDeleteModal(template) },
                            ]}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* معاينة فعلية */}
      <Modal open={!!previewTemplate} onClose={() => setPreviewTemplate(null)} title={`معاينة: ${previewTemplate?.name ?? ''}`} icon={Eye} size="wide">
        {previewLoading ? <LoadingState /> : previewError ? <ErrorState /> : (
          <div
            style={{ fontSize: 14, lineHeight: 1.9, color: 'var(--color-text)' }}
            // المحتوى مُنظَّف خادمياً (SEC-05) — عرض HTML الناتج عن المعاينة.
            dangerouslySetInnerHTML={{ __html: previewData?.data?.content ?? '' }}
          />
        )}
      </Modal>

      {/* حذف */}
      <Modal
        open={!!deleteModal}
        onClose={() => setDeleteModal(null)}
        title="حذف القالب"
        icon={Trash2}
        size="narrow"
        footer={(
          <>
            <button type="button" className="fin-btn" onClick={() => setDeleteModal(null)}>إلغاء</button>
            <button type="button" className="fin-btn fin-btn--danger" disabled={deleteMutation.isPending} onClick={() => deleteModal && deleteMutation.mutate(deleteModal.id)}>
              {deleteMutation.isPending ? 'جارٍ الحذف...' : 'حذف'}
            </button>
          </>
        )}
      >
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>هل أنت متأكد من حذف قالب «{deleteModal?.name}»؟ لا يمكن التراجع.</p>
      </Modal>

      {/* نسخ */}
      <Modal
        open={!!duplicateModal}
        onClose={() => { setDuplicateModal(null); setDuplicateName(''); }}
        title="نسخ القالب"
        icon={Copy}
        size="narrow"
        footer={(
          <>
            <button type="button" className="fin-btn" onClick={() => { setDuplicateModal(null); setDuplicateName(''); }}>إلغاء</button>
            <button type="button" className="fin-btn fin-btn--primary" disabled={duplicateMutation.isPending || !duplicateName.trim()} onClick={() => duplicateModal && duplicateMutation.mutate({ id: duplicateModal.id, name: duplicateName })}>
              {duplicateMutation.isPending ? 'جارٍ النسخ...' : 'نسخ'}
            </button>
          </>
        )}
      >
        <div className="fin-field">
          <label className="fin-field__label">اسم القالب الجديد</label>
          <input className="fin-input" value={duplicateName} onChange={(e) => setDuplicateName(e.target.value)} placeholder="اسم القالب الجديد" />
        </div>
      </Modal>
    </div>
  );
};

export default ContractTemplates;
