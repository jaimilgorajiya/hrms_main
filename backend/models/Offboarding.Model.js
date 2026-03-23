import mongoose from 'mongoose';

const offboardingSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['Initiated', 'Notice Period Active', 'Clearance Pending', 'Settlement Pending', 'Documents Issued', 'Completed', 'Archived'],
    default: 'Initiated'
  },
  exitType: {
    type: String,
    enum: ['Resignation', 'Termination', 'Retirement', 'Death'],
    required: true
  },
  
  // Initiated Details
  exitReason: { type: String },
  resignationDate: { type: Date },
  lastWorkingDate: { type: Date },
  noticePeriodDays: { type: Number },
  remarks: { type: String },

  // Clearance Checklists
// Enhanced Clearance Structure
  clearance: {
    itAssets: { 
      status: { type: String, enum: ['Pending', 'Cleared', 'Rejected', 'On Hold'], default: 'Pending' }, 
      comments: { type: String },
      clearedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      clearedOn: { type: Date },
      attachment: { type: String },
      items: [{ name: String, status: String, comment: String }]
    },
    finance: { 
      status: { type: String, enum: ['Pending', 'Cleared', 'Rejected', 'On Hold'], default: 'Pending' }, 
      comments: { type: String },
      clearedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      clearedOn: { type: Date },
      attachment: { type: String }
    },
    admin: { 
      status: { type: String, enum: ['Pending', 'Cleared', 'Rejected', 'On Hold'], default: 'Pending' }, 
      comments: { type: String },
      clearedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      clearedOn: { type: Date },
      attachment: { type: String },
      items: [{ name: String, status: String, comment: String }]
    },
    manager: { 
      status: { type: String, enum: ['Pending', 'Cleared', 'Rejected', 'On Hold'], default: 'Pending' }, 
      comments: { type: String },
      clearedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      clearedOn: { type: Date },
      attachment: { type: String }
    },
    custom: [{ 
      name: { type: String },
      status: { type: String, enum: ['Pending', 'Cleared', 'Rejected', 'On Hold'], default: 'Pending' }, 
      comments: { type: String },
      clearedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      clearedOn: { type: Date },
      attachment: { type: String }
    }]
  },

  // Audit Logs
  auditLog: [{
    action: { type: String },
    details: { type: String },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    date: { type: Date, default: Date.now }
  }],

  // Exit Interview
  exitInterview: {
    conductedDate: { type: Date },
    feedback: { type: String },
    reasonSecondary: { type: String },
    rehireEligible: { type: Boolean, default: false },
    notes: { type: String }
  },

  // Settlement
  settlement: {
    status: { type: String, enum: ['Draft', 'Approved', 'Paid'], default: 'Draft' },
    payableAmount: { type: Number },
    breakdown: [{ description: String, amount: Number, type: { type: String, enum: ['Earning', 'Deduction'] } }]
  },

  // Documents
  documents: {
    relievingLetter: { generated: Boolean, sent: Boolean, url: String },
    experienceLetter: { generated: Boolean, sent: Boolean, url: String },
    noDuesCertificate: { generated: Boolean, sent: Boolean, url: String },
  }

}, { timestamps: true });

export default mongoose.model('Offboarding', offboardingSchema);
