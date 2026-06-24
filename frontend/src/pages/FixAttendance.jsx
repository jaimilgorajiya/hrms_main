import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { User, Calendar, Clock, Save, RefreshCw, CheckCircle, AlertCircle, Edit3 } from 'lucide-react';
import SearchableSelect from '../components/SearchableSelect';
import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';
import Swal from 'sweetalert2';

// Helper to convert time formats (like "09:30 am") to HH:MM for time inputs
const to24hr = (timeStr) => {
    if (!timeStr) return '';
    const s = timeStr.trim();
    const match = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?$/i);
    if (!match) return s; 
    let [, h, m, , period] = match;
    h = parseInt(h, 10);
    if (period) {
        const p = period.toLowerCase();
        if (p === 'am' && h === 12) h = 0;
        if (p === 'pm' && h !== 12) h += 12;
    }
    return `${String(h).padStart(2, '0')}:${m}`;
};

const FixAttendance = () => {
    const today = new Date().toISOString().split('T')[0];
    const location = useLocation();
    const navigate = useNavigate();
    const state = location.state || {};

    const [employees, setEmployees] = useState([]);
    const [loadingEmployees, setLoadingEmployees] = useState(true);
    const [fetchingRecord, setFetchingRecord] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [selectedEmp, setSelectedEmp] = useState(state.employeeId || '');
    const [selectedDate, setSelectedDate] = useState(state.date || today);
    
    // Existing log preview states
    const [existingRecord, setExistingRecord] = useState(null);
    const [hasLoaded, setHasLoaded] = useState(false);

    // Edit form states
    const [status, setStatus] = useState('Present');
    const [inTime, setInTime] = useState('09:30');
    const [outTime, setOutTime] = useState('');
    const [remark, setRemark] = useState('');

    useEffect(() => {
        const fetchEmployees = async () => {
            try {
                const res = await authenticatedFetch(`${API_URL}/api/users`);
                const json = await res.json();
                if (json.success) setEmployees(json.users);
            } catch (e) {
                console.error("Error fetching employees:", e);
            } finally {
                setLoadingEmployees(false);
            }
        };
        fetchEmployees();
    }, []);

    // Automatically load existing log when employee or date changes
    useEffect(() => {
        if (selectedEmp && selectedDate) {
            handleFetchRecord();
        } else {
            setExistingRecord(null);
            setHasLoaded(false);
        }
    }, [selectedEmp, selectedDate]);

    const handleFetchRecord = async () => {
        setFetchingRecord(true);
        try {
            const res = await authenticatedFetch(`${API_URL}/api/attendance/admin/get-record?employeeId=${selectedEmp}&date=${selectedDate}`);
            const json = await res.json();
            if (json.success) {
                setExistingRecord(json.record);
                if (json.record) {
                    setStatus(json.record.status || 'Present');
                    setInTime(json.record.punchIn ? to24hr(json.record.punchIn) : '09:30');
                    setOutTime(json.record.punchOut ? to24hr(json.record.punchOut) : '');
                    setRemark(json.record.remark || '');
                } else {
                    // Reset to defaults for empty logs
                    setStatus('Present');
                    setInTime('09:30');
                    setOutTime('');
                    setRemark('');
                }
                setHasLoaded(true);
            } else {
                Swal.fire('Error', json.message || 'Failed to fetch logs', 'error');
            }
        } catch (e) {
            console.error("Error fetching record:", e);
        } finally {
            setFetchingRecord(false);
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        if (!selectedEmp || !selectedDate) {
            Swal.fire('Warning', 'Please select an employee and date.', 'warning');
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                employeeId: selectedEmp,
                date: selectedDate,
                status,
                inTime: (status === 'On Leave' || status === 'Absent') ? '' : inTime,
                outTime: (status === 'On Leave' || status === 'Absent') ? '' : outTime,
                remark: remark || 'Direct manual update by administrator'
            };

            const res = await authenticatedFetch(`${API_URL}/api/attendance/admin/add-manual`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const json = await res.json();

            if (json.success) {
                await Swal.fire({
                    title: 'Success!',
                    text: 'Attendance record updated successfully.',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false
                });
                
                if (state.fromSalarySlip) {
                    navigate('/admin/payroll/create-salary-slip', {
                        state: {
                            employeeId: state.employeeId,
                            monthYear: state.monthYear,
                            branch: state.branch,
                            department: state.department
                        }
                    });
                } else {
                    handleFetchRecord(); // Refresh preview
                }
            } else {
                Swal.fire('Error', json.message || 'Failed to update record', 'error');
            }
        } catch (e) {
            console.error("Error updating attendance:", e);
            Swal.fire('Error', 'Something went wrong.', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="hrm-container">
            <div className="hrm-header" style={{ marginBottom: '32px' }}>
                <div>
                    <h1 className="hrm-title" style={{ fontSize: '28px', marginBottom: '4px' }}>Fix Attendance</h1>
                </div>
            </div>

            {/* Top Filter Card */}
            <div className="hrm-card" style={{ marginBottom: '24px', overflow: 'visible', padding: '24px' }}>
                <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={{ flex: 1, minWidth: '300px' }}>
                        {loadingEmployees ? (
                            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Loading employees list...</p>
                        ) : (
                            <SearchableSelect
                                label="Select Employee"
                                options={employees.map(e => ({ label: `${e.name} (${e.employeeId || 'N/A'})`, value: e._id }))}
                                value={selectedEmp}
                                onChange={setSelectedEmp}
                                placeholder="Search by name or ID..."
                                searchable
                            />
                        )}
                    </div>
                    
                    <div style={{ minWidth: '240px' }}>
                        <label className="hrm-label" style={{ marginBottom: '8px', display: 'block' }}>Select Date</label>
                        <input
                            type="date"
                            className="hrm-input"
                            value={selectedDate}
                            onChange={e => setSelectedDate(e.target.value)}
                            style={{ 
                                padding: '12px 16px', 
                                border: '1.5px solid var(--border)', 
                                background: 'var(--bg-base)', 
                                borderRadius: '14px', 
                                outline: 'none', 
                                fontSize: '14px', 
                                color: 'var(--text-primary)', 
                                cursor: 'pointer',
                                width: '100%',
                                boxSizing: 'border-box',
                                height: '50px'
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Bottom Content Card */}
            <div className="hrm-card" style={{ padding: '32px' }}>
                {!selectedEmp ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', color: 'var(--text-muted)' }}>
                        <User size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
                        <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>No Employee Selected</h3>
                        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '8px', textAlign: 'center' }}>
                            Please select an employee from the dropdown above to correct their logs.
                        </p>
                    </div>
                ) : fetchingRecord ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px' }}>
                        <RefreshCw className="animate-spin" size={32} color="var(--primary-blue)" />
                        <p style={{ marginTop: '16px', color: 'var(--text-secondary)', fontWeight: '600' }}>Fetching existing record...</p>
                    </div>
                ) : (
                    <div style={{ margin: '0 auto' }}>
                        <form onSubmit={handleUpdate}>
                            {/* Existing Record Indicator */}
                            <div style={{ 
                                padding: '16px', 
                                borderRadius: '16px', 
                                background: existingRecord ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                                border: existingRecord ? '1px solid rgba(16, 185, 129, 0.15)' : '1px solid rgba(239, 68, 68, 0.15)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                marginBottom: '28px'
                            }}>
                                {existingRecord ? (
                                    <>
                                        <CheckCircle size={20} color="#10B981" />
                                        <div>
                                            <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>Existing Log Found</div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                                Status: <strong style={{ color: 'var(--primary-blue)' }}>{existingRecord.status}</strong> · 
                                                Punches: <strong>{existingRecord.punchIn || 'None'} - {existingRecord.punchOut || 'None'}</strong>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <AlertCircle size={20} color="#EF4444" />
                                        <div>
                                            <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>No Log Found for Date</div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>Creating a new manual entry will register this day.</div>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Forms */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                <div>
                                    <SearchableSelect
                                        label="Status"
                                        required
                                        options={[
                                            { label: 'Present', value: 'Present' },
                                            { label: 'Half Day', value: 'Half Day' },
                                            { label: 'Absent', value: 'Absent' },
                                            { label: 'On Leave', value: 'On Leave' }
                                        ]}
                                        value={status}
                                        onChange={(val) => setStatus(val)}
                                    />
                                </div>

                                {status !== 'On Leave' && status !== 'Absent' && (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                        <div>
                                            <label className="hrm-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <Clock size={14} /> Punch In (IST)
                                            </label>
                                            <input
                                                type="time"
                                                value={inTime}
                                                onChange={e => setInTime(e.target.value)}
                                                className="hrm-input"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="hrm-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <Clock size={14} /> Punch Out (IST)
                                            </label>
                                            <input
                                                type="time"
                                                value={outTime}
                                                onChange={e => setOutTime(e.target.value)}
                                                className="hrm-input"
                                            />
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="hrm-label">Administrative Remark / Reason</label>
                                    <textarea
                                        value={remark}
                                        onChange={e => setRemark(e.target.value)}
                                        className="hrm-textarea"
                                        placeholder="Reason for correction..."
                                        style={{ height: '100px', resize: 'none' }}
                                        required
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={submitting}
                                    style={{
                                        marginTop: '10px',
                                        padding: '14px',
                                        borderRadius: '12px',
                                        background: 'var(--primary-blue)',
                                        color: 'white',
                                        border: 'none',
                                        fontWeight: '800',
                                        fontSize: '15px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px'
                                    }}
                                >
                                    {submitting ? <RefreshCw className="animate-spin" size={18} /> : <><Save size={18} /> Save & Fix Attendance</>}
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .animate-spin { animation: spin 1s linear infinite; }
            `}</style>
        </div>
    );
};

export default FixAttendance;
