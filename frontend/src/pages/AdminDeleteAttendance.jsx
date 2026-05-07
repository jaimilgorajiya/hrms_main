import React, { useState, useEffect, useCallback } from 'react';
import { 
  Trash2, 
  Search, 
  Calendar as CalendarIcon, 
  Users, 
  RefreshCw, 
  User, 
  AlertCircle,
  Filter,
  CheckSquare,
  Square,
  MapPin
} from 'lucide-react';
import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';
import Swal from 'sweetalert2';

const AdminDeleteAttendance = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authenticatedFetch(`${API_URL}/api/attendance/admin/all?date=${date}`);
      const json = await res.json();
      if (json.success) setRecords(json.records);
    } catch (e) {
      console.error(e);
      Swal.fire('Error', 'Failed to fetch attendance records', 'error');
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const handleDelete = async (id, empName, attDate) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `Marking the attendance for ${empName} on ${attDate} as "Absent". This will clear all their punch timings.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      cancelButtoncolor: 'var(--text-secondary)',
      confirmButtonText: 'Yes, mark as absent!'
    });

    if (result.isConfirmed) {
      try {
        const res = await authenticatedFetch(`${API_URL}/api/attendance/admin/delete`, {
          method: 'DELETE',
          body: JSON.stringify({ attendanceId: id })
        });
        const json = await res.json();
        if (json.success) {
          Swal.fire('Updated!', 'Attendance marked as Absent.', 'success');
          fetchRecords();
          setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
        }
      } catch (e) {
        Swal.fire('Error', 'Update failed', 'error');
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;

    const result = await Swal.fire({
      title: `Mark ${selectedIds.length} as Absent?`,
      text: 'This will clear all punch timings and set status to Absent for selected records.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      confirmButtonText: 'Confirm Bulk Action'
    });

    if (result.isConfirmed) {
      setLoading(true);
      try {
        // Sequentially or via a new bulk endpoint (for now sequential/mapping to keep backend simple)
        await Promise.all(selectedIds.map(id => 
          authenticatedFetch(`${API_URL}/api/attendance/admin/delete`, {
            method: 'DELETE',
            body: JSON.stringify({ attendanceId: id })
          })
        ));
        Swal.fire('Done!', 'Selected records deleted.', 'success');
        setSelectedIds([]);
        fetchRecords();
      } catch (e) {
        Swal.fire('Error', 'Some deletions failed', 'error');
        fetchRecords();
      } finally {
        setLoading(false);
      }
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map(r => r._id));
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const filtered = records.filter(r => {
    // Hide employees who are already on leave
    if (r.status === 'On Leave') return false;

    const q = search.toLowerCase();
    return (
      r.employee?.name?.toLowerCase().includes(q) ||
      r.employee?.employeeId?.toLowerCase().includes(q) ||
      r.employee?.department?.toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '900', color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: '0 0 8px' }}> Delete Attendance</h1>
          <p style={{ color: 'var(--text-secondary)', fontWeight: '500', margin: 0 }}>Permanently remove erroneous logs. Deleting records marks the employee as "Absent" to maintain history.</p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', background: '#fff', border: '1.5px solid #E2E8F0', borderRadius: '14px', padding: '0 12px' }}>
            <CalendarIcon size={18} color="var(--text-secondary)" />
            <input 
              type="date" value={date} onChange={e => setDate(e.target.value)}
              style={{ border: 'none', padding: '12px', fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', outline: 'none' }}
            />
          </div>
          <button onClick={fetchRecords} disabled={loading} style={iconButtonStyle('#fff', '#64748B', '#E2E8F0')}>
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Control Bar */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" placeholder="Search employee, ID, or department..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '14px 16px 14px 48px', borderRadius: '16px', border: '1.5px solid #E2E8F0', fontSize: '14px', fontWeight: '600', outline: 'none' }}
          />
        </div>

        {selectedIds.length > 0 && (
          <button onClick={handleBulkDelete} style={{ background: '#EF4444', color: '#fff', padding: '14px 24px', borderRadius: '16px', border: 'none', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)' }}>
            <Trash2 size={20} /> Delete Selected ({selectedIds.length})
          </button>
        )}
      </div>

      {/* Records Table */}
      <div style={{ background: '#fff', borderRadius: '24px', border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        {loading && records.length === 0 ? (
          <div style={{ padding: '100px', textAlign: 'center' }}><RefreshCw size={40} color="#2563EB" className="animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '100px', textAlign: 'center' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '30px', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <AlertCircle size={40} color="#CBD5E1" />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-secondary)' }}>No records to display</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No logs found for the selected filter or date.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                  <th style={{ ...thStyle, width: '60px' }}>
                    <div onClick={toggleSelectAll} style={{ cursor: 'pointer' }}>
                      {selectedIds.length === filtered.length && filtered.length > 0 ? <CheckSquare size={20} color="#2563EB" /> : <Square size={20} color="#CBD5E1" />}
                    </div>
                  </th>
                  <th style={thStyle}>Employee</th>
                  <th style={thStyle}>Date & Status</th>
                  <th style={thStyle}>Timing</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r._id} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.2s', background: selectedIds.includes(r._id) ? '#F1F5F9' : 'transparent' }}>
                    <td style={tdStyle}>
                      <div onClick={() => toggleSelect(r._id)} style={{ cursor: 'pointer' }}>
                        {selectedIds.includes(r._id) ? <CheckSquare size={20} color="#2563EB" /> : <Square size={20} color="#CBD5E1" />}
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                          {r.employee?.profilePhoto ? <img src={`${API_URL}/uploads/${r.employee.profilePhoto}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <User size={20} color="var(--text-muted)" />}
                        </div>
                        <div>
                          <div style={{ fontWeight: '800', fontSize: '14px', color: 'var(--text-primary)' }}>{r.employee?.name}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>{r.employee?.employeeId}</div>
                        </div>
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: '700', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>{r.date}</div>
                      <span style={statusBadge(r.status)}>{r.status}</span>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '13px', fontWeight: '700', color: '#059669' }}>In: {r.punchIn || '--:--'}</span>
                          {r.punches?.find(p => p.type === 'IN')?.latitude && (
                            <button onClick={() => window.open(`https://www.google.com/maps?q=${r.punches.find(p => p.type === 'IN').latitude},${r.punches.find(p => p.type === 'IN').longitude}`, '_blank')} title="View In location" style={{ padding: '3px', border: 'none', background: '#ECFDF5', color: '#059669', borderRadius: '4px', cursor: 'pointer', display: 'flex' }}>
                              <MapPin size={12} />
                            </button>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '13px', fontWeight: '700', color: '#DC2626' }}>Out: {r.punchOut || '--:--'}</span>
                          {[...(r.punches || [])].reverse().find(p => p.type === 'OUT')?.latitude && (
                            <button onClick={() => window.open(`https://www.google.com/maps?q=${[...r.punches].reverse().find(p => p.type === 'OUT').latitude},${[...r.punches].reverse().find(p => p.type === 'OUT').longitude}`, '_blank')} title="View Out location" style={{ padding: '3px', border: 'none', background: '#FEF2F2', color: '#DC2626', borderRadius: '4px', cursor: 'pointer', display: 'flex' }}>
                              <MapPin size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <button 
                        onClick={() => handleDelete(r._id, r.employee?.name, r.date)}
                        style={{ padding: '10px 18px', borderRadius: '12px', border: 'none', background: '#FEF2F2', color: '#EF4444', fontSize: '12px', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s' }}
                      >
                        <Trash2 size={16} /> Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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

const iconButtonStyle = (bg, color, border) => ({
  width: '48px', height: '48px', borderRadius: '14px', background: bg, color: color,
  border: `1.5px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
});

const thStyle = { padding: '20px', textAlign: 'left', fontSize: '12px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' };
const tdStyle = { padding: '20px', fontSize: '14px' };

const statusBadge = (status) => {
  const styles = {
    Present: { bg: '#ECFDF5', text: '#059669' },
    Absent: { bg: '#FEF2F2', text: '#DC2626' },
    'Half Day': { bg: '#FFFBEB', text: '#D97706' },
    'On Leave': { bg: '#F5F3FF', text: '#7C3AED' }
  };
  const s = styles[status] || { bg: '#F8FAFC', text: '#64748B' };
  return { padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: '800', backgroundColor: s.bg, color: s.text };
};

export default AdminDeleteAttendance;
