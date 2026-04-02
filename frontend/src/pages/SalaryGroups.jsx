import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  RefreshCw, 
  XCircle, 
  Calculator, 
  Info, 
  Settings,
  ChevronDown,
  Check
} from 'lucide-react';
import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';
import Swal from 'sweetalert2';

// --- Elite Premium Select System ---
const EliteSelect = ({ label, value, options, onChange, placeholder = "Select Option..." }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedOption = options.find(opt => opt.value === value || opt === value);
    const displayLabel = typeof selectedOption === 'object' ? selectedOption.label : selectedOption;

    return (
        <div ref={dropdownRef} style={{ position: 'relative', width: '100%' }}>
            <label style={labelStyle}>{label}</label>
            <div 
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    ...inputStyle,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: isOpen ? '#fff' : '#F8FAFC',
                    borderColor: isOpen ? '#2563EB' : '#E2E8F0',
                    boxShadow: isOpen ? '0 0 0 5px rgba(37, 99, 235, 0.1)' : '0 2px 4px rgba(0,0,0,0.02)',
                    padding: '16px 20px',
                    cursor: 'pointer',
                    userSelect: 'none'
                }}
            >
                <span style={{ color: value ? '#0F172A' : '#94A3B8', fontWeight: '800', fontSize: '14.5px' }}>
                    {displayLabel || placeholder}
                </span>
                <ChevronDown size={20} style={{ color: isOpen ? '#2563EB' : '#64748B', transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)', transform: isOpen ? 'rotate(180deg)' : 'none' }} />
            </div>

            {isOpen && (
                <div style={{
                    position: 'absolute', top: 'calc(100% + 10px)', left: 0, right: 0, background: '#fff', 
                    borderRadius: '24px', border: '1.5px solid #E2E8F0', boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.2)', 
                    zIndex: 2500, padding: '10px', maxHeight: '280px', overflowY: 'auto', animation: 'slideFadeDown 0.3s ease-out'
                }}>
                    {options.map((opt, idx) => {
                        const optValue = typeof opt === 'object' ? opt.value : opt;
                        const optLabel = typeof opt === 'object' ? opt.label : opt;
                        const isSelected = optValue === value;
                        return (
                            <div 
                                key={idx}
                                onClick={() => { onChange(optValue); setIsOpen(false); }}
                                style={{
                                    padding: '14px 20px', borderRadius: '16px', cursor: 'pointer', display: 'flex', 
                                    alignItems: 'center', justifyContent: 'space-between', background: isSelected ? '#EFF6FF' : 'transparent', 
                                    color: isSelected ? '#2563EB' : '#475569', fontWeight: isSelected ? '900' : '700', fontSize: '14px', 
                                    transition: 'all 0.2s', marginBottom: '4px'
                                }}
                                onMouseEnter={e => { if (!isSelected) { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.color = '#0F172A'; }}}
                                onMouseLeave={e => { if (!isSelected) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#475569'; }}}
                            >
                                {optLabel}
                                {isSelected && <Check size={18} strokeWidth={3.5} />}
                            </div>
                        );
                    })}
                </div>
            )}
            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes slideFadeDown { from { opacity: 0; transform: translateY(-12px); } to { opacity: 1; transform: translateY(0); } }
                ::-webkit-scrollbar { width: 8px; }
                ::-webkit-scrollbar-thumb { background: #E2E8F0; borderRadius: 20px; border: 2px solid #fff; }
            `}} />
        </div>
    );
};

const SalaryGroups = () => {
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Form States
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState({
        groupName: '',
        payrollFrequency: 'Monthly Pay',
        workingDaysType: 'Calendar days (Paid Week Off & Holiday)',
        salaryCycleStartDate: 1,
        roundedSalary: 'No',
        status: 'Active'
    });

    const fetchGroups = async () => {
        setLoading(true);
        try {
            const res = await authenticatedFetch(`${API_URL}/api/salary-groups/all`);
            const json = await res.json();
            if (json.success) setGroups(json.groups);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchGroups(); }, []);

    const resetForm = () => {
        setForm({
            groupName: '', payrollFrequency: 'Monthly Pay', workingDaysType: 'Calendar days (Paid Week Off & Holiday)',
            salaryCycleStartDate: 1, roundedSalary: 'No', status: 'Active'
        });
        setEditingId(null);
        setShowForm(false);
    };

    const handleEdit = (g) => { setForm({ ...g }); setEditingId(g._id); setShowForm(true); };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const url = editingId ? `${API_URL}/api/salary-groups/update/${editingId}` : `${API_URL}/api/salary-groups/add`;
            const res = await authenticatedFetch(url, { method: editingId ? 'PUT' : 'POST', body: JSON.stringify(form) });
            const json = await res.json();
            if (json.success) { Swal.fire('Success', json.message, 'success'); resetForm(); fetchGroups(); }
            else { Swal.fire('Error', json.message, 'error'); }
        } catch (e) { Swal.fire('Error', 'Something went wrong', 'error'); }
    };

    const handleDelete = async (id) => {
        const result = await Swal.fire({ title: 'Delete Salary Group?', text: 'Irreversible action.', icon: 'warning', showCancelButton: true, confirmButtonColor: '#EF4444', confirmButtonText: 'Yes, delete it!' });
        if (result.isConfirmed) {
            try {
                const res = await authenticatedFetch(`${API_URL}/api/salary-groups/delete/${id}`, { method: 'DELETE' });
                const json = await res.json();
                if (json.success) { Swal.fire('Deleted!', 'Salary Group removed.', 'success'); fetchGroups(); }
                else { Swal.fire('Error', json.message, 'error'); }
            } catch (e) { Swal.fire('Error', 'Deletion failed', 'error'); }
        }
    };

    // --- Options Mapping (Minimalist V1) ---
    const freqOptions = ["Monthly Pay", "Weekly Pay"];
    const wdOptions = ["Calendar days (Paid Week Off & Holiday)", "Fixed Working Days"];
    const yesNoOptions = ["Yes", "No"];
    const statusOptions = ["Active", "Inactive"];
    const dateOptions = Array.from({ length: 30 }, (_, i) => ({ value: i + 1, label: `${i + 1}${getOrdinal(i + 1)} of Month` }));

    function getOrdinal(n) { let s = ["th", "st", "nd", "rd"], v = n % 100; return (s[(v - 20) % 10] || s[v] || s[0]); }

    return (
        <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
            {/* Minimalist Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '45px' }}>
                <div>
                    <h2 style={{ fontSize: '36px', fontWeight: '950', color: '#0F172A', margin: '0 0 10px', letterSpacing: '-0.04em' }}>Salary Common Value</h2>
                    <p style={{ color: '#64748B', fontWeight: '600', fontSize: '15.5px' }}>Core Payroll Configuration</p>
                </div>
                <button onClick={() => setShowForm(true)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '18px 36px', background: '#2563EB', border: 'none', borderRadius: '22px', fontSize: '15px', fontWeight: '900', cursor: 'pointer', color: '#fff', boxShadow: '0 15px 25px -5px rgba(37, 99, 235, 0.45)' }}><Plus size={22} /> Add Salary Group</button>
            </div>

            {/* Premium Table View */}
            <div style={{ background: '#fff', borderRadius: '44px', border: '2px solid #F1F5F9', overflow: 'hidden', boxShadow: '0 25px 45px -15px rgba(0,0,0,0.06)' }}>
                {loading ? ( <div style={{ padding: '120px', textAlign: 'center' }}><RefreshCw className="animate-spin" size={52} color="#2563EB" /></div> ) :
                groups.length === 0 ? ( <div style={{ padding: '140px', textAlign: 'center', color: '#CBD5E1' }}><Calculator size={90} style={{ marginBottom: '28px', opacity: 0.12 }} /><p style={{ fontSize: '22px', fontWeight: '950', color: '#94A3B8' }}>No Salary Policies Found</p></div> ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead><tr style={{ background: '#F8FAFC', borderBottom: '2.5px solid #F1F5F9' }}><th style={thStyle}>Salary Group</th><th style={thStyle}>Frequency</th><th style={thStyle}>Working Days</th><th style={thStyle}>Status</th><th style={thStyle}>Actions</th></tr></thead>
                            <tbody>
                                {groups.map(g => (
                                    <tr key={g._id} style={{ borderBottom: '1.5px solid #F8FAFC', transition: 'all 0.25s' }} onMouseEnter={e => e.currentTarget.style.background = '#F9FBFF'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                        <td style={tdStyle}><div style={{ fontWeight: '900', fontSize: '17px', color: '#1E293B' }}>{g.groupName}</div><div style={{ fontSize: '12.5px', color: '#94A3B8', fontWeight: '750', marginTop: '6px' }}>Cycle Start: Day {g.salaryCycleStartDate}</div></td>
                                        <td style={tdStyle}><div style={{ fontWeight: '800', fontSize: '14.5px', color: '#475569' }}>{g.payrollFrequency}</div></td>
                                        <td style={tdStyle}><div style={{ fontWeight: '750', fontSize: '14px', color: '#64748B' }}>{g.workingDaysType}</div></td>
                                        <td style={tdStyle}><span style={{ padding: '9px 18px', borderRadius: '14px', fontSize: '11px', fontWeight: '950', background: g.status === 'Active' ? '#ECFDF5' : '#FEF2F2', color: g.status === 'Active' ? '#059669' : '#EF4444', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{g.status}</span></td>
                                        <td style={tdStyle}><div style={{ display: 'flex', gap: '12px' }}><button onClick={() => handleEdit(g)} style={actionBtn('#EFF6FF', '#2563EB')}><Edit2 size={20} /></button><button onClick={() => handleDelete(g._id)} style={actionBtn('#FFF1F2', '#E11D48')}><Trash2 size={20} /></button></div></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Ultra-Minimalist V1 Form Drawer */}
            {showForm && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
                    <div onClick={resetForm} style={{ position: 'absolute', inset: 0, background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(16px)' }} />
                    <div style={{ position: 'relative', background: '#fff', borderRadius: '54px', width: '100%', maxWidth: '850px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 50px 100px -20px rgba(0,0,0,0.3)' }}>
                        <form onSubmit={handleSubmit} style={{ padding: '54px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '50px' }}>
                                <div><h3 style={{ margin: 0, fontSize: '32px', fontWeight: '950', color: '#0F172A', letterSpacing: '-0.04em' }}>Setup Salary Group</h3><p style={{ margin: '6px 0 0', color: '#64748B', fontWeight: '700', fontSize: '15px' }}>Configuration window for core payroll drivers.</p></div>
                                <button type="button" onClick={resetForm} style={{ background: '#F8FAFC', border: '1.5px solid #F1F5F9', padding: '14px', borderRadius: '22px', cursor: 'pointer', color: '#64748B' }}><XCircle size={30} /></button>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '32px' }}>
                                <div style={{ gridColumn: 'span 2' }}>
                                    <label style={labelStyle}>Salary Group Name *</label>
                                    <input type="text" required placeholder="e.g. Core Engineering" value={form.groupName} onChange={e => setForm({...form, groupName: e.target.value})} style={{ ...inputStyle, padding: '16px 20px', fontWeight: '800' }} />
                                </div>
                                <EliteSelect label="Payroll Frequency *" value={form.payrollFrequency} options={freqOptions} onChange={v => setForm({...form, payrollFrequency: v})} />
                                <EliteSelect label="Working Days Type *" value={form.workingDaysType} options={wdOptions} onChange={v => setForm({...form, workingDaysType: v})} />
                                <EliteSelect label="Salary Cycle Start Date" value={form.salaryCycleStartDate} options={dateOptions} onChange={v => setForm({...form, salaryCycleStartDate: v})} />
                                <EliteSelect label="Round Off Salary?" value={form.roundedSalary} options={yesNoOptions} onChange={v => setForm({...form, roundedSalary: v})} />
                            </div>

                            <div style={{ marginTop: '55px', display: 'flex', gap: '20px' }}>
                                <button type="submit" style={submitBtnStyle}>{editingId ? 'Save Core Settings' : 'Add New Salary Group'}</button>
                                <button type="button" onClick={resetForm} style={cancelBtnStyle}>Discard</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .animate-spin { animation: spin 1s linear infinite; }` }} />
        </div>
    );
};

