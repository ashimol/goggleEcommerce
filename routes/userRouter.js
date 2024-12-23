const express= require("express");
const router = express.Router();
const userController =require("../controllers/user/userController");
const addressController= require('../controllers/user/addressController');
const passport = require("passport");
const session = require('express-session');
const {userAuth,adminAuth}=require('../middlewares/auth');
const profileController= require("../controllers/user/profileController");
const cartController = require('../controllers/user/cartController');
const orderController = require('../controllers/user/orderController');
const wishlistController = require("../controllers/user/wishlistController");


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

router.get("/forgot-password",profileController.getForgotPassPage);
 router.post("/forgot-email-valid", profileController.forgotEmailValid);
 router.post("/verify-passForgot-otp",profileController.verifyForgotPassOtp);
 router.get("/reset-password",profileController.getResetPassPage);
 router.post("/resend-forgot-otp",profileController.resendOtp);
 router.post("/reset-password",profileController.postNewPassword);

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
router.delete('/cart/remove',userAuth, cartController.removeFromCart);

router.get("/cart/checkout/:id", userAuth, orderController.getCheckout);
router.post('/cart/place-order',userAuth,orderController.placeOrder);
router.post('/verify-payment',userAuth,orderController.verifyPayment);
router.post('/cart/apply-coupon',userAuth, orderController.applyCoupon);
router.post("/cart/remove-coupon", userAuth, orderController.removeCoupon);


router.get('/orderConfirmation/:orderId',userAuth,orderController.orderConfirmation);
router.get('/user/my-order',userAuth,orderController.getMyOrders);
router.get('/my-order/order-details/:orderId/:itemId',userAuth, orderController.getOrderDetails);
router.post('/my-order/cancel/:orderId',userAuth,orderController.cancelOrder);
router.post('/myorder/return-order',userAuth, orderController.returnOrder);

router.get("/wishlist",userAuth,wishlistController.loadWishlist);
router.post("/add-wishlist",userAuth,wishlistController.addToWishlist);
router.delete('/wishlist/deleteItems/:wishlistId', userAuth, wishlistController.deleteWishlistItem);



module.exports= router;