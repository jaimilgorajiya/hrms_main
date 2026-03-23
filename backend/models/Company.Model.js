import mongoose from 'mongoose';

const companySchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  companyName: {
    type: String,
    required: true,
    trim: true
  },
  website: {
    type: String,
    trim: true
  },
  logo: {
    type: String, // URL/Path to logo
  },
  address: {
    type: String,
    required: true
  },
  companyEmail: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  companyContact: {
    type: String,
    required: true
  },
  hrEmail: {
    type: String,
    lowercase: true,
    trim: true
  },
  pincode: {
    type: String,
    required: true
  },
  gstNumber: {
    type: String,
    trim: true
  },
  pan: {
    type: String,
    trim: true
  },
  tan: {
    type: String,
    trim: true
  },
  currency: {
    type: String,
    required: true,
    default: '₹'
  },
  socials: {
    instagram: String,
    facebook: String,
    linkedin: String,
    youtube: String
  },
  location: {
    lat: Number,
    lng: Number
  },
  employeeIdFormat: {
    prefix: { type: String, default: 'EMP' },
    includeYear: { type: Boolean, default: true },
    digitCount: { type: Number, default: 4 },
    separator: { type: String, default: '' }
  }
}, { timestamps: true });

const Company = mongoose.model('Company', companySchema);

export default Company;
