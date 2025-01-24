const express= require("express");
const router = express.Router();
const userController =require("../controllers/user/userController");
const addressController= require('../controllers/user/addressController');
const passport = require("passport");
const session = require('express-session');
const {userAuth,adminAuth}=require('../middlewares/auth');
const {cartCount} = require('../middlewares/cartCount');
const profileController= require("../controllers/user/profileController");
const cartController = require('../controllers/user/cartController');
const orderController = require('../controllers/user/orderController');
const wishlistController = require("../controllers/user/wishlistController");
const userWalletController = require('../controllers/user/userWalletController');
const orderCancelController = require('../controllers/user/orderCancelController');
const confirmRePaymentController = require('../controllers/user/confirmRePaymentController');

const Order = require('../models/orderSchema');
const Wallet = require('../models/walletSchema');
const Product =require('../models/productSchema')

// router.use((req, res, next) => {
//     console.log('Incoming request:', {
//         method: req.method,
//         url: req.url,
//         params: req.params,
//         body: req.body,
//         path: req.path
//     });
//     next();
// });


router.get("/pageNotFound",userController.pageNotFound);


router.get('/',userController.loadHomepage);

router.get('/signup',userController.loadSignup);
router.post('/signup',userController.signup);

router.get('/shop',userAuth,userController.loadShopping);
// router.get('/filter',userAuth,userController.filterProducts);
// router.get('/filterPrice',userAuth,userController.filterByPrice);
// router.post('/search',userAuth,userController.searchProducts);


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

router.get('/userprofile',userAuth,cartCount,profileController.userprofile);
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
//router.get('/my-order/order-details',userAuth,orderController.getOrderDetails);
router.post("/test-route", (req, res) => {
    console.log("Test route hit");
    res.json({ message: "Test route working" });
});


router.post("/user/my-order/cancel/:itemOrderId/:cancelReason", userAuth,orderCancelController.cancelOrder);
router.post("/my-order/return/:itemOrderId", userAuth, orderController.returnOrder);
router.post('/my-order/order-details', userAuth,confirmRePaymentController.confirmRePayment);
router.get("/my-order/:orderId/invoice/:itemId", userAuth, orderController.downloadInvoice);


router.get("/wishlist",userAuth,wishlistController.loadWishlist);
router.post("/add-wishlist",userAuth,wishlistController.addToWishlist);
router.delete('/wishlist/deleteItems/:wishlistId', userAuth, wishlistController.deleteWishlistItem);

//router.get("/wallet",userAuth,userWalletController.wallet);
router.get("/user/my-wallet",userAuth,userWalletController.wallet);
router.post('/user/check-wallet-balance', userAuth,userWalletController.checkWalletBalance);



// Add error handling middleware 
router.use((error, req, res, next) => {
    console.error("Global error handler caught:", error);
    res.status(500).json({
        success: false,
        message: 'Server error occurred',
        error: error.message
    });
});




module.exports= router;