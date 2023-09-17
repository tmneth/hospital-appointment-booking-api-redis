import { v4 as uuidv4 } from "uuid";
import client from "../redisClient.js";

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

    client.unwatch();

    if (!results || results.includes(null)) {
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
      console.log(doctors);
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

    client.watch(doctorKey, workingHoursKey, reservationsKey);

    const multi = client.multi();

    multi.del(doctorKey);
    multi.del(workingHoursKey);

    const reservationExists = await client.exists(reservationsKey);
    if (reservationExists) {
      multi.del(reservationsKey);
    }

    const results = await multi.exec();

    client.unwatch();

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
