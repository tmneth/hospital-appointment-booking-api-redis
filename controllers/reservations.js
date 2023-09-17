import client from "../redisClient.js";

export const reserveAppointment = async (req, res) => {
  const { doctorId, dateTime } = req.body;
  const time = dateTime.split(" ")[1];

  try {
    const doctorKey = `doctor:${doctorId}`;
    const reservationKey = `reservations:${doctorId}`;
    const workingHoursKey = `workingHours:${doctorId}`;

    const doctorExists = await client.exists(doctorKey);
    if (!doctorExists) {
      return res
        .status(404)
        .json({ message: `Doctor with id ${doctorId} not found.` });
    }

    client.watch(reservationKey);

    const slotReserved = await client.sIsMember(reservationKey, dateTime);
    if (slotReserved) {
      client.unwatch();
      return res
        .status(409)
        .json({ message: "Selected time slot already reserved." });
    }

    const slotAvailable = await client.sIsMember(workingHoursKey, time);
    if (!slotAvailable) {
      client.unwatch();
      return res
        .status(409)
        .json({ message: "Selected time slot is not available." });
    }

    const multi = client.multi();

    multi.sAdd(reservationKey, dateTime);

    const results = await multi.exec();

    client.unwatch();

    if (!results || results.includes(0)) {
      return res
        .status(409)
        .json({ message: "Time slot has been reserved by another user." });
    }

    res
      .status(200)
      .json({ message: `Appointment successfully reserved for ${dateTime}!` });
  } catch (error) {
    res.status(500).json({ message: "Error reserving appointment." });
  }
};

export const removeReservation = async (req, res) => {
  const { doctorId, dateTime } = req.body;

  try {
    const doctorKey = `doctor:${doctorId}`;
    const reservationKey = `reservations:${doctorId}`;

    const doctorExists = await client.exists(doctorKey);
    if (!doctorExists) {
      return res
        .status(404)
        .json({ message: `Doctor with id ${doctorId} not found.` });
    }

    const slotReserved = await client.sIsMember(reservationKey, dateTime);
    if (!slotReserved) {
      return res
        .status(409)
        .json({ message: "Selected time slot is not reserved." });
    }

    await client.sRem(reservationKey, dateTime);

    res
      .status(200)
      .json({ message: `Reservation for ${dateTime} removed successfully!` });
  } catch (error) {
    res.status(500).json({ message: "Error removing reservation." });
  }
};
