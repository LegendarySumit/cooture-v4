const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

// Health check — used by frontend to pre-warm Render on page load
app.get("/health", (req, res) => res.json({ status: "ok" }));

// Routes
app.use("/auth", require("./routes/auth"));
app.use("/ai", require("./routes/ai"));

app.listen(process.env.PORT, () =>
    console.log(`Server running on port ${process.env.PORT}`)
);
