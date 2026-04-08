import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  FileCheck,
  Loader2,
  AlertCircle,
  Plus,
  Trash2,
  User,
  Briefcase,
} from 'lucide-react';
import { WekalatService } from '../services/wekalatService';
import '../styles/add-wekala-modal.css';

interface AddWekalaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWekalaAdded: () => void;
}

interface PartyInput { name: string; id_number: string; }

const emptyParty = (): PartyInput => ({ name: '', id_number: '' });

const STATUS_OPTIONS = [
  { value: 'معتمدة', label: 'معتمدة', color: '#16a34a', bg: '#f0fdf4' },
  { value: 'قيد الاعتماد', label: 'قيد الاعتماد', color: '#f59e0b', bg: '#fffbeb' },
  { value: 'منتهية', label: 'منتهية', color: '#ef4444', bg: '#fef2f2' },
  { value: 'مفسوخة', label: 'مفسوخة', color: '#6b7280', bg: '#f3f4f6' },
  { value: 'موقوفة', label: 'موقوفة', color: '#7c3aed', bg: '#f5f3ff' },
];

const WEKALA_TYPES = ['عامة', 'خاصة', 'قضائية', 'بنكية', 'عقارية', 'أخرى'];

export const AddWekalaModal: React.FC<AddWekalaModalProps> = ({
  isOpen, onClose, onWekalaAdded
}) => {
  const [formData, setFormData] = useState({
    number: '', type: '', status: 'معتمدة',
    issue_date_gregorian: '', expiry_date_gregorian: '',
    notary_name: '', issuer: '', agency_text: '',
  });
  const [agents, setAgents] = useState<PartyInput[]>([emptyParty()]);
  const [clients, setClients] = useState<PartyInput[]>([emptyParty()]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showExtra, setShowExtra] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      if (!formData.number.trim()) throw new Error('رقم الوكالة مطلوب');
      const validAgents = agents.filter(a => a.name.trim());
      const validClients = clients.filter(c => c.name.trim());
      await WekalatService.createWekala({
        ...formData, number: formData.number.trim(),
        agents: validAgents.length > 0 ? validAgents : undefined,
        clients: validClients.length > 0 ? validClients : undefined,
      });
      setFormData({ number: '', type: '', status: 'معتمدة', issue_date_gregorian: '', expiry_date_gregorian: '', notary_name: '', issuer: '', agency_text: '' });
      setAgents([emptyParty()]); setClients([emptyParty()]); setShowExtra(false);
      onWekalaAdded(); onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع');
    } finally { setLoading(false); }
  };

  const handleCancel = () => { setError(null); onClose(); };
  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError(null);
  };
  const updateParty = (list: PartyInput[], setList: React.Dispatch<React.SetStateAction<PartyInput[]>>, i: number, field: keyof PartyInput, value: string) => {
    const updated = [...list]; updated[i] = { ...updated[i], [field]: value }; setList(updated);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="add-wekala-modal-overlay" onClick={handleCancel}>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.2 }}
          className="add-wekala-modal" onClick={(e) => e.stopPropagation()}>

          {/* Header */}
          <div className="awm-header">
            <div className="awm-header__icon"><FileCheck size={18} /></div>
            <h2 className="awm-header__title">إضافة وكالة</h2>
            <span className="awm-manual-badge">يدوية</span>
            <button className="awm-close-btn" onClick={handleCancel}><X size={16} /></button>
          </div>

          {error && (
            <div className="awm-error"><AlertCircle size={14} /><span>{error}</span></div>
          )}

          <form onSubmit={handleSubmit} className="awm-form">
            {/* Row 1: Number + Type pills */}
            <div className="awm-field">
              <label>رقم الوكالة *</label>
              <input type="text" value={formData.number}
                onChange={(e) => updateField('number', e.target.value)}
                placeholder="أدخل رقم الوكالة" required />
            </div>

            {/* Type pills */}
            <div className="awm-type-row">
              <label>نوع الوكالة</label>
              <div className="awm-type-pills">
                {WEKALA_TYPES.map(t => (
                  <button key={t} type="button"
                    className={`awm-type-pill ${formData.type === t ? 'awm-type-pill--active' : ''}`}
                    onClick={() => updateField('type', formData.type === t ? '' : t)}
                  >{t}</button>
                ))}
              </div>
            </div>

            {/* Status pills */}
            <div className="awm-status-row">
              <label>الحالة</label>
              <div className="awm-status-pills">
                {STATUS_OPTIONS.map(opt => (
                  <button key={opt.value} type="button"
                    className={`awm-status-pill ${formData.status === opt.value ? 'awm-status-pill--active' : ''}`}
                    style={formData.status === opt.value ? { background: opt.bg, color: opt.color, borderColor: opt.color } : {}}
                    onClick={() => updateField('status', opt.value)}
                  >{opt.label}</button>
                ))}
              </div>
            </div>

            {/* Dates */}
            <div className="awm-row">
              <div className="awm-field awm-field--grow">
                <label>تاريخ الإصدار</label>
                <input type="date" value={formData.issue_date_gregorian}
                  onChange={(e) => updateField('issue_date_gregorian', e.target.value)} />
              </div>
              <div className="awm-field awm-field--grow">
                <label>تاريخ الانتهاء</label>
                <input type="date" value={formData.expiry_date_gregorian}
                  onChange={(e) => updateField('expiry_date_gregorian', e.target.value)} />
              </div>
            </div>

            {/* Agents */}
            <div className="awm-party-section">
              <div className="awm-party-section__head">
                <User size={13} /><span>الوكلاء</span>
                <button type="button" className="awm-add-btn" onClick={() => setAgents(p => [...p, emptyParty()])}>
                  <Plus size={12} />
                </button>
              </div>
              {agents.map((a, i) => (
                <div key={i} className="awm-party-row">
                  <input type="text" value={a.name} placeholder="اسم الوكيل"
                    onChange={(e) => updateParty(agents, setAgents, i, 'name', e.target.value)}
                    className="awm-party-row__name" />
                  <input type="text" value={a.id_number} placeholder="رقم الهوية"
                    onChange={(e) => updateParty(agents, setAgents, i, 'id_number', e.target.value)}
                    className="awm-party-row__id" />
                  {agents.length > 1 && (
                    <button type="button" className="awm-party-row__remove"
                      onClick={() => setAgents(p => p.filter((_, j) => j !== i))}>
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Clients */}
            <div className="awm-party-section">
              <div className="awm-party-section__head">
                <Briefcase size={13} /><span>الموكلون</span>
                <button type="button" className="awm-add-btn" onClick={() => setClients(p => [...p, emptyParty()])}>
                  <Plus size={12} />
                </button>
              </div>
              {clients.map((c, i) => (
                <div key={i} className="awm-party-row">
                  <input type="text" value={c.name} placeholder="اسم الموكل"
                    onChange={(e) => updateParty(clients, setClients, i, 'name', e.target.value)}
                    className="awm-party-row__name" />
                  <input type="text" value={c.id_number} placeholder="رقم الهوية"
                    onChange={(e) => updateParty(clients, setClients, i, 'id_number', e.target.value)}
                    className="awm-party-row__id" />
                  {clients.length > 1 && (
                    <button type="button" className="awm-party-row__remove"
                      onClick={() => setClients(p => p.filter((_, j) => j !== i))}>
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Show more toggle */}
            <button type="button" className="awm-toggle-extra"
              onClick={() => setShowExtra(!showExtra)}>
              {showExtra ? 'إخفاء التفاصيل الإضافية' : '+ تفاصيل إضافية (الموثق، جهة الإصدار، نص الوكالة)'}
            </button>

            {showExtra && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                transition={{ duration: 0.15 }} className="awm-extra">
                <div className="awm-row">
                  <div className="awm-field awm-field--grow">
                    <label>اسم الموثق</label>
                    <input type="text" value={formData.notary_name}
                      onChange={(e) => updateField('notary_name', e.target.value)} placeholder="—" />
                  </div>
                  <div className="awm-field awm-field--grow">
                    <label>جهة الإصدار</label>
                    <input type="text" value={formData.issuer}
                      onChange={(e) => updateField('issuer', e.target.value)} placeholder="كتابة العدل..." />
                  </div>
                </div>
                <div className="awm-field">
                  <label>نص الوكالة</label>
                  <textarea value={formData.agency_text}
                    onChange={(e) => updateField('agency_text', e.target.value)}
                    placeholder="نص الوكالة (اختياري)" rows={2} />
                </div>
              </motion.div>
            )}

            {/* Actions */}
            <div className="awm-actions">
              <button type="button" className="awm-btn awm-btn--cancel" onClick={handleCancel}>إلغاء</button>
              <button type="submit" className="awm-btn awm-btn--submit" disabled={loading}>
                {loading ? <><Loader2 size={15} className="animate-spin" /> جاري الحفظ...</>
                  : <><FileCheck size={15} /> حفظ الوكالة</>}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
