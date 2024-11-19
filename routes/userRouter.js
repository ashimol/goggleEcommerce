const express= require("express");
const router = express.Router();
const userController =require("../controllers/user/userController");
const passport = require("passport");
const session = require('express-session');
const {userAuth,adminAuth}=require('../middlewares/auth');

router.get("/pageNotFound",userController.pageNotFound);


router.get('/',userAuth,userController.loadHomepage);

router.get('/signup',userController.loadSignup);
router.post('/signup',userController.signup);
//router.get('/shop',userAuth,userController.loadShopping);

router.post("/verify-otp",userController.verifyOtp);
router.post("/resend-otp",userController.resendOtp);

// router.get("/auth/google",userAuth,passport.authenticate('google',{scope:['profile','email']}));

// router.get("/auth/google/callback",userAuth, passport.authenticate('google', { failureRedirect: '/signup' }), (req, res) => {
//     console.log("Authentication successful, redirecting to home page.");
//     res.redirect('/');
// });

router.get('/auth/google',passport.authenticate('google',{scope:['profile','email']}));
router.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:'/signup'}),(req,res)=>{
    res.redirect('/')
});

router.get('/login',userAuth,userController.loadLogin);

router.post('/login',userAuth,userController.login);

router.get('/logout',userAuth,userController.logout);

router.get('/product-details/:id',userAuth,userController.productDetails);


module.exports= router;