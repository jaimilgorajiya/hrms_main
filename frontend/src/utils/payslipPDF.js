import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const generatePayslipPDF = (payout, company) => {
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
        ['Basic Earnings (Accrued)', `₹${payout.systemAccrued.toLocaleString()}`],
        ['Manual Additions / Bonus', `₹${payout.adjustments.bonus.amount.toLocaleString()}`],
        payout.adjustments.bonus.reason ? ['Bonus Reason', payout.adjustments.bonus.reason] : null
    ].filter(Boolean);

    const deductions = [
        ['LOP / Unpaid Leave', `₹${(payout.baseSalary - payout.systemAccrued - payout.penalties.total).toLocaleString()}`],
        ['Late/Early Penalties', `₹${payout.penalties.total.toLocaleString()}`],
        ['Manual Deductions', `₹${payout.adjustments.deduction.amount.toLocaleString()}`],
        payout.adjustments.deduction.reason ? ['Deduction Reason', payout.adjustments.deduction.reason] : null
    ].filter(Boolean);

    const tableBody = [];
    const maxRows = Math.max(earnings.length, deductions.length);
    for(let i=0; i<maxRows; i++){
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
    doc.text(`₹${payout.finalPayout.toLocaleString()}`, pageWidth - 25, finalY + 13, { align: 'right' });

    // --- Footer ---
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.setFont('helvetica', 'italic');
    doc.text('This is a computer-generated document and does not require a physical signature.', pageWidth/2, 280, { align: 'center' });

    const blob = doc.output('bloburl');
    window.open(blob);
};

export default generatePayslipPDF;
