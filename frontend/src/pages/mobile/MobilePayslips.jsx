import React, { useState, useEffect } from 'react';
import { Receipt, Download, Eye } from 'lucide-react';
import { useMobileAuth } from './context/MobileAuthContext';
import API_URL from '../../config/api';

function getMonthName(monthStr) {
  if (!monthStr) return '';
  const [year, month] = monthStr.split('-');
  return new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
}

function PayslipCard({ slip }) {
  const { apiFetch } = useMobileAuth();

  const handleView = async () => {
    try {
      const res = await apiFetch(`/api/payroll/download-slip/${slip._id}`);
      if (!res.ok) throw new Error("Failed to download payslip");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (err) {
      console.error(err);
      alert("Failed to view payslip");
    }
  };

  return (
    <div className="m-payslip-card">
      <div style={{ width: 56, height: 56, borderRadius: 18, background: 'var(--m-primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Receipt size={24} color="var(--m-primary)" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="m-list-title">{getMonthName(slip.month)}</div>
        <div className="m-list-sub" style={{ marginTop: 4 }}>
          Net Salary: <strong style={{ color: 'var(--m-success)' }}>₹{(slip.finalPayout || 0).toLocaleString('en-IN')}</strong>
        </div>
      </div>
      <button
        className="m-btn m-btn-primary m-btn-sm"
        onClick={handleView}
        style={{ gap: 6, flexShrink: 0 }}
      >
        <Eye size={14} /> View
      </button>
    </div>
  );
}

export default function MobilePayslips() {
  const { apiFetch } = useMobileAuth();
  const [slips, setSlips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/api/payroll/my-slips')
      .then(r => r.json())
      .then(json => { if (json.success) setSlips(json.history || []); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="m-loader" style={{ height: '60vh' }}><div className="m-spinner" /></div>;

  return (
    <div className="m-animate-in" style={{ minHeight: '100%', paddingBottom: 20, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '32px 24px 20px' }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--m-text)', margin: '0 0 8px', letterSpacing: '-0.5px' }}>My Payslips</h1>
        <p style={{ fontSize: 14, color: 'var(--m-muted)', margin: 0, fontWeight: 500 }}>Check and download your salary statements</p>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '24px 16px 80px' }}>
        {slips.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 20, marginTop: '20%' }}>
            <Receipt size={88} strokeWidth={1.2} style={{ color: 'var(--m-muted)', opacity: 0.25 }} />
            <p style={{ fontSize: 16, color: 'var(--m-muted)', opacity: 0.7, fontWeight: 600, margin: 0 }}>
              No payslips available yet.
            </p>
          </div>
        ) : (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {slips.map((s, i) => <PayslipCard key={i} slip={s} />)}
          </div>
        )}
      </div>
    </div>
  );
}
