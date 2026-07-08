import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Calendar, Clock, AlertTriangle, Info, Wallet, CheckCircle2, XCircle
} from 'lucide-react';
import { useMobileAuth } from './context/MobileAuthContext';
import API_URL from '../../config/api';

export default function MobileDaywiseSalary() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { apiFetch } = useMobileAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBreakdown = async () => {
      try {
        setLoading(true);
        const res = await apiFetch(`/api/payroll/my-slips/${id}/daywise`);
        const json = await res.json();
        if (json.success) {
          setData(json);
        } else {
          setError(json.message || "Failed to load details.");
        }
      } catch (err) {
        console.error("Mobile fetch daywise error:", err);
        setError("Error loading salary breakdown.");
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchBreakdown();
  }, [id]);

  const getMonthName = (monthStr) => {
    if (!monthStr) return '';
    const [year, month] = monthStr.split('-');
    return new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  const getStatusBadge = (status) => {
    const base = {
      padding: '4px 8px',
      borderRadius: '8px',
      fontSize: '11px',
      fontWeight: '700',
      textTransform: 'uppercase',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px'
    };

    switch (status) {
      case 'Present':
        return <span style={{ ...base, background: 'rgba(16, 185, 129, 0.15)', color: '#10B981' }}><CheckCircle2 size={10} /> Present</span>;
      case 'Half Day':
        return <span style={{ ...base, background: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B' }}><AlertTriangle size={10} /> Half Day</span>;
      case 'Week Off':
        return <span style={{ ...base, background: 'rgba(59, 130, 246, 0.15)', color: '#3B82F6' }}><Info size={10} /> Week Off</span>;
      case 'Holiday':
        return <span style={{ ...base, background: 'rgba(139, 92, 246, 0.15)', color: '#8B5CF6' }}><Info size={10} /> Holiday</span>;
      case 'Paid Leave':
      case 'Paid Leave (Half)':
        return <span style={{ ...base, background: 'rgba(6, 182, 212, 0.15)', color: '#06B6D4' }}><Info size={10} /> Paid Leave</span>;
      case 'Unpaid Leave':
      case 'Unpaid Leave (Half)':
        return <span style={{ ...base, background: 'rgba(100, 116, 139, 0.15)', color: '#94A3B8' }}><Info size={10} /> Unpaid Leave</span>;
      case 'Absent':
      default:
        return <span style={{ ...base, background: 'rgba(239, 68, 68, 0.15)', color: '#EF4444' }}><XCircle size={10} /> Absent</span>;
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    const dateObj = new Date(year, month - 1, day);
    return dateObj.toLocaleDateString('default', { day: '2-digit', month: 'short' });
  };

  if (loading) return <div className="m-loader" style={{ height: '60vh' }}><div className="m-spinner" /></div>;

  if (error || !data) {
    return (
      <div style={{ padding: '32px 24px', textAlign: 'center', color: 'var(--m-text)' }}>
        <h3 style={{ color: 'var(--m-danger)' }}>Error Loading Breakdown</h3>
        <p style={{ color: 'var(--m-muted)', fontSize: '14px', margin: '12px 0 24px' }}>{error || "Could not load breakdown details."}</p>
        <button className="m-btn m-btn-primary" onClick={() => navigate('/mobile/payslips')}>
          <ArrowLeft size={16} /> Back to Payslips
        </button>
      </div>
    );
  }

  // Count summaries
  const totalDays = data.days?.length || 0;
  const presentCount = data.days?.filter(d => d.status === 'Present').length || 0;
  const halfCount = data.days?.filter(d => d.status === 'Half Day').length || 0;
  const unpaidCount = data.days?.filter(d => d.status === 'Absent' || d.status.includes('Unpaid')).length || 0;
  const totalPenalties = data.days?.reduce((sum, d) => sum + d.totalPenalty, 0) || 0;
  const totalNetEarned = data.days?.reduce((sum, d) => sum + d.netEarned, 0) || 0;

  return (
    <div className="m-animate-in" style={{ paddingBottom: 80 }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '24px 20px 16px' }}>
        <button 
          onClick={() => navigate('/mobile/payslips')}
          style={{
            background: 'var(--m-card-bg)',
            border: '1px solid var(--m-border)',
            color: 'var(--m-text)',
            width: 40,
            height: 40,
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--m-text)', margin: 0 }}>Day-wise Details</h1>
          <p style={{ fontSize: 13, color: 'var(--m-muted)', margin: '2px 0 0 0', fontWeight: 500 }}>{getMonthName(data.month)} Breakdown</p>
        </div>
      </div>

      {/* Mini overview cards */}
      <div style={{ display: 'flex', gap: 10, padding: '0 20px', overflowX: 'auto', marginBottom: 20, scrollbarWidth: 'none' }}>
        {[
          { label: 'Net Earned', value: `₹${totalNetEarned.toLocaleString()}`, color: 'var(--m-success)' },
          { label: 'Penalties', value: `₹${totalPenalties.toLocaleString()}`, color: 'var(--m-danger)' },
          { label: 'Attended', value: `${presentCount + halfCount * 0.5}/${totalDays}d`, color: 'var(--m-primary)' }
        ].map((item, idx) => (
          <div key={idx} style={{ flexShrink: 0, width: 110, background: 'var(--m-card-bg)', border: '1px solid var(--m-border)', borderRadius: 14, padding: '12px 14px' }}>
            <div style={{ fontSize: 10, color: 'var(--m-muted)', textTransform: 'uppercase', fontWeight: 700 }}>{item.label}</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: item.color, marginTop: 4 }}>{item.value}</div>
          </div>
        ))}
      </div>

      {/* Day List */}
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {data.days?.map((day, idx) => {
          const hasPunches = day.punchIn !== '--' || day.punchOut !== '--';
          const hasPenalty = day.totalPenalty > 0;
          return (
            <div key={idx} style={{ background: 'var(--m-card-bg)', border: '1px solid var(--m-border)', borderRadius: 16, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--m-text)' }}>{formatDate(day.date)}</span>
                  <span style={{ fontSize: 12, color: 'var(--m-muted)' }}>•</span>
                  <span style={{ fontSize: 13, color: 'var(--m-muted)', fontWeight: 500 }}>{day.dayName}</span>
                </div>
                <div>
                  {getStatusBadge(day.status)}
                </div>
              </div>

              {/* Punch and Work hours */}
              {day.status !== 'Week Off' && day.status !== 'Holiday' && day.status !== 'Absent' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '8px 12px', borderRadius: 10, border: '1px solid var(--m-border)' }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <Clock size={12} color="var(--m-muted)" />
                    <span style={{ fontSize: 12, color: 'var(--m-muted)', fontWeight: 600 }}>{day.punchIn} - {day.punchOut}</span>
                  </div>
                  {day.workedMins > 0 && (
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--m-text)' }}>{day.workedHours}</span>
                  )}
                </div>
              )}

              {/* Penalties Row */}
              {hasPenalty && (
                <div style={{ fontSize: 12, color: 'var(--m-danger)', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.15)', borderRadius: 10, padding: '6px 12px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Late / Early penalties applied</span>
                  <strong style={{ fontWeight: 800 }}>-₹{day.totalPenalty}</strong>
                </div>
              )}

              {/* Earnings Row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--m-border)', paddingTop: 10, marginTop: 2 }}>
                <span style={{ fontSize: 11, color: 'var(--m-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Info size={11} /> {day.rateDescription}
                </span>
                <span style={{ fontSize: 15, fontWeight: 900, color: day.netEarned > 0 ? 'var(--m-success)' : 'var(--m-muted)' }}>
                  ₹{day.netEarned?.toLocaleString()}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
