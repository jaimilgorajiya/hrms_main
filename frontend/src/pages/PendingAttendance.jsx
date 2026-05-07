import React, { useState, useEffect, useCallback } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Search, 
  RefreshCw, 
  User, 
  Calendar as CalendarIcon, 
  LogIn, 
  LogOut, 
  AlertCircle,
  ChevronRight,
  Filter,
  CheckSquare,
  Square
} from 'lucide-react';
import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';
import Swal from 'sweetalert2';

const PendingAttendance = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchPending = useCallback(async () => {
    setLoading(true);
    try {
      const response = await authenticatedFetch(`${API_URL}/api/attendance/admin/all?approvalStatus=Pending`);
      const result = await response.json();
      if (result.success) {
        setRecords(result.records || []);
      }
    } catch (error) {
      console.error("Error fetching pending attendance:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  const handleAction = async (ids, status) => {
    if (!ids.length) return;
    
    const confirmText = ids.length === 1 ? `Are you sure you want to ${status.toLowerCase()} this record?` : `Are you sure you want to ${status.toLowerCase()} ${ids.length} records?`;
    
    const result = await Swal.fire({
      title: 'Confirm Action',
      text: confirmText,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: status === 'Approved' ? '#10B981' : '#EF4444',
      cancelButtoncolor: 'var(--text-secondary)',
      confirmButtonText: `Yes, ${status}`
    });

    if (!result.isConfirmed) return;

    setActionLoading(true);
    try {
      // The current API might not support bulk approval. Let's check.
      // If not, we'll run them in parallel.
      const promises = ids.map(id => 
        authenticatedFetch(`${API_URL}/api/attendance/admin/approve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ attendanceId: id, status })
        })
      );
      
      const responses = await Promise.all(promises);
      const allSuccess = responses.every(async r => (await r.json()).success);

      if (allSuccess) {
        Swal.fire({
          title: 'Success!',
          text: `${ids.length} record(s) have been ${status.toLowerCase()}.`,
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        });
        setSelectedIds([]);
        fetchPending();
      }
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'Action failed for one or more records', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length) setSelectedIds([]);
    else setSelectedIds(filtered.map(r => r._id));
  };

  const toggleSelect = (id) => {
    if (selectedIds.includes(id)) setSelectedIds(prev => prev.filter(i => i !== id));
    else setSelectedIds(prev => [...prev, id]);
  };

  const filtered = records.filter(r => {
    const q = search.toLowerCase();
    return (
      r.employee?.name?.toLowerCase().includes(q) ||
      r.employee?.employeeId?.toLowerCase().includes(q) ||
      r.date?.includes(q)
    );
  });

  return (
    <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      {/* Header section with Stats */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '900', color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: '0 0 8px' }}>
            Pending Approvals
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ background: '#FFFBEB', color: '#B45309', padding: '4px 12px', borderRadius: '10px', fontSize: '13px', fontWeight: '800', border: '1px solid #FEF3C7' }}>
              {records.length} Records Requiring Review
            </span>
            <button onClick={fetchPending} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: '600' }}>
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </div>

        {selectedIds.length > 0 && (
          <div style={{ display: 'flex', gap: '12px', animation: 'fadeIn 0.2s ease-out' }}>
            <button 
              onClick={() => handleAction(selectedIds, 'Approved')}
              disabled={actionLoading}
              style={{ padding: '12px 24px', borderRadius: '14px', border: 'none', background: '#10B981', color: '#fff', fontWeight: '800', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 15px rgba(16, 185, 129, 0.2)' }}
            >
              <CheckCircle size={18} /> Approve ({selectedIds.length})
            </button>
            <button 
              onClick={() => handleAction(selectedIds, 'Rejected')}
              disabled={actionLoading}
              style={{ padding: '12px 24px', borderRadius: '14px', border: 'none', background: '#EF4444', color: '#fff', fontWeight: '800', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 15px rgba(239, 68, 68, 0.2)' }}
            >
              <XCircle size={18} /> Reject
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
        {/* Search & Filter Bar */}
        <div style={{ background: '#fff', padding: '16px', borderRadius: '20px', border: '1px solid #E2E8F0', display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Search by employee name, ID or date..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%', padding: '14px 16px 14px 48px', borderRadius: '14px', border: '1.5px solid #F1F5F9', background: '#F8FAFC', outline: 'none', fontSize: '14px', fontWeight: '600', transition: 'all 0.2s' }}
            />
          </div>
          <button style={{ padding: '14px', borderRadius: '14px', border: '1.5px solid #F1F5F9', background: '#fff', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <Filter size={18} />
          </button>
        </div>

        {/* Records Table */}
        <div style={{ background: '#fff', borderRadius: '24px', border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          {loading ? (
             <div style={{ padding: '100px', textAlign: 'center' }}>
                <RefreshCw size={40} color="#2563EB" className="animate-spin" style={{ marginBottom: '16px' }} />
                <p style={{ fontWeight: '700', color: 'var(--text-secondary)' }}>Identifying pending records...</p>
             </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '100px 20px', textAlign: 'center' }}>
               <div style={{ width: '80px', height: '80px', borderRadius: '30px', background: '#F0F9FF', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                  <CheckCircle size={40} color="#0EA5E9" />
               </div>
               <h3 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)', margin: '0 0 8px' }}>All Caught Up!</h3>
               <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '300px', margin: '0 auto' }}>No attendance records are currently waiting for your approval.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                    <th style={{ padding: '20px', width: '40px' }}>
                      <button onClick={toggleSelectAll} style={{ background: 'none', border: 'none', cursor: 'pointer', color: selectedIds.length === filtered.length ? '#2563EB' : '#CBD5E1' }}>
                        {selectedIds.length === filtered.length ? <CheckSquare size={20} /> : <Square size={20} />}
                      </button>
                    </th>
                    <th style={thStyle}>Employee</th>
                    <th style={thStyle}>Date & Shift</th>
                    <th style={thStyle}>Punches</th>
                    <th style={thStyle}>Status Details</th>
                    <th style={thStyle}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => (
                    <tr key={r._id} style={{ borderBottom: '1px solid #F1F5F9', background: selectedIds.includes(r._id) ? '#F0F7FF' : 'transparent', transition: 'background 0.2s' }}>
                      <td style={{ padding: '20px', textAlign: 'center' }}>
                         <button onClick={() => toggleSelect(r._id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: selectedIds.includes(r._id) ? '#2563EB' : '#CBD5E1' }}>
                            {selectedIds.includes(r._id) ? <CheckSquare size={18} /> : <Square size={18} />}
                         </button>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                           <div style={{ 
                             width: '44px', height: '44px', borderRadius: '14px', 
                             background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)', 
                             display: 'flex', alignItems: 'center', justifyContent: 'center', 
                             fontWeight: '800', color: '#2563EB', fontSize: '15px'
                           }}>
                              {r.employee?.name?.charAt(0)}
                           </div>
                           <div>
                              <div style={{ fontWeight: '800', fontSize: '14px', color: 'var(--text-primary)' }}>{r.employee?.name}</div>
                              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>#{r.employee?.employeeId}</div>
                           </div>
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                           <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <CalendarIcon size={14} color="var(--text-muted)" />
                              {new Date(r.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                           </div>
                           <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '700', background: '#F1F5F9', padding: '2px 8px', borderRadius: '6px', alignSelf: 'flex-start' }}>
                              {r.isExtraDay ? 'Extra Day (Week Off)' : 'Regular Shift'}
                           </div>
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                           <div style={{ padding: '8px 12px', background: '#F0FDF4', borderRadius: '10px', border: '1px solid #DCFCE7' }}>
                              <div style={{ fontSize: '9px', color: '#15803D', fontWeight: '900', textTransform: 'uppercase', marginBottom: '2px' }}>In</div>
                              <div style={{ fontWeight: '800', fontSize: '13px', color: '#166534', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                 <LogIn size={12} /> {r.punchIn || '--:--'}
                              </div>
                           </div>
                           <div style={{ padding: '8px 12px', background: '#FEF2F2', borderRadius: '10px', border: '1px solid #FEE2E2' }}>
                              <div style={{ fontSize: '9px', color: '#B91C1C', fontWeight: '900', textTransform: 'uppercase', marginBottom: '2px' }}>Out</div>
                              <div style={{ fontWeight: '800', fontSize: '13px', color: '#991B1B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                 <LogOut size={12} /> {r.punchOut || '--:--'}
                              </div>
                           </div>
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                           <div style={{ display: 'flex', gap: '6px' }}>
                              <span style={{ 
                                padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: '800',
                                background: r.status === 'Present' ? '#ECFDF5' : '#FFFBEB',
                                color: r.status === 'Present' ? '#059669' : '#D97706'
                              }}>{r.status}</span>
                              {r.workingMinutes > 0 && (
                                <span style={{ padding: '4px 10px', borderRadius: '8px', background: '#EFF6FF', color: '#2563EB', fontSize: '11px', fontWeight: '800' }}>
                                  {r.workingFormatted}
                                </span>
                              )}
                           </div>
                           {/* Late/Early Tags */}
                           <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                              {r.punches?.some(p => p.lateReason) && <span style={{ fontSize: '10px', color: '#EF4444', fontWeight: '700', padding: '2px 6px', background: '#FEF2F2', borderRadius: '4px' }}>Late Entry</span>}
                              {r.punches?.some(p => p.earlyReason) && <span style={{ fontSize: '10px', color: '#F59E0B', fontWeight: '700', padding: '2px 6px', background: '#FFFBEB', borderRadius: '4px' }}>Early Out</span>}
                              {r.punchIn && !r.punchOut && <span style={{ fontSize: '10px', color: '#F97316', fontWeight: '700', padding: '2px 6px', background: '#FFF7ED', borderRadius: '4px' }}>Missing Out</span>}
                           </div>
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                           <button 
                            onClick={(e) => { e.stopPropagation(); handleAction([r._id], 'Approved'); }}
                            style={{ width: '38px', height: '38px', borderRadius: '12px', border: 'none', background: '#DCFCE7', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                            title="Approve"
                           >
                              <CheckCircle size={20} />
                           </button>
                           <button 
                            onClick={(e) => { e.stopPropagation(); handleAction([r._id], 'Rejected'); }}
                            style={{ width: '38px', height: '38px', borderRadius: '12px', border: 'none', background: '#FEE2E2', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                            title="Reject"
                           >
                              <XCircle size={20} />
                           </button>
                           <button 
                            style={{ width: '38px', height: '38px', borderRadius: '12px', border: 'none', background: '#F1F5F9', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                            title="Details"
                           >
                              <ChevronRight size={20} />
                           </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

const thStyle = { padding: '20px', textAlign: 'left', fontSize: '12px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' };
const tdStyle = { padding: '20px', fontSize: '14px' };

export default PendingAttendance;
