import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Edit2, Trash2, X, Save, RefreshCw,
    ChevronLeft, ChevronRight, Flag, MapPin, Star,
    Plus, CheckSquare, Square, List, Calendar
} from 'lucide-react';
import Swal from 'sweetalert2';
import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';

/* ── Constants ───────────────────────────────────────────────────────────── */
const TYPE_CFG = {
    National: { color: '#EF4444', bg: 'rgba(239,68,68,0.13)', border: 'rgba(239,68,68,0.3)',  light: '#FEF2F2', icon: <Flag   size={11}/> },
    Regional: { color: '#F59E0B', bg: 'rgba(245,158,11,0.13)', border: 'rgba(245,158,11,0.3)', light: '#FFFBEB', icon: <MapPin size={11}/> },
    Optional: { color: '#8B5CF6', bg: 'rgba(139,92,246,0.13)', border: 'rgba(139,92,246,0.3)', light: '#F5F3FF', icon: <Star   size={11}/> },
};
const MONTHS   = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_HDR  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const EMPTY    = { name:'', type:'National', applicableTo:'All', branches:[], departments:[], description:'', isPaid: true };

/* ── MonthGrid — each month tile ─────────────────────────────────────────── */
const MonthGrid = ({ year, monthIdx, holidayMap, onDayClick }) => {
    const firstDay   = new Date(year, monthIdx, 1).getDay();
    const daysInMon  = new Date(year, monthIdx + 1, 0).getDate();
    const todayStr   = new Date().toISOString().split('T')[0];
    const cells      = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMon; d++) cells.push(d);

    return (
        <div style={{ background: 'var(--card-bg)', borderRadius: '20px', border: '1.5px solid var(--border)', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
            {/* Month header */}
            <div style={{ padding: '12px 16px', background: 'var(--primary-gradient)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'white', fontWeight: 900, fontSize: '14px' }}>{MONTHS[monthIdx]}</span>
                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px', fontWeight: 700 }}>{year}</span>
            </div>

            {/* Day-of-week headers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', padding: '10px 8px 4px', gap: '2px' }}>
                {DAY_HDR.map(d => (
                    <div key={d} style={{ fontSize: '9px', fontWeight: 800, color: 'var(--text-muted)', textAlign: 'center' }}>{d}</div>
                ))}
            </div>

            {/* Day cells */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', padding: '0 8px 10px', gap: '3px' }}>
                {cells.map((day, i) => {
                    if (!day) return <div key={`e-${i}`} style={{ height: 36 }} />;
                    const dateStr = `${year}-${String(monthIdx + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                    const holiday = holidayMap[dateStr];
                    const isToday = dateStr === todayStr;
                    const tc      = holiday ? TYPE_CFG[holiday.type] : null;
                    const isSun   = new Date(year, monthIdx, day).getDay() === 0;
                    const isSat   = new Date(year, monthIdx, day).getDay() === 6;

                    return (
                        <div key={day}
                            onClick={() => onDayClick({ date: dateStr, holiday })}
                            title={holiday ? holiday.name : `Add holiday on ${dateStr}`}
                            style={{
                                height: 36, borderRadius: '8px', display: 'flex', flexDirection: 'column',
                                alignItems: 'center', justifyContent: 'center', cursor: 'pointer', gap: '2px',
                                transition: 'all 0.15s',
                                background: holiday ? tc.bg : isToday ? 'var(--primary-blue)' : 'transparent',
                                border: holiday
                                    ? `1.5px solid ${tc.border}`
                                    : isToday ? '2px solid var(--primary-blue)'
                                    : '1.5px solid transparent',
                                position: 'relative',
                            }}
                            onMouseEnter={e => { if (!holiday && !isToday) e.currentTarget.style.background = 'var(--bg-main)'; }}
                            onMouseLeave={e => { if (!holiday && !isToday) e.currentTarget.style.background = 'transparent'; }}>

                            {/* Day number */}
                            <span style={{
                                fontSize: '12px', fontWeight: holiday || isToday ? 900 : 600, lineHeight: 1,
                                color: holiday ? tc.color : isToday ? 'white' : isSun || isSat ? 'var(--text-muted)' : 'var(--text-primary)',
                            }}>{day}</span>

                            {/* Holiday dot */}
                            {holiday && (
                                <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: tc.color }} />
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Month's holiday count badge */}
            {Object.values(holidayMap).filter(h => {
                const [y, m] = h.date.split('-').map(Number);
                return y === year && m - 1 === monthIdx;
            }).length > 0 && (
                <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border)', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {Object.values(holidayMap).filter(h => {
                        const [y, m] = h.date.split('-').map(Number);
                        return y === year && m - 1 === monthIdx;
                    }).map(h => (
                        <span key={h._id} style={{
                            fontSize: '9px', fontWeight: 800, padding: '2px 7px', borderRadius: '20px',
                            background: TYPE_CFG[h.type].bg, color: TYPE_CFG[h.type].color,
                            maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                        }}>
                            {h.date.split('-')[2]} · {h.name}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
};

/* ── HolidayModal — add / edit form ─────────────────────────────────────── */
const HolidayModal = ({ open, onClose, prefillDate, holiday, branches, departments, onSaved }) => {
    const isEdit = !!holiday;
    const [form, setForm] = useState(EMPTY);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!open) return;
        if (isEdit) {
            setForm({ name: holiday.name, type: holiday.type, applicableTo: holiday.applicableTo,
                      branches: holiday.branches || [], departments: holiday.departments || [],
                      description: holiday.description || '', isPaid: holiday.isPaid !== false });
        } else {
            setForm({ ...EMPTY });
        }
    }, [open, holiday, isEdit]);

    const fmtDisplay = (d) => {
        if (!d) return '';
        const [y, m, day] = d.split('-').map(Number);
        return new Date(y, m - 1, day).toLocaleDateString('en-IN', { weekday:'long', day:'2-digit', month:'long', year:'numeric' });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name.trim()) return Swal.fire('Error', 'Holiday name is required', 'error');
        setSaving(true);
        const payload = { ...form, date: prefillDate };
        const url    = isEdit ? `${API_URL}/api/holidays/${holiday._id}` : `${API_URL}/api/holidays`;
        const method = isEdit ? 'PUT' : 'POST';
        try {
            const res  = await authenticatedFetch(url, { method, headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
            const data = await res.json();
            if (data.success) {
                Swal.fire({ title: 'Saved!', text: data.message, icon: 'success', timer: 1400, showConfirmButton: false });
                onClose(); onSaved();
            } else { Swal.fire('Error', data.message || 'Something went wrong', 'error'); }
        } catch { Swal.fire('Error', 'Network error', 'error'); }
        finally { setSaving(false); }
    };

    if (!open) return null;
    return (
        <div className="hrm-modal-overlay" onClick={onClose}>
            <div className="hrm-modal-content" style={{ width: '520px' }} onClick={e => e.stopPropagation()}>
                <div className="hrm-modal-header" style={{ background: 'var(--primary-gradient)', padding: '20px 28px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{ width: 42, height: 42, borderRadius: '12px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Calendar size={20} color="white" />
                        </div>
                        <div>
                            <h3 style={{ color: 'white', fontWeight: 900, margin: 0, fontSize: '17px' }}>
                                {isEdit ? 'Edit Holiday' : 'Mark as Holiday'}
                            </h3>
                            <p style={{ margin: 0, color: 'rgba(255,255,255,0.75)', fontSize: '12px', fontWeight: 600 }}>
                                {fmtDisplay(prefillDate)}
                            </p>
                        </div>
                    </div>
                    <button className="icon-btn" style={{ color:'white', background:'rgba(255,255,255,0.15)', border:'none' }} onClick={onClose}><X size={18}/></button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="hrm-modal-body" style={{ padding: '24px 28px' }}>
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'18px' }}>
                            {/* Name — full width */}
                            <div className="hrm-form-group" style={{ gridColumn:'span 2' }}>
                                <label className="hrm-label">Holiday Name <span style={{color:'var(--danger)'}}>*</span></label>
                                <input className="hrm-input" placeholder="e.g. Diwali, Independence Day"
                                    value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} required />
                            </div>

                            {/* Type */}
                            <div className="hrm-form-group">
                                <label className="hrm-label">Type</label>
                                <select className="hrm-select" value={form.type} onChange={e => setForm(f => ({...f, type: e.target.value}))}>
                                    <option value="National">National</option>
                                    <option value="Regional">Regional</option>
                                    <option value="Optional">Optional</option>
                                </select>
                            </div>

                            {/* Applies to */}
                            <div className="hrm-form-group">
                                <label className="hrm-label">Applies To</label>
                                <select className="hrm-select" value={form.applicableTo}
                                    onChange={e => setForm(f => ({...f, applicableTo: e.target.value, branches:[], departments:[]}))}>
                                    <option value="All">All Employees</option>
                                    <option value="Branch">Specific Branches</option>
                                    <option value="Department">Specific Departments</option>
                                </select>
                            </div>

                            {/* Paid / Unpaid toggle — full width */}
                            <div className="hrm-form-group" style={{ gridColumn:'span 2' }}>
                                <label className="hrm-label">Holiday Pay</label>
                                <div style={{ display:'flex', gap:'12px' }}>
                                    {[
                                        { value: true,  label: 'Paid Holiday',   desc: 'Full salary on this day',    color: '#10B981', bg: 'rgba(16,185,129,0.1)'  },
                                        { value: false, label: 'Unpaid Holiday', desc: 'Salary not paid for this day', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
                                    ].map(opt => {
                                        const active = form.isPaid === opt.value;
                                        return (
                                            <button key={String(opt.value)} type="button"
                                                onClick={() => setForm(f => ({...f, isPaid: opt.value}))}
                                                style={{
                                                    flex: 1, padding: '12px 16px', borderRadius: '12px', cursor: 'pointer',
                                                    border: `2px solid ${active ? opt.color : 'var(--border)'}`,
                                                    background: active ? opt.bg : 'var(--bg-main)',
                                                    textAlign: 'left', transition: 'all 0.15s',
                                                }}>
                                                <div style={{ fontWeight: 800, fontSize: '13px', color: active ? opt.color : 'var(--text-primary)' }}>
                                                    {opt.label}
                                                </div>
                                                <div style={{ fontSize: '11px', color: active ? opt.color : 'var(--text-muted)', marginTop: '3px', fontWeight: 600 }}>
                                                    {opt.desc}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Branch checkbox picker */}
                            {form.applicableTo === 'Branch' && (
                                <div className="hrm-form-group" style={{ gridColumn:'span 2' }}>
                                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                                        <label className="hrm-label" style={{ margin:0 }}>Select Branches</label>
                                        <button type="button"
                                            onClick={() => setForm(f => ({
                                                ...f,
                                                branches: f.branches.length === branches.length ? [] : [...branches]
                                            }))}
                                            style={{ fontSize:'11px', fontWeight:700, color:'var(--primary-blue)', background:'none', border:'none', cursor:'pointer', padding:0 }}>
                                            {form.branches.length === branches.length ? 'Deselect All' : 'Select All'}
                                        </button>
                                    </div>
                                    <div style={{
                                        border:'1.5px solid var(--border)', borderRadius:'12px',
                                        maxHeight:'160px', overflowY:'auto', background:'var(--bg-main)'
                                    }}>
                                        {branches.length === 0 ? (
                                            <div style={{ padding:'16px', textAlign:'center', color:'var(--text-muted)', fontSize:'13px', fontWeight:600 }}>
                                                No branches found
                                            </div>
                                        ) : branches.map((b, i) => {
                                            const checked = form.branches.includes(b);
                                            return (
                                                <label key={b}
                                                    style={{
                                                        display:'flex', alignItems:'center', gap:'10px',
                                                        padding:'10px 14px', cursor:'pointer',
                                                        borderBottom: i < branches.length - 1 ? '1px solid var(--border)' : 'none',
                                                        background: checked ? 'rgba(59,130,246,0.06)' : 'transparent',
                                                        transition:'background 0.15s',
                                                    }}>
                                                    <div style={{
                                                        width:18, height:18, borderRadius:'5px', flexShrink:0,
                                                        border: checked ? 'none' : '2px solid var(--border)',
                                                        background: checked ? 'var(--primary-blue)' : 'transparent',
                                                        display:'flex', alignItems:'center', justifyContent:'center',
                                                        transition:'all 0.15s',
                                                    }}>
                                                        {checked && (
                                                            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                                                <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                                                            </svg>
                                                        )}
                                                    </div>
                                                    <input type="checkbox" checked={checked} style={{ display:'none' }}
                                                        onChange={() => setForm(f => ({
                                                            ...f,
                                                            branches: checked
                                                                ? f.branches.filter(x => x !== b)
                                                                : [...f.branches, b]
                                                        }))} />
                                                    <span style={{ fontSize:'13px', fontWeight: checked ? 700 : 600, color: checked ? 'var(--primary-blue)' : 'var(--text-primary)' }}>
                                                        {b}
                                                    </span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                    {form.branches.length > 0 && (
                                        <div style={{ marginTop:8, display:'flex', flexWrap:'wrap', gap:'6px' }}>
                                            {form.branches.map(b => (
                                                <span key={b} style={{
                                                    display:'inline-flex', alignItems:'center', gap:5,
                                                    padding:'3px 10px', borderRadius:'20px', fontSize:'11px', fontWeight:800,
                                                    background:'rgba(59,130,246,0.12)', color:'var(--primary-blue)',
                                                    border:'1px solid rgba(59,130,246,0.25)'
                                                }}>
                                                    {b}
                                                    <button type="button" onClick={() => setForm(f => ({ ...f, branches: f.branches.filter(x => x !== b) }))}
                                                        style={{ background:'none', border:'none', cursor:'pointer', color:'var(--primary-blue)', padding:0, lineHeight:1, fontSize:13 }}>×</button>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Department checkbox picker */}
                            {form.applicableTo === 'Department' && (
                                <div className="hrm-form-group" style={{ gridColumn:'span 2' }}>
                                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                                        <label className="hrm-label" style={{ margin:0 }}>Select Departments</label>
                                        <button type="button"
                                            onClick={() => setForm(f => ({
                                                ...f,
                                                departments: f.departments.length === departments.length ? [] : [...departments]
                                            }))}
                                            style={{ fontSize:'11px', fontWeight:700, color:'var(--primary-blue)', background:'none', border:'none', cursor:'pointer', padding:0 }}>
                                            {form.departments.length === departments.length ? 'Deselect All' : 'Select All'}
                                        </button>
                                    </div>
                                    <div style={{
                                        border:'1.5px solid var(--border)', borderRadius:'12px',
                                        maxHeight:'160px', overflowY:'auto', background:'var(--bg-main)'
                                    }}>
                                        {departments.length === 0 ? (
                                            <div style={{ padding:'16px', textAlign:'center', color:'var(--text-muted)', fontSize:'13px', fontWeight:600 }}>
                                                No departments found
                                            </div>
                                        ) : departments.map((d, i) => {
                                            const checked = form.departments.includes(d);
                                            return (
                                                <label key={d}
                                                    style={{
                                                        display:'flex', alignItems:'center', gap:'10px',
                                                        padding:'10px 14px', cursor:'pointer',
                                                        borderBottom: i < departments.length - 1 ? '1px solid var(--border)' : 'none',
                                                        background: checked ? 'rgba(139,92,246,0.06)' : 'transparent',
                                                        transition:'background 0.15s',
                                                    }}>
                                                    <div style={{
                                                        width:18, height:18, borderRadius:'5px', flexShrink:0,
                                                        border: checked ? 'none' : '2px solid var(--border)',
                                                        background: checked ? '#8B5CF6' : 'transparent',
                                                        display:'flex', alignItems:'center', justifyContent:'center',
                                                        transition:'all 0.15s',
                                                    }}>
                                                        {checked && (
                                                            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                                                <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                                                            </svg>
                                                        )}
                                                    </div>
                                                    <input type="checkbox" checked={checked} style={{ display:'none' }}
                                                        onChange={() => setForm(f => ({
                                                            ...f,
                                                            departments: checked
                                                                ? f.departments.filter(x => x !== d)
                                                                : [...f.departments, d]
                                                        }))} />
                                                    <span style={{ fontSize:'13px', fontWeight: checked ? 700 : 600, color: checked ? '#8B5CF6' : 'var(--text-primary)' }}>
                                                        {d}
                                                    </span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                    {form.departments.length > 0 && (
                                        <div style={{ marginTop:8, display:'flex', flexWrap:'wrap', gap:'6px' }}>
                                            {form.departments.map(d => (
                                                <span key={d} style={{
                                                    display:'inline-flex', alignItems:'center', gap:5,
                                                    padding:'3px 10px', borderRadius:'20px', fontSize:'11px', fontWeight:800,
                                                    background:'rgba(139,92,246,0.12)', color:'#8B5CF6',
                                                    border:'1px solid rgba(139,92,246,0.25)'
                                                }}>
                                                    {d}
                                                    <button type="button" onClick={() => setForm(f => ({ ...f, departments: f.departments.filter(x => x !== d) }))}
                                                        style={{ background:'none', border:'none', cursor:'pointer', color:'#8B5CF6', padding:0, lineHeight:1, fontSize:13 }}>×</button>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Description */}
                            <div className="hrm-form-group" style={{ gridColumn:'span 2' }}>
                                <label className="hrm-label">Description <span style={{color:'var(--text-muted)', fontWeight:600}}>(optional)</span></label>
                                <textarea className="hrm-textarea" rows={2} placeholder="Any notes about this holiday..."
                                    value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} />
                            </div>
                        </div>
                    </div>
                    <div className="hrm-modal-footer">
                        <button type="button" className="btn-hrm btn-hrm-secondary" onClick={onClose}>CANCEL</button>
                        <button type="submit" className="btn-hrm btn-hrm-primary" disabled={saving}>
                            <Save size={15}/> {saving ? 'SAVING…' : isEdit ? 'UPDATE' : 'MARK HOLIDAY'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

/* ── DayDetailModal — click on an existing holiday day ──────────────────── */
const DayDetailModal = ({ holiday, onClose, onEdit, onDelete }) => {
    if (!holiday) return null;
    const tc = TYPE_CFG[holiday.type];
    const fmtDisplay = (d) => {
        const [y, m, day] = d.split('-').map(Number);
        return new Date(y, m - 1, day).toLocaleDateString('en-IN', { weekday:'long', day:'2-digit', month:'long', year:'numeric' });
    };
    return (
        <div className="hrm-modal-overlay" onClick={onClose}>
            <div className="hrm-modal-content" style={{ width:'420px' }} onClick={e => e.stopPropagation()}>
                <div className="hrm-modal-header" style={{ background: tc.bg, borderBottom:`2px solid ${tc.border}` }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                        <div style={{ width:44, height:44, borderRadius:'12px', background:tc.color, display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:'18px' }}>
                            {tc.icon}
                        </div>
                        <div>
                            <h3 style={{ margin:0, fontWeight:900, color:'var(--text-dark)', fontSize:'16px' }}>{holiday.name}</h3>
                            <p style={{ margin:0, fontSize:'12px', color:'var(--text-secondary)', fontWeight:600 }}>{fmtDisplay(holiday.date)}</p>
                        </div>
                    </div>
                    <button className="icon-btn" onClick={onClose}><X size={18}/></button>
                </div>
                <div className="hrm-modal-body" style={{ padding:'24px' }}>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px', marginBottom:'16px' }}>
                        <div>
                            <p style={{ fontSize:'10px', fontWeight:800, color:'var(--text-muted)', textTransform:'uppercase', marginBottom:6 }}>Type</p>
                            <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'5px 12px', borderRadius:'20px', fontSize:'12px', fontWeight:800, background:tc.bg, color:tc.color, border:`1px solid ${tc.border}` }}>
                                {tc.icon} {holiday.type}
                            </span>
                        </div>
                        <div>
                            <p style={{ fontSize:'10px', fontWeight:800, color:'var(--text-muted)', textTransform:'uppercase', marginBottom:6 }}>Holiday Pay</p>
                            <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'5px 12px', borderRadius:'20px', fontSize:'12px', fontWeight:800,
                                background: holiday.isPaid !== false ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
                                color:      holiday.isPaid !== false ? '#10B981'               : '#F59E0B',
                                border:     `1px solid ${holiday.isPaid !== false ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}` }}>
                                {holiday.isPaid !== false ? '✓ Paid' : '✗ Unpaid'}
                            </span>
                        </div>
                    </div>
                    <div style={{ marginBottom:'16px' }}>
                        <p style={{ fontSize:'10px', fontWeight:800, color:'var(--text-muted)', textTransform:'uppercase', marginBottom:6 }}>Applies To</p>
                        <span style={{ fontSize:'13px', fontWeight:700, color:'var(--text-primary)' }}>
                            {holiday.applicableTo === 'All'
                                ? 'All Employees'
                                : `${holiday.applicableTo}: ${(holiday.applicableTo === 'Branch' ? holiday.branches : holiday.departments).join(', ') || '—'}`}
                        </span>
                    </div>
                    {holiday.description && (
                        <div style={{ padding:'12px 16px', background:'var(--bg-main)', borderRadius:'12px', fontSize:'13px', color:'var(--text-secondary)', fontWeight:600, marginBottom:'16px' }}>
                            {holiday.description}
                        </div>
                    )}
                    <div style={{ display:'flex', gap:'10px' }}>
                        <button className="btn-hrm btn-hrm-primary" style={{ flex:1 }} onClick={onEdit}>
                            <Edit2 size={14}/> EDIT
                        </button>
                        <button className="btn-hrm btn-hrm-danger" style={{ flex:1 }} onClick={onDelete}>
                            <Trash2 size={14}/> DELETE
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

/* ── Main Page ───────────────────────────────────────────────────────────── */
const HolidayCalendar = () => {
    const [holidays,    setHolidays]    = useState([]);
    const [loading,     setLoading]     = useState(true);
    const [year,        setYear]        = useState(new Date().getFullYear());
    const [view,        setView]        = useState('calendar');   // 'calendar' | 'list'
    const [branches,    setBranches]    = useState([]);
    const [departments, setDepartments] = useState([]);

    // Modal states
    const [modalDate,   setModalDate]   = useState(null);   // date string being added/edited
    const [editHoliday, setEditHoliday] = useState(null);   // holiday object when editing
    const [detailHol,   setDetailHol]   = useState(null);   // holiday for detail view

    // List view selection
    const [selectedIds, setSelectedIds] = useState([]);

    /* ── Load reference data ─────────────────────────────────────────────── */
    useEffect(() => {
        authenticatedFetch(`${API_URL}/api/branches`).then(r => r.json())
            .then(d => { if (d.success) setBranches((d.branches || []).map(b => b.branchName)); })
            .catch(() => {});
        authenticatedFetch(`${API_URL}/api/departments`).then(r => r.json())
            .then(d => {
                if (d.success && d.departments) {
                    // Deduplicate by name — departments are stored per branch so the same
                    // name can appear multiple times across branches
                    const unique = [...new Set(d.departments.map(dep => dep.name))];
                    setDepartments(unique);
                }
            })
            .catch(() => {});
    }, []);

    /* ── Fetch holidays ──────────────────────────────────────────────────── */
    const fetchHolidays = useCallback(async () => {
        setLoading(true);
        try {
            const res  = await authenticatedFetch(`${API_URL}/api/holidays?year=${year}`);
            const data = await res.json();
            if (data.success) setHolidays(data.holidays || []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, [year]);

    useEffect(() => { fetchHolidays(); setSelectedIds([]); }, [fetchHolidays]);

    /* ── holidayMap: date string → holiday object ────────────────────────── */
    const holidayMap = useMemo(() => {
        const map = {};
        holidays.forEach(h => { map[h.date] = h; });
        return map;
    }, [holidays]);

    /* ── Stats ───────────────────────────────────────────────────────────── */
    const stats = useMemo(() => ({
        total:    holidays.length,
        national: holidays.filter(h => h.type === 'National').length,
        regional: holidays.filter(h => h.type === 'Regional').length,
        optional: holidays.filter(h => h.type === 'Optional').length,
    }), [holidays]);

    /* ── Day click handler ───────────────────────────────────────────────── */
    const handleDayClick = ({ date, holiday }) => {
        if (holiday) {
            // Existing holiday → show detail
            setDetailHol(holiday);
        } else {
            // Empty day → open add modal with date pre-filled
            setEditHoliday(null);
            setModalDate(date);
        }
    };

    /* ── Open edit from detail modal ─────────────────────────────────────── */
    const handleEditFromDetail = () => {
        setModalDate(detailHol.date);
        setEditHoliday(detailHol);
        setDetailHol(null);
    };

    /* ── Delete ──────────────────────────────────────────────────────────── */
    const handleDelete = async (id) => {
        setDetailHol(null);
        const result = await Swal.fire({
            title: 'Delete Holiday?', text: 'This cannot be undone.', icon: 'warning',
            showCancelButton: true, confirmButtonColor: '#EF4444', cancelButtonColor: '#64748b',
            confirmButtonText: 'Yes, delete'
        });
        if (!result.isConfirmed) return;
        try {
            const res  = await authenticatedFetch(`${API_URL}/api/holidays/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                Swal.fire({ title: 'Deleted!', icon: 'success', timer: 1200, showConfirmButton: false });
                fetchHolidays();
            }
        } catch { Swal.fire('Error', 'Failed to delete', 'error'); }
    };

    /* ── Bulk delete ─────────────────────────────────────────────────────── */
    const handleBulkDelete = async () => {
        if (!selectedIds.length) return;
        const result = await Swal.fire({
            title: `Delete ${selectedIds.length} Holiday(s)?`, icon: 'warning',
            showCancelButton: true, confirmButtonColor: '#EF4444', confirmButtonText: 'Yes, delete all'
        });
        if (!result.isConfirmed) return;
        try {
            const res  = await authenticatedFetch(`${API_URL}/api/holidays/bulk-delete`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: selectedIds })
            });
            const data = await res.json();
            if (data.success) {
                Swal.fire({ title: 'Deleted!', text: data.message, icon: 'success', timer: 1500, showConfirmButton: false });
                setSelectedIds([]); fetchHolidays();
            }
        } catch { Swal.fire('Error', 'Failed to delete', 'error'); }
    };

    /* ── Format helpers ──────────────────────────────────────────────────── */
    const fmtDate    = (d) => { const [y,m,day] = d.split('-').map(Number); return new Date(y,m-1,day).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}); };
    const fmtDayName = (d) => { const [y,m,day] = d.split('-').map(Number); return new Date(y,m-1,day).toLocaleDateString('en-IN',{weekday:'long'}); };

    const toggleSelect    = (id) => setSelectedIds(p => p.includes(id) ? p.filter(i => i !== id) : [...p, id]);
    const toggleSelectAll = () => setSelectedIds(selectedIds.length === holidays.length ? [] : holidays.map(h => h._id));

    return (
        <div className="hrm-container">

            {/* ── Header ───────────────────────────────────────────────── */}
            <div className="hrm-header">
                <div>
                    <h1 className="hrm-title">Holiday Calendar</h1>
                    <p style={{ color:'var(--text-muted)', fontSize:'13px', marginTop:'4px', fontWeight:600 }}>
                        Click any date to mark it as a holiday
                    </p>
                </div>
                <div style={{ display:'flex', gap:'12px', alignItems:'center' }}>
                    {selectedIds.length > 0 && view === 'list' && (
                        <button className="btn-hrm btn-hrm-danger" onClick={handleBulkDelete}>
                            <Trash2 size={16}/> DELETE ({selectedIds.length})
                        </button>
                    )}
                    <button className="btn-hrm btn-hrm-secondary" onClick={fetchHolidays} disabled={loading}>
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''}/> REFRESH
                    </button>
                    {/* View toggle */}
                    <div style={{ display:'flex', background:'var(--bg-main)', borderRadius:'12px', border:'1.5px solid var(--border)', overflow:'hidden' }}>
                        {[{key:'calendar', icon:<Calendar size={15}/>}, {key:'list', icon:<List size={15}/>}].map(v => (
                            <button key={v.key} onClick={() => setView(v.key)}
                                style={{ padding:'10px 16px', border:'none', cursor:'pointer', fontWeight:700, fontSize:'13px',
                                    display:'flex', alignItems:'center', gap:'6px',
                                    background: view === v.key ? 'var(--primary-blue)' : 'transparent',
                                    color: view === v.key ? 'white' : 'var(--text-secondary)' }}>
                                {v.icon} {v.key.charAt(0).toUpperCase() + v.key.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Stat cards ───────────────────────────────────────────── */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'16px', marginBottom:'24px' }}>
                {[
                    { label:'Total Holidays', value:stats.total,    color:'#3B82F6', bg:'rgba(59,130,246,0.1)',   icon:null },
                    { label:'National',        value:stats.national, color:'#EF4444', bg:'rgba(239,68,68,0.1)',   icon:<Flag   size={20}/> },
                    { label:'Regional',        value:stats.regional, color:'#F59E0B', bg:'rgba(245,158,11,0.1)', icon:<MapPin size={20}/> },
                    { label:'Optional',        value:stats.optional, color:'#8B5CF6', bg:'rgba(139,92,246,0.1)', icon:<Star   size={20}/> },
                ].map((s, i) => (
                    <div key={i} className="hrm-card" style={{ padding:'18px 22px', display:'flex', alignItems:'center', gap:'14px' }}>
                        <div style={{ width:46, height:46, borderRadius:'13px', background:s.bg, color:s.color,
                            display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px', fontWeight:900 }}>
                            {s.icon || s.value}
                        </div>
                        <div>
                            <div style={{ fontSize:'22px', fontWeight:900, color:'var(--text-primary)', lineHeight:1 }}>{s.value}</div>
                            <div style={{ fontSize:'12px', fontWeight:700, color:'var(--text-secondary)', marginTop:3 }}>{s.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Year nav + legend row ─────────────────────────────────── */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'20px', flexWrap:'wrap', gap:'12px' }}>
                {/* Year picker */}
                <div style={{ display:'flex', alignItems:'center', gap:'6px', background:'var(--card-bg)', padding:'8px 14px', borderRadius:'14px', border:'1.5px solid var(--border)' }}>
                    <button onClick={() => setYear(y => y - 1)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-secondary)', display:'flex' }}>
                        <ChevronLeft size={18}/>
                    </button>
                    <span style={{ fontWeight:900, fontSize:'18px', color:'var(--text-primary)', minWidth:'52px', textAlign:'center' }}>{year}</span>
                    <button onClick={() => setYear(y => y + 1)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-secondary)', display:'flex' }}>
                        <ChevronRight size={18}/>
                    </button>
                </div>

                {/* Legend */}
                <div style={{ display:'flex', gap:'12px', flexWrap:'wrap' }}>
                    {Object.entries(TYPE_CFG).map(([type, cfg]) => (
                        <div key={type} style={{ display:'flex', alignItems:'center', gap:'7px', padding:'7px 14px', borderRadius:'20px', background:cfg.bg, border:`1.5px solid ${cfg.border}` }}>
                            <span style={{ color:cfg.color }}>{cfg.icon}</span>
                            <span style={{ fontSize:'12px', fontWeight:800, color:cfg.color }}>{type}</span>
                        </div>
                    ))}
                    <div style={{ display:'flex', alignItems:'center', gap:'7px', padding:'7px 14px', borderRadius:'20px', background:'var(--bg-main)', border:'1.5px solid var(--border)', color:'var(--text-muted)', fontSize:'12px', fontWeight:700 }}>
                        Click any day to add ↗
                    </div>
                </div>
            </div>

            {/* ── Calendar View: 12-month grid ─────────────────────────── */}
            {view === 'calendar' && (
                loading ? (
                    <div style={{ textAlign:'center', padding:'80px' }}>
                        <RefreshCw className="animate-spin" size={32} color="var(--primary-blue)" style={{ margin:'0 auto' }}/>
                        <p style={{ marginTop:'16px', fontWeight:600, color:'var(--text-muted)' }}>Loading calendar...</p>
                    </div>
                ) : (
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(240px, 1fr))', gap:'18px' }}>
                        {Array.from({ length: 12 }, (_, i) => (
                            <MonthGrid key={i} year={year} monthIdx={i} holidayMap={holidayMap} onDayClick={handleDayClick} />
                        ))}
                    </div>
                )
            )}

            {/* ── List View ────────────────────────────────────────────── */}
            {view === 'list' && (
                <div className="hrm-card">
                    <div className="hrm-card-header" style={{ justifyContent:'space-between', padding:'16px 24px' }}>
                        <span style={{ fontWeight:700, color:'var(--text-muted)', fontSize:'13px' }}>
                            {holidays.length} HOLIDAY{holidays.length !== 1 ? 'S' : ''} IN {year}
                        </span>
                        <button className="btn-hrm btn-hrm-primary" style={{ padding:'8px 18px', fontSize:'12px' }}
                            onClick={() => { setEditHoliday(null); setModalDate(`${year}-01-01`); }}>
                            <Plus size={14}/> ADD HOLIDAY
                        </button>
                    </div>
                    <div className="hrm-table-wrapper">
                        <table className="hrm-table">
                            <thead>
                                <tr>
                                    <th style={{ width:40, paddingLeft:24 }}>
                                        <button onClick={toggleSelectAll} style={{ background:'none', border:'none', cursor:'pointer',
                                            color: selectedIds.length === holidays.length && holidays.length > 0 ? 'var(--primary-blue)' : 'var(--border)' }}>
                                            {selectedIds.length === holidays.length && holidays.length > 0 ? <CheckSquare size={18}/> : <Square size={18}/>}
                                        </button>
                                    </th>
                                    <th style={{ width:50 }}>Sr.</th>
                                    <th style={{ width:110 }}>Action</th>
                                    <th>Holiday Name</th>
                                    <th>Date</th>
                                    <th>Day</th>
                                    <th>Type</th>
                                    <th>Pay</th>
                                    <th>Applies To</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={9} style={{ textAlign:'center', padding:'60px' }}>
                                        <RefreshCw className="animate-spin" size={28} color="var(--primary-blue)" style={{ margin:'0 auto' }}/>
                                    </td></tr>
                                ) : holidays.length === 0 ? (
                                    <tr><td colSpan={9} style={{ textAlign:'center', padding:'80px' }}>
                                        <Calendar size={48} style={{ margin:'0 auto 16px', opacity:0.2, color:'var(--text-muted)', display:'block' }}/>
                                        <div style={{ color:'var(--text-muted)', fontWeight:700 }}>No holidays added for {year}</div>
                                        <div style={{ color:'var(--text-muted)', fontSize:'13px', marginTop:'8px' }}>
                                            Switch to Calendar view and click any date to add one
                                        </div>
                                    </td></tr>
                                ) : holidays.map((h, idx) => {
                                    const tc = TYPE_CFG[h.type];
                                    return (
                                        <tr key={h._id} style={{ opacity: h.status === 'Inactive' ? 0.5 : 1 }}>
                                            <td style={{ paddingLeft:24 }}>
                                                <button onClick={() => toggleSelect(h._id)} style={{ background:'none', border:'none', cursor:'pointer',
                                                    color: selectedIds.includes(h._id) ? 'var(--primary-blue)' : 'var(--border)' }}>
                                                    {selectedIds.includes(h._id) ? <CheckSquare size={16}/> : <Square size={16}/>}
                                                </button>
                                            </td>
                                            <td>{idx + 1}</td>
                                            <td>
                                                <div style={{ display:'flex', gap:'8px' }}>
                                                    <button className="btn-action-edit" onClick={() => { setEditHoliday(h); setModalDate(h.date); }}><Edit2 size={13}/></button>
                                                    <button className="btn-action-delete" onClick={() => handleDelete(h._id)}><Trash2 size={13}/></button>
                                                </div>
                                            </td>
                                            <td style={{ fontWeight:700, color:'var(--text-dark)' }}>{h.name}</td>
                                            <td style={{ fontWeight:700 }}>{fmtDate(h.date)}</td>
                                            <td style={{ color:'var(--text-secondary)', fontSize:'13px' }}>{fmtDayName(h.date)}</td>
                                            <td>
                                                <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'4px 10px', borderRadius:'20px', fontSize:'11px', fontWeight:800, background:tc.bg, color:tc.color }}>
                                                    {tc.icon} {h.type}
                                                </span>
                                            </td>
                                            <td>
                                                <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'4px 10px', borderRadius:'20px', fontSize:'11px', fontWeight:800,
                                                    background: h.isPaid !== false ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                                                    color:      h.isPaid !== false ? '#10B981'              : '#F59E0B' }}>
                                                    {h.isPaid !== false ? '✓ Paid' : '✗ Unpaid'}
                                                </span>
                                            </td>
                                            <td style={{ fontSize:'12px', fontWeight:700, color: h.applicableTo === 'All' ? 'var(--text-secondary)' : 'var(--primary-blue)' }}>
                                                {h.applicableTo === 'All' ? 'All Employees'
                                                    : `${h.applicableTo}: ${(h.applicableTo === 'Branch' ? h.branches : h.departments).join(', ') || '—'}`}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── Add / Edit Modal ─────────────────────────────────────── */}
            <HolidayModal
                open={!!modalDate}
                onClose={() => { setModalDate(null); setEditHoliday(null); }}
                prefillDate={modalDate}
                holiday={editHoliday}
                branches={branches}
                departments={departments}
                onSaved={() => { setModalDate(null); setEditHoliday(null); fetchHolidays(); }}
            />

            {/* ── Day detail modal (existing holiday clicked) ───────────── */}
            <DayDetailModal
                holiday={detailHol}
                onClose={() => setDetailHol(null)}
                onEdit={handleEditFromDetail}
                onDelete={() => handleDelete(detailHol._id)}
            />

            <style>{`
                .animate-spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default HolidayCalendar;
