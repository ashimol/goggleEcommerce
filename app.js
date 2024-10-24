const express = require("express");
const app = express();
const path = require("path");
const dotenv = require("dotenv").config();
const userRouter = require("./routes/userRouter");

// Connect to the database
const db = require("./config/db");
db();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));  // Use express.urlencoded directly

app.set("view engine", "ejs");


// Correctly setting multiple view directories
app.set("views", [path.join(__dirname, 'views/user'), path.join(__dirname, 'views/admin')]);



app.use(express.static(path.join(__dirname, "public"))); // Serving static files

app.use("/", userRouter);

// Define the port from the environment variables or use a default one
const port = process.env.PORT || 3000;

app.listen(port, (err) => {
    if (err) {
        console.error(`Error: ${err.message}`);
    } else {
        console.log(`Server running on port ${port}`);
    }
});

module.exports = app;
