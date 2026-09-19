import pdfmake from 'pdfmake';

/**
 * Configure PDF fonts
 */
const fonts = {
    Roboto: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique'
    }
};

pdfmake.setFonts(fonts);

/**
 * Format date string (YYYY-MM-DD) to nice readable format (e.g. "Saturday, 19 September 2026")
 */
const formatDateHeader = (dateStr) => {
    try {
        const [y, m, d] = dateStr.split('-').map(Number);
        const date = new Date(Date.UTC(y, m - 1, d));
        return date.toLocaleDateString('en-IN', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            timeZone: 'UTC'
        });
    } catch (_) {
        return dateStr;
    }
};

/**
 * Build the Daily Attendance Report PDF document buffer.
 *
 * @param {Object} params
 * @param {Object} params.company - Company model document
 * @param {String} params.dateStr - 'YYYY-MM-DD'
 * @param {Object} params.stats - { total, present, absent, halfDay, onLeave }
 * @param {Array}  params.records - Array of employee attendance row objects
 * @returns {Promise<Buffer>}
 */
export const buildDailyAttendanceReportPdfBuffer = async ({ company, dateStr, stats, records }) => {
    const formattedDate = formatDateHeader(dateStr);
    const attendanceRate = stats.total > 0
        ? Math.round(((stats.present + stats.halfDay * 0.5) / stats.total) * 100)
        : 0;

    // Prepare table rows
    const tableBody = [
        [
            { text: '#', style: 'tableHeader' },
            { text: 'Employee Name', style: 'tableHeader' },
            { text: 'Emp ID', style: 'tableHeader' },
            { text: 'Department', style: 'tableHeader' },
            { text: 'Punch In', style: 'tableHeader' },
            { text: 'Punch Out', style: 'tableHeader' },
            { text: 'Hours', style: 'tableHeader' },
            { text: 'Status', style: 'tableHeader' }
        ]
    ];

    records.forEach((rec, idx) => {
        let statusColor = '#15803d'; // Present (green)
        let statusBg = '#dcfce7';

        if (rec.status === 'Absent') {
            statusColor = '#b91c1c'; // Red
            statusBg = '#fee2e2';
        } else if (rec.status === 'Half Day') {
            statusColor = '#b45309'; // Amber
            statusBg = '#fef3c7';
        } else if (rec.status === 'On Leave' || rec.status?.includes('Leave')) {
            statusColor = '#1d4ed8'; // Blue
            statusBg = '#dbeafe';
        }

        tableBody.push([
            { text: (idx + 1).toString(), alignment: 'center', fontSize: 8 },
            { text: rec.name || '—', fontSize: 8, bold: true, color: '#0f172a' },
            { text: rec.empId || '—', fontSize: 8, alignment: 'center', color: '#475569' },
            { text: rec.dept || '—', fontSize: 8, color: '#334155' },
            { text: rec.punchIn || '--:--', fontSize: 8, alignment: 'center', color: rec.punchIn !== '--:--' ? '#0f172a' : '#94a3b8' },
            { text: rec.punchOut || '--:--', fontSize: 8, alignment: 'center', color: rec.punchOut !== '--:--' ? '#0f172a' : '#94a3b8' },
            { text: rec.workHours || '0h 0m', fontSize: 8, alignment: 'center', color: '#334155' },
            {
                text: rec.status,
                fontSize: 7.5,
                bold: true,
                color: statusColor,
                fillColor: statusBg,
                alignment: 'center',
                margin: [0, 2, 0, 2]
            }
        ]);
    });

    const companyName = company?.companyName || 'IFLORA INFO PVT. LTD.';
    const companyAddress = company?.address ? `${company.address}${company?.pincode ? ', ' + company.pincode : ''}` : '';
    const companyContact = company?.companyContact ? `Contact: ${company.companyContact}` : '';
    const companyEmail = company?.companyEmail ? `Email: ${company.companyEmail}` : '';
    const contactInfo = [companyContact, companyEmail].filter(Boolean).join(' | ');

    const docDefinition = {
        pageSize: 'A4',
        pageOrientation: 'portrait',
        pageMargins: [30, 30, 30, 40],
        header: (currentPage, pageCount) => {
            return null; // Keep top clean
        },
        footer: (currentPage, pageCount) => {
            return {
                columns: [
                    {
                        text: `Generated on ${new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })} at 07:00 PM IST | Confidential`,
                        fontSize: 7.5,
                        color: '#94a3b8',
                        margin: [30, 10, 0, 0]
                    },
                    {
                        text: `Page ${currentPage} of ${pageCount}`,
                        alignment: 'right',
                        fontSize: 7.5,
                        color: '#94a3b8',
                        margin: [0, 10, 30, 0]
                    }
                ]
            };
        },
        content: [
            // ── Company Branding Header ──
            { text: companyName.toUpperCase(), style: 'companyHeader' },
            companyAddress ? { text: companyAddress, style: 'companySubHeader' } : null,
            contactInfo ? { text: contactInfo, style: 'companySubHeader' } : null,
            { canvas: [{ type: 'line', x1: 0, y1: 8, x2: 535, y2: 8, lineWidth: 1.5, lineColor: '#0f172a' }] },

            // ── Report Title & Metadata ──
            { text: 'DAILY ATTENDANCE REPORT', style: 'reportTitle' },
            { text: `${formattedDate}  •  Overall Attendance Rate: ${attendanceRate}%`, style: 'dateSubtitle' },

            // ── KPI Summary Cards ──
            {
                table: {
                    widths: ['20%', '20%', '20%', '20%', '20%'],
                    body: [
                        [
                            { text: `TOTAL STAFF\n${stats.total}`, style: 'kpiTotal' },
                            { text: `PRESENT\n${stats.present}`, style: 'kpiPresent' },
                            { text: `HALF DAY\n${stats.halfDay}`, style: 'kpiHalfDay' },
                            { text: `ON LEAVE\n${stats.onLeave}`, style: 'kpiLeave' },
                            { text: `ABSENT\n${stats.absent}`, style: 'kpiAbsent' }
                        ]
                    ]
                },
                layout: 'noBorders',
                margin: [0, 6, 0, 14]
            },

            // ── Attendance Detail Table ──
            {
                table: {
                    headerRows: 1,
                    widths: [18, 112, 60, 85, 55, 55, 55, 60],
                    body: tableBody
                },
                layout: {
                    fillColor: (rowIndex) => (rowIndex === 0 ? '#0f172a' : rowIndex % 2 === 0 ? '#f8fafc' : '#ffffff'),
                    hLineColor: () => '#e2e8f0',
                    vLineColor: () => '#e2e8f0',
                    paddingLeft: () => 4,
                    paddingRight: () => 4,
                    paddingTop: () => 4,
                    paddingBottom: () => 4
                }
            },

            // ── Notice Footer ──
            {
                text: 'This is an automated system report generated by the HRMS daily sync engine.',
                fontSize: 7.5,
                italics: true,
                color: '#64748b',
                alignment: 'center',
                margin: [0, 15, 0, 0]
            }
        ].filter(Boolean),
        styles: {
            companyHeader: { fontSize: 16, bold: true, color: '#0f172a', alignment: 'center', margin: [0, 0, 0, 2], letterSpacing: 0.5 },
            companySubHeader: { fontSize: 8, color: '#475569', alignment: 'center', margin: [0, 0, 0, 1.5] },
            reportTitle: { fontSize: 12, bold: true, color: '#0f172a', alignment: 'center', margin: [0, 10, 0, 2], letterSpacing: 1 },
            dateSubtitle: { fontSize: 8.5, color: '#475569', alignment: 'center', margin: [0, 0, 0, 8], bold: true },
            kpiTotal: { fillColor: '#f1f5f9', color: '#0f172a', bold: true, fontSize: 9.5, alignment: 'center', margin: [2, 5, 2, 5] },
            kpiPresent: { fillColor: '#dcfce7', color: '#15803d', bold: true, fontSize: 9.5, alignment: 'center', margin: [2, 5, 2, 5] },
            kpiHalfDay: { fillColor: '#fef3c7', color: '#b45309', bold: true, fontSize: 9.5, alignment: 'center', margin: [2, 5, 2, 5] },
            kpiLeave: { fillColor: '#dbeafe', color: '#1d4ed8', bold: true, fontSize: 9.5, alignment: 'center', margin: [2, 5, 2, 5] },
            kpiAbsent: { fillColor: '#fee2e2', color: '#b91c1c', bold: true, fontSize: 9.5, alignment: 'center', margin: [2, 5, 2, 5] },
            tableHeader: { bold: true, fontSize: 8, color: '#ffffff', alignment: 'center', margin: [0, 3, 0, 3] }
        },
        defaultStyle: { font: 'Roboto' }
    };

    const pdf = pdfmake.createPdf(docDefinition);
    return await pdf.getBuffer();
};
