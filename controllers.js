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
  try {
    const id = req.params.id;
    const doctorKey = `doctor:${id}`;
    const workingHoursKey = `WorkingHours:${id}`;

    const exists = await client.exists(doctorKey);
    if (!exists) {
      return res.status(404).json({ message: "Doctor not found." });
    }

    const doctorDetails = await client.hGetAll(doctorKey);
    const workingHours = await client.sMembers(workingHoursKey);

    res.status(200).json({ doctorDetails, workingHours });
  } catch (error) {
    res.status(500).json({ message: "Error getting doctor." });
  }
};

export const deleteDoctor = async (req, res) => {
  try {
    const id = req.params.id;
    const doctorKey = `doctor:${id}`;
    const workingHoursKey = `WorkingHours:${id}`;

    const exists = await client.exists(doctorKey);
    if (!exists) {
      return res.status(404).json({ message: "Doctor not found." });
    }

    await client.del(doctorKey);
    await client.del(workingHoursKey);

    res
      .status(200)
      .json({ message: `Doctor with id: ${id} deleted successfully` });
  } catch (error) {
    res.status(500).json({ message: "Error deleting doctor." });
  }
};

export const getDoctors = async (req, res) => {
  try {
    const doctorKeys = await client.keys("doctor:*");
    const doctors = [];

    for (const key of doctorKeys) {
      const doctorDetails = await client.hGetAll(key);
      const id = key.split(":")[1];
      const workingHours = await client.sMembers(`WorkingHours:${id}`);

      doctors.push({ ...doctorDetails, workingHours });
    }

    res.status(200).json(doctors);
  } catch (error) {
    res.status(500).json({ message: "Error retrieving doctors." });
  }
};
