import Package from "../models/Package.Model.js";
import Client from "../models/Client.Model.js";
import User from "../models/User.Model.js";
import Razorpay from "razorpay";
import crypto from "crypto";

const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_Rya7YN2wKhxeQO',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'eevaOjQnOAz22VKp8Y4HdEyF',
});

// Create Package
export const createPackage = async (req, res) => {
    try {
        const newPackage = new Package(req.body);
        const savedPackage = await newPackage.save();
        res.status(201).json({ success: true, package: savedPackage });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get All Packages
export const getPackages = async (req, res) => {
    try {
        const packages = await Package.find();
        res.status(200).json({ success: true, packages });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get Single Package
export const getPackageById = async (req, res) => {
    try {
        const pkg = await Package.findById(req.params.id);
        if (!pkg) return res.status(404).json({ success: false, message: "Package not found" });
        res.status(200).json({ success: true, package: pkg });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update Package
export const updatePackage = async (req, res) => {
    try {
        const updatedPackage = await Package.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updatedPackage) return res.status(404).json({ success: false, message: "Package not found" });
        res.status(200).json({ success: true, package: updatedPackage });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Delete Package
export const deletePackage = async (req, res) => {
    try {
        const pkg = await Package.findByIdAndDelete(req.params.id);
        if (!pkg) return res.status(404).json({ success: false, message: "Package not found" });
        res.status(200).json({ success: true, message: "Package deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get Employee Usage for the logged-in admin
export const getEmployeeUsage = async (req, res) => {
    try {
        const adminId = req.user._id;
        const client = await Client.findOne({ adminId }).populate('packageId');

        const masterEmail = process.env.MASTER_ADMIN_EMAIL;
        const isMaster = (masterEmail && req.user.email && req.user.email.toLowerCase() === masterEmail.toLowerCase()) || req.user.role === 'Master Admin';

        if (!client) {
            if (isMaster) {
                const currentCount = await User.countDocuments({
                    adminId,
                    role: { $ne: 'Admin' },
                    status: { $in: ['Active', 'Onboarding', 'Resigned'] }
                });
                return res.status(200).json({
                    success: true,
                    usage: {
                        currentCount,
                        baseLimit: 999999,
                        addonTotal: 0,
                        totalAllowed: 999999,
                        remaining: 999999,
                        packageName: "Infinite Admin Plan",
                        packageExpiry: null,
                        addonPurchases: []
                    }
                });
            }
            return res.status(200).json({ success: true, usage: null });
        }

        const baseLimit = client.packageId?.maxEmployees || client.maxEmployees || 0;
        const addonTotal = (client.addonPurchases || [])
            .reduce((sum, addon) => sum + (addon.employeesAdded || 0), 0);
        let totalAllowed = baseLimit + addonTotal;

        if (isMaster) {
            totalAllowed = 999999; // Unlimited for master admin
        }

        const currentCount = await User.countDocuments({
            adminId,
            role: { $ne: 'Admin' },
            status: { $in: ['Active', 'Onboarding', 'Resigned'] }
        });

        res.status(200).json({
            success: true,
            usage: {
                currentCount,
                baseLimit,
                addonTotal,
                totalAllowed,
                remaining: Math.max(0, totalAllowed - currentCount),
                packageName: client.packageId?.name || "Standard Plan",
                packageExpiry: client.packageExpiryDate,
                addonPurchases: client.addonPurchases || []
            }
        });
    } catch (error) {
        console.error('getEmployeeUsage error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Get available employee add-on packages
export const getAddonPackages = async (req, res) => {
    try {
        const addons = await Package.find({ packageType: 'employee_addon', isActive: true });
        res.status(200).json({ success: true, packages: addons });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Initiate employee add-on purchase (creates Razorpay order)
export const purchaseEmployeeAddon = async (req, res) => {
    try {
        const { packageId, quantity } = req.body;
        const adminId = req.user._id;

        if (!quantity || quantity < 1 || !Number.isInteger(Number(quantity))) {
            return res.status(400).json({ success: false, message: 'Please enter a valid number of employees (minimum 1)' });
        }

        const addonPkg = await Package.findById(packageId);
        if (!addonPkg || addonPkg.packageType !== 'employee_addon') {
            return res.status(400).json({ success: false, message: 'Invalid add-on package' });
        }

        if (!addonPkg.isActive) {
            return res.status(400).json({ success: false, message: 'This add-on package is no longer available' });
        }

        const totalPrice = Number(quantity) * addonPkg.price;

        // Create Razorpay order
        const order = await razorpayInstance.orders.create({
            amount: totalPrice * 100, // in paise
            currency: 'INR',
            receipt: `rcpt_addon_${Date.now()}`
        });

        res.status(200).json({
            success: true,
            order,
            key_id: razorpayInstance.key_id,
            quantity: Number(quantity),
            pricePerEmployee: addonPkg.price,
            totalPrice,
            currency: 'INR'
        });
    } catch (error) {
        console.error('Addon purchase error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Verify employee add-on payment
export const verifyAddonPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, packageId, quantity } = req.body;
        const adminId = req.user._id;

        // Verify Razorpay signature
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || 'eevaOjQnOAz22VKp8Y4HdEyF')
            .update(body.toString())
            .digest("hex");

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ success: false, message: 'Invalid payment signature' });
        }

        const addonPkg = await Package.findById(packageId);
        if (!addonPkg || addonPkg.packageType !== 'employee_addon') {
            return res.status(400).json({ success: false, message: 'Invalid add-on package' });
        }

        const employeesAdded = Number(quantity) || addonPkg.addonEmployees;
        const totalAmount = employeesAdded * addonPkg.price;

        const client = await Client.findOne({ adminId });
        if (!client) {
            return res.status(404).json({ success: false, message: 'Client record not found' });
        }

        // Add addon record
        client.addonPurchases.push({
            packageId: addonPkg._id,
            employeesAdded,
            amount: totalAmount,
            paymentId: razorpay_payment_id
        });

        // Add to payment history
        client.paymentHistory.push({
            packageId: addonPkg._id,
            amount: totalAmount,
            paymentId: razorpay_payment_id,
            status: 'completed',
            type: 'employee_addon'
        });

        // Update the actual employee limit in the client record
        client.maxEmployees = (client.maxEmployees || 0) + employeesAdded;

        await client.save();

        res.status(200).json({
            success: true,
            message: `Successfully added ${employeesAdded} employee slots!`,
            newTotalAllowed: client.maxEmployees
        });
    } catch (error) {
        console.error('Addon verification error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Get subscription details and payment history for the logged-in client
export const getSubscriptionDetails = async (req, res) => {
    try {
        const adminId = req.user._id;
        const client = await Client.findOne({ adminId })
            .populate('packageId')
            .populate('paymentHistory.packageId')
            .populate('addonPurchases.packageId');

        const masterEmail = process.env.MASTER_ADMIN_EMAIL;
        const isMaster = (masterEmail && req.user.email && req.user.email.toLowerCase() === masterEmail.toLowerCase()) || req.user.role === 'Master Admin';

        if (!client) {
            if (isMaster) {
                return res.status(200).json({
                    success: true,
                    subscription: {
                        packageName: "Infinite Admin Plan",
                        packagePrice: 0,
                        packageType: "subscription",
                        startDate: new Date(),
                        expiryDate: null,
                        isActive: true,
                        maxEmployees: 999999,
                        paymentHistory: [],
                        addonPurchases: []
                    }
                });
            }
            return res.status(200).json({ success: true, subscription: null });
        }

        res.status(200).json({
            success: true,
            subscription: {
                packageName: client.packageId?.name,
                packagePrice: client.packageId?.price,
                packageType: client.packageId?.packageType,
                startDate: client.packageStartDate,
                expiryDate: client.packageExpiryDate,
                isActive: client.isActive,
                maxEmployees: client.maxEmployees,
                paymentHistory: client.paymentHistory || [],
                addonPurchases: client.addonPurchases || []
            }
        });
    } catch (error) {
        console.error('getSubscriptionDetails error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
