import express from "express";
import bodyParser from "body-parser";
import cors from "cors";

import doctorRoutes from "./routes/doctors.js";
import reservationRoutes from "./routes/reservations.js";

const app = express();

app.use(bodyParser.json());
app.use(cors());

app.use("/doctors", doctorRoutes);
app.use("/reserve", reservationRoutes);

const PORT = 8000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
