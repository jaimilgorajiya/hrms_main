import mongoose from 'mongoose';

const clientSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  ownerName: {
    type: String,
    required: true,
    trim: true
  },
  businessName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  phoneNumber: {
    type: String,
    required: true
  },
  packageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Package',
    required: true
  },
  packageStartDate: {
    type: Date,
    default: Date.now
  },
  packageExpiryDate: {
    type: Date
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  isActive: {
    type: Boolean,
    default: false
  },
  softwareAccess: {
    type: String,
    default: 'HRMS'
  },
  maxEmployees: {
    type: Number,
    default: 0
  },
  addonPurchases: [{
    packageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Package' },
    employeesAdded: Number,
    amount: Number,
    paymentId: String,
    purchasedAt: { type: Date, default: Date.now }
  }],
  paymentHistory: [{
    date: { type: Date, default: Date.now },
    packageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Package' },
    amount: Number,
    paymentId: String,
    status: String,
    type: { type: String, enum: ['subscription', 'employee_addon'], default: 'subscription' }
  }]
}, { timestamps: true });
const Client = mongoose.model('Client', clientSchema);
export default Client;