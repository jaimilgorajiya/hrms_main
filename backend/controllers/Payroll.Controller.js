import User from "../models/User.Model.js";
import Attendance from "../models/Attendance.Model.js";
import Request from "../models/Request.Model.js";
import EmployeeCTC from "../models/EmployeeCTC.Model.js";
import { computeWorkingMinutes } from "../utils/attendance.js";
import PenaltyRule from "../models/PenaltyRule.Model.js";
import Payout from "../models/Payout.Model.js";
import Company from '../models/Company.Model.js';
import pdfmake from 'pdfmake';

export const getMonthlyPayoutSummary = async (req, res) => {
    try {
        const { month } = req.query; // YYYY-MM
        if (!month) return res.status(400).json({ success: false, message: "Month is required (YYYY-MM)" });

        const [year, monthNum] = month.split('-').map(Number);
        const startDate = `${month}-01`;
        const endDate = new Date(year, monthNum, 0).toISOString().split('T')[0];
        const daysInMonth = new Date(year, monthNum, 0).getDate();

        const employees = await User.find({ 
            status: { $in: ['Active', 'Resigned'] } 
        })
            .populate('workSetup.shift')
            .populate('workSetup.salaryGroup')
            .select('name employeeId department designation workSetup role status');

        const existingPayouts = await Payout.find({ month });
        const initiatedMap = {};
        existingPayouts.forEach(p => {
            initiatedMap[p.employeeId.toString()] = p;
        });

        const summary = [];

        for (const emp of employees) {
            const isInitiated = !!initiatedMap[emp._id.toString()];
            
            const ctc = await EmployeeCTC.findOne({ employeeId: emp._id, status: 'Active' });
            if (!ctc) continue;

            const monthAttendance = await Attendance.find({
                employee: emp._id,
                date: { $gte: startDate, $lte: endDate }
            });

            const approvedLeaves = await Request.find({
                employee: emp._id,
                requestType: 'Leave',
                status: 'Approved',
                date: { $gte: startDate, $lte: endDate }
            });

            const usedPaidLeaves = approvedLeaves.filter(l => l.leaveCategory === 'Paid').length;
            const usedUnpaidLeaves = approvedLeaves.filter(l => l.leaveCategory === 'Unpaid').length;

            const presentDays = monthAttendance.filter(a => a.status === 'Present').length;
            const halfDays = monthAttendance.filter(a => a.status === 'Half Day').length;
            const weekOffs = monthAttendance.filter(a => a.status === 'Week Off').length;
            const holidays = monthAttendance.filter(a => a.status === 'Holiday').length;
            const absentDaysCount = monthAttendance.filter(a => a.status === 'Absent').length;
            
            const workedMins = monthAttendance.reduce((acc, a) => acc + computeWorkingMinutes(a.punches, a.breaks), 0);
            
            const shift = emp.workSetup?.shift;
            let expectedMins = 0;
            if (shift) {
                const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
                for (let d = 1; d <= daysInMonth; d++) {
                    const dateObj = new Date(year, monthNum - 1, d);
                    const dayName = daysOfWeek[dateObj.getDay()];
                    const isWeekOff = shift.weekOffDays?.includes(dayName.charAt(0).toUpperCase() + dayName.slice(1));
                    if (!isWeekOff) {
                        const sched = shift.schedule?.[dayName];
                        if (sched?.shiftStart && sched?.shiftEnd) {
                            const start = parseInt(sched.shiftStart.split(':')[0]) * 60 + parseInt(sched.shiftStart.split(':')[1]);
                            const end = parseInt(sched.shiftEnd.split(':')[0]) * 60 + parseInt(sched.shiftEnd.split(':')[1]);
                            expectedMins += (end > start ? end - start : (end + 1440 - start));
                        } else {
                            expectedMins += 540;
                        }
                    }
                }
            }

            let totalLatePenalty = 0;
            let totalEarlyPenalty = 0;
            for (const a of monthAttendance) {
                totalLatePenalty += a.lateInPenalty?.amount || 0;
                totalEarlyPenalty += a.earlyOutPenalty?.amount || 0;
            }

            const monthPenalty = totalLatePenalty + totalEarlyPenalty;
            const salaryGroup = emp.workSetup?.salaryGroup;
            const isFixed = salaryGroup?.workingDaysType === 'Fixed Working Days';
            const baseDays = isFixed ? (salaryGroup?.fixedDays || 26) : daysInMonth;

            const perDayGross = (ctc.monthlyGross || 0) / baseDays;
            const perDayNet = (ctc.netSalary || 0) / baseDays;
            const payableDays = presentDays + (halfDays * 0.5) + weekOffs + holidays + usedPaidLeaves;

            let accruedGross = 0;
            let accruedNet = 0;
            let unpaidLeaveDeduction = 0;

            if (isFixed) {
                const cappedPayable = Math.min(baseDays, payableDays);
                accruedGross = perDayGross * cappedPayable;
                accruedNet = (perDayNet * cappedPayable) - monthPenalty;
                unpaidLeaveDeduction = (ctc.netSalary || 0) - accruedNet - monthPenalty;
            } else {
                accruedGross = perDayGross * payableDays;
                accruedNet = (perDayNet * payableDays) - monthPenalty;
                unpaidLeaveDeduction = (ctc.netSalary || 0) - accruedNet - monthPenalty;
            }

            if (salaryGroup?.roundedSalary === 'Yes') {
                accruedGross = Math.round(accruedGross);
                accruedNet = Math.round(accruedNet);
                unpaidLeaveDeduction = Math.round(unpaidLeaveDeduction);
            } else {
                accruedGross = parseFloat(accruedGross.toFixed(2));
                accruedNet = parseFloat(accruedNet.toFixed(2));
                unpaidLeaveDeduction = parseFloat(unpaidLeaveDeduction.toFixed(2));
            }

            summary.push({
                employee: {
                    _id: emp._id,
                    name: emp.name,
                    employeeId: emp.employeeId,
                    department: emp.department,
                    designation: emp.designation
                },
                daysInMonth,
                isInitiated,
                attendance: { present: presentDays, halfDay: halfDays, absent: absentDaysCount, weekOff: weekOffs, holiday: holidays, paidLeave: usedPaidLeaves, unpaidLeave: usedUnpaidLeaves },
                hours: { worked: Math.floor(workedMins / 60) + 'h ' + (workedMins % 60) + 'm', expected: Math.floor(expectedMins / 60) + 'h ' + (expectedMins % 60) + 'm' },
                penalties: { 
                    lateIn: isInitiated ? 0 : totalLatePenalty, 
                    earlyOut: isInitiated ? 0 : totalEarlyPenalty, 
                    total: isInitiated ? 0 : monthPenalty 
                },
                salary: { 
                    monthlyGross: ctc.monthlyGross, 
                    monthlyNet: ctc.netSalary, 
                    accruedGross: isInitiated ? (initiatedMap[emp._id.toString()].systemAccrued || 0) : accruedGross, 
                    accruedNet: isInitiated ? (initiatedMap[emp._id.toString()].finalPayout || 0) : accruedNet, 
                    unpaidLeaveDeduction: isInitiated ? 0 : unpaidLeaveDeduction 
                }
            });
        }
        res.status(200).json({ success: true, month, summary });
    } catch (error) {
        console.error("getMonthlyPayoutSummary error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const initiatePayout = async (req, res) => {
    try {
        const { 
            employeeId, month, attendance, baseSalary, systemAccrued, penalties, adjustments, finalPayout 
        } = req.body;
        const adminId = req.user._id;
        const payout = await Payout.findOneAndUpdate(
            { employeeId, month },
            { $set: { attendance, baseSalary, systemAccrued, penalties, adjustments, finalPayout, initiatedBy: adminId, initiatedAt: new Date(), status: 'Initiated' } },
            { upsert: true, new: true }
        );
        res.status(200).json({ success: true, message: "Payout initiated successfully", payout });
    } catch (error) {
        console.error("initiatePayout error:", error);
        res.status(500).json({ success: false, message: "Failed to initiate payout" });
    }
};

export const generateSalarySlip = async (req, res) => {
    try {
        const { payoutIds } = req.body; // Array of IDs
        if (!payoutIds || !payoutIds.length) return res.status(400).json({ success: false, message: "No slips selected" });

        await Payout.updateMany(
            { _id: { $in: payoutIds }, status: 'Initiated' },
            { $set: { status: 'Generated' } }
        );

        res.status(200).json({ success: true, message: "Salary slips generated successfully" });
    } catch (error) {
        console.error("generateSalarySlip error:", error);
        res.status(500).json({ success: false, message: "Failed to generate slips" });
    }
};

export const publishSalarySlip = async (req, res) => {
    try {
        const { payoutIds } = req.body;
        if (!payoutIds || !payoutIds.length) return res.status(400).json({ success: false, message: "No slips selected" });

        await Payout.updateMany(
            { _id: { $in: payoutIds }, status: 'Generated' },
            { $set: { status: 'Published' } }
        );

        res.status(200).json({ success: true, message: "Salary slips published to employees" });
    } catch (error) {
        console.error("publishSalarySlip error:", error);
        res.status(500).json({ success: false, message: "Failed to publish slips" });
    }
};

export const getMyPayslips = async (req, res) => {
    try {
        const employeeId = req.user._id;
        const slips = await Payout.find({ 
            employeeId, 
            status: 'Published' 
        })
            .populate('employeeId', 'name employeeId department designation')
            .sort({ month: -1 });

        res.status(200).json({ success: true, history: slips });
    } catch (error) {
        console.error("getMyPayslips error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch payslips" });
    }
};

export const downloadPayslip = async (req, res) => {
    try {
        const { id } = req.params;
        const payout = await Payout.findById(id).populate('employeeId', 'name employeeId department designation adminId');
        if (!payout) return res.status(404).json({ success: false, message: "Payslip not found" });

        // Fetch company details based on the admin who onboarded this employee
        const company = await Company.findOne({ adminId: payout.employeeId?.adminId });

        const fonts = {
            Roboto: {
                normal: 'Helvetica',
                bold: 'Helvetica-Bold',
                italics: 'Helvetica-Oblique',
                bolditalics: 'Helvetica-BoldOblique'
            }
        };

        // Initialize pdfmake instance
        pdfmake.setFonts(fonts);

        // Fetch CTC Breakdown
        const ctc = await EmployeeCTC.findOne({ employeeId: payout.employeeId._id, status: 'Active' });
        
        // Calculate dynamic values based on payout ratio
        const ratio = payout.baseSalary > 0 ? (payout.systemAccrued / payout.baseSalary) : 0;
        
        let earningRows = [];
        let deductionRows = [];
        
        // Process Dynamic Earnings
        if (ctc && ctc.earnings && ctc.earnings.length > 0) {
            earningRows = ctc.earnings.map(e => ([
                { text: e.componentName, fontSize: 10 },
                { text: (e.amount * ratio).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }), fontSize: 10, alignment: 'right' }
            ]));
        } else {
            earningRows.push([{ text: 'Basic Salary (Accrued)', fontSize: 10 }, { text: payout.systemAccrued.toLocaleString(), fontSize: 10, alignment: 'right' }]);
        }

        // Process Dynamic Deductions from CTC
        if (ctc && ctc.deductions && ctc.deductions.length > 0) {
            deductionRows = ctc.deductions.map(d => ([
                { text: d.componentName, fontSize: 10 },
                { text: (d.amount * ratio).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }), fontSize: 10, alignment: 'right' }
            ]));
        }

        // Add System Penalties to Deductions
        if ((payout.penalties?.total || 0) > 0) {
            deductionRows.push([
                { text: 'Late In / Early Out', fontSize: 10 },
                { text: (payout.penalties.total).toLocaleString(), fontSize: 10, alignment: 'right' }
            ]);
        }

        // Add Adjustments
        if ((payout.adjustments?.bonus?.amount || 0) > 0) {
            earningRows.push([
                { text: `Bonus: ${payout.adjustments.bonus.reason || 'Performance'}`, fontSize: 10 },
                { text: (payout.adjustments.bonus.amount).toLocaleString(), fontSize: 10, alignment: 'right' }
            ]);
        }
        if ((payout.adjustments?.deduction?.amount || 0) > 0) {
            deductionRows.push([
                { text: `Deduction: ${payout.adjustments.deduction.reason || 'Other'}`, fontSize: 10 },
                { text: (payout.adjustments.deduction.amount).toLocaleString(), fontSize: 10, alignment: 'right' }
            ]);
        }

        // Build the table body by merging rows
        const maxRows = Math.max(earningRows.length, deductionRows.length);
        const tableBody = [
            [
                { text: 'EARNINGS', style: 'earningsHeader' },
                { text: 'AMOUNT', style: 'earningsHeader' },
                { text: 'DEDUCTIONS', style: 'deductionsHeader' },
                { text: 'AMOUNT', style: 'deductionsHeader' }
            ]
        ];

        let totalEarnings = 0;
        let totalDeductions = 0;

        for (let i = 0; i < maxRows; i++) {
            const e = earningRows[i] || [{ text: '', fontSize: 10 }, { text: '', fontSize: 10 }];
            const d = deductionRows[i] || [{ text: '', fontSize: 10 }, { text: '', fontSize: 10 }];
            tableBody.push([...e, ...d]);
            if (earningRows[i]) totalEarnings += parseFloat(e[1].text.replace(/,/g, '')) || 0;
            if (deductionRows[i]) totalDeductions += parseFloat(d[1].text.replace(/,/g, '')) || 0;
        }

        // Summary Row
        tableBody.push([
            { text: 'Total Earnings', bold: true, fontSize: 11, fillColor: '#f8fafc' },
            { text: totalEarnings.toLocaleString(), bold: true, fontSize: 11, alignment: 'right', fillColor: '#f8fafc' },
            { text: 'Total Deductions', bold: true, fontSize: 11, fillColor: '#f8fafc' },
            { text: totalDeductions.toLocaleString(), bold: true, fontSize: 11, alignment: 'right', fillColor: '#f8fafc' }
        ]);

        const docDefinition = {
            content: [
                // Header Region
                { text: company?.companyName || 'COMPANY NAME', style: 'header' },
                { text: `${company?.address || ''}${company?.pincode ? ', ' + company.pincode : ''}`, style: 'subHeader' },
                { text: `Email: ${company?.companyEmail || 'N/A'} | Contact: ${company?.companyContact || 'N/A'}`, style: 'subHeader' },
                { canvas: [{ type: 'line', x1: 0, y1: 5, x2: 515, y2: 5, lineWidth: 1, lineColor: '#e2e8f0' }] },
                
                { text: `PAYSLIP FOR THE MONTH OF ${payout.month}`, style: 'title' },

                // Employee Details Table
                {
                    table: {
                        widths: ['20%', '30%', '20%', '30%'],
                        body: [
                            [
                                { text: 'Employee Name:', bold: true, fontSize: 10 },
                                { text: payout.employeeId?.name || 'N/A', fontSize: 10 },
                                { text: 'Employee ID:', bold: true, fontSize: 10 },
                                { text: payout.employeeId?.employeeId || 'N/A', fontSize: 10 }
                            ],
                            [
                                { text: 'Department:', bold: true, fontSize: 10 },
                                { text: payout.employeeId?.department || 'N/A', fontSize: 10 },
                                { text: 'Designation:', bold: true, fontSize: 10 },
                                { text: payout.employeeId?.designation || 'N/A', fontSize: 10 }
                            ],
                            [
                                { text: 'Generated On:', bold: true, fontSize: 10 },
                                { text: new Date().toLocaleDateString(), fontSize: 10 },
                                { text: '', fontSize: 10 },
                                { text: '', fontSize: 10 }
                            ]
                        ]
                    },
                    layout: 'noBorders',
                    margin: [0, 10, 0, 20]
                },

                // Attendance Summary
                { text: 'ATTENDANCE SUMMARY', style: 'sectionHeader' },
                {
                    table: {
                        headerRows: 1,
                        widths: ['*', '*', '*', '*', '*', '*', '*'],
                        body: [
                            [
                                { text: 'Present', style: 'tableHeader' },
                                { text: 'Half Day', style: 'tableHeader' },
                                { text: 'Absent', style: 'tableHeader' },
                                { text: 'Paid LV', style: 'tableHeader' },
                                { text: 'Unpaid LV', style: 'tableHeader' },
                                { text: 'Week Off', style: 'tableHeader' },
                                { text: 'Holiday', style: 'tableHeader' }
                            ],
                            [
                                { text: payout.attendance.present, alignment: 'center', fontSize: 9 },
                                { text: payout.attendance.halfDay, alignment: 'center', fontSize: 9 },
                                { text: payout.attendance.absent, alignment: 'center', fontSize: 9 },
                                { text: payout.attendance.paidLeave, alignment: 'center', fontSize: 9 },
                                { text: payout.attendance.unpaidLeave, alignment: 'center', fontSize: 9 },
                                { text: payout.attendance.weekOff, alignment: 'center', fontSize: 9 },
                                { text: payout.attendance.holiday, alignment: 'center', fontSize: 9 }
                            ]
                        ]
                    },
                    margin: [0, 5, 0, 20]
                },

                // Earnings & Deductions (Dynamic)
                {
                    table: {
                        headerRows: 1,
                        widths: ['35%', '15%', '35%', '15%'],
                        body: tableBody
                    },
                    margin: [0, 0, 0, 20]
                },

                // Net Amount Area
                {
                    table: {
                        widths: ['*', '35%'],
                        body: [
                             [
                                { text: 'NET PAYABLE:', bold: true, fontSize: 13, color: '#0f172a', margin: [0, 5, 0, 5] },
                                { text: ` ${payout.finalPayout.toLocaleString()}`, bold: true, fontSize: 16, color: '#0f172a', alignment: 'right', margin: [0, 5, 0, 5] }
                            ]
                        ]
                    },
                    layout: {
                        fillColor: '#eff6ff',
                        hLineWidth: () => 1,
                        vLineWidth: () => 0,
                        hLineColor: '#bfdbfe'
                    }
                },

                { text: `(Rupees ${amountToWords(payout.finalPayout)} Only)`, fontSize: 10, italics: true, margin: [0, 10, 0, 0], alignment: 'right' },

                // Footer Region
                { text: 'This is a computer-generated document and does not require a physical signature.', style: 'footer' }
            ],
            styles: {
                header: { fontSize: 22, bold: true, color: '#0f172a', alignment: 'center', margin: [0, 0, 0, 5] },
                subHeader: { fontSize: 9, color: '#475569', alignment: 'center', margin: [0, 0, 0, 2] },
                title: { fontSize: 12, bold: true, alignment: 'center', margin: [0, 15, 0, 15], color: '#334155', background: '#f8fafc' },
                sectionHeader: { fontSize: 10, bold: true, margin: [0, 0, 0, 8], color: '#334155', letterSpacing: 1 },
                tableHeader: { bold: true, fontSize: 9, alignment: 'center', fillColor: '#334155', color: 'white', margin: [0, 4, 0, 4] },
                earningsHeader: { bold: true, fontSize: 10, fillColor: '#1e293b', color: 'white', margin: [0, 4, 0, 4] },
                deductionsHeader: { bold: true, fontSize: 10, fillColor: '#475569', color: 'white', margin: [0, 4, 0, 4] },
                footer: { fontSize: 8, italics: true, color: '#94a3b8', alignment: 'center', margin: [0, 60, 0, 0] }
            },
            defaultStyle: { font: 'Roboto' }
        };

        // Helper function for amount to words
        function amountToWords(amount) {
            const a = ['','One ','Two ','Three ','Four ', 'Five ','Six ','Seven ','Eight ','Nine ','Ten ','Eleven ','Twelve ','Thirteen ','Fourteen ','Fifteen ','Sixteen ','Seventeen ','Eighteen ','Nineteen '];
            const b = ['', '', 'Twenty','Thirty','Forty','Fifty', 'Sixty','Seventy','Eighty','Ninety'];

            function inWords (num) {
                if ((num = num.toString()).length > 9) return 'overflow';
                const n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
                if (!n) return; let str = '';
                str += (Number(n[1]) != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
                str += (Number(n[2]) != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
                str += (Number(n[3]) != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
                str += (Number(n[4]) != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
                str += (Number(n[5]) != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) : '';
                return str;
            }
            return inWords(amount);
        }

        const pdfDoc = await pdfmake.createPdf(docDefinition);
        const buffer = await pdfDoc.getBuffer();

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=payslip-${payout.month}.pdf`);
        
        res.send(Buffer.from(buffer));

    } catch (error) {
        console.error("downloadPayslip error:", error);
        res.status(500).json({ success: false, message: "Failed to generate PDF" });
    }
};

export const deletePayout = async (req, res) => {
    try {
        const { id } = req.params;
        const payout = await Payout.findById(id);
        
        if (!payout) return res.status(404).json({ success: false, message: "Record not found" });
        if (payout.status === 'Published') {
            // Optional: You might want to restrict deleting published slips, 
            // but for recovery purposes we allow it here.
        }

        await Payout.findByIdAndDelete(id);
        res.status(200).json({ success: true, message: "Payout record cleared successfully" });
    } catch (error) {
        console.error("deletePayout error:", error);
        res.status(500).json({ success: false, message: "Failed to delete record" });
    }
};

export const getPayoutHistory = async (req, res) => {
    try {
        const { month, employeeId } = req.query;
        let query = {};
        if (month) query.month = month;
        if (employeeId) query.employeeId = employeeId;

        const history = await Payout.find(query)
            .populate('employeeId', 'name employeeId department designation')
            .populate('initiatedBy', 'name')
            .sort({ initiatedAt: -1 });

        res.status(200).json({ success: true, history });
    } catch (error) {
        console.error("getPayoutHistory error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch payout history" });
    }
};
