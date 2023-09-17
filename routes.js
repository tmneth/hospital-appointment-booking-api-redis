import express from "express";
const router = express.Router();

import {
  addDoctor,
  getDoctor,
  deleteDoctor,
  getDoctors,
  reserveAppointment,
  removeReservation,
} from "./controllers.js";

router.post("/doctor", addDoctor);
router.get("/doctor/:id", getDoctor);
router.delete("/doctor/:id", deleteDoctor);
router.get("/doctors", getDoctors);

router.post("/reserve", reserveAppointment);
router.delete("/reserve", removeReservation);

export default router;
