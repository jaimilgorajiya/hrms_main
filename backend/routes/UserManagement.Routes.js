import express from "express";
import { getManagers, getExEmployees, getNewJoiners, getUpcomingRetirements, getOtherEmployees, getExitRecord, updateExitRecord, getOnboardingDetails, updateOnboardingDetails } from "../controllers/UserManagement.Controller.js";
import Role from "../models/Role.Model.js";
import Grade from "../models/Grade.Model.js";
import Resignation from "../models/Resignation.Model.js";

const router = express.Router(); 

// --- ROLES & PERMISSIONS ---
router.get("/roles", async (req, res) => {
    try {
        const roles = await Role.find();
        res.status(200).json({ success: true, roles });
    } catch (err) { res.status(500).send(err.message); }
});

router.post("/roles", async (req, res) => {
    try {
        const { name } = req.body;
        const newRole = new Role({ name });
        await newRole.save();
        res.status(201).json({ success: true, role: newRole });
    } catch (err) { res.status(500).send(err.message); }
});

router.put("/roles/:id", async (req, res) => {
    try {
        const { name, permissions } = req.body;
        const role = await Role.findByIdAndUpdate(req.params.id, { name, permissions }, { new: true });
        res.status(200).json({ success: true, role });
    } catch (err) { res.status(500).send(err.message); }
});

router.delete("/roles/:id", async (req, res) => {
    try {
        await Role.findByIdAndDelete(req.params.id);
        res.status(200).json({ success: true, message: "Role deleted" });
    } catch (err) { res.status(500).send(err.message); }
});

// --- GRADES ---
router.get("/grades", async (req, res) => {
    try {
        const grades = await Grade.find();
        res.status(200).json({ success: true, grades });
    } catch (err) { res.status(500).send(err.message); }
});

router.post("/grades", async (req, res) => {
    try {
        const { name, minSalary, maxSalary, benefits, description } = req.body;
        const newGrade = new Grade({ 
            name, 
            basicSalaryRange: { min: minSalary, max: maxSalary },
            benefits,
            description
        });
        await newGrade.save();
        res.status(201).json({ success: true, grade: newGrade });
    } catch (err) { res.status(500).send(err.message); }
});

router.put("/grades/:id", async (req, res) => {
    try {
        const { name, minSalary, maxSalary, benefits, description } = req.body;
        const grade = await Grade.findByIdAndUpdate(req.params.id, { 
            name, 
            basicSalaryRange: { min: minSalary, max: maxSalary },
            benefits,
            description
        }, { new: true });
        res.status(200).json({ success: true, grade });
    } catch (err) { res.status(500).send(err.message); }
});

router.delete("/grades/:id", async (req, res) => {
    try {
        await Grade.findByIdAndDelete(req.params.id);
        res.status(200).json({ success: true, message: "Grade deleted" });
    } catch (err) { res.status(500).send(err.message); }
});

// --- LISTS ---
router.get("/managers", getManagers);
router.get("/ex-employees", getExEmployees);
router.get("/new-joiners", getNewJoiners); // Onboarding
router.get("/upcoming-retirements", getUpcomingRetirements);
router.get("/other-employees", getOtherEmployees);

// --- EXIT MANAGEMENT ---
router.get("/exit-record/:userId", getExitRecord);
router.put("/exit-record/:userId", updateExitRecord);

// --- ONBOARDING ---
router.get("/onboarding-record/:userId", getOnboardingDetails);
router.put("/onboarding-record/:userId", updateOnboardingDetails);

// --- RESIGNATIONS ---
router.post("/resignations", async (req, res) => { // User submits
    try {
        const { reason, noticeDate, employeeId } = req.body;
        const newResignation = new Resignation({
            employeeId,
            reason,
            noticeDate
        });
        await newResignation.save();
        res.status(201).json({ success: true, message: "Resignation submitted" });
    } catch (err) { res.status(500).send(err.message); }
});

router.put("/resignations/:id", async (req, res) => { // HR Approves/Rejects
    try {
        const { status, lastWorkingDay, comments } = req.body;
        const resignation = await Resignation.findByIdAndUpdate(req.params.id, {
            status,
            lastWorkingDay,
            comments
        }, { new: true });
        // If approved, maybe update user status? Leaving that logic for now.
        res.status(200).json({ success: true, resignation });
    } catch (err) { res.status(500).send(err.message); }
});

router.get("/resignations", async (req, res) => { // HR views all
    try {
        const resignations = await Resignation.find().populate('employeeId', 'name department');
        res.status(200).json({ success: true, resignations });
    } catch (err) { res.status(500).send(err.message); }
});

export default router;
