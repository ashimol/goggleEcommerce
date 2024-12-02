const express= require("express");
const router = express.Router();
const userController =require("../controllers/user/userController");
const addressController= require('../controllers/user/addressController');
const passport = require("passport");
const session = require('express-session');
const {userAuth,adminAuth}=require('../middlewares/auth');
const profileController= require("../controllers/user/profileController");
const cartController = require('../controllers/user/cartController');
const checkouController= require('../controllers/user/checkoutController');



router.get("/pageNotFound",userController.pageNotFound);


router.get('/',userAuth,userController.loadHomepage);

router.get('/signup',userController.loadSignup);
router.post('/signup',userController.signup);

router.get('/shop',userAuth,userController.loadShopping);
router.get('/filter',userAuth,userController.filterProducts);
router.get('/filterPrice',userAuth,userController.filterByPrice);
router.post('/search',userAuth,userController.searchProducts);


router.post("/verify-otp",userController.verifyOtp);
router.post("/resend-otp",userController.resendOtp);


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

router.post("/add-cart",userAuth,cartController.addToCart);
router.get('/cart',userAuth,cartController.getCart);
router.post("/cart/update-quantity",userAuth,cartController.updateQuantity)
//router.post('/cart/remove',userAuth, cartController.removeFromCart);
router.delete('/cart/remove',userAuth, cartController.removeFromCart);
//router.delete('/cart/remove-deleted-item',userAuth,cartController.removeDeletedItem);

router.get('/checkout-page',userAuth,checkouController.getCheckout);
router.post('/checkout',userAuth,checkouController.addToCheckout);
module.exports= router;