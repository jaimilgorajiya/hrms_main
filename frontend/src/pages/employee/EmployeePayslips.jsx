import React, { useState } from 'react';
import { FileText, Download, Eye, ChevronDown } from 'lucide-react';
import '../../styles/EmployeePanel.css';

const mockPayslips = [
  { month: 'February 2026', gross: 55000, deductions: 6200, net: 48800, status: 'Generated', date: '2026-03-01' },
  { month: 'January 2026', gross: 55000, deductions: 6200, net: 48800, status: 'Generated', date: '2026-02-01' },
  { month: 'December 2025', gross: 55000, deductions: 6200, net: 48800, status: 'Generated', date: '2026-01-01' },
  { month: 'November 2025', gross: 55000, deductions: 6200, net: 48800, status: 'Generated', date: '2025-12-01' },
  { month: 'October 2025', gross: 55000, deductions: 6200, net: 48800, status: 'Generated', date: '2025-11-01' },
  { month: 'September 2025', gross: 55000, deductions: 6200, net: 48800, status: 'Generated', date: '2025-10-01' },
];

const mockBreakdown = {
  earnings: [
    { label: 'Basic Salary', amount: 30000 },
    { label: 'HRA', amount: 12000 },
    { label: 'Transport Allowance', amount: 3000 },
    { label: 'Special Allowance', amount: 10000 },
  ],
  deductions: [
    { label: 'PF (Employee)', amount: 3600 },
    { label: 'Professional Tax', amount: 200 },
    { label: 'TDS', amount: 2400 },
  ],
};

const EmployeePayslips = () => {
  const [selected, setSelected] = useState(null);

  const fmt = (n) => `₹${n.toLocaleString('en-IN')}`;

  return (
    <div className="ep-page">
      <div className="ep-page-header">
        <div>
          <h2>My Payslips</h2>
          <p>View and download your monthly payslips</p>
        </div>
      </div>

      <div className="ep-payslip-layout">
        {/* List */}
        <div className="ep-card ep-payslip-list-card">
          <div className="ep-card-header">
            <FileText size={18} />
            <h3>Payslip History</h3>
          </div>
          <div className="ep-payslip-list">
            {mockPayslips.map((p, i) => (
              <div
                key={i}
                className={`ep-payslip-row ${selected === i ? 'active' : ''}`}
                onClick={() => setSelected(selected === i ? null : i)}
              >
                <div className="ep-payslip-row-left">
                  <div className="ep-payslip-icon">
                    <FileText size={18} />
                  </div>
                  <div>
                    <span className="ep-payslip-month">{p.month}</span>
                    <span className="ep-payslip-date">Generated on {new Date(p.date).toLocaleDateString('en-IN')}</span>
                  </div>
                </div>
                <div className="ep-payslip-row-right">
                  <span className="ep-payslip-net">{fmt(p.net)}</span>
                  <span className="ep-payslip-status-chip">Generated</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Detail */}
        <div className="ep-card ep-payslip-detail-card">
          {selected !== null ? (
            <>
              <div className="ep-payslip-detail-header">
                <div>
                  <h3>{mockPayslips[selected].month}</h3>
                  <span>Payslip Details</span>
                </div>
                <button className="ep-btn-primary ep-download-btn">
                  <Download size={16} /> Download PDF
                </button>
              </div>

              <div className="ep-payslip-summary-row">
                <div className="ep-payslip-summary-item green">
                  <label>Gross Earnings</label>
                  <span>{fmt(mockPayslips[selected].gross)}</span>
                </div>
                <div className="ep-payslip-summary-item red">
                  <label>Total Deductions</label>
                  <span>{fmt(mockPayslips[selected].deductions)}</span>
                </div>
                <div className="ep-payslip-summary-item blue">
                  <label>Net Pay</label>
                  <span>{fmt(mockPayslips[selected].net)}</span>
                </div>
              </div>

              <div className="ep-payslip-breakdown">
                <div className="ep-breakdown-col">
                  <h4>Earnings</h4>
                  {mockBreakdown.earnings.map((e, i) => (
                    <div key={i} className="ep-breakdown-row">
                      <span>{e.label}</span>
                      <span className="ep-breakdown-amount green">{fmt(e.amount)}</span>
                    </div>
                  ))}
                  <div className="ep-breakdown-total">
                    <span>Total Earnings</span>
                    <span>{fmt(mockPayslips[selected].gross)}</span>
                  </div>
                </div>
                <div className="ep-breakdown-col">
                  <h4>Deductions</h4>
                  {mockBreakdown.deductions.map((d, i) => (
                    <div key={i} className="ep-breakdown-row">
                      <span>{d.label}</span>
                      <span className="ep-breakdown-amount red">{fmt(d.amount)}</span>
                    </div>
                  ))}
                  <div className="ep-breakdown-total">
                    <span>Total Deductions</span>
                    <span>{fmt(mockPayslips[selected].deductions)}</span>
                  </div>
                </div>
              </div>

              <div className="ep-payslip-net-row">
                <span>Net Pay (Take Home)</span>
                <span className="ep-net-amount">{fmt(mockPayslips[selected].net)}</span>
              </div>
            </>
          ) : (
            <div className="ep-att-detail-empty">
              <FileText size={40} />
              <p>Select a payslip to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeePayslips;
