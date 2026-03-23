import express from "express";
import { addLocation, getLocations, updateLocation, deleteLocation } from "../controllers/Location.Controller.js";
import { verifyToken, isAdmin } from "../middleware/Auth.Middleware.js";

const router = express.Router();

router.get("/", verifyToken, getLocations);
router.post("/add", verifyToken, isAdmin, addLocation);
router.put("/:id", verifyToken, isAdmin, updateLocation);
router.delete("/:id", verifyToken, isAdmin, deleteLocation);

export default router;
