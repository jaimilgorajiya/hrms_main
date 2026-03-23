import Company from '../models/Company.Model.js';

export const getCompanyDetails = async (req, res) => {
  try {
    const adminId = req.user._id;
    const company = await Company.findOne({ adminId });
    if (!company) {
      return res.status(200).json({ message: "No company details found", data: null });
    }
    res.status(200).json(company);
  } catch (error) {
    res.status(500).json({ message: "Error fetching company details", error: error.message });
  }
};

export const updateCompanyDetails = async (req, res) => {
  try {
    const adminId = req.user._id;
    let company = await Company.findOne({ adminId });
    
    if (company) {
      company = await Company.findByIdAndUpdate(company._id, req.body, { new: true });
    } else {
      company = new Company({ ...req.body, adminId });
      await company.save();
    }
    
    res.status(200).json({ message: "Company details updated successfully", data: company });
  } catch (error) {
    res.status(500).json({ message: "Error updating company details", error: error.message });
  }
};
