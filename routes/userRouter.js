const express= require("express");
const router = express.Router();
const userController =require("../controllers/user/userController");
const addressController= require('../controllers/user/addressController');
const passport = require("passport");
const session = require('express-session');
const {userAuth,adminAuth}=require('../middlewares/auth');
const profileController= require("../controllers/user/profileController");


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

router.get('/login',userController.loadLogin);

router.post('/login',userController.login);

router.get('/logout',userAuth,userController.logout);

router.get('/product-details/:id',userAuth,userController.productDetails);

router.get('/userprofile',userAuth,profileController.userprofile);

router.get('/user/account',userAuth,profileController.userAccount);
router.post('/user/account/edit-user/:id',userAuth,profileController.editUser);

router.get('/user/address',userAuth,addressController.userAddress);
router.get('/user/add-new-address',userAuth,addressController.addAddress);
router.post('/user/add-new-address',userAuth,addressController.addNewAddress);
router.get('/user/edit-address',userAuth,addressController.getEditAddresss);
router.get('/user/edit-address/:id',userAuth,addressController.getEditAddresss);
router.post('/user/edit-address/:id',userAuth,addressController.updateAddress);
router.delete('/user/deleteAddress', userAuth, addressController.deleteAddress);


module.exports= router;