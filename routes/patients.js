import express from "express";
const router = express.Router();

import {
  addPatient,
  getPatient,
  deletePatient,
  getPatients,
  getPatientReservations,
} from "../controllers/patients.js";

router.get("/", getPatients);
router.post("/", addPatient);
router.get("/:id", getPatient);
router.delete("/:id", deletePatient);
router.get("/:id/reservations", getPatientReservations);

export default router;
