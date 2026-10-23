/**
 * download_payslip.js
 * -------------------
 * Finds an existing Payout record for a given employee & month,
 * generates the PDF using the same engine as the web portal,
 * and saves it to the /backend/scripts/ folder.
 *
 * Usage:
 *   node --experimental-vm-modules scripts/download_payslip.js
 *
 * Edit EMPLOYEE_NAME and TARGET_MONTH below before running.
 */

import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

// ─── CONFIG — Edit these ──────────────────────────────────────────────────────
const EMPLOYEE_NAME = 'Nirmal Vaghasiya';   // full or partial name (case-insensitive)
const TARGET_MONTH  = '2026-08';             // YYYY-MM
const OUTPUT_DIR    = __dirname;             // saves next to this script
// ─────────────────────────────────────────────────────────────────────────────

import Payout      from '../models/Payout.Model.js';
import User        from '../models/User.Model.js';
import Company     from '../models/Company.Model.js';
import Attendance  from '../models/Attendance.Model.js';
import Holiday     from '../models/Holiday.Model.js';
import EmployeeCTC from '../models/EmployeeCTC.Model.js';
import { computeWorkingMinutes } from '../utils/attendance.js';
import pdfmake from 'pdfmake';

// ─── Connect ──────────────────────────────────────────────────────────────────
await mongoose.connect(process.env.MONGO_URI);
console.log('✅ Connected to MongoDB');

// ─── Find Employee ────────────────────────────────────────────────────────────
const employee = await User.findOne({
    name: { $regex: EMPLOYEE_NAME, $options: 'i' }
}).select('_id name employeeId department designation adminId');

if (!employee) {
    console.error(`❌ Employee "${EMPLOYEE_NAME}" not found.`);
    await mongoose.disconnect();
    process.exit(1);
}
console.log(`👤 Employee: ${employee.name} (${employee.employeeId})  ID: ${employee._id}`);

// ─── Find Payout ──────────────────────────────────────────────────────────────
const payout = await Payout.findOne({
    employeeId: employee._id,
    month: TARGET_MONTH
}).populate('employeeId', 'name employeeId department designation adminId');

if (!payout) {
    console.error(`❌ No payout record found for ${employee.name} in month ${TARGET_MONTH}.`);
    console.error('   → Generate/initiate the salary slip from the admin portal first.');
    await mongoose.disconnect();
    process.exit(1);
}
console.log(`💰 Payout found  ID: ${payout._id}  Status: ${payout.status}  NetPay: ₹${payout.finalPayout}`);

// ─── Company Info ─────────────────────────────────────────────────────────────
const company = await Company.findOne({ adminId: employee.adminId });

// ─── Attendance data ──────────────────────────────────────────────────────────
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
    adminId: employee.adminId,
    year,
    date: { $gte: startDate, $lte: endDate },
    status: 'Active'
});
const holMap = {};
monthHolidays.forEach(h => { holMap[h.date] = h; });

const perDayNet = (payout.finalPayout || 0) / (payout.attendance?.present || daysInMonth || 1);

// ─── Build day-wise rows ──────────────────────────────────────────────────────
const daywiseRows = [];
for (let d = 1; d <= daysInMonth; d++) {
    const dateStr  = `${TARGET_MONTH}-${String(d).padStart(2, '0')}`;
    const dateObj  = new Date(dateStr);
    const dayName  = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
    const attRec   = attMap[dateStr];
    const holRec   = holMap[dateStr];

    const status     = attRec?.status || (holRec ? 'Holiday' : 'Absent');
    let punchIn      = '--';
    let punchOut     = '--';
    let workedMins   = 0;

    if (attRec) {
        const first = attRec.punches?.[0];
        const last  = attRec.punches?.[attRec.punches.length - 1];
        if (first?.punchIn)  punchIn  = new Date(first.punchIn ).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
        if (last?.punchOut)  punchOut = new Date(last.punchOut ).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
        workedMins = computeWorkingMinutes(attRec.punches || []);
    }

    const displayDate  = `${String(d).padStart(2, '0')}-${dateObj.toLocaleString('en-US', { month: 'short' })}`;
    const punchesStr   = punchIn !== '--' ? `${punchIn} - ${punchOut}` : '--';
    const workedHrsStr = workedMins > 0 ? `${Math.floor(workedMins / 60)}h ${workedMins % 60}m` : '--';

    daywiseRows.push([
        { text: `${displayDate} (${dayName.slice(0, 3)})`, fontSize: 7, alignment: 'left' },
        { text: status,        fontSize: 7, alignment: 'center' },
        { text: punchesStr,    fontSize: 7, alignment: 'center' },
        { text: workedHrsStr,  fontSize: 7, alignment: 'center' },
        { text: '-',           fontSize: 7, alignment: 'center', color: '#475569' },
        { text: `Rs. ${Math.round(perDayNet).toLocaleString()}`, fontSize: 7, alignment: 'right', bold: true }
    ]);
}

