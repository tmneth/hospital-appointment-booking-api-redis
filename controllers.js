import redis from "redis";
import { v4 as uuidv4 } from "uuid";

const client = redis.createClient("rediss://127.0.0.1:6379");

client.on("error", function (error) {
  console.error("Error connecting to Redis:", error);
});

await client.connect();

export const addDoctor = async (req, res) => {
  const { name, specialization, workingHours } = req.body;

  if (!name || !specialization || !workingHours.length) {
    return res.status(400).json({ message: "Some details are missing." });
  }

  try {
    const doctorId = uuidv4();

    const doctorKey = `doctor:${doctorId}`;
    const workingHoursKey = `workingHours:${doctorId}`;

    client.watch(doctorKey, workingHoursKey);

    const multi = client.multi();

    multi.hSet(doctorKey, [
      "id",
      doctorId,
      "name",
      name,
      "specialization",
      specialization,
    ]);

    multi.sAdd(workingHoursKey, workingHours);

    const results = await multi.exec();

    if (results.includes(0)) {
      return res
        .status(500)
        .json({ message: "Error during creation. Please try again." });
    }

    res
      .status(200)
      .json({ message: `Doctor with id: ${doctorId} added successfully!` });
  } catch (error) {
    res.status(500).json({ message: "Error adding doctor." });
  }
};

export const getDoctors = async (req, res) => {
  try {
    const doctorKeys = await client.keys("doctor:*");
    const doctors = [];

    for (const key of doctorKeys) {
      const doctorDetails = await client.hGetAll(key);

      const doctorId = key.split(":")[1];

      const workingHours = await client.sMembers(`workingHours:${doctorId}`);
      const reservations = await client.sMembers(`reservations:${doctorId}`);

      doctors.push({ ...doctorDetails, workingHours, reservations });
    }

    res.status(200).json(doctors);
  } catch (error) {
    res.status(500).json({ message: "Error getting doctors." });
  }
};

export const getDoctor = async (req, res) => {
  const doctorId = req.params.id;

  try {
    const doctorKey = `doctor:${doctorId}`;
    const workingHoursKey = `workingHours:${doctorId}`;
    const reservationsKey = `reservations:${doctorId}`;

    const doctorExists = await client.exists(doctorKey);
    if (!doctorExists) {
      return res
        .status(404)
        .json({ message: `Doctor with id ${doctorId} not found.` });
    }

    const doctorDetails = await client.hGetAll(doctorKey);
    const workingHours = await client.sMembers(workingHoursKey);
    const reservations = await client.sMembers(reservationsKey);

    res.status(200).json({ ...doctorDetails, workingHours, reservations });
  } catch (error) {
    res.status(500).json({ message: "Error getting doctor." });
  }
};

export const deleteDoctor = async (req, res) => {
  try {
    const doctorId = req.params.id;
    const doctorKey = `doctor:${doctorId}`;
    const workingHoursKey = `workingHours:${doctorId}`;
    const reservationsKey = `reservations:${doctorId}`;

    const doctorExists = await client.exists(doctorKey);
    if (!doctorExists) {
      return res
        .status(404)
        .json({ message: `Doctor with id ${doctorId} not found.` });
    }

    client.watch(doctorKey, workingHoursKey, reservationsKey);

    const multi = client.multi();

    multi.del(doctorKey);
    multi.del(workingHoursKey);

    const reservationExists = await client.exists(reservationsKey);
    if (reservationExists) {
      multi.del(reservationsKey);
    }

    const results = await multi.exec();

    if (results.includes(0)) {
      return res
        .status(500)
        .json({ message: "Error during deletion. Please try again." });
    }

    res
      .status(200)
      .json({ message: `Doctor with id: ${doctorId} deleted successfully!` });
  } catch (error) {
    res.status(500).json({ message: "Error deleting doctor." });
  }
};

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

    if (!results[0]) {
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
