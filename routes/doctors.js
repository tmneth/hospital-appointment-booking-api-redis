import express from "express";
const router = express.Router();

import {
  addDoctor,
  getDoctor,
  deleteDoctor,
  getDoctors,
  getDoctorReservations,
} from "../controllers/doctors.js";

router.get("/", getDoctors);
router.post("/", addDoctor);
router.get("/:id", getDoctor);
router.delete("/:id", deleteDoctor);
router.get("/:id/reservations", getDoctorReservations);

export default router;