// ─── Earnings / Deductions ────────────────────────────────────────────────────
const fonts = {
    Roboto: { normal: 'Helvetica', bold: 'Helvetica-Bold', italics: 'Helvetica-Oblique', bolditalics: 'Helvetica-BoldOblique' }
};
pdfmake.setFonts(fonts);

let earningRows = [];
let deductionRows = [];

if (payout.earnings?.length > 0) {
    earningRows = payout.earnings.map(e => ([
        { text: e.componentName, fontSize: 10 },
        { text: Math.round(e.calculatedAmount).toLocaleString(), fontSize: 10, alignment: 'right' }
    ]));
} else {
    earningRows.push([
        { text: 'Basic Salary (Accrued)', fontSize: 10 },
        { text: Math.round(payout.systemAccrued ?? payout.finalPayout ?? 0).toLocaleString(), fontSize: 10, alignment: 'right' }
    ]);
}

if (payout.deductions?.length > 0) {
    deductionRows = payout.deductions.map(d => ([
        { text: d.componentName, fontSize: 10 },
        { text: Math.round(d.amount).toLocaleString(), fontSize: 10, alignment: 'right' }
    ]));
}
if ((payout.penalties?.total || 0) > 0) {
    deductionRows.push([
        { text: 'Late In / Early Out', fontSize: 10 },
        { text: (payout.penalties.total).toLocaleString(), fontSize: 10, alignment: 'right' }
    ]);
}

const maxRows   = Math.max(earningRows.length, deductionRows.length);
const tableBody = [[
    { text: 'EARNINGS',   style: 'earningsHeader' },
    { text: 'AMOUNT',     style: 'earningsHeader' },
    { text: 'DEDUCTIONS', style: 'deductionsHeader' },
    { text: 'AMOUNT',     style: 'deductionsHeader' }
]];

let totalEarnings   = 0;
let totalDeductions = 0;
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

// ─── Document Definition ──────────────────────────────────────────────────────
const docDefinition = {
    content: [
        { text: company?.companyName || 'COMPANY NAME', style: 'header' },
        { text: `${company?.address || ''}${company?.pincode ? ', ' + company.pincode : ''}`, style: 'subHeader' },
        { text: `Email: ${company?.companyEmail || 'N/A'} | Contact: ${company?.companyContact || 'N/A'}`, style: 'subHeader' },
        { canvas: [{ type: 'line', x1: 0, y1: 5, x2: 515, y2: 5, lineWidth: 1, lineColor: '#e2e8f0' }] },
        { text: `PAYSLIP FOR THE MONTH OF ${payout.month}`, style: 'title' },
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
            layout: 'noBorders',
            margin: [0, 10, 0, 20]
        },
        { text: 'ATTENDANCE SUMMARY', style: 'sectionHeader' },
        {
            table: {
                widths: ['25%', '25%', '25%', '25%'],
                body: [[
                    { text: `Present Days\n${payout.attendance?.present ?? '--'}`,  style: 'attendanceCell' },
                    { text: `LOP Days\n${payout.attendance?.unpaidLeave ?? '--'}`,          style: 'attendanceCell' },
                    { text: `Paid Leaves\n${payout.attendance?.paidLeave ?? '--'}`,    style: 'attendanceCell' },
                    { text: `Working Days\n${daysInMonth}`,                 style: 'attendanceCell' }
                ]]
            },
            layout: 'noBorders',
            margin: [0, 4, 0, 16]
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
                    { text: `Rs. ${Math.round(payout.finalPayout || 0).toLocaleString()}`, bold: true, fontSize: 13, fillColor: '#0f172a', color: 'white', alignment: 'right', margin: [0, 8, 8, 8] }
                ]]
            },
            layout: 'noBorders',
            margin: [0, 0, 0, 20]
        },
        { text: 'DAY-WISE ATTENDANCE DETAIL', style: 'sectionHeader' },
        {
            table: {
                headerRows: 1,
                widths: ['22%', '15%', '25%', '15%', '12%', '11%'],
                body: [
                    [
                        { text: 'Date',          style: 'daywiseHeader' },
                        { text: 'Status',        style: 'daywiseHeader' },
                        { text: 'Punch In - Out',style: 'daywiseHeader' },
                        { text: 'Hours',         style: 'daywiseHeader' },
                        { text: 'Penalty',       style: 'daywiseHeader' },
                        { text: 'Earned',        style: 'daywiseHeader' }
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

// ─── Generate & Save PDF ──────────────────────────────────────────────────────
const pdfDoc = pdfmake.createPdf(docDefinition);
const buffer = await pdfDoc.getBuffer();
const safeName = (employee.employeeId || employee.name).replace(/\s+/g, '_');
const outputPath = path.join(OUTPUT_DIR, `payslip_${safeName}_${TARGET_MONTH}.pdf`);
fs.writeFileSync(outputPath, Buffer.from(buffer));

console.log(`\n✅ PDF generated successfully!`);
console.log(`📄 File: ${outputPath}`);
console.log(`💰 Net Pay: ₹${Math.round(payout.finalPayout || 0).toLocaleString()}`);

await mongoose.disconnect();
