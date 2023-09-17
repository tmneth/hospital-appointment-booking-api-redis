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
    return res.status(400).json({ message: "All fields are required." });
  }

  try {
    const doctorId = uuidv4();

    const doctorKey = `doctor:${doctorId}`;

    await client.hSet(doctorKey, [
      "id",
      doctorId,
      "name",
      name,
      "specialization",
      specialization,
    ]);

    await client.sAdd(`workingHours:${doctorId}`, workingHours);

    res
      .status(200)
      .json({ message: `Doctor with id: ${doctorId} added successfully` });
  } catch (error) {
    res.status(500).json({ message: "Error adding doctor." });
  }
};

export const getDoctor = async (req, res) => {
  const id = req.params.id;

  try {
    const doctorKey = `doctor:${id}`;
    const workingHoursKey = `workingHours:${id}`;
    const reservationsKey = `reservations:${id}`;

    const exists = await client.exists(doctorKey);
    if (!exists) {
      return res.status(404).json({ message: "Doctor not found." });
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
    const id = req.params.id;
    const doctorKey = `doctor:${id}`;
    const workingHoursKey = `workingHours:${id}`;
    const reservationsKey = `reservations:${id}`;

    const exists = await client.exists(doctorKey);
    if (!exists) {
      return res.status(404).json({ message: "Doctor not found." });
    }

    await client.del(doctorKey);
    await client.del(workingHoursKey);
    await client.del(reservationsKey);

    res
      .status(200)
      .json({ message: `Doctor with id: ${id} deleted successfully` });
  } catch (error) {
    res.status(500).json({ message: "Error deleting doctor." });
  }
};

export const reserveAppointment = async (req, res) => {
  const { doctorId, dateTime } = req.body;
  const time = dateTime.split(" ")[1];

  try {
    const doctorExists = await client.exists(`doctor:${doctorId}`);
    if (!doctorExists) {
      return res.status(404).json({ message: "Doctor not found." });
    }

    const reservationKey = `reservations:${doctorId}`;
    const workingHoursKey = `workingHours:${doctorId}`;

    client.watch(reservationKey);

    const isSlotReserved = await client.sIsMember(reservationKey, dateTime);
    if (isSlotReserved) {
      client.unwatch();
      return res.status(409).json({ message: "Slot already reserved." });
    }

    const isTimeAvailable = await client.sIsMember(workingHoursKey, time);
    if (!isTimeAvailable) {
      client.unwatch();
      return res
        .status(409)
        .json({ message: "Selected time is not available for the doctor." });
    }

    const multi = client.multi();

    multi.sAdd(reservationKey, dateTime);

    const results = await multi.exec();

    console.log(results);
    if (!results[0]) {
      return res
        .status(409)
        .json({ message: "Slot was reserved by another user." });
    }
    console.log("reserved");
    res.status(200).json({ message: `Appointment reserved for ${dateTime}` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error reserving appointment." });
  }
};
