import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import routes from "./routes.js";

const app = express();

app.use(bodyParser.json());
app.use(cors());
app.use("/", routes);

const PORT = 8000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