const thStyle = { padding: '28px 36px', textAlign: 'left', fontSize: '12.5px', fontWeight: '950', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.12em' };
const tdStyle = { padding: '28px 36px' };
const labelStyle = { display: 'block', marginBottom: '12px', fontSize: '13.5px', fontWeight: '900', color: '#475569' };
const inputStyle = { width: '100%', borderRadius: '20px', border: '2px solid #E2E8F0', fontSize: '15px', color: '#0F172A', outline: 'none', background: '#F8FAFC', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' };
const actionBtn = (bg, color) => ({ padding: '14px', borderRadius: '20px', border: 'none', background: bg, color: color, cursor: 'pointer', display: 'flex', transition: 'all 0.2s' });
const submitBtnStyle = { flex: 1, padding: '22px', borderRadius: '26px', border: 'none', background: '#2563EB', color: '#fff', fontSize: '16px', fontWeight: '950', cursor: 'pointer', boxShadow: '0 15px 30px -5px rgba(37, 99, 235, 0.55)' };
const cancelBtnStyle = { padding: '22px 50px', borderRadius: '26px', border: '2.5px solid #E2E8F0', background: 'transparent', color: '#64748B', fontSize: '16px', fontWeight: '900', cursor: 'pointer' };

export default SalaryGroups;
