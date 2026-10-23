/**
 * revise_salary_and_generate_slip.js
 * ------------------------------------
 * 1. Archives current CTC into history
 * 2. Updates employee CTC to ₹18,000
 * 3. Updates the August 2026 payout record to ₹18,000
 * 4. Generates and saves the payslip PDF
 *
;    * Usage: node scripts/revise_salary_and_generate_slip.js
 */

import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const EMPLOYEE_ID_DB  = '6a4ce70c4b4774424eaf292f';   // Nirmal Vaghasiya's _id
const CTC_ID          = '6a4ceecd1af651c4de2773aa';    // active CTC document _id
const PAYOUT_ID       = '6ab3c79d934d94a1891a1e21';    // August 2026 payout _id
const TARGET_MONTH    = '2026-08';
const NEW_MONTHLY     = 18000;
const NEW_ANNUAL      = NEW_MONTHLY * 12;              // 216000
const EFFECTIVE_DATE  = new Date('2026-08-01');
// ─────────────────────────────────────────────────────────────────────────────

import EmployeeCTC from '../models/EmployeeCTC.Model.js';
import Payout      from '../models/Payout.Model.js';
import User        from '../models/User.Model.js';
import Company     from '../models/Company.Model.js';
import Attendance  from '../models/Attendance.Model.js';
import Holiday     from '../models/Holiday.Model.js';
import { computeWorkingMinutes } from '../utils/attendance.js';
import pdfmake from 'pdfmake';

await mongoose.connect(process.env.MONGO_URI);
console.log('✅ Connected to MongoDB\n');

// ─── STEP 1: Archive current CTC into history ─────────────────────────────────
console.log('📋 STEP 1: Archiving current CTC into history...');
const ctc = await EmployeeCTC.findById(CTC_ID);
if (!ctc) { console.error('❌ CTC record not found'); process.exit(1); }

const historyEntry = {
    annualCTC: ctc.annualCTC,
    monthlyGross: ctc.monthlyGross,
    netSalary: ctc.netSalary,
    earnings: ctc.earnings,
    deductions: ctc.deductions,
    effectiveDate: ctc.effectiveDate,
    endDate: new Date(),
    incrementPercentage: ctc.incrementPercentage || 0,
    status: 'Previous',
    branch: ctc.branch || 'HO',
    department: ctc.department || 'Digital Marketing',
    designation: ctc.designation || 'Video Editor',
    salaryGroup: ctc.salaryGroup || 'Staff',
    updatedAt: new Date()
};
ctc.history.push(historyEntry);
console.log(`   ✓ Archived: ₹${ctc.monthlyGross}/month → history`);

// ─── STEP 2: Update CTC to ₹18,000 ──────────────────────────────────────────
console.log('\n💰 STEP 2: Updating CTC to ₹18,000...');
ctc.annualCTC      = NEW_ANNUAL;
ctc.monthlyGross   = NEW_MONTHLY;
ctc.netSalary      = NEW_MONTHLY;
ctc.effectiveDate  = EFFECTIVE_DATE;
ctc.updatedAt      = new Date();

// Update the Basic Salary earning component
if (ctc.earnings && ctc.earnings.length > 0) {
    ctc.earnings[0].amount = NEW_MONTHLY;
}

await ctc.save();
console.log(`   ✓ CTC updated: ₹${NEW_MONTHLY}/month  (Annual: ₹${NEW_ANNUAL})`);

// ─── STEP 3: Update August payout record ─────────────────────────────────────
console.log('\n📊 STEP 3: Updating August 2026 payout record...');
const payout = await Payout.findById(PAYOUT_ID);
if (!payout) { console.error('❌ Payout record not found'); process.exit(1); }

const oldPayout = payout.finalPayout;
payout.baseSalary         = NEW_MONTHLY;
payout.joiningMonthlyGross = NEW_MONTHLY;
payout.joiningNetSalary    = NEW_MONTHLY;
payout.systemAccrued       = NEW_MONTHLY;
payout.finalPayout         = NEW_MONTHLY;

