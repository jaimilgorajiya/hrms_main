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

  const showDetails = (record) => {
    const punchesHtml = record.punches.map((p, idx) => {
      const timeStr = new Date(p.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
      const typeColor = p.type === 'IN' ? '#10B981' : '#EF4444';
      const typeBg = p.type === 'IN' 
        ? (isDarkMode ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5') 
        : (isDarkMode ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2');
      return `
        <div style="display: flex; gap: 15px; margin-bottom: 12px; position: relative;">
          <div style="display: flex; flex-direction: column; align-items: center;">
            <div style="width: 32px; height: 32px; border-radius: 50%; background: ${typeBg}; border: 1px solid ${typeColor}; display: flex; align-items: center; justify-content: center; font-weight: 800; color: ${typeColor}; font-size: 11px;">
              ${p.type}
            </div>
            ${idx < record.punches.length - 1 ? '<div style="width: 2px; flex-grow: 1; background: var(--border); margin: 4px 0;"></div>' : ''}
          </div>
          <div style="flex-grow: 1; background: var(--card-bg); padding: 10px 14px; border-radius: 8px; border: 1px solid var(--border); text-align: left;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <span style="font-size: 14px; font-weight: 700; color: var(--text-primary);">${timeStr}</span>
              ${p.syncedOffline ? '<span style="font-size: 10px; background: var(--bg-main); color: var(--text-secondary); padding: 2px 6px; border-radius: 4px; font-weight: 700;">Offline Synced</span>' : ''}
            </div>
            ${p.locationAddress ? `<p style="margin: 0; font-size: 12px; color: var(--text-secondary); font-weight: 500;">📍 ${p.locationAddress}</p>` : ''}
            ${p.lateReason ? `<p style="margin: 4px 0 0 0; font-size: 12px; color: #dc2626; font-style: italic; font-weight: 500;">⚠️ Late Reason: "${p.lateReason}"</p>` : ''}
            ${p.earlyReason ? `<p style="margin: 4px 0 0 0; font-size: 12px; color: #f59e0b; font-style: italic; font-weight: 500;">⚠️ Early Reason: "${p.earlyReason}"</p>` : ''}
            ${p.workSummary ? `<p style="margin: 6px 0 0 0; font-size: 12px; color: var(--text-primary); background: var(--bg-main); padding: 6px 10px; border-radius: 6px; border-left: 3px solid var(--primary-blue);">📝 Report: ${p.workSummary}</p>` : ''}
          </div>
        </div>
      `;
    }).join('');

    const breaksHtml = record.breaks && record.breaks.length > 0 ? `
      <div style="margin-top: 15px; border-top: 1px solid var(--border); padding-top: 15px; text-align: left;">
        <p style="font-size: 11px; font-weight: 800; color: var(--text-secondary); text-transform: uppercase; margin: 0 0 8px 0;">Breaks</p>
        ${record.breaks.map(b => {
          const startStr = b.start ? new Date(b.start).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '--:--';
          const endStr = b.end ? new Date(b.end).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : 'In Progress';
          return `
            <div style="display: flex; justify-content: space-between; font-size: 13px; color: var(--text-secondary); background: var(--bg-main); padding: 8px 12px; border-radius: 8px; margin-bottom: 6px;">
              <span>☕ ${b.type || 'General'} Break</span>
              <span style="font-weight: 700;">${startStr} → ${endStr}</span>
            </div>
          `;
        }).join('')}
      </div>
    ` : '';

    Swal.fire({
      title: 'Attendance Details',
      html: `
        <div style="font-family: 'Inter', sans-serif; max-height: 70vh; overflow-y: auto; padding: 5px;">
          <div style="text-align: left; background: var(--bg-main); padding: 14px; border-radius: 12px; border: 1px solid var(--border); margin-bottom: 15px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <div>
                <p style="font-size: 9px; font-weight: 800; color: var(--text-muted); text-transform: uppercase; margin: 0;">Employee</p>
                <p style="font-size: 14px; font-weight: 700; color: var(--text-primary); margin: 0;">${record.employee?.name}</p>
              </div>
              <div style="text-align: right;">
                <p style="font-size: 9px; font-weight: 800; color: var(--text-muted); text-transform: uppercase; margin: 0;">Date</p>
                <p style="font-size: 14px; font-weight: 700; color: var(--text-primary); margin: 0;">${new Date(record.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
              </div>
            </div>
            <div style="display: flex; gap: 8px; margin-top: 10px;">
              <span style="padding: 4px 10px; border-radius: 8px; font-size: 11px; font-weight: 800; background: ${record.status === 'Present' ? (isDarkMode ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5') : (isDarkMode ? 'rgba(245, 158, 11, 0.15)' : '#FFFBEB')}; color: ${record.status === 'Present' ? (isDarkMode ? '#10b981' : '#059669') : (isDarkMode ? '#fbbf24' : '#D97706')};">${record.status}</span>
              ${record.workingMinutes > 0 ? `<span style="padding: 4px 10px; border-radius: 8px; background: var(--primary-light); color: var(--primary-blue); font-size: 11px; font-weight: 800;">${record.workingFormatted}</span>` : ''}
            </div>
          </div>
          
          <p style="font-size: 11px; font-weight: 800; color: var(--text-secondary); text-transform: uppercase; margin: 0 0 10px 0; text-align: left;">Punch Timeline</p>
          <div style="margin-bottom: 15px;">
            ${punchesHtml || '<p style="font-size: 13px; color: var(--text-muted); font-style: italic;">No punches recorded.</p>'}
          </div>
          
          ${breaksHtml}
        </div>
      `,
      confirmButtonText: 'Close',
      width: '500px',
      customClass: {
        popup: isDarkMode ? 'swal-dark-popup' : ''
      }
    });
  };

  const handleAction = async (ids, status) => {
    if (!ids.length) return;
    
    let confirmHtml = '';
    if (ids.length === 1) {
      const record = records.find(r => r._id === ids[0]);
      const lateReason = record?.punches?.find(p => p.lateReason)?.lateReason;
      const earlyReason = record?.punches?.find(p => p.earlyReason)?.earlyReason;

      confirmHtml = `
        <div style="text-align: left; background: var(--bg-main); padding: 20px; border-radius: 12px; border: 1px solid var(--border); font-family: 'Inter', sans-serif;">
          <div style="margin-bottom: 12px; display: flex; justify-content: space-between;">
            <div>
              <p style="font-size: 10px; font-weight: 800; color: var(--text-muted); text-transform: uppercase; margin: 0 0 2px 0;">Employee</p>
              <p style="font-size: 14px; font-weight: 700; color: var(--text-primary); margin: 0;">${record.employee?.name}</p>
            </div>
            <div style="text-align: right;">
              <p style="font-size: 10px; font-weight: 800; color: var(--text-muted); text-transform: uppercase; margin: 0 0 2px 0;">Date</p>
              <p style="font-size: 14px; font-weight: 700; color: var(--text-primary); margin: 0;">${new Date(record.date).toLocaleDateString()}</p>
            </div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
            <div style="background: ${isDarkMode ? 'rgba(16, 185, 129, 0.15)' : '#ecfdf5'}; padding: 8px; borderRadius: 8px; border: 1px solid ${isDarkMode ? 'rgba(16, 185, 129, 0.3)' : '#dcfce7'};">
              <p style="font-size: 9px; font-weight: 800; color: ${isDarkMode ? '#10b981' : '#059669'}; text-transform: uppercase; margin: 0;">In Time</p>
              <p style="font-size: 13px; font-weight: 700; color: ${isDarkMode ? '#34d399' : '#065f46'}; margin: 0;">${record.punchIn || '--:--'}</p>
            </div>
            <div style="background: ${isDarkMode ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2'}; padding: 8px; borderRadius: 8px; border: 1px solid ${isDarkMode ? 'rgba(239, 68, 68, 0.3)' : '#fee2e2'};">
              <p style="font-size: 9px; font-weight: 800; color: ${isDarkMode ? '#ef4444' : '#dc2626'}; text-transform: uppercase; margin: 0;">Out Time</p>
              <p style="font-size: 13px; font-weight: 700; color: ${isDarkMode ? '#f87171' : '#991b1b'}; margin: 0;">${record.punchOut || '--:--'}</p>
            </div>
          </div>
          ${lateReason ? `
            <div style="margin-bottom: 10px; padding: 10px; background: ${isDarkMode ? 'rgba(249, 115, 22, 0.1)' : '#fff7ed'}; border-left: 4px solid #f97316; border-radius: 4px;">
              <p style="font-size: 10px; font-weight: 800; color: ${isDarkMode ? '#f97316' : '#c2410c'}; text-transform: uppercase; margin: 0 0 4px 0;">Late Reason</p>
              <p style="font-size: 13px; color: ${isDarkMode ? '#ffedd5' : '#7c2d12'}; margin: 0; font-style: italic;">"${lateReason}"</p>
            </div>
          ` : ''}
          ${earlyReason ? `
            <div style="margin-bottom: 10px; padding: 10px; background: ${isDarkMode ? 'rgba(225, 29, 72, 0.1)' : '#fff1f2'}; border-left: 4px solid #e11d48; border-radius: 4px;">
              <p style="font-size: 10px; font-weight: 800; color: ${isDarkMode ? '#e11d48' : '#be123c'}; text-transform: uppercase; margin: 0 0 4px 0;">Early Out Reason</p>
              <p style="font-size: 13px; color: ${isDarkMode ? '#ffe4e6' : '#881337'}; margin: 0; font-style: italic;">"${earlyReason}"</p>
            </div>
          ` : ''}
          <p style="font-size: 13px; color: var(--text-secondary); margin-top: 10px; text-align: center; font-weight: 600;">
            Are you sure you want to <b>${status.toLowerCase()}</b> this record?
          </p>
        </div>
      `;
    } else {
      confirmHtml = `<p style="font-size: 15px; font-weight: 600; color: var(--text-secondary);">Are you sure you want to <b>${status.toLowerCase()}</b> ${ids.length} selected records?</p>`;
    }
    
    const result = await Swal.fire({
      title: status === 'Approved' ? 'Approve Attendance?' : 'Reject Attendance?',
      html: confirmHtml,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: status === 'Approved' ? '#10B981' : '#EF4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: `Yes, ${status}`,
      cancelButtonText: 'Cancel',
      reverseButtons: true
    });

    if (!result.isConfirmed) return;

    setActionLoading(true);
    try {
      const promises = ids.map(id => 
        authenticatedFetch(`${API_URL}/api/attendance/admin/approve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ attendanceId: id, status })
        })
      );
      
      const responses = await Promise.all(promises);
      let successCount = 0;
      for (const res of responses) {
        const d = await res.json();
        if (d.success) successCount++;
      }

      if (successCount > 0) {
        Swal.fire({
          title: 'Success!',
          text: `${successCount} record(s) have been ${status.toLowerCase()}.`,
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

  const isDarkMode = document.body.classList.contains('dark-mode');

  return (
    <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      {/* Header section with Stats */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <h1 className="hrm-title" style={{ fontSize: '28px', fontWeight: '900', color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: '0 0 8px' }}>
            Pending Approvals
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ 
              background: isDarkMode ? 'rgba(245, 158, 11, 0.15)' : '#FFFBEB', 
              color: isDarkMode ? '#fbbf24' : '#B45309', 
              padding: '4px 12px', 
              borderRadius: '10px', 
              fontSize: '13px', 
              fontWeight: '800', 
              border: `1px solid ${isDarkMode ? 'rgba(245, 158, 11, 0.3)' : '#FEF3C7'}` 
            }}>
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
        <div style={{ background: 'var(--card-bg)', padding: '16px', borderRadius: '20px', border: '1px solid var(--border)', display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Search by employee name, ID or date..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%', padding: '14px 16px 14px 48px', borderRadius: '14px', border: '1.5px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-primary)', outline: 'none', fontSize: '14px', fontWeight: '600', transition: 'all 0.2s' }}
            />
          </div>
          <button style={{ padding: '14px', borderRadius: '14px', border: '1.5px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <Filter size={18} />
          </button>
        </div>

        {/* Records Table */}
        <div style={{ background: 'var(--card-bg)', borderRadius: '24px', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          {loading ? (
             <div style={{ padding: '100px', textAlign: 'center' }}>
                <RefreshCw size={40} color="var(--primary-blue)" className="animate-spin" style={{ marginBottom: '16px' }} />
                <p style={{ fontWeight: '700', color: 'var(--text-secondary)' }}>Identifying pending records...</p>
             </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '100px 20px', textAlign: 'center' }}>
               <div style={{ width: '80px', height: '80px', borderRadius: '30px', background: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                  <CheckCircle size={40} color="#0EA5E9" />
               </div>
               <h3 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)', margin: '0 0 8px' }}>All Caught Up!</h3>
               <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '300px', margin: '0 auto' }}>No attendance records are currently waiting for your approval.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-main)', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '20px', width: '40px' }}>
                      <button onClick={toggleSelectAll} style={{ background: 'none', border: 'none', cursor: 'pointer', color: selectedIds.length === filtered.length ? 'var(--primary-blue)' : 'var(--border)' }}>
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
                    <tr key={r._id} style={{ borderBottom: '1px solid var(--border)', background: selectedIds.includes(r._id) ? 'var(--primary-light)' : 'transparent', transition: 'background 0.2s' }}>
                      <td style={{ padding: '20px', textAlign: 'center' }}>
                         <button onClick={() => toggleSelect(r._id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: selectedIds.includes(r._id) ? 'var(--primary-blue)' : 'var(--border)' }}>
                            {selectedIds.includes(r._id) ? <CheckSquare size={18} /> : <Square size={18} />}
                         </button>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                           <div style={{ 
                             width: '44px', height: '44px', borderRadius: '14px', 
                             background: 'linear-gradient(135deg, var(--primary-light) 0%, var(--border) 100%)', 
                             display: 'flex', alignItems: 'center', justifyContent: 'center', 
                             fontWeight: '800', color: 'var(--primary-blue)', fontSize: '15px'
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
                           <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '700', background: 'var(--bg-main)', padding: '2px 8px', borderRadius: '6px', alignSelf: 'flex-start' }}>
                              {r.isExtraDay ? 'Extra Day (Week Off)' : 'Regular Shift'}
                           </div>
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                           <div style={{ padding: '8px 12px', background: isDarkMode ? 'rgba(16, 185, 129, 0.15)' : '#F0FDF4', borderRadius: '10px', border: `1px solid ${isDarkMode ? 'rgba(16, 185, 129, 0.3)' : '#DCFCE7'}` }}>
                              <div style={{ fontSize: '9px', color: isDarkMode ? '#4ade80' : '#15803D', fontWeight: '900', textTransform: 'uppercase', marginBottom: '2px' }}>In</div>
                              <div style={{ fontWeight: '800', fontSize: '13px', color: isDarkMode ? '#34d399' : '#166534', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                 <LogIn size={12} /> {r.punchIn || '--:--'}
                              </div>
                           </div>
                           <div style={{ padding: '8px 12px', background: isDarkMode ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2', borderRadius: '10px', border: `1px solid ${isDarkMode ? 'rgba(239, 68, 68, 0.3)' : '#FEE2E2'}` }}>
                              <div style={{ fontSize: '9px', color: isDarkMode ? '#f87171' : '#B91C1C', fontWeight: '900', textTransform: 'uppercase', marginBottom: '2px' }}>Out</div>
                              <div style={{ fontWeight: '800', fontSize: '13px', color: isDarkMode ? '#ef4444' : '#991B1B', display: 'flex', alignItems: 'center', gap: '4px' }}>
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
                                background: r.status === 'Present' 
                                  ? (isDarkMode ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5') 
                                  : (isDarkMode ? 'rgba(245, 158, 11, 0.15)' : '#FFFBEB'),
                                color: r.status === 'Present' 
                                  ? (isDarkMode ? '#10b981' : '#059669') 
                                  : (isDarkMode ? '#fbbf24' : '#D97706')
                              }}>{r.status}</span>
                              {r.workingMinutes > 0 && (
                                <span style={{ padding: '4px 10px', borderRadius: '8px', background: 'var(--primary-light)', color: 'var(--primary-blue)', fontSize: '11px', fontWeight: '800' }}>
                                  {r.workingFormatted}
                                </span>
                              )}
                           </div>
                           {/* Late/Early Tags */}
                           <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                              {r.punches?.some(p => p.lateReason) && <span style={{ fontSize: '10px', color: '#EF4444', fontWeight: '700', padding: '2px 6px', background: 'rgba(239, 68, 68, 0.15)', borderRadius: '4px' }}>Late Entry</span>}
                              {r.punches?.some(p => p.earlyReason) && <span style={{ fontSize: '10px', color: '#F59E0B', fontWeight: '700', padding: '2px 6px', background: 'rgba(245, 158, 11, 0.15)', borderRadius: '4px' }}>Early Out</span>}
                              {r.punchIn && !r.punchOut && <span style={{ fontSize: '10px', color: '#F97316', fontWeight: '700', padding: '2px 6px', background: 'rgba(249, 115, 22, 0.15)', borderRadius: '4px' }}>Missing Out</span>}
                           </div>
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                           <button 
                            onClick={(e) => { e.stopPropagation(); handleAction([r._id], 'Approved'); }}
                            style={{ width: '38px', height: '38px', borderRadius: '12px', border: 'none', background: isDarkMode ? 'rgba(16, 185, 129, 0.2)' : '#DCFCE7', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                            title="Approve"
                           >
                              <CheckCircle size={20} />
                           </button>
                           <button 
                            onClick={(e) => { e.stopPropagation(); handleAction([r._id], 'Rejected'); }}
                            style={{ width: '38px', height: '38px', borderRadius: '12px', border: 'none', background: isDarkMode ? 'rgba(239, 68, 68, 0.2)' : '#FEE2E2', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                            title="Reject"
                           >
                              <XCircle size={20} />
                           </button>
                           <button 
                            onClick={(e) => { e.stopPropagation(); showDetails(r); }}
                            style={{ width: '38px', height: '38px', borderRadius: '12px', border: 'none', background: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : '#F1F5F9', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
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
