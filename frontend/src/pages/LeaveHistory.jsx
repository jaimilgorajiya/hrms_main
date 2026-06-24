import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Clock, Search, RefreshCw, CheckCircle, XCircle, FileText, User, ChevronRight } from 'lucide-react';
import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';

const statusColors = {
  Approved: { color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)', icon: <CheckCircle size={14} /> },
  Rejected: { color: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)', icon: <XCircle size={14} /> },
  Pending: { color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)', icon: <Clock size={14} /> },
};

const typeColors = {
  'Leave': { color: '#8B5CF6', bg: '#F5F3FF' },
  'Attendance Correction': { color: '#0052ff', bg: '#EFF6FF' },
};

const LeaveHistory = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterType, setFilterType] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      let url = `${API_URL}/api/requests/admin/all`;
      const params = [];
      if (filterStatus !== 'All') params.push(`status=${filterStatus}`);
      if (filterType !== 'All') params.push(`requestType=${filterType}`);
      if (startDate) params.push(`startDate=${startDate}`);
      if (endDate) params.push(`endDate=${endDate}`);
      if (params.length > 0) url += `?${params.join('&')}`;

      const res = await authenticatedFetch(url);
      const json = await res.json();
      if (json.success) setRequests(json.requests);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [filterStatus, filterType, startDate, endDate]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const filtered = requests.filter(r => {
    const q = search.toLowerCase();
    return (
      r.employee?.name?.toLowerCase().includes(q) ||
      r.employee?.employeeId?.toLowerCase().includes(q) ||
      r.reason?.toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ padding: '32px', margin: '0 auto', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '35px' }}>
        <div>
          <h2 style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-primary)', margin: '0 0 8px' }}>Leave Request History</h2>
         
        </div>
        <button 
          onClick={fetchRequests} 
          style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px',
            background: 'var(--card-bg)', border: '1.5px solid var(--border)', borderRadius: '15px',
            fontSize: '14px', fontWeight: '700', cursor: 'pointer', color: 'var(--text-primary)',
            boxShadow: 'var(--shadow-sm)', transition: 'all 0.2s'
          }}
        >
          <RefreshCw size={18} /> Refresh Log
        </button>
      </div>

      <div style={{ 
        background: 'var(--card-bg)', padding: '24px', borderRadius: '24px', border: '1.5px solid var(--border)', 
        marginBottom: '30px', boxShadow: 'var(--shadow-sm)',
        display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center'
      }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '300px' }}>
          <Search size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text" placeholder="Search by employee, ID, or reason..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', padding: '14px 14px 14px 48px', border: '1.5px solid var(--border)',
              borderRadius: '16px', fontSize: '14px', outline: 'none', color: 'var(--text-primary)',
              background: 'var(--bg-main)', fontWeight: '600'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-main)', padding: '10px 16px', borderRadius: '16px', border: '1.5px solid var(--border)' }}>
            <Calendar size={16} color="var(--text-secondary)" />
            <input 
              type="date" 
              value={startDate} 
              onChange={e => setStartDate(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}
            />
            <span style={{ color: 'var(--text-muted)', fontWeight: '800' }}>—</span>
            <input 
              type="date" 
              value={endDate} 
              onChange={e => setEndDate(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}
            />
          </div>

          <select 
            value={filterStatus} 
            onChange={e => setFilterStatus(e.target.value)}
            style={{ padding: '14px 20px', border: '1.5px solid var(--border)', borderRadius: '16px', outline: 'none', background: 'var(--bg-main)', fontWeight: '700', color: 'var(--text-secondary)', cursor: 'pointer' }}
          >
            <option value="All">Statuses</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
            <option value="Pending">Pending</option>
          </select>

          <select 
            value={filterType} 
            onChange={e => setFilterType(e.target.value)}
            style={{ padding: '14px 20px', border: '1.5px solid var(--border)', borderRadius: '16px', outline: 'none', background: 'var(--bg-main)', fontWeight: '700', color: 'var(--text-secondary)', cursor: 'pointer' }}
          >
            <option value="All">All Types</option>
            <option value="Leave">Leave</option>
            <option value="Attendance Correction">Manual</option>
          </select>
        </div>
      </div>

      <div style={{ background: 'var(--card-bg)', borderRadius: '30px', border: '1.5px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow-lg)' }}>
        {loading ? (
          <div style={{ padding: '100px', textAlign: 'center', color: '#3B648B' }}>
            <RefreshCw className="animate-spin" size={48} />
            <p style={{ marginTop: '20px', fontWeight: '700' }}>Retrieving archive records...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '100px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <FileText size={64} style={{ marginBottom: '24px', opacity: 0.2 }} />
            <p style={{ fontSize: '18px', fontWeight: '700' }}>No historical records found</p>
            <p style={{ fontSize: '14px', fontWeight: '500' }}>Try adjusting your search or filters</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg-main)', borderBottom: '1.5px solid var(--border)' }}>
                  <th style={thStyle}>Employee</th>
                  <th style={thStyle}>Period / Type</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Category</th>
                  <th style={thStyle}>Applied Over</th>
                  <th style={thStyle}>Action By</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r._id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }}>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div style={{ width: '42px', height: '42px', borderRadius: '14px', background: 'var(--bg-main)', border: '1px solid var(--border)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {r.employee?.profilePhoto ? (
                                <img src={`${API_URL}/uploads/${r.employee.profilePhoto}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : <User size={22} color="var(--text-muted)" />}
                        </div>
                        <div>
                          <div style={{ fontWeight: '800', fontSize: '15px', color: 'var(--text-primary)' }}>{r.employee?.name}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>{r.employee?.employeeId}</div>
                        </div>
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-primary)' }}>
                        {r.requestType === 'Leave' ? (
                          <span>{r.fromDate === r.toDate ? r.fromDate : `${r.fromDate} — ${r.toDate}`}</span>
                        ) : (
                          <span>Correction: {r.date}</span>
                        )}
                      </div>
                      <div style={{ fontSize: '11px', color: r.requestType === 'Leave' ? '#7C3AED' : '#0052ff', fontWeight: '800', textTransform: 'uppercase', marginTop: '4px' }}>
                        {r.requestType}
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ 
                        padding: '6px 14px', borderRadius: '12px', fontSize: '12px', fontWeight: '800',
                        display: 'inline-flex', alignItems: 'center', gap: '8px',
                        backgroundColor: statusColors[r.status]?.bg, color: statusColors[r.status]?.color
                      }}>
                        {statusColors[r.status]?.icon} {r.status}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      {r.requestType === 'Leave' && (
                        <div style={{ 
                          padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: '800',
                          background: r.leaveCategory === 'Paid' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                          color: r.leaveCategory === 'Paid' ? '#10B981' : '#F59E0B',
                          display: 'inline-block'
                        }}>
                          {r.leaveCategory || 'Paid'}
                        </div>
                      )}
                    </td>
                    <td style={tdStyle}>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                         {new Date(r.appliedAt || r.createdAt).toLocaleDateString('en-GB')}
                      </div>
                    </td>
                    <td style={tdStyle}>
                       {r.status !== 'Pending' ? (
                         <div>
                            <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-primary)' }}>{r.status}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>
                               {r.actionDate ? new Date(r.actionDate).toLocaleDateString('en-GB') : 'Processed'}
                            </div>
                         </div>
                       ) : (
                         <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>Awaiting...</span>
                       )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .animate-spin { animation: spin 1s linear infinite; } body.dark-mode input[type="date"] { color-scheme: dark; }` }} />
    </div>
  );
};

const thStyle = { padding: '20px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' };
const tdStyle = { padding: '20px 24px', fontSize: '14px' };

export default LeaveHistory;
