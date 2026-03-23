import PDFDocument from 'pdfkit';

export const generatePayslipPreview = (format, data = {}) => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const buffers = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
            const pdfData = Buffer.concat(buffers);
            resolve(pdfData);
        });

        // Sample Data for Preview
        const sampleData = {
            companyName: 'YOUR COMPANY NAME',
            address: '123 Business Avenue, Tech Park',
            employeeName: 'JOHN DOE',
            employeeId: 'EMP001',
            month: 'MARCH 2026',
            earnings: [
                { label: 'Basic Salary', value: 25000 },
                { label: 'HRA', value: 10000 },
                { label: 'Special Allowance', value: 5000 }
            ],
            deductions: [
                { label: 'Professional Tax', value: 200 },
                { label: 'PF', value: 1800 }
            ],
            ...data
        };

        if (format === 'Format 1') {
            renderFormat1(doc, sampleData);
        } else if (format === 'Format 2') {
            renderFormat2(doc, sampleData);
        } else if (format === 'Format 3') {
            renderFormat3(doc, sampleData);
        } else {
            renderFormat1(doc, sampleData);
        }

        doc.end();
    });
};

const renderFormat3 = (doc, data) => {
    // Very compact layout
    doc.fontSize(14).font('Helvetica-Bold').text(data.companyName, { align: 'left' });
    doc.fontSize(8).font('Helvetica').text(data.address, { align: 'left' });
    doc.moveDown();
    
    doc.rect(40, 100, 515, 20).fill('#EEF2FF').stroke('#C7D2FE');
    doc.fillColor('#1E3A8A').fontSize(10).font('Helvetica-Bold').text('PAYSLIP: ' + data.employeeName + ' | ' + data.month, 50, 105);
    doc.fillColor('black');

    let y = 130;
    doc.fontSize(9);
    data.earnings.concat(data.deductions).forEach((item, i) => {
        doc.text(item.label, 50, y);
        doc.text(item.value.toString(), 200, y, { align: 'right' });
        y += 15;
    });

    doc.moveTo(40, y + 5).lineTo(250, y + 5).stroke();
    const net = data.earnings.reduce((s, e) => s + e.value, 0) - data.deductions.reduce((s, d) => s + d.value, 0);
    doc.font('Helvetica-Bold').text('NET: ' + net.toLocaleString(), 50, y + 15);
};

const renderFormat1 = (doc, data) => {
    // Header
    doc.fontSize(20).text(data.companyName, { align: 'center' });
    doc.fontSize(10).text(data.address, { align: 'center' });
    doc.moveDown();
    doc.fontSize(14).text('PAYSLIP FOR THE MONTH OF ' + data.month, { align: 'center', underline: true });
    doc.moveDown();

    // Employee Details Table
    const tableTop = 180;
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Employee Name:', 50, tableTop);
    doc.font('Helvetica').text(data.employeeName, 150, tableTop);
    
    doc.font('Helvetica-Bold').text('Employee ID:', 350, tableTop);
    doc.font('Helvetica').text(data.employeeId, 450, tableTop);

    doc.moveDown(2);

    // Earnings & Deductions
    const gridTop = 220;
    doc.font('Helvetica-Bold').text('EARNINGS', 50, gridTop);
    doc.text('AMOUNT', 200, gridTop);
    doc.text('DEDUCTIONS', 300, gridTop);
    doc.text('AMOUNT', 450, gridTop);

    doc.moveTo(50, gridTop + 15).lineTo(530, gridTop + 15).stroke();

    let currentY = gridTop + 25;
    const maxLines = Math.max(data.earnings.length, data.deductions.length);

    for (let i = 0; i < maxLines; i++) {
        doc.font('Helvetica');
        if (data.earnings[i]) {
            doc.text(data.earnings[i].label, 50, currentY);
            doc.text(data.earnings[i].value.toString(), 200, currentY);
        }
        if (data.deductions[i]) {
            doc.text(data.deductions[i].label, 300, currentY);
            doc.text(data.deductions[i].value.toString(), 450, currentY);
        }
        currentY += 20;
    }

    doc.moveTo(50, currentY).lineTo(530, currentY).stroke();
    
    // Totals
    currentY += 10;
    const totalEarnings = data.earnings.reduce((s, e) => s + e.value, 0);
    const totalDeductions = data.deductions.reduce((s, e) => s + e.value, 0);
    const netPay = totalEarnings - totalDeductions;

    doc.font('Helvetica-Bold').text('Total Earnings:', 50, currentY);
    doc.text(totalEarnings.toString(), 200, currentY);
    
    doc.text('Total Deductions:', 300, currentY);
    doc.text(totalDeductions.toString(), 450, currentY);

    doc.moveDown(2);
    doc.fontSize(14).text('NET PAYABLE: ' + netPay, { align: 'right' });
};

const renderFormat2 = (doc, data) => {
    // A more "Boxed" layout
    doc.rect(40, 40, 515, 750).stroke();
    
    // Blue header box
    doc.rect(40, 40, 515, 60).fillAndStroke('#3B648B', '#3B648B');
    doc.fillColor('white').fontSize(18).font('Helvetica-Bold').text(data.companyName, 50, 60);
    doc.fontSize(10).font('Helvetica').text(data.address, 50, 85);

    doc.fillColor('black').moveDown(4);
    doc.fontSize(12).font('Helvetica-Bold').text('SALARY SLIP', { align: 'center' });
    doc.moveDown();

    // Boxed Details
    doc.rect(50, 150, 495, 60).stroke();
    doc.fontSize(10).text('Employee: ' + data.employeeName, 60, 160);
    doc.text('ID: ' + data.employeeId, 60, 180);
    doc.text('Month: ' + data.month, 350, 160);

    // Earnings/Deductions Columns
    doc.rect(50, 220, 245, 300).stroke();
    doc.rect(295, 220, 250, 300).stroke();
    
    doc.font('Helvetica-Bold').text('EARNINGS', 60, 230);
    doc.text('DEDUCTIONS', 310, 230);
    
    let y = 255;
    data.earnings.forEach(e => {
        doc.font('Helvetica').text(e.label, 60, y);
        doc.text(e.value.toString(), 240, y, { align: 'right' });
        y += 20;
    });

    y = 255;
    data.deductions.forEach(d => {
        doc.font('Helvetica').text(d.label, 310, y);
        doc.text(d.value.toString(), 530, y, { align: 'right' });
        y += 20;
    });

    // Simple net pay footer
    doc.rect(50, 530, 495, 40).fill('#F8FAFC').stroke('#E2E8F0');
    doc.fillColor('#1E293B').font('Helvetica-Bold').text('NET TAKE HOME:', 70, 545);
    const net = data.earnings.reduce((s, e) => s + e.value, 0) - data.deductions.reduce((s, d) => s + d.value, 0);
    doc.fontSize(14).text('INR ' + net.toLocaleString(), 400, 545, { align: 'right' });
};
