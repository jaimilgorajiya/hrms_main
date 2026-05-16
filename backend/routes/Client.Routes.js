import express from "express";
import { getAllClients, toggleClientStatus, deleteClient, createClient, updateClient, getClientById } from "../controllers/Client.Controller.js";
import { verifyToken, isAdmin } from "../middleware/Auth.Middleware.js";

const router = express.Router();

// POST create client
router.post("/", createClient);

// GET single client
router.get("/:id", getClientById);

// GET all clients
router.get("/", getAllClients);

// PUT update client
router.put("/:id", updateClient);

// PATCH toggle status
router.patch("/:id/toggle-status", toggleClientStatus);

// DELETE client
router.delete("/:id", deleteClient);

export default router;
