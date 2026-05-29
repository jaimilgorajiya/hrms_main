import Client from "../models/Client.Model.js";
import User from "../models/User.Model.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { generateEmployeeId } from "../utils/employeeId.js";
import Package from "../models/Package.Model.js";
import { sendClientCredentialsMail } from "../utils/mailer.js";

// Get All Clients
export const getAllClients = async (req, res) => {
    try {
        const clients = await Client.find()
            .populate("adminId", "name email role status permissions")
            .populate("packageId", "name price duration");

        res.status(200).json({ success: true, data: clients });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get Client By ID (Detail View)
export const getClientById = async (req, res) => {
    try {
        const { id } = req.params;
        const client = await Client.findById(id)
            .populate("adminId", "name email role status permissions createdAt")
            .populate("packageId")
            .populate("paymentHistory.packageId");

        if (!client) return res.status(404).json({ success: false, message: "Client not found" });

        res.status(200).json({ success: true, client });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Toggle Client Status
export const toggleClientStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const client = await Client.findById(id);
        if (!client) return res.status(404).json({ success: false, message: "Client not found" });

        client.isActive = !client.isActive;
        await client.save();

        res.status(200).json({ 
            success: true, 
            message: `Client ${client.isActive ? 'activated' : 'deactivated'} successfully`,
            isActive: client.isActive 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Delete Client
export const deleteClient = async (req, res) => {
    try {
        const { id } = req.params;
        const client = await Client.findById(id);
        if (!client) return res.status(404).json({ success: false, message: "Client not found" });

        await User.findByIdAndDelete(client.adminId);
        await Client.findByIdAndDelete(id);

        res.status(200).json({ success: true, message: "Client and associated admin deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Create Client (Master Admin only)
export const createClient = async (req, res) => {
    try {
        const { ownerName, businessName, email, phoneNumber, packageId, password } = req.body;

        if (!ownerName || !businessName || !email || !phoneNumber || !packageId) {
            return res.status(400).json({ success: false, message: "All fields are required" });
        }

        const existingUser = await User.findOne({ email: email.trim().toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ success: false, message: "Email is already registered" });
        }

        const selectedPackage = await Package.findById(packageId);
        if (!selectedPackage) {
            return res.status(404).json({ success: false, message: "Package not found" });
        }

        // Use provided password or generate a random one
        const finalPassword = password || crypto.randomBytes(8).toString('hex');
        const hashedPassword = await bcrypt.hash(finalPassword, 10);
        const employeeId = await generateEmployeeId();

        const newUser = new User({
            name: ownerName,
            email: email.trim().toLowerCase(),
            password: hashedPassword,
            role: "Admin",
            status: "Active", 
            employeeId,
            phone: phoneNumber
        });
        await newUser.save();

        const pkgDuration = selectedPackage.duration;
        let expiryDate = new Date();
        if (pkgDuration.unit === 'day') expiryDate.setDate(expiryDate.getDate() + pkgDuration.value);
        if (pkgDuration.unit === 'month') expiryDate.setMonth(expiryDate.getMonth() + pkgDuration.value);
        if (pkgDuration.unit === 'year') expiryDate.setFullYear(expiryDate.getFullYear() + pkgDuration.value);

        const newClient = new Client({
            adminId: newUser._id,
            businessName,
            ownerName,
            email: email.trim().toLowerCase(),
            phoneNumber,
            packageId: selectedPackage._id,
            packageStartDate: new Date(),
            packageExpiryDate: expiryDate,
            paymentStatus: 'completed',
            isActive: true,
            softwareAccess: 'HRMS',
            paymentHistory: [{
                packageId: selectedPackage._id,
                amount: selectedPackage.price,
                status: 'completed',
                paymentId: 'ADMIN_CREATED'
            }]
        });
        await newClient.save();

        // Send credentials email to the client
        try {
            await sendClientCredentialsMail({
                ownerName,
                businessName,
                email: email.trim().toLowerCase(),
                password: finalPassword,
            });
        } catch (mailError) {
            console.error("Failed to send credentials email:", mailError.message);
        }

        res.status(201).json({
            success: true,
            message: "Client created successfully by Master Admin",
            client: newClient,
            tempPassword: password ? undefined : finalPassword 
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update Client (Master Admin only)
export const updateClient = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const client = await Client.findByIdAndUpdate(id, updateData, { new: true });
        if (!client) return res.status(404).json({ success: false, message: "Client not found" });

        // Sync with Admin User if relevant fields are updated
        if (updateData.ownerName || updateData.email) {
            await User.findByIdAndUpdate(client.adminId, {
                name: updateData.ownerName,
                email: updateData.email
            });
        }

        res.status(200).json({ success: true, message: "Client updated successfully", client });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
