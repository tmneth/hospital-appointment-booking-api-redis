import { v4 as uuidv4 } from "uuid";
import client from "../redisClient.js";

export const addPatient = async (req, res) => {
  const { name, age, address } = req.body;

  if (!name || !age || !address) {
    return res.status(400).json({ message: "Some details are missing." });
  }

  try {
    const patientId = uuidv4();
    const patientKey = `patient:${patientId}`;

    await client.hSet(patientKey, [
      "id",
      patientId,
      "name",
      name,
      "age",
      age.toString(),
      "address",
      address,
    ]);

    res
      .status(200)
      .json({ message: `Patient with id: ${patientId} added successfully!` });
  } catch (error) {
    res.status(500).json({ message: "Error adding patient." });
  }
};

export const getPatients = async (req, res) => {
  try {
    const patientKeys = await client.keys("patient:*");
    const patients = [];

    for (const key of patientKeys) {
      const patientDetails = await client.hGetAll(key);
      patients.push(patientDetails);
    }

    res.status(200).json(patients);
  } catch (error) {
    res.status(500).json({ message: "Error fetching all patients." });
  }
};

export const getPatient = async (req, res) => {
  const patientId = req.params.id;
  const patientKey = `patient:${patientId}`;

  try {
    const patientDetails = await client.hGetAll(patientKey);
    if (!patientDetails || !patientDetails.id) {
      return res
        .status(404)
        .json({ message: `Patient with id ${patientId} not found.` });
    }

    res.status(200).json(patientDetails);
  } catch (error) {
    res.status(500).json({ message: "Error getting patient." });
  }
};

export const deletePatient = async (req, res) => {
  const patientId = req.params.id;
  const patientKey = `patient:${patientId}`;

  try {
    const exists = await client.exists(patientKey);
    if (!exists) {
      return res
        .status(404)
        .json({ message: `Patient with id ${patientId} not found.` });
    }

    await client.del(patientKey);

    res
      .status(200)
      .json({ message: `Patient with id: ${patientId} deleted successfully!` });
  } catch (error) {
    res.status(500).json({ message: "Error deleting patient." });
  }
};

export const getPatientReservations = async (req, res) => {
  const patientId = req.params.id;

  try {
    const patientKey = `patient:${patientId}`;
    const patientReservationKeysSet = `patientReservations:${patientId}`;

    const patientExists = await client.exists(patientKey);
    if (!patientExists) {
      return res
        .status(404)
        .json({ message: `Patient with id ${patientId} not found.` });
    }

    const reservationKeys = await client.sMembers(patientReservationKeysSet);

    const reservations = [];
    for (const reservationKey of reservationKeys) {
      const reservationDetails = await client.hGetAll(reservationKey);
      reservations.push(reservationDetails);
    }

    res.status(200).json(reservations);
  } catch (error) {
    res.status(500).json({ message: "Error getting patient reservations." });
    console.log(error);
  }
};
