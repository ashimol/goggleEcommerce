const express = require("express");
const app = express();
const path = require("path");
const dotenv = require("dotenv").config();
const session = require("express-session");
const passport = require("./config/passport");
const userRouter = require("./routes/userRouter");
const adminRouter =require('./routes/adminRouter');

// Connect to the database
const db = require("./config/db");
db();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));  

app.use(session({
    secret : process.env.SESSION_SECRET,
    resave : false,
    saveUninitialized : true,
    cookie:{
        secure:false,
        httpOnly:true,
        maxAge:72*60*60*1000
    }
}));


app.use(passport.initialize());
app.use(passport.session());

app.set("view engine", "ejs");


// Correctly setting multiple view directories
app.set("views", [path.join(__dirname, 'views/user'), path.join(__dirname, 'views/admin')]);


app.use(express.static(path.join(__dirname, "public"))); // Serving static files

app.use("/", userRouter);
app.use('/admin',adminRouter);

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
