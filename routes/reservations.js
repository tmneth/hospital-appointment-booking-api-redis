import express from "express";
const router = express.Router();

import {
  reserveAppointment,
  removeReservation,
} from "../controllers/reservations.js";

router.post("/", reserveAppointment);
router.delete("/", removeReservation);

export default router;
