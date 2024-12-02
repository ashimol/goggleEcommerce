const express = require('express');
const router = express.Router();

const adminController = require('../controllers/admin/adminController');
const customerController = require('../controllers/admin/customerController');
const categoryController = require('../controllers/admin/categoryController');
const brandController = require("../controllers/admin/brandController");
const productController = require('../controllers/admin/productController');


const {userAuth,adminAuth}=require('../middlewares/auth');
const multer = require("multer");
const storage = require('../helpers/multer');

const uploads = multer({storage:storage});

router.get('/pageerror',adminController.pageerror);
router.get('/login',adminController.loadLogin);
router.post('/login',adminController.login);
router.get('/',adminAuth,adminController.loadDashboard);
router.get("/dashboard",adminAuth,adminController.loadDashboard);
router.get('/logout',adminAuth,adminController.logout);

//router.get('/users',adminAuth,customerController.customerInfo);
router.get('/users',adminAuth,customerController.customerInfo);
// router.get('/blockCustomer',adminAuth,customerController.customerBlocked);
// router.get('/unblockCustomer',adminAuth,customerController.customerunBlocked);

//router.get('/blockCustomer',adminAuth,customerController.custBlockOrUnblock);
router.get('/togle-block',adminAuth,customerController.toggleCustomerBlockStatus);

router.get('/category',adminAuth,categoryController.categoryInfo);
router.post('/addCategory',adminAuth,categoryController.addCategory);
router.get('/listCategory',adminAuth,categoryController.getListCategory);
router.get('/unlistCategory',adminAuth,categoryController.getUnlistCategory);
router.get('/editCategory',adminAuth,categoryController.getEditCategory);
router.post('/editCategory/:id',adminAuth,categoryController.editCategory);


router.get("/brand",adminAuth,brandController.brandInfo);
router.post("/addBrand",adminAuth,brandController.addBrand);
router.get("/getBrands", adminAuth, brandController.getBrands);
router.get("/listBrand",adminAuth,brandController.getListBrand);
router.get("/unlistBrand",adminAuth,brandController.getUnListBrand);
router.get("/editBrand",adminAuth,brandController.getEditBrand);
router.get("/editBrand/:id",adminAuth,brandController.getEditBrand);
router.post("/editBrand/:id", adminAuth, brandController.editBrand);
router.delete('/deleteBrand', adminAuth, brandController.deleteBrand);



router.get('/addProducts',adminAuth,productController.getProductAddPage);
router.post("/addProducts",adminAuth,uploads.array('images',3),productController.addProducts);
router.get('/products',adminAuth,productController.getAllProduct);
router.get('/blockProduct',adminAuth,productController.blockProduct);
router.get('/unblockProduct',adminAuth,productController.unblockProduct);
router.get('/editProduct',adminAuth,productController.getEditProduct);
router.post('/editProduct/:id',adminAuth,uploads.array('images',3),productController.editProduct);
//router.post('/deleteImage',adminAuth,productController.deleteSingleImage );
//router.delete('/deleteProduct', adminAuth, productController.deleteProduct);


module.exports = router;