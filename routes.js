import express from "express";
const router = express.Router();

import {
  addDoctor,
  getDoctor,
  deleteDoctor,
  getDoctors,
} from "./controllers.js";

router.post("/doctor", addDoctor);
router.get("/doctor/:id", getDoctor);
router.delete("/doctor/:id", deleteDoctor);
router.get("/doctors", getDoctors);

export default router;