// Update the earnings snapshot
if (payout.earnings && payout.earnings.length > 0) {
    payout.earnings[0].monthlyAmount    = NEW_MONTHLY;
    payout.earnings[0].calculatedAmount = NEW_MONTHLY;
}

payout.updatedAt = new Date();
await payout.save();
console.log(`   ✓ Payout updated: ₹${oldPayout} → ₹${payout.finalPayout}`);

// ─── STEP 4: Generate PDF ─────────────────────────────────────────────────────
console.log('\n📄 STEP 4: Generating payslip PDF...');

const employee = await User.findById(EMPLOYEE_ID_DB)
    .select('name employeeId department designation adminId');
const company  = await Company.findOne({ adminId: employee.adminId });

const [year, monthNum] = TARGET_MONTH.split('-').map(Number);
const daysInMonth = new Date(year, monthNum, 0).getDate();
const startDate   = `${TARGET_MONTH}-01`;
const endDate     = `${TARGET_MONTH}-${String(daysInMonth).padStart(2, '0')}`;

const monthAttendance = await Attendance.find({
    employee: employee._id,
    date: { $gte: startDate, $lte: endDate }
});
const attMap = {};
monthAttendance.forEach(a => { attMap[a.date] = a; });

const monthHolidays = await Holiday.find({
    adminId: employee.adminId, year,
    date: { $gte: startDate, $lte: endDate }, status: 'Active'
});
const holMap = {};
monthHolidays.forEach(h => { holMap[h.date] = h; });

const perDayNet = NEW_MONTHLY / (payout.attendance?.present || daysInMonth || 1);

