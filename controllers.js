import redis from "redis";

const client = redis.createClient("rediss://127.0.0.1:6379");

client.on("error", function (error) {
  console.error("Error connecting to Redis:", error);
});

await client.connect();

export const addDoctor = async (req, res) => {
  const { id, name, specialization } = req.body;

  try {
    await client.hSet(`doctor:${id}`, [
      "name",
      name,
      "specialization",
      specialization,
    ]);
    res
      .status(200)
      .json({ message: `Doctor with id: ${id} added successfully` });
  } catch (error) {
    res.status(500).json({ message: "Error adding doctor." });
  }
};

export const getDoctor = async (req, res) => {
  try {
    const id = req.params.id;

    const exists = await client.exists(`doctor:${id}`);
    if (!exists) {
      return res.status(404).json({ message: "Doctor not found." });
    }

    const doctor = await client.hGetAll(`doctor:${id}`);

    res.status(200).json(doctor);
  } catch (error) {
    res.status(500).json({ message: "Error getting doctor." });
  }
};

export const deleteDoctor = async (req, res) => {
  try {
    const id = req.params.id;

    const exists = await client.exists(`doctor:${id}`);
    if (!exists) {
      return res.status(404).json({ message: "Doctor not found." });
    }

    await client.del(`doctor:${id}`);

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
      doctors.push(doctorDetails);
    }

    res.status(200).json(doctors);
  } catch (error) {
    res.status(500).json({ message: "Error retrieving doctors." });
  }
};
