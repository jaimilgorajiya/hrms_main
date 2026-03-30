import React, { useState, useEffect, useCallback } from 'react';
import { User, Calendar, Clock, MessageSquare, Save, RefreshCw, CheckCircle, ArrowLeft, Plus, XCircle, Search, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SearchableSelect from '../components/SearchableSelect';
import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';

const AddAttendance = () => {
    const navigate = useNavigate();
    const today = new Date().toISOString().split('T')[0];
    
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [employees, setEmployees] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [formLoading, setFormLoading] = useState(false);
    const [search, setSearch] = useState('');
    
    const [selectedEmployeeName, setSelectedEmployeeName] = useState('');
    
    const [formData, setFormData] = useState({
        employeeId: '',
        date: today,
        status: 'Present',
        inTime: '09:00',
        outTime: '18:00',
        remark: ''
    });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await authenticatedFetch(`${API_URL}/api/attendance/admin/missing`);
            const json = await res.json();
            if (json.success) setRecords(json.records);
            
            const empRes = await authenticatedFetch(`${API_URL}/api/users`);
            const empJson = await empRes.json();
            if (empJson.success) setEmployees(empJson.users);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleOpenModal = (record = null) => {
        if (record) {
            setSelectedEmployeeName(record.employee.name);
            setFormData({
                employeeId: record.employee._id,
                date: record.date,
                status: 'Present',
                inTime: '09:00',
                outTime: '18:00',
                remark: `Correction for ${record.status} on ${record.date}`
            });
        } else {
            setSelectedEmployeeName('');
            setFormData({
                employeeId: '',
                date: today,
                status: 'Present',
                inTime: '09:00',
                outTime: '18:00',
                remark: ''
            });
        }
        setModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormLoading(true);
        try {
            const res = await authenticatedFetch(`${API_URL}/api/attendance/admin/add-manual`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const json = await res.json();
            if (json.success) {
                setModalOpen(false);
                fetchData();
            } else {
                alert(json.message);
            }
        } catch (e) { console.error(e); }
        finally { setFormLoading(false); }
    };

    const filtered = records.filter(r => 
        r.employee?.name?.toLowerCase().includes(search.toLowerCase()) || 
        r.employee?.employeeId?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
                <div>
                    <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px' }}>Add & Correct Attendance</h2>
                    <p style={{ color: '#64748b', margin: 0, fontSize: '14px' }}>Resolve missing logs and rejected attendance records</p>
                </div>
                <button 
                    onClick={() => handleOpenModal()}
                    style={{ 
                        display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', 
                        background: '#2563EB', color: 'white', border: 'none', borderRadius: '12px',
                        fontSize: '14px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)'
                    }}
                >
                    <Plus size={18} /> Add Manual Log
                </button>
            </div>

            {/* Filter */}
            <div style={{ position: 'relative', marginBottom: '20px', maxWidth: '400px' }}>
                <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                <input 
                    type="text" placeholder="Search missing records..." 
                    value={search} onChange={e => setSearch(e.target.value)}
                    style={{ width: '100%', padding: '12px 12px 12px 42px', border: '1.5px solid #E2E8F0', borderRadius: '12px', outline: 'none' }}
                />
            </div>

            {/* Table */}
            <div style={{ background: '#fff', borderRadius: '20px', border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                {loading ? (
                    <div style={{ padding: '100px', textAlign: 'center' }}>
                        <RefreshCw className="animate-spin" size={32} color="#2563EB" />
                        <p style={{ marginTop: '16px', color: '#64748b', fontWeight: '600' }}>Fetching queue...</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div style={{ padding: '80px', textAlign: 'center' }}>
                        <CheckCircle size={48} color="#10B981" style={{ opacity: 0.3, marginBottom: '16px' }} />
                        <h3 style={{ margin: 0, color: '#0f172a' }}>All Clear!</h3>
                        <p style={{ color: '#64748b', marginTop: '8px' }}>No rejected or missing attendance records found matching your search.</p>
                    </div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                                {['Employee', 'Date', 'Previous Status', 'Current Logs', 'Action'].map(h => (
                                    <th key={h} style={{ padding: '16px', textAlign: 'left', fontSize: '13px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(r => (
                                <tr key={r._id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                    <td style={{ padding: '16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#F1F5F9', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', color: '#2563EB' }}>
                                                {r.employee?.name?.charAt(0)}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: '700', color: '#0f172a' }}>{r.employee?.name}</div>
                                                <div style={{ fontSize: '12px', color: '#94A3B8' }}>{r.employee?.employeeId} · {r.employee?.department}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px', fontSize: '14px', color: '#334155', fontWeight: '600' }}>
                                        {new Date(r.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        <span style={{ 
                                            padding: '4px 12px', borderRadius: '999px', fontSize: '11px', fontWeight: '800',
                                            background: r.approvalStatus === 'Rejected' ? '#FEF2F2' : '#F1F5F9',
                                            color: r.approvalStatus === 'Rejected' ? '#EF4444' : '#64748B',
                                            display: 'inline-flex', alignItems: 'center', gap: '4px'
                                        }}>
                                            {r.approvalStatus === 'Rejected' ? <XCircle size={12} /> : <AlertCircle size={12} />}
                                            {r.approvalStatus === 'Rejected' ? 'Rejected' : r.status}
                                        </span>
                                    </td>
                                    <td style={{ padding: '16px', fontSize: '13px', color: '#64748b' }}>
                                        {r.punchIn ? `In: ${r.punchIn}` : 'No In'} · {r.punchOut ? `Out: ${r.punchOut}` : 'No Out'}
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        <button 
                                            onClick={() => handleOpenModal(r)}
                                            style={{ 
                                                padding: '8px 16px', borderRadius: '8px', background: '#F0F9FF', border: '1.5px solid #0EA5E9', 
                                                color: '#0EA5E9', fontWeight: '700', fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s'
                                            }}
                                            onMouseEnter={e => { e.target.style.background = '#0EA5E9'; e.target.style.color = '#fff'; }}
                                            onMouseLeave={e => { e.target.style.background = '#F0F9FF'; e.target.style.color = '#0EA5E9'; }}
                                        >
                                            Fix / Add
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Modal */}
            {modalOpen && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div onClick={() => setModalOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)' }} />
                    <div style={{ position: 'relative', background: '#fff', borderRadius: '28px', width: '100%', maxWidth: '520px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
                        <div style={{ padding: '24px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>{formData.remark.startsWith('Correction') ? 'Correct Attendance' : 'Add Attendance'}</h3>
                            <button onClick={() => setModalOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94A3B8' }}><XCircle size={22} /></button>
                        </div>
                        
                        <form onSubmit={handleSubmit} style={{ padding: '32px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                {formData.remark.startsWith('Correction') ? (
                                    <div style={{ background: '#F0F9FF', padding: '16px', borderRadius: '16px', border: '1px solid #BAE6FD', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ fontSize: '11px', fontWeight: '800', color: '#0369A1', textTransform: 'uppercase', marginBottom: '4px' }}>Correcting For</div>
                                            <div style={{ fontSize: '16px', fontWeight: '800', color: '#0c4a6e' }}>{selectedEmployeeName}</div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '11px', fontWeight: '800', color: '#0369A1', textTransform: 'uppercase', marginBottom: '4px' }}>Log Date</div>
                                            <div style={{ fontSize: '16px', fontWeight: '800', color: '#0c4a6e' }}>{new Date(formData.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <SearchableSelect
                                            label="Employee"
                                            required
                                            placeholder="Search an employee..."
                                            searchable={true}
                                            options={employees.map(e => ({ label: `${e.name} (${e.employeeId})`, value: e._id }))}
                                            value={formData.employeeId}
                                            onChange={(val) => setFormData({ ...formData, employeeId: val })}
                                        />
                                    </div>
                                )}

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    {!formData.remark.startsWith('Correction') && (
                                        <div>
                                            <label className="hrm-label">Date</label>
                                            <input type="date" required className="hrm-input"
                                                value={formData.date}
                                                onChange={e => setFormData({...formData, date: e.target.value})}
                                            />
                                        </div>
                                    )}
                                    <div style={{ gridColumn: formData.remark.startsWith('Correction') ? 'span 2' : 'span 1' }}>
                                        <SearchableSelect
                                            label="Set Status"
                                            required
                                            options={[
                                                { label: 'Present', value: 'Present' },
                                                { label: 'Half Day', value: 'Half Day' },
                                                { label: 'On Leave', value: 'On Leave' }
                                            ]}
                                            value={formData.status}
                                            onChange={(val) => setFormData({ ...formData, status: val })}
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <div>
                                        <label className="hrm-label">Punch In</label>
                                        <input type="time" value={formData.inTime} onChange={e => setFormData({...formData, inTime: e.target.value})} className="hrm-input" />
                                    </div>
                                    <div>
                                        <label className="hrm-label">Punch Out</label>
                                        <input type="time" value={formData.outTime} onChange={e => setFormData({...formData, outTime: e.target.value})} className="hrm-input" />
                                    </div>
                                </div>

                                <div>
                                    <label className="hrm-label">Administrative Remark</label>
                                    <textarea value={formData.remark} onChange={e => setFormData({...formData, remark: e.target.value})}
                                        className="hrm-textarea" style={{ height: '80px', resize: 'none' }}
                                    />
                                </div>

                                <button type="submit" disabled={formLoading}
                                    style={{ 
                                        marginTop: '10px', padding: '16px', borderRadius: '16px', background: '#2563EB', color: 'white', 
                                        border: 'none', fontWeight: '800', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
                                    }}
                                >
                                    {formLoading ? <RefreshCw className="animate-spin" size={20} /> : <><Save size={20} /> Update Record</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .animate-spin { animation: spin 1s linear infinite; }
            `}</style>
        </div>
    );
};

export default AddAttendance;
