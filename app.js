const express = require("express");
const app = express();
const path = require("path");
const env = require("dotenv").config();
const session = require("express-session");
const passport = require("./config/passport");
const userRouter = require("./routes/userRouter");
const adminRouter =require('./routes/adminRouter');
const nocache = require('nocache');
const cors = require("cors");

// Connect to the database
const db = require("./config/db");
db();


const allowedOrigins = ['http://localhost:3000'];

app.use(cors({
    origin: function(origin, callback) {

        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'The CORS policy for this site does not ' +
                'allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));




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


app.use(nocache());
app.use(passport.initialize());
app.use(passport.session());

app.use((req,res,next) =>{
    res.set("cache-controll","no-store");
    next();
})

app.set("view engine", "ejs");


// Correctly setting multiple view directories
app.set("views", [path.join(__dirname, 'views/user'), path.join(__dirname, 'views/admin')]);


app.use(express.static(path.join(__dirname, "public"))); // Serving static files
app.use('/css', express.static(path.join(__dirname, 'public/css')));


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
