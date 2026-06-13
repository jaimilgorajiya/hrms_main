import Offboarding from '../models/Offboarding.Model.js';
import User from '../models/User.Model.js';

// 1. Initiate Offboarding
export const initiateOffboarding = async (req, res) => {
    try {
        const { employeeId, exitType, reason, resignationDate, lastWorkingDate, noticePeriodDays, remarks } = req.body;
        
        // Ensure user is active before initiating offboarding, and belongs to this admin
        const user = await User.findOne({ _id: employeeId, adminId: req.user._id });
        if (!user || user.status === 'Inactive') return res.status(400).json({ success: false, message: 'Invalid or Inactive User' });

        const newOffboarding = new Offboarding({
            employeeId,
            adminId: req.user._id,
            exitType,
            exitReason: reason,
            resignationDate,
            lastWorkingDate,
            noticePeriodDays,
            remarks,
            status: 'Initiated'
        });

        await newOffboarding.save();
        res.status(201).json({ success: true, message: 'Offboarding Process Initiated', data: newOffboarding });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 2. Get All Offboardings (With Filters)
export const getOffboardings = async (req, res) => {
    try {
        const query = { adminId: req.user._id };
        if (req.query.status) query.status = req.query.status;
        if (req.query.exitType) query.exitType = req.query.exitType;
        
        const offboardings = await Offboarding.find(query)
            .populate('employeeId', 'name email department designation')
            .sort({ createdAt: -1 });

        res.status(200).json({ success: true, count: offboardings.length, data: offboardings });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 3. Get Single Offboarding Details
export const getOffboardingDetails = async (req, res) => {
    try {
        const offboarding = await Offboarding.findOne({ _id: req.params.id, adminId: req.user._id }).populate('employeeId', 'name email department designation joiningDate');
        if (!offboarding) return res.status(404).json({ success: false, message: 'Record not found' });
        res.status(200).json({ success: true, data: offboarding });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 4. Update Offboarding Stage/Details
export const updateOffboarding = async (req, res) => {
    try {
        const offboarding = await Offboarding.findOne({ _id: req.params.id, adminId: req.user._id });
        if (!offboarding) return res.status(404).json({ success: false, message: 'Record not found' });

        const updates = req.body;
        
        // Handle Status Change Audit
        if (updates.status && updates.status !== offboarding.status) {
            offboarding.auditLog.push({
                action: 'Status Change',
                details: `Status changed from ${offboarding.status} to ${updates.status}`,
                performedBy: req.user._id,
                date: new Date()
            });
            offboarding.status = updates.status;
        }

        // Handle Clearance Updates specifically
        if (updates.clearance) {
             Object.keys(updates.clearance).forEach(key => {
                 const newClearanceData = updates.clearance[key];
                 const currentClearanceData = offboarding.clearance[key];
                 
                 // Skip if not a valid section (e.g. if key is not in schema)
                 if (!currentClearanceData) return;

                 // Check if status changed
                 if (newClearanceData.status && newClearanceData.status !== currentClearanceData.status) {
                     offboarding.auditLog.push({
                         action: 'Clearance Update',
                         details: `${key.toUpperCase().replace(/([A-Z])/g, ' $1').trim()} Clearance status changed from ${currentClearanceData.status} to ${newClearanceData.status}`,
                         performedBy: req.user._id,
                         date: new Date()
                     });
                     
                     // If Cleared, set clearedBy and clearedOn
                     if (newClearanceData.status === 'Cleared') {
                         newClearanceData.clearedBy = req.user._id;
                         newClearanceData.clearedOn = new Date();
                     }
                 }
                 
                 // Update the subdocument fields
                 if (newClearanceData.status) currentClearanceData.status = newClearanceData.status;
                 if (newClearanceData.comments) currentClearanceData.comments = newClearanceData.comments;
                 if (newClearanceData.attachment) currentClearanceData.attachment = newClearanceData.attachment;
                 if (newClearanceData.clearedBy) currentClearanceData.clearedBy = newClearanceData.clearedBy;
                 if (newClearanceData.clearedOn) currentClearanceData.clearedOn = newClearanceData.clearedOn;
             });
        }
        
        // Handle other fields
        if (updates.exitInterview) offboarding.exitInterview = { ...offboarding.exitInterview, ...updates.exitInterview };
        if (updates.settlement) offboarding.settlement = { ...offboarding.settlement, ...updates.settlement };
        if (updates.documents) offboarding.documents = { ...offboarding.documents, ...updates.documents };

        await offboarding.save();
        res.status(200).json({ success: true, message: 'Offboarding updated', data: offboarding });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// 6. Generate Exit Document (Dummy)
export const generateDocument = async (req, res) => {
    try {
        const { documentType } = req.body;
        const offboarding = await Offboarding.findOne({ _id: req.params.id, adminId: req.user._id });
        
        if (!offboarding) return res.status(404).json({ success: false, message: 'Record not found' });

        // Map frontend document names to schema keys
        const keyMap = {
            'Relieving Letter': 'relievingLetter',
            'Experience Letter': 'experienceLetter',
            'No Dues Certificate': 'noDuesCertificate'
        };
        const key = keyMap[documentType];

        if (!key) return res.status(400).json({ success: false, message: 'Invalid document type' });

        // Ensure documents object exists
        if (!offboarding.documents) offboarding.documents = {};

        // Update document status
        const PORT = process.env.PORT || 7000;
        const dummyUrl = `http://localhost:${PORT}/api/offboarding/download-dummy/${key}`; 
        
        offboarding.documents[key] = {
            generated: true,
            sent: false,
            url: dummyUrl
        };
        
        // Mark as modified to ensure mongoose saves the mixed type or nested object change
        offboarding.markModified('documents');

        // Log generation
        offboarding.auditLog.push({
            action: 'Document Generated',
            details: `${documentType} generated`,
            performedBy: req.user._id,
            date: new Date()
        });

        await offboarding.save();
        res.status(200).json({ success: true, message: `${documentType} generated successfully`, data: offboarding });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// 7. Send Exit Document via Email
export const sendDocument = async (req, res) => {
    try {
        const { documentType } = req.body;
        const offboarding = await Offboarding.findOne({ _id: req.params.id, adminId: req.user._id }).populate('employeeId', 'email name');
        
        if (!offboarding) return res.status(404).json({ success: false, message: 'Record not found' });

        const keyMap = {
            'Relieving Letter': 'relievingLetter',
            'Experience Letter': 'experienceLetter',
            'No Dues Certificate': 'noDuesCertificate'
        };
        const key = keyMap[documentType];

        if (!key || !offboarding.documents[key]?.generated) {
            return res.status(400).json({ success: false, message: 'Document not generated yet' });
        }

        // Send Email
        const employee = offboarding.employeeId;
        const docUrl = offboarding.documents[key].url;

        const { sendOffboardingDocument } = await import('../utils/emailService.js');
        
        const emailResult = await sendOffboardingDocument(employee.email, employee.name, documentType, docUrl);

        if (emailResult.success) {
            offboarding.documents[key].sent = true;
            offboarding.markModified('documents');
            
            // Log sending
            offboarding.auditLog.push({
                action: 'Document Sent',
                details: `${documentType} emailed to ${employee.email}`,
                performedBy: req.user._id,
                date: new Date()
            });

            await offboarding.save();
            res.status(200).json({ success: true, message: `${documentType} sent successfully`, data: offboarding });
        } else {
            res.status(500).json({ success: false, message: 'Failed to send email' });
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// 8. Download Dummy Document (PDF Generation)
export const downloadDummyDocument = async (req, res) => {
    try {
        const { key } = req.params;
        const docNameMap = {
            'relievingLetter': 'Relieving Letter',
            'experienceLetter': 'Experience Letter',
            'noDuesCertificate': 'No Dues Certificate'
        };
        const docName = docNameMap[key] || 'Document';

        // Try dynamically importing pdfkit
        let PDFDocument;
        try {
            const pdfKitModule = await import('pdfkit');
            PDFDocument = pdfKitModule.default || pdfKitModule;
        } catch (err) {
            console.error('pdfkit not found:', err);
            return res.status(500).send('PDF Generator (pdfkit) not installed on server.');
        }

        const doc = new PDFDocument();

        // Set headers for PDF
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${key}.pdf"`);

        // Pipe generated PDF to response
        doc.pipe(res);

        // Header
        doc.fontSize(25).text(docName, { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Date: ${new Date().toLocaleDateString()}`, { align: 'right' });
        doc.moveDown(2);

        // Body Content
        doc.fontSize(12).text(`TO WHOM IT MAY CONCERN`, { underline: true });
        doc.moveDown();
        
        if (key === 'relievingLetter') {
            doc.text(`This is to certify that the employee associated with this record has been relieved from their duties as of ${new Date().toLocaleDateString()}. Used for demonstration purposes.`);
        } else if (key === 'experienceLetter') {
            doc.text(`This letter certifies that the employee was employed with us. Their performance was satisfactory during their tenure. Used for demonstration purposes.`);
        } else if (key === 'noDuesCertificate') {
            doc.text(`This is to certify that the employee has cleared all dues and has no outstanding liabilities towards the organization. Used for demonstration purposes.`);
        } else {
            doc.text(`This is a generated document for ${docName}.`);
        }

        doc.moveDown(4);
        doc.text('Authorized Signatory', { align: 'right' });
        doc.text('HR Department', { align: 'right' });

        // Finalize PDF file
        doc.end();

    } catch (error) {
        console.error('Error generating PDF:', error);
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
};

// 5. Finalize Offboarding (Archive)
export const finalizeOffboarding = async (req, res) => {
    try {
        const offboarding = await Offboarding.findOne({ _id: req.params.id, adminId: req.user._id });
        if (!offboarding) return res.status(404).json({ success: false, message: 'Record not found' });

        // Update User Status
        const updatedUser = await User.findOneAndUpdate(
            { _id: offboarding.employeeId, adminId: req.user._id },
            { 
                status: offboarding.exitType || 'Ex-Employee', 
                exitDate: offboarding.lastWorkingDate 
            }
        );
        if (!updatedUser) return res.status(400).json({ success: false, message: 'Failed to update user status or access denied' });

        offboarding.status = 'Archived';
        
        offboarding.auditLog.push({
             action: 'Offboarding Finalized',
             details: 'Employee account deactivated and offboarding archived',
             performedBy: req.user._id,
             date: new Date()
        });

        await offboarding.save();

        res.status(200).json({ success: true, message: 'Offboarding Finalized. User Moved to Ex-Employees.', data: offboarding });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
