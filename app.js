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
  
const allowedOrigins = ['http://localhost:3000', 'https://ashitha.live', 'http://localhost'];

app.use(cors({
    origin: function(origin, callback) {
        
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
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


app.set("views", [path.join(__dirname, 'views/user'), path.join(__dirname, 'views/admin')]);


app.use(express.static(path.join(__dirname, "public"))); 
app.use('/css', express.static(path.join(__dirname, 'public/css')));


app.use("/", userRouter);
app.use('/admin',adminRouter);


app.use((req, res) => {
    const err = new Error('Not Found');
    err.status = 404;
    res.redirect("/pageNotFound");
});


const port = process.env.PORT || 3000;

app.listen(port, (err) => {
    if (err) {
        console.error(`Error: ${err.message}`);
    } else {
        console.log(`Server running on port ${port}`);
    }
});

module.exports = app;
