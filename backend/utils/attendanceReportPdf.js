import pdfmake from 'pdfmake';

/**
 * Configure standard PDF fonts
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
 * Format date string (YYYY-MM-DD) to clean readable format
 * e.g. "19 September 2026 (Saturday)"
 */
const formatDateHeader = (dateStr) => {
    try {
        const [y, m, d] = dateStr.split('-').map(Number);
        const date = new Date(Date.UTC(y, m - 1, d));
        const dayName = date.toLocaleDateString('en-IN', { weekday: 'long', timeZone: 'UTC' });
        const day = d.toString().padStart(2, '0');
        const monthName = date.toLocaleDateString('en-IN', { month: 'short', timeZone: 'UTC' });
        return `${day} ${monthName} ${y}, ${dayName}`;
    } catch (_) {
        return dateStr;
    }
};

/**
 * Build a simple, clean, and properly formatted Daily Attendance Report PDF document buffer.
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
        ? Math.round(((stats.present + (stats.halfDay || 0) * 0.5) / stats.total) * 100)
        : 0;

    // Prepare table body
    const tableBody = [
        [
            { text: '#', style: 'th', alignment: 'center' },
            { text: 'Employee Name', style: 'th', alignment: 'left' },
            { text: 'Emp ID', style: 'th', alignment: 'center' },
            { text: 'Department', style: 'th', alignment: 'left' },
            { text: 'In Time', style: 'th', alignment: 'center' },
            { text: 'Out Time', style: 'th', alignment: 'center' },
            { text: 'Working Hrs', style: 'th', alignment: 'center' },
            { text: 'Status', style: 'th', alignment: 'center' }
        ]
    ];

    records.forEach((rec, idx) => {
        let statusColor = '#166534'; // Green
        let statusBg = '#dcfce7';

        if (rec.status === 'Absent') {
            statusColor = '#991b1b'; // Red
            statusBg = '#fee2e2';
        } else if (rec.status === 'Half Day') {
            statusColor = '#9a3412'; // Amber / Orange
            statusBg = '#ffedd5';
        } else if (rec.status === 'On Leave' || rec.status?.includes('Leave')) {
            statusColor = '#1e40af'; // Blue
            statusBg = '#dbeafe';
        }

        tableBody.push([
            { text: (idx + 1).toString(), alignment: 'center', fontSize: 8, color: '#64748b' },
            { text: rec.name || '—', fontSize: 8.5, bold: true, color: '#1e293b', alignment: 'left' },
            { text: rec.empId || '—', fontSize: 8, alignment: 'center', color: '#475569' },
            { text: rec.dept || '—', fontSize: 8, color: '#334155', alignment: 'left' },
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
    const contactParts = [];
    if (company?.companyContact) contactParts.push(`Phone: ${company.companyContact}`);
    if (company?.companyEmail) contactParts.push(`Email: ${company.companyEmail}`);
    const companyContactInfo = contactParts.join('  |  ');

    const docDefinition = {
        pageSize: 'A4',
        pageOrientation: 'portrait',
        pageMargins: [35, 30, 35, 35],
        footer: (currentPage, pageCount) => {
            return {
                margin: [35, 10, 35, 0],
                columns: [
                    {
                        text: `Generated at 07:00 PM IST  •  Confidential`,
                        fontSize: 7.5,
                        color: '#94a3b8'
                    },
                    {
                        text: `Page ${currentPage} of ${pageCount}`,
                        alignment: 'right',
                        fontSize: 7.5,
                        color: '#94a3b8'
                    }
                ]
            };
        },
        content: [
            // ── Top Header Section ──
            {
                columns: [
                    {
                        width: '*',
                        stack: [
                            { text: companyName.toUpperCase(), fontSize: 13, bold: true, color: '#0f172a', margin: [0, 0, 0, 2] },
                            companyAddress ? { text: companyAddress, fontSize: 8, color: '#64748b', margin: [0, 0, 0, 1] } : null,
                            companyContactInfo ? { text: companyContactInfo, fontSize: 8, color: '#64748b' } : null
                        ].filter(Boolean)
                    },
                    {
                        width: 'auto',
                        alignment: 'right',
                        stack: [
                            { text: 'DAILY ATTENDANCE REPORT', fontSize: 11, bold: true, color: '#1e293b', margin: [0, 0, 0, 2] },
                            { text: formattedDate, fontSize: 8.5, color: '#475569', bold: true, margin: [0, 0, 0, 1] },
                            { text: `Attendance Rate: ${attendanceRate}%`, fontSize: 8, color: attendanceRate >= 75 ? '#166534' : '#991b1b', bold: true }
                        ]
                    }
                ]
            },

            // ── Thin Divider ──
            {
                margin: [0, 8, 0, 10],
                canvas: [{ type: 'line', x1: 0, y1: 0, x2: 525, y2: 0, lineWidth: 1, lineColor: '#e2e8f0' }]
            },

            // ── Simple KPI Metrics Bar ──
            {
                table: {
                    widths: ['20%', '20%', '20%', '20%', '20%'],
                    body: [
                        [
                            {
                                stack: [
                                    { text: 'TOTAL STAFF', fontSize: 7.5, bold: true, color: '#475569', alignment: 'center' },
                                    { text: `${stats.total}`, fontSize: 13, bold: true, color: '#0f172a', alignment: 'center', margin: [0, 2, 0, 0] }
                                ],
                                fillColor: '#f8fafc'
                            },
                            {
                                stack: [
                                    { text: 'PRESENT', fontSize: 7.5, bold: true, color: '#166534', alignment: 'center' },
                                    { text: `${stats.present}`, fontSize: 13, bold: true, color: '#166534', alignment: 'center', margin: [0, 2, 0, 0] }
                                ],
                                fillColor: '#f0fdf4'
                            },
                            {
                                stack: [
                                    { text: 'HALF DAY', fontSize: 7.5, bold: true, color: '#9a3412', alignment: 'center' },
                                    { text: `${stats.halfDay || 0}`, fontSize: 13, bold: true, color: '#9a3412', alignment: 'center', margin: [0, 2, 0, 0] }
                                ],
                                fillColor: '#fff7ed'
                            },
                            {
                                stack: [
                                    { text: 'ON LEAVE', fontSize: 7.5, bold: true, color: '#1e40af', alignment: 'center' },
                                    { text: `${stats.onLeave || 0}`, fontSize: 13, bold: true, color: '#1e40af', alignment: 'center', margin: [0, 2, 0, 0] }
                                ],
                                fillColor: '#eff6ff'
                            },
                            {
                                stack: [
                                    { text: 'ABSENT', fontSize: 7.5, bold: true, color: '#991b1b', alignment: 'center' },
                                    { text: `${stats.absent}`, fontSize: 13, bold: true, color: '#991b1b', alignment: 'center', margin: [0, 2, 0, 0] }
                                ],
                                fillColor: '#fef2f2'
                            }
                        ]
                    ]
                },
                layout: {
                    hLineWidth: () => 1,
                    vLineWidth: () => 1,
                    hLineColor: () => '#e2e8f0',
                    vLineColor: () => '#e2e8f0',
                    paddingLeft: () => 6,
                    paddingRight: () => 6,
                    paddingTop: () => 5,
                    paddingBottom: () => 5
                },
                margin: [0, 0, 0, 12]
            },

            // ── Clean Attendance Table ──
            {
                table: {
                    headerRows: 1,
                    widths: [20, 115, 60, 85, 55, 55, 65, 70],
                    body: tableBody
                },
                layout: {
                    fillColor: (rowIndex) => (rowIndex === 0 ? '#1e293b' : rowIndex % 2 === 0 ? '#f8fafc' : '#ffffff'),
                    hLineWidth: (i, node) => (i === 0 || i === 1 || i === node.table.body.length ? 1 : 0.5),
                    vLineWidth: () => 0.5,
                    hLineColor: () => '#cbd5e1',
                    vLineColor: () => '#e2e8f0',
                    paddingLeft: () => 4,
                    paddingRight: () => 4,
                    paddingTop: () => 5,
                    paddingBottom: () => 5
                }
            }
        ],
        styles: {
            th: {
                bold: true,
                fontSize: 8,
                color: '#ffffff',
                margin: [0, 2, 0, 2]
            }
        },
        defaultStyle: {
            font: 'Roboto'
        }
    };

    const pdf = pdfmake.createPdf(docDefinition);
    return await pdf.getBuffer();
};
