import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  Calendar as CalendarIcon, 
  Search, 
  RefreshCw, 
  Phone, 
  MapPin, 
  User, 
  Clock,
  AlertTriangle,
  ChevronRight,
  Filter,
  MoreVertical,
  Plus
} from 'lucide-react';
import authenticatedFetch from '../utils/apiHandler';
import API_URL from '../config/api';
import SearchableSelect from '../components/SearchableSelect';
import Swal from 'sweetalert2';

const AbsentEmployees = () => {
  const [absentees, setAbsentees] = useState([]);
  const [stats, setStats] = useState({ totalActive: 0, presentCount: 0 });
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('All');
  const [filterType, setFilterType] = useState('All'); // All, Absent, Week-off

  const fetchAbsentees = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authenticatedFetch(`${API_URL}/api/attendance/admin/absent-list?date=${date}`);
      const json = await res.json();
      if (json.success) {
        setAbsentees(json.absentees);
        setStats({ totalActive: json.totalActive, presentCount: json.presentCount });
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [date]);

  useEffect(() => { fetchAbsentees(); }, [fetchAbsentees]);

  const filtered = absentees.filter(a => {
    const q = search.toLowerCase();
    const matchSearch = a.name?.toLowerCase().includes(q) || a.employeeId?.toLowerCase().includes(q);
    const matchDept = filterDept === 'All' || a.department === filterDept;
    const matchType = filterType === 'All' || 
                    (filterType === 'Absent' && !a.isWeekOff) || 
                    (filterType === 'Week-off' && a.isWeekOff);
    return matchSearch && matchDept && matchType;
  });

  const departments = ['All', ...new Set(absentees.map(a => a.department).filter(Boolean))];

  return (
    <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      {/* Header & Stats Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px', flexWrap: 'wrap', gap: '24px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '900', color: '#0F172A', letterSpacing: '-0.02em', margin: '0 0 8px' }}>Absent Employees</h1>
          <p style={{ color: '#64748B', fontWeight: '500', margin: 0 }}>Tracking employees who haven't clocked in for the selected date.</p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', background: '#fff', border: '1.5px solid #E2E8F0', borderRadius: '12px', padding: '0 12px' }}>
            <CalendarIcon size={18} color="#64748B" />
            <input 
              type="date" value={date} onChange={e => setDate(e.target.value)}
              style={{ border: 'none', padding: '12px', fontSize: '14px', fontWeight: '700', color: '#1E293B', outline: 'none', background: 'transparent' }} 
            />
          </div>
          <button onClick={fetchAbsentees} style={{ padding: '14px', borderRadius: '12px', border: 'none', background: '#2563EB', color: '#fff', cursor: 'pointer', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)' }}>
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <div style={statCardStyle('#FEE2E2', '#EF4444')}>
          <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
            <AlertTriangle size={24} color="#EF4444" />
          </div>
          <h3 style={{ fontSize: '32px', fontWeight: '900', margin: '0 0 4px', color: '#0F172A' }}>{absentees.filter(a => !a.isWeekOff).length}</h3>
          <p style={{ fontSize: '14px', fontWeight: '700', color: '#64748B', margin: 0 }}>Actually Absent</p>
        </div>

        <div style={statCardStyle('#F1F5F9', '#64748B')}>
          <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
            <Clock size={24} color="#64748B" />
          </div>
          <h3 style={{ fontSize: '32px', fontWeight: '900', margin: '0 0 4px', color: '#0F172A' }}>{absentees.filter(a => a.isWeekOff).length}</h3>
          <p style={{ fontSize: '14px', fontWeight: '700', color: '#64748B', margin: 0 }}>On Week-off</p>
        </div>

        <div style={statCardStyle('#ECFDF5', '#10B981')}>
          <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
            <Users size={24} color="#10B981" />
          </div>
          <h3 style={{ fontSize: '32px', fontWeight: '900', margin: '0 0 4px', color: '#0F172A' }}>{stats.presentCount}</h3>
          <p style={{ fontSize: '14px', fontWeight: '700', color: '#64748B', margin: 0 }}>Present Today</p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '300px' }}>
          <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
          <input 
            type="text" placeholder="Search by name or employee ID..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '14px 16px 14px 48px', borderRadius: '14px', border: '1.5px solid #E2E8F0', fontSize: '14px', fontWeight: '600', outline: 'none', background: '#fff' }}
          />
        </div>

        <select 
          value={filterDept} onChange={e => setFilterDept(e.target.value)}
          style={filterSelectStyle}
        >
          {departments.map(d => <option key={d} value={d}>{d === 'All' ? 'All Departments' : d}</option>)}
        </select>

        <select 
          value={filterType} onChange={e => setFilterType(e.target.value)}
          style={filterSelectStyle}
        >
          <option value="All">All Absentees</option>
          <option value="Absent">Strictly Absent</option>
          <option value="Week-off">Week-Off Only</option>
        </select>
      </div>

      {/* Absentees Grid/Table */}
      <div style={{ background: '#fff', borderRadius: '24px', border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        {loading ? (
          <div style={{ padding: '80px', textAlign: 'center' }}><RefreshCw size={40} color="#2563EB" className="animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '100px 20px', textAlign: 'center' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '30px', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <Users size={40} color="#CBD5E1" />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#475569' }}>No Absentees Found</h3>
            <p style={{ color: '#94A3B8', fontSize: '14px' }}>Everyone is accounted for based on your current filters.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                  <th style={thStyle}>Employee</th>
                  <th style={thStyle}>Department & Branch</th>
                  <th style={thStyle}>Contact</th>
                  <th style={thStyle}>Reason / Schedule</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(a => (
                  <tr key={a._id} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.2s' }}>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '1px solid #E2E8F0' }}>
                          {a.profilePhoto ? (
                            <img src={a.profilePhoto.startsWith('http') ? a.profilePhoto : `${API_URL}/uploads/${a.profilePhoto}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : <User size={20} color="#94A3B8" />}
                        </div>
                        <div>
                          <div style={{ fontWeight: '800', fontSize: '14px', color: '#0F172A' }}>{a.name}</div>
                          <div style={{ fontSize: '12px', color: '#64748B', fontWeight: '600' }}>#{a.employeeId}</div>
                        </div>
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ fontSize: '14px', fontWeight: '700', color: '#334155' }}>{a.department || '—'}</div>
                      <div style={{ fontSize: '12px', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={12} /> {a.branch || 'Main Branch'}
                      </div>
                    </td>
                    <td style={tdStyle}>
                      {a.phone ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563EB' }}>
                            <Phone size={14} />
                          </div>
                          <span style={{ fontSize: '13px', fontWeight: '700', color: '#475569' }}>{a.phone}</span>
                        </div>
                      ) : <span style={{ color: '#CBD5E1', fontSize: '12px' }}>No phone listed</span>}
                    </td>
                    <td style={tdStyle}>
                      <span style={{ 
                        padding: '6px 12px', borderRadius: '10px', fontSize: '12px', fontWeight: '800',
                        background: a.isWeekOff ? '#F5F3FF' : '#FFF1F2',
                        color: a.isWeekOff ? '#7C3AED' : '#E11D48',
                        border: `1px solid ${a.isWeekOff ? '#DDD6FE' : '#FECDD3'}`
                      }}>
                        {a.isWeekOff ? 'Week Off' : 'Unmarked Absence'}
                      </span>
                      <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '6px', fontWeight: '600' }}>Shift: {a.shiftName}</div>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                         <button 
                          style={{ padding: '8px 16px', borderRadius: '10px', border: '1.5px solid #F1F5F9', background: '#fff', color: '#2563EB', fontSize: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                          onClick={() => Swal.fire('Call Feature', `Connect with ${a.phone}`, 'info')}
                         >
                            Contact
                         </button>
                         <button 
                          style={{ width: '36px', height: '36px', borderRadius: '10px', border: 'none', background: '#F8FAFC', color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                         >
                            <MoreVertical size={18} />
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

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
};

const statCardStyle = (bg, color) => ({
  background: bg,
  padding: '24px',
  borderRadius: '24px',
  border: `1.5px solid ${color}20`,
  display: 'flex',
  flexDirection: 'column'
});

const filterSelectStyle = { 
  padding: '12px 16px', border: '1.5px solid #E2E8F0', borderRadius: '14px', 
  outline: 'none', background: '#fff', fontWeight: '700', color: '#475569', fontSize: '14px', minWidth: '180px' 
};

const thStyle = { padding: '20px', textAlign: 'left', fontSize: '12px', fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' };
const tdStyle = { padding: '20px', fontSize: '14px' };

export default AbsentEmployees;