// Day-wise rows
const daywiseRows = [];
for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${TARGET_MONTH}-${String(d).padStart(2, '0')}`;
    const dateObj = new Date(dateStr);
    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
    const attRec  = attMap[dateStr];
    const holRec  = holMap[dateStr];

    const status   = attRec?.status || (holRec ? 'Holiday' : 'Absent');
    let punchIn    = '--', punchOut = '--', workedMins = 0;

    if (attRec) {
        const first = attRec.punches?.[0];
        const last  = attRec.punches?.[attRec.punches.length - 1];
        if (first?.punchIn)  punchIn  = new Date(first.punchIn).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
        if (last?.punchOut)  punchOut = new Date(last.punchOut).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
        workedMins = computeWorkingMinutes(attRec.punches || []);
    }

    const displayDate  = `${String(d).padStart(2, '0')}-${dateObj.toLocaleString('en-US', { month: 'short' })}`;
    const punchesStr   = punchIn !== '--' ? `${punchIn} - ${punchOut}` : '--';
    const workedHrsStr = workedMins > 0 ? `${Math.floor(workedMins / 60)}h ${workedMins % 60}m` : '--';

    daywiseRows.push([
        { text: `${displayDate} (${dayName.slice(0,3)})`, fontSize: 7, alignment: 'left' },
        { text: status,        fontSize: 7, alignment: 'center' },
        { text: punchesStr,    fontSize: 7, alignment: 'center' },
        { text: workedHrsStr,  fontSize: 7, alignment: 'center' },
        { text: '-',           fontSize: 7, alignment: 'center', color: '#475569' },
        { text: `Rs. ${Math.round(perDayNet).toLocaleString()}`, fontSize: 7, alignment: 'right', bold: true }
    ]);
}

// Earnings/Deductions
const fonts = {
    Roboto: { normal: 'Helvetica', bold: 'Helvetica-Bold', italics: 'Helvetica-Oblique', bolditalics: 'Helvetica-BoldOblique' }
};
pdfmake.setFonts(fonts);

const earningRows = payout.earnings?.length > 0
    ? payout.earnings.map(e => ([
        { text: e.componentName, fontSize: 10 },
        { text: Math.round(e.calculatedAmount).toLocaleString(), fontSize: 10, alignment: 'right' }
      ]))
    : [[
        { text: 'Basic Salary (Accrued)', fontSize: 10 },
        { text: NEW_MONTHLY.toLocaleString(), fontSize: 10, alignment: 'right' }
      ]];

const deductionRows = [];
if ((payout.penalties?.total || 0) > 0) {
    deductionRows.push([
        { text: 'Late In / Early Out', fontSize: 10 },
        { text: (payout.penalties.total).toLocaleString(), fontSize: 10, alignment: 'right' }
    ]);
}

const maxRows   = Math.max(earningRows.length, deductionRows.length, 1);
const tableBody = [[
    { text: 'EARNINGS',   style: 'earningsHeader' },
    { text: 'AMOUNT',     style: 'earningsHeader' },
    { text: 'DEDUCTIONS', style: 'deductionsHeader' },
    { text: 'AMOUNT',     style: 'deductionsHeader' }
]];

let totalEarnings = 0, totalDeductions = 0;
for (let i = 0; i < maxRows; i++) {
    const e = earningRows[i]   || [{ text: '', fontSize: 10 }, { text: '', fontSize: 10 }];
    const d = deductionRows[i] || [{ text: '', fontSize: 10 }, { text: '', fontSize: 10 }];
    tableBody.push([...e, ...d]);
    if (earningRows[i])   totalEarnings   += parseFloat(String(e[1].text).replace(/,/g, '')) || 0;
    if (deductionRows[i]) totalDeductions += parseFloat(String(d[1].text).replace(/,/g, '')) || 0;
}
tableBody.push([
    { text: 'Total Earnings',    bold: true, fontSize: 11, fillColor: '#f8fafc' },
    { text: totalEarnings.toLocaleString(),   bold: true, fontSize: 11, alignment: 'right', fillColor: '#f8fafc' },
    { text: 'Total Deductions',  bold: true, fontSize: 11, fillColor: '#f8fafc' },
    { text: totalDeductions.toLocaleString(), bold: true, fontSize: 11, alignment: 'right', fillColor: '#f8fafc' }
]);

const docDefinition = {
    content: [
        { text: company?.companyName || 'COMPANY NAME', style: 'header' },
        { text: `${company?.address || ''}${company?.pincode ? ', ' + company.pincode : ''}`, style: 'subHeader' },
        { text: `Email: ${company?.companyEmail || 'N/A'} | Contact: ${company?.companyContact || 'N/A'}`, style: 'subHeader' },
        { canvas: [{ type: 'line', x1: 0, y1: 5, x2: 515, y2: 5, lineWidth: 1, lineColor: '#e2e8f0' }] },
        { text: `PAYSLIP FOR THE MONTH OF ${TARGET_MONTH}`, style: 'title' },
        {
            table: {
                widths: ['20%', '30%', '20%', '30%'],
                body: [
                    [
                        { text: 'Employee Name:', bold: true, fontSize: 10 },
                        { text: employee.name, fontSize: 10 },
                        { text: 'Employee ID:', bold: true, fontSize: 10 },
                        { text: employee.employeeId || 'N/A', fontSize: 10 }
                    ],
                    [
                        { text: 'Department:', bold: true, fontSize: 10 },
                        { text: employee.department || 'N/A', fontSize: 10 },
                        { text: 'Designation:', bold: true, fontSize: 10 },
                        { text: employee.designation || 'N/A', fontSize: 10 }
                    ],
                    [
                        { text: 'Generated On:', bold: true, fontSize: 10 },
                        { text: new Date().toLocaleDateString('en-IN'), fontSize: 10 },
                        { text: 'Pay Month:', bold: true, fontSize: 10 },
                        { text: TARGET_MONTH, fontSize: 10 }
                    ]
                ]
            },
            layout: 'noBorders', margin: [0, 10, 0, 20]
        },
        { text: 'ATTENDANCE SUMMARY', style: 'sectionHeader' },
        {
            table: {
                widths: ['25%', '25%', '25%', '25%'],
                body: [[
                    { text: `Present Days\n${payout.attendance?.present ?? '--'}`,    style: 'attendanceCell' },
                    { text: `LOP Days\n${payout.attendance?.unpaidLeave ?? '--'}`,    style: 'attendanceCell' },
                    { text: `Paid Leaves\n${payout.attendance?.paidLeave ?? '--'}`,   style: 'attendanceCell' },
                    { text: `Working Days\n${daysInMonth}`,                            style: 'attendanceCell' }
                ]]
            },
            layout: 'noBorders', margin: [0, 4, 0, 16]
        },
        { text: 'SALARY BREAKDOWN', style: 'sectionHeader' },
        {
            table: { widths: ['35%', '15%', '35%', '15%'], body: tableBody },
            layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5, hLineColor: () => '#e2e8f0', vLineColor: () => '#e2e8f0' },
            margin: [0, 4, 0, 16]
        },
        {
            table: {
                widths: ['70%', '30%'],
                body: [[
                    { text: 'NET PAY (Take Home)', bold: true, fontSize: 13, fillColor: '#0f172a', color: 'white', margin: [8, 8, 0, 8] },
                    { text: `Rs. ${NEW_MONTHLY.toLocaleString()}`, bold: true, fontSize: 13, fillColor: '#0f172a', color: 'white', alignment: 'right', margin: [0, 8, 8, 8] }
                ]]
            },
            layout: 'noBorders', margin: [0, 0, 0, 20]
        },
        { text: 'DAY-WISE ATTENDANCE DETAIL', style: 'sectionHeader' },
        {
            table: {
                headerRows: 1,
                widths: ['22%', '15%', '25%', '15%', '12%', '11%'],
                body: [
                    [
                        { text: 'Date',           style: 'daywiseHeader' },
                        { text: 'Status',         style: 'daywiseHeader' },
                        { text: 'Punch In - Out', style: 'daywiseHeader' },
                        { text: 'Hours',          style: 'daywiseHeader' },
                        { text: 'Penalty',        style: 'daywiseHeader' },
                        { text: 'Earned',         style: 'daywiseHeader' }
                    ],
                    ...daywiseRows
                ]
            },
            layout: { hLineWidth: () => 0.3, vLineWidth: () => 0.3, hLineColor: () => '#e2e8f0', vLineColor: () => '#e2e8f0' },
            margin: [0, 4, 0, 0]
        }
    ],
    styles: {
        header:           { fontSize: 18, bold: true, alignment: 'center', color: '#0f172a', margin: [0, 0, 0, 4] },
        subHeader:        { fontSize: 9,  alignment: 'center', color: '#64748b', margin: [0, 0, 0, 2] },
        title:            { fontSize: 13, bold: true, alignment: 'center', color: '#1e40af', margin: [0, 14, 0, 14] },
        sectionHeader:    { fontSize: 11, bold: true, color: '#1e3a5f', margin: [0, 0, 0, 4] },
        earningsHeader:   { fontSize: 10, bold: true, fillColor: '#dcfce7', color: '#166534' },
        deductionsHeader: { fontSize: 10, bold: true, fillColor: '#fee2e2', color: '#991b1b' },
        attendanceCell:   { fontSize: 10, alignment: 'center', bold: true },
        daywiseHeader:    { fontSize: 8,  bold: true, fillColor: '#f1f5f9', alignment: 'center' }
    },
    defaultStyle: { font: 'Roboto' },
    pageSize: 'A4',
    pageMargins: [30, 30, 30, 30]
};

const pdfDoc = pdfmake.createPdf(docDefinition);
const buffer = await pdfDoc.getBuffer();
const outputPath = path.join(__dirname, `payslip_NIRMAL_VAGHASIYA_${TARGET_MONTH}_REVISED.pdf`);
fs.writeFileSync(outputPath, Buffer.from(buffer));

console.log(`   ✓ PDF saved: ${outputPath}`);

// ─── Summary ──────────────────────────────────────────────────────────────────
console.log('\n═══════════════════════════════════════════');
console.log('✅ ALL STEPS COMPLETED SUCCESSFULLY');
console.log('═══════════════════════════════════════════');
console.log(`   Employee  : ${employee.name} (${employee.employeeId})`);
console.log(`   Month     : ${TARGET_MONTH}`);
console.log(`   Old Salary: ₹15,000`);
console.log(`   New Salary: ₹${NEW_MONTHLY.toLocaleString()}`);
console.log(`   Annual CTC: ₹${NEW_ANNUAL.toLocaleString()}`);
console.log(`   PDF       : ${outputPath}`);
console.log('═══════════════════════════════════════════\n');

await mongoose.disconnect();
