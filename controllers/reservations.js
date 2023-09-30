import { v4 as uuidv4 } from "uuid";
import client from "../redisClient.js";

export const reserveAppointment = async (req, res) => {
  const { doctorId, dateTime, patientId } = req.body;

  const time = dateTime.split(" ")[1];

  const doctorKey = `doctor:${doctorId}`;
  const reservationKey = `reservation:${doctorId}:${dateTime}`;
  const patientKey = `patient:${patientId}`;
  const workingHoursKey = `workingHours:${doctorId}`;

  try {
    client.watch(doctorKey, patientKey, reservationKey, workingHoursKey);

    const doctorExists = await client.exists(doctorKey);
    if (!doctorExists) {
      client.unwatch();
      return res
        .status(404)
        .json({ message: `Doctor with id ${doctorId} not found.` });
    }

    const patientExists = await client.exists(patientKey);
    if (!patientExists) {
      client.unwatch();
      return res
        .status(404)
        .json({ message: `Patient with id ${patientId} not found.` });
    }

    const reservationExists = await client.sIsMember(
      `doctorReservations:${doctorId}`,
      reservationKey
    );
    if (reservationExists) {
      client.unwatch();
      return res.status(409).json({
        message: "The doctor is already reserved for the given time slot.",
      });
    }

    const slotAvailable = await client.sIsMember(workingHoursKey, time);
    if (!slotAvailable) {
      client.unwatch();
      return res
        .status(409)
        .json({ message: "Selected time slot is not available." });
    }

    const multi = client.multi();

    const newResId = uuidv4();

    multi.hSet(reservationKey, [
      "dateTime",
      dateTime,
      "resId",
      newResId,
      "doctorId",
      doctorId,
      "patientId",
      patientId,
    ]);

    multi.sAdd(`doctorReservations:${doctorId}`, reservationKey);
    multi.sAdd(`patientReservations:${patientId}`, reservationKey);
    multi.set(`reservationId:${newResId}`, reservationKey);

    const results = await multi.exec();

    client.unwatch();

    if (!results) {
      return res.status(409).json({
        message:
          "Reservation failed due to concurrent modification. Please try again.",
      });
    }

    res
      .status(200)
      .json({ message: `Appointment successfully reserved for ${dateTime}!` });
  } catch (error) {
    res.status(500).json({ message: "Error reserving appointment." });
  }
};

export const removeReservation = async (req, res) => {
  const resId = req.params.id;

  try {
    const reservationKey = await client.get(`resIdMapping:${resId}`);

    if (!reservationKey) {
      return res.status(404).json({
        message: `No reservation found for the provided ID ${resId}.`,
      });
    }

    const [doctorId, dateTime] = reservationKey.split(":").slice(1);
    const doctorReservationListKey = `doctorReservations:${doctorId}`;
    const patientId = await client.hGet(reservationKey, "patientId");
    const patientReservationListKey = `patientReservations:${patientId}`;

    client.watch(
      patientReservationListKey,
      doctorReservationListKey,
      reservationKey
    );

    const multi = client.multi();

    multi.del(reservationKey);
    multi.del(`reservationId:${resId}`);
    multi.sRem(doctorReservationListKey, reservationKey);
    multi.sRem(patientReservationListKey, reservationKey);

    await multi.exec();

    client.unwatch();

    res.status(200).json({
      message: `Reservation with ID ${resId} has been successfully removed!`,
    });
  } catch (error) {
    res.status(500).json({ message: "Error removing appointment by ID." });
  }
};
