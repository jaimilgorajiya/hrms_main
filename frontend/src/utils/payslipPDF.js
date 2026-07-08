import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import API_URL from '../config/api';

const generatePayslipPDF = async (payout, company) => {
    // --- Fetch Day-wise Salary Breakdown ---
    let daywiseData = null;
    try {
        const token = localStorage.getItem('token') || localStorage.getItem('mobile_token');
        const res = await fetch(`${API_URL}/api/payroll/my-slips/${payout._id}/daywise`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const json = await res.json();
        if (json.success) {
            daywiseData = json;
        }
    } catch (err) {
        console.error("Failed to fetch day-wise details for PDF", err);
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // --- Header ---
    doc.setFontSize(22);
    doc.setTextColor(37, 99, 235); // Blue
    doc.setFont('helvetica', 'bold');
    doc.text(company?.companyName || 'COMPANY NAME', pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    const address = `${company?.address || ''}, ${company?.pincode || ''}`;
    doc.text(address, pageWidth / 2, 28, { align: 'center' });
    doc.text(`Email: ${company?.companyEmail || ''} | Contact: ${company?.companyContact || ''}`, pageWidth / 2, 34, { align: 'center' });

    doc.setDrawColor(226, 232, 240);
    doc.line(15, 40, pageWidth - 15, 40);

    // --- Payslip Title ---
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text(`SALARY SLIP - ${payout.month}`, pageWidth / 2, 50, { align: 'center' });

    // --- Employee Info ---
    const empInfo = [
        ['Employee Name:', payout.employeeId?.name || 'N/A', 'Employee ID:', payout.employeeId?.employeeId || 'N/A'],
        ['Department:', payout.employeeId?.department || 'N/A', 'Designation:', payout.employeeId?.designation || 'N/A'],
        ['Payment Date:', new Date().toLocaleDateString(), 'Status:', 'Published']
    ];

    autoTable(doc, {
        startY: 60,
        body: empInfo,
        theme: 'plain',
        styles: { fontSize: 9, cellPadding: 2 },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 35 },
            1: { cellWidth: 60 },
            2: { fontStyle: 'bold', cellWidth: 30 },
            3: { cellWidth: 60 }
        }
    });

    // --- Attendance Summary ---
    const attendStartY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(11);
    doc.text('Attendance Summary', 15, attendStartY);

    const attendData = [
        ['Present', 'Half Day', 'Absent', 'Paid Leave', 'Unpaid Leave', 'Week Off', 'Holiday'],
        [
            payout.attendance.present,
            payout.attendance.halfDay,
            payout.attendance.absent,
            payout.attendance.paidLeave,
            payout.attendance.unpaidLeave,
            payout.attendance.weekOff,
            payout.attendance.holiday
        ]
    ];

    autoTable(doc, {
        startY: attendStartY + 3,
        head: [attendData[0]],
        body: [attendData[1]],
        theme: 'grid',
        headStyles: { fillColor: [100, 116, 139], textColor: 255, fontSize: 8, halign: 'center' },
        styles: { fontSize: 9, halign: 'center' }
    });

    // --- Earnings & Deductions ---
    const financialStartY = doc.lastAutoTable.finalY + 10;

    const earnings = [
        ['Basic Earnings (Accrued)', `Rs. ${payout.systemAccrued.toLocaleString()}`],
        ['Manual Additions / Bonus', `Rs. ${payout.adjustments.bonus.amount.toLocaleString()}`],
        payout.adjustments.bonus.reason ? ['Bonus Reason', payout.adjustments.bonus.reason] : null
    ].filter(Boolean);

    const deductions = [
        ['LOP / Unpaid Leave', `Rs. ${(payout.baseSalary - payout.systemAccrued - payout.penalties.total).toLocaleString()}`],
        ['Late/Early Penalties', `Rs. ${payout.penalties.total.toLocaleString()}`],
        ['Manual Deductions', `Rs. ${payout.adjustments.deduction.amount.toLocaleString()}`],
        payout.adjustments.deduction.reason ? ['Deduction Reason', payout.adjustments.deduction.reason] : null
    ].filter(Boolean);

    const tableBody = [];
    const maxRows = Math.max(earnings.length, deductions.length);
    for (let i = 0; i < maxRows; i++) {
        const row = [];
        row.push(earnings[i] ? earnings[i][0] : '');
        row.push(earnings[i] ? earnings[i][1] : '');
        row.push(deductions[i] ? deductions[i][0] : '');
        row.push(deductions[i] ? deductions[i][1] : '');
        tableBody.push(row);
    }

    autoTable(doc, {
        startY: financialStartY,
        head: [['Earnings', 'Amount', 'Deductions', 'Amount']],
        body: tableBody,
        theme: 'grid',
        headStyles: { fillColor: [37, 99, 235], textColor: 255 },
        styles: { fontSize: 9 },
        columnStyles: {
            0: { cellWidth: 50 },
            1: { cellWidth: 40, halign: 'right' },
            2: { cellWidth: 50 },
            3: { cellWidth: 40, halign: 'right' }
        }
    });

    // --- Final Net ---
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setDrawColor(37, 99, 235);
    doc.setLineWidth(0.5);
    doc.rect(15, finalY, pageWidth - 30, 20);

    doc.setFontSize(12);
    doc.setTextColor(37, 99, 235);
    doc.text('NET PAYABLE:', 25, finalY + 13);

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`Rs. ${payout.finalPayout.toLocaleString()}`, pageWidth - 25, finalY + 13, { align: 'right' });

    // --- Remarks / Notes ---
    const payoutDescription = payout.description || daywiseData?.description || "";
    if (payoutDescription) {
        let notesY = finalY + 25;
        const splitText = doc.splitTextToSize(payoutDescription, pageWidth - 36);
        const noteHeight = (splitText.length * 4.5) + 8;
        
        doc.setDrawColor(226, 232, 240); // Grey-200
        doc.setLineWidth(0.2);
        doc.setFillColor(248, 250, 252); // Grey-50
        doc.rect(15, notesY, pageWidth - 30, noteHeight, 'FD');
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(51, 65, 85); // Slate-700
        doc.text('Note / Remarks:', 18, notesY + 5);
        
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105); // Slate-600
        doc.text(splitText, 18, notesY + 10);
    }

    // --- Footer ---
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.setFont('helvetica', 'italic');
    doc.text('This is a computer-generated document and does not require a physical signature.', pageWidth / 2, 280, { align: 'center' });

    // --- Page 2: Day-wise Salary Breakdown ---
    if (daywiseData && daywiseData.days && daywiseData.days.length > 0) {
        doc.addPage();

        // Header
        doc.setFontSize(18);
        doc.setTextColor(37, 99, 235); // Blue
        doc.setFont('helvetica', 'bold');
        doc.text(company?.companyName || 'COMPANY NAME', pageWidth / 2, 20, { align: 'center' });

        doc.setFontSize(10);
        doc.setTextColor(71, 85, 105);
        doc.text(`Payslip Report - ${payout.month}`, pageWidth / 2, 27, { align: 'center' });

        doc.setFontSize(11);
        doc.setTextColor(15, 23, 42);
        doc.text('DAY-WISE ATTENDANCE & EARNINGS BREAKDOWN', pageWidth / 2, 36, { align: 'center' });

        doc.setDrawColor(226, 232, 240);
        doc.line(15, 40, pageWidth - 15, 40);

        // Build table body
        const daywiseHeaders = ['Date', 'Status', 'Punches', 'Work Hrs', 'Penalties', 'Earned Pay'];
        const daywiseBody = daywiseData.days.map(day => {
            const [y, m, d] = day.date.split('-');
            const displayDate = `${d}-${new Date(y, m - 1, d).toLocaleString('en-US', { month: 'short' })} (${day.dayName.slice(0, 3)})`;
            const punchesStr = day.punchIn !== '--' ? `${day.punchIn} - ${day.punchOut}` : '--';
            const workedHoursStr = day.workedMins > 0 ? day.workedHours : '--';
            const penaltyStr = day.totalPenalty > 0 ? `Rs. ${day.totalPenalty}` : '-';

            return [
                displayDate,
                day.status,
                punchesStr,
                workedHoursStr,
                penaltyStr,
                `Rs. ${Math.round(day.netEarned).toLocaleString()}`
            ];
        });

        autoTable(doc, {
            startY: 46,
            head: [daywiseHeaders],
            body: daywiseBody,
            theme: 'grid',
            headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 8, halign: 'center' },
            bodyStyles: { fontSize: 8 },
            columnStyles: {
                0: { cellWidth: 35 },
                1: { cellWidth: 28, halign: 'center' },
                2: { cellWidth: 42, halign: 'center' },
                3: { cellWidth: 25, halign: 'center' },
                4: { cellWidth: 20, halign: 'center' },
                5: { cellWidth: 30, halign: 'right', fontStyle: 'bold' }
            }
        });

        // Footer text
        const finalY2 = Math.min(doc.lastAutoTable.finalY + 10, 280);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(100, 116, 139);
        doc.text('* Earned Pay represents the pro-rated daily salary based on actual status and shift multipliers (if applicable), minus daily penalties.', pageWidth / 2, finalY2, { align: 'center' });
    }

    const blob = doc.output('bloburl');
    window.open(blob);
};

export default generatePayslipPDF;
