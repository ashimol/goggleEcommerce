const User = require("../../models/userSchema");
const Category = require('../../models/categorySchema');
const Product = require('../../models/productSchema');
const Brand = require('../../models/brandSchema');
const mongoose = require("mongoose");
const env = require("dotenv").config();
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const session = require('express-session');


const pageNotFound = async (req,res) =>{
    try{
        res.render("page-404");
    } catch(error){
        res.redirect("/pageNotFound");
    }
};


const loadHomepage = async (req, res) => {
    try {
        
      let userId;
  
      const categories = await Category.find({ isListed: true });
  
    //   const products = await Product.find({
    //     isBlocked: false,
    //     category: { $in: categories.map((category) => category._id) },
    //     // quantity: { $gt: 0 },
    //   });
  
    const products = await Product.find({
        isBlocked: false,
        category: { $in: categories.map((category) => category._id) },
      })
        .sort({ _id: -1 }) 
        .limit(4);        
      
       
      if (req.user) {
        userId = req.user;
      } else if (req.session.user) {
        userId = req.session.user;
      }
  
      if (userId) {
        // const userData = await User.findById(userId);
        const userData = await User.findById(userId)
        .populate({
            path: "cart",
            populate: {
                path: "items.productId", // Populate productId within items array
                model: "Product",       // Refers to the Product model
            },
        })
        .exec();

        return res.render("home", {
          user: userData,
          products,
     
        });
      } else {
        return res.render("home", {
          products,
          
        });
      }
    } catch (error) {
      console.log("Home page not found", error);
      res.status(500).send("Server error");
    }
  };
  



const loadSignup = async (req,res) =>{
    try{
        return res.render('signup');
    } catch (error){
        console.log('signup page not loadding');
        res.status(500).send('Server Error');
        
    }
}



function generateOtp(){
    //generating 6 digits otp
    return Math.floor(100000 +Math.random()*900000).toString();
}

async function sendVerificationEmail(email,otp){
    try {
       
        const transporter=nodemailer.createTransport({
            service:'gmail',
            port:587,
            secure:false,
            requireTLS:true,
            auth:{
                user:process.env.NODEMAILER_EMAIL,
                pass:process.env.NODEMAILER_PASSWORD
            }
        })

        const info=await transporter.sendMail({
            from:process.env.NODEMAILER_EMAIL,
            to:email,
            subject:"Verify your account",
            text:`Your OTP is :${otp}`,
            html:`<b>Your OTP :${otp}</b>`,

        })
        return info.accepted.length >0

    } catch (error) {
        console.error("Error sending email",error);
        return false;
    }
}


const signup=async(req,res)=>{ 
    try{
           const {name,phone,email,password,cPassword}=req.body;
           
           if(password !== cPassword){
            return res.render("signup",{message:"Passwords do not match"});
           }
         
        const findUser=await User.findOne({email});
         if(findUser){
            return res.render("signup",{message:"User with this email already exists"});   
         }
    
        const otp=generateOtp();
        console.log("Generated OTP:", otp); 

        const emailSent=await sendVerificationEmail(email,otp);
         if(!emailSent){
            return res.json({ message: "Error sending verification email. Please try again later." });

         }
         req.session.userOtp=otp;
         req.session.userData={name,phone,email,password};

         console.log(req.session.userData);
         
    
         res.render("verify-otp");
         console.log("OTP Sent",otp);
    }catch(error){
            console.error("signup error",error);
            res.redirect("/pageNotFound");
    }
}
    

const securePassword=async(password)=>{
        try {
             const passwordHash=await bcrypt.hash(password,10)
             return passwordHash;
        } catch (error) {

        }
}



const verifyOtp = async(req,res)=>{
    try {
     const {otp}=req.body;
     console.log("o1" ,otp);
     console.log(req.session.userOtp);

     if(otp===req.session.userOtp){
         const user=req.session.userData
         const passwordHash=await securePassword(user.password);
         
         const saveUserData=new User({
             name:user.name,
             email:user.email,
             phone:user.phone,
             password:passwordHash,
         })
         await saveUserData.save();
         req.session.user=saveUserData._id;
         res.json({success:true,redirectUrl:"/"})
     }else{
         res.status(400).json({success:false,message:"Invalid OTP,Please try again"})
     }
    } catch (error) {
     console.error("Error Verifying OTP",error);
     res.status(500).json({success:false,message:"An error occured"})
    }
 };




const resendOtp=async (req,res) =>{
    try{

        const {email} = req.session.userData;
        if(!email){
            return res.status(400).json({ success :false, message :"Email not found in session"});
        }

        const otp = generateOtp();
        req.session.userOtp = otp;
        
        const emailSent = await sendVerificationEmail(email,otp);
        if(emailSent){
            console.log("Resend OTP : ",otp);
            res.status(200). json({ success:true,message:"OTP Resend Successfully"});
            
        } else{
            console.error("Error resending otp :" ,error);
            
            res.status(500).json({success:false,message:"Failed to resend OTP, Please try again"});
        }

    }catch(error){

        console.error("Error resending OTP",error);
        res.status(500).json({ success:false,message: "Internal Server Error .Please try again"});
        
    }
};


const loadLogin = async (req,res) => {
    try{
        if(!req.session.user){
            return res.render("login");
        }else{
            res.redirect("/");
        }
    } catch (error) {
        res.redirect("/pageNotFound");
    }
};



const login=async(req,res)=>{
    try {
        const {email,password}=req.body;

        const user=await User.findOne({isAdmin:0,email:email});

        const categories = await Category.find({ isListed: true });
        const products = await Product.find({
            isBlocked: false,
            category: { $in: categories.map((category) => category._id) },
            // quantity: { $gt: 0 },
          });
      

        if(!user){
            return res.render("login",{message:"User not found"})
        }
        if(user.isBlocked){
            return res.render("login",{message:"User is blocked by admin"});
        }

        const passwordMatch = await bcrypt.compare(password,user.password);

        console.log("Entered password:", password); 
        console.log("Password match result:", passwordMatch);

        if(!passwordMatch){
            return res.render("login",{message:"Incorrect Password"})
        }
        req.session.user=user._id;
        console.log("Session user after login:", req.session.user);

        const userData = await User.findOne({isAdmin:0,email:email})
        .populate({
            path: "cart",
            populate: {
                path: "items.productId", // Populate productId within items array
                model: "Product",       // Refers to the Product model
            },
        })
        .exec();
        
        //res.redirect("/");    
        res.render('home',{user:userData,
            products});

    } catch (error) {
        console.error("login error",error);
        res.render("login",{message:"login failed.Please try again later"});
    }
}

  
// const loadShopping = async (req,res)=>{

//     try{

//         let userId ;
        
//         if (req.user) {
//             userId = req.user;
//         } else if (req.session.user) {
//             userId = req.session.user;
//         }

        
//         const categories = await Category.find({isListed:true});
//         const categoryId = categories.map( (category) =>category._id.toString());



//         const page= parseInt(req.query.page) || 1;
//         const limit =6;
//         const skip = (page-1)*limit;
//         const products = await Product.find({
//             isBlocked:false,
//             category:{$in:categoryId},
//             // quantity:{$gt:0},
//         })
//         .populate('brand')
//         .sort({createdOn : -1})
//         .skip(skip)
//         .limit(limit);


//         const totalProducts = await Product.countDocuments({
//             isBlocked:false,
//             category:{$in:categoryId},
//             // quantity:{$gt:0},
//         });

//         const totalPages = Math.ceil(totalProducts / limit);
//         const brands = await Brand.find({isBlocked:false});

//         const categoriesWithIds = categories.map(category =>({_id:category.id,name :category.name}));

//         console.log('userid :',userId);
        

//         if(userId){
//             const userData = await User.findById(userId);
//             console.log('user data :',userData);
            
//          res.render("shop",{
//             user:userData,
//             products:products,
//             category:categoriesWithIds,
//             brand:brands,
//             totalProducts:totalProducts,
//             currentPage:page,
//             totalPages:totalPages
//          });
//         }else{
//             res.render("shop",{
//                 //user:userData,
//                 products:products,
//                 category:categoriesWithIds,
//                 brand:brands,
//                 totalProducts:totalProducts,
//                 currentPage:page,
//                 totalPages:totalPages
//             });
//         }
//     } catch(error){
//         console.log("shopping page not found");
//         res.status(500).send("Server error");
        
//     }
// };

const loadShopping = async (req, res) => {
    try {
        let userId ;
        
        if (req.user) {
            userId = req.user;
        } else if (req.session.user) {
            userId = req.session.user;
        }
        // Get search query and sort option from request
        const searchQuery = req.query.searchQuery || "";
        const sortBy = req.query.sortBy || "";
        const selectedCategory = req.query.category || ""; 

       
        const page = parseInt(req.query.page) || 1;
        const limit = 8;
        const skip = (page - 1) * limit;

       
        let searchCondition = { isBlocked: false };

        
        if (searchQuery.trim() !== "") {
            const regex = new RegExp(searchQuery, "i");
            searchCondition.$or = [
                { productName: regex },
                { description: regex },
                
            ];
        }

        if (selectedCategory) {
            searchCondition.category = selectedCategory;
        }

       
        let sortOptions = {};
        switch (sortBy) {
            case "priceLowToHigh":
                sortOptions = { salePrice: 1 };
                break;
            case "priceHighToLow":
                sortOptions = { salePrice: -1 };
                break;
            case "aToZ":
                sortOptions = { productName: 1 };
                break;
            case "zToA":
                sortOptions = { productName: -1 };
                break;
            default:
                sortOptions = {}; 
        }

        
        const products = await Product.find(searchCondition)
            .populate("category")  
            .populate("brand")     
            .sort(sortOptions)
            .skip(skip)
            .limit(limit)
            .select({
                productName: 1,
                salePrice: 1,
                regularPrice: 1,
                productImage: 1,
                brand: 1,
                category: 1,
                status: 1
            })
            .lean();

        
        const totalProducts = await Product.countDocuments(searchCondition);
        const totalPages = Math.ceil(totalProducts / limit);

       
        const categories = await Category.find({ isListed: true })
            .sort(sortOptions)
            .skip(skip)
            .limit(limit)
            .select("name")
            .lean();

            if(userId){
                const userData = await User.findById(userId)
                .populate({
                    path: "cart",
                    populate: {
                        path: "items.productId", 
                        model: "Product",       
                    },
                })
                .exec();
               
                            
        res.render("shop", {
            user:userData,
            products,
            categories,
            currentPage: page,
            totalPages,
            searchQuery,
            selectedCategory,
            sortBy,
            message: products.length === 0 ? "No products found." : "",
            metadata: {
                totalProducts,
                currentSort: sortBy,
                resultsPerPage: limit
            }
        });
        }else{

            res.render("shop", {
                products,
                categories,
                currentPage: page,
                totalPages,
                searchQuery,
                selectedCategory,
                sortBy,
                message: products.length === 0 ? "No products found." : "",
                metadata: {
                    totalProducts,
                    currentSort: sortBy,
                    resultsPerPage: limit
                }
            });
        }
        

    } catch (error) {
        console.error("Shop page error:", error);
        res.status(500).send("An error occurred while loading the shop page");
    }
};

// const filterProducts  = async (req,res) =>{
//     try {
        
//         const user = req.session.user;
//         const category = req.query.category;
//         const brand = req.query.brand;

//         const findCategory = category ? await Category.findOne({_id:category}) : null;
//         const findBrand = brand ? await Brand.findOne({_id:brand}):null;
//         const brands = await Brand.find({}).lean();

//         const query = {
//             isBlocked:false,
//            // quantity:{$gt:0}
//         }

//         if(findCategory ){
//             //query.Category = findCategory._id;
//             query.category = findCategory._id; 

//         }
//         if(findBrand){
//             query.brand = findBrand._id;
//         }

//         let findProducts = await Product.find(query).lean();

//         findProducts.sort((a,b) =>new Date(b.createdOn)-new Date(a.createdOn));

//         const categories = await Category.find({isListed:true});


//         let itemsPerPage= 6;
//         let currentPage = parseInt(req.query.page) || 1;
//         let startIndex = (currentPage -1)*itemsPerPage;
//         let endIndex =startIndex+itemsPerPage;
//         let totalPages = Math.ceil(findProducts.length / itemsPerPage);
//         let currentProduct = findProducts.slice(startIndex,endIndex);

//         let userData = null;

//         if(user){
//             userData = await User.findOne({_id:user});
//             if(userData){
//                 const searchEntry = {
//                     category:findCategory ? findCategory._id : null,
//                     brand : findBrand ? findBrand.name :null,
//                     searchedOn : new Date(),

//                 }
//                 userData.searchHistory.push(searchEntry);
//                 await userData.save();
//             }
//         }

//         req.session.filteredProducts = currentProduct;

//         res.render('shop',{
//             user:userData,
//             products:currentProduct,
//             category:categories,
//             brand:brands,
//             totalPages,
//             currentPage,
//             selectedCategory:category || null,
//             selectedBrand :brand || null,

//         })

//     } catch (error) {
//         console.error('Error in filterProducts:', error); 
//         res.redirect('/pageNotFound');
        
//     }
// }


// const filterByPrice = async (req,res) =>{
//     try {
        
//         const user = req.session.user;
//         const userData = await User.findOne({_id:user});
//         const brands = await Brand.find({}).lean();

//         const categories= await Category.find({isListed:true}).lean();

//         let findProducts = await Product .find({
//             salePrice:{$gt:req.query.gt,$lt:req.query.lt},
//             isBlocked:false,
//            // quantity:{$gt :0},
//         }).lean();

//         findProducts.sort((a,b) => new Date(b.createdOn) - new Date(a.createdOn));

//         let itemsPerPage= 6;
//         let currentPage = parseInt(req.query.page) || 1;
//         let startIndex = (currentPage -1)*itemsPerPage;
//         let endIndex =startIndex + itemsPerPage;
//         let totalPages = Math.ceil(findProducts.length / itemsPerPage);
//         let currentProduct = findProducts.slice(startIndex,endIndex);

//         req.session.filteredProducts = findProducts;

//         res.render('shop',{
//             user:userData,
//             products:currentProduct,
//             category:categories,
//             brand:brands,
//             totalPages,
//             currentPage,
//             selectedCategory:categories || null,

//         })


//     } catch (error) {
        
//         console.error(error);
//         res.redirect('/pageNotFound')
        
//     }
// }


// const searchProducts = async (req,res) =>{

//     try {
//         const user = req.session.user;
//         const userData = await User.findOne({_id:user});
//         const search = req.body.query;

//         const brands = await Brand.find({}).lean();
//         const categories = await Category.find({isListed:true}).lean();
//         const categoryIds = categories.map(category =>category._id.toString());

//         let searchResult = [];

//         if(req.session.filteredProducts && req.session.filteredProducts.length>0){
//             searchResult = req.session.filteredProducts.filter(product => 
//                 product.productName.toLowerCase().includes(search.toLowerCase())
//             )
//         }else{
//             searchResult = await Product.find({
//                 productName:{$regex:'.*'+search+'.*',$options:'i'},
//                 isBlocked:false,
//                // quantity:{$gt:0},
//                 category:{$in:categoryIds}
//             })
//         }
//         searchResult.sort( (a,b) => new Date(b.createdOn) - new Date(a.createdOn));
        
//         let itemsPerPage= 6;
//         let currentPage = parseInt(req.query.page) || 1;
//         let startIndex = (currentPage -1)*itemsPerPage;
//         let endIndex =startIndex + itemsPerPage;
//         let totalPages = Math.ceil(searchResult.length / itemsPerPage);
//         let currentProduct = searchResult.slice(startIndex,endIndex);

//         res.render('shop',{
//             user:userData,
//             products:currentProduct,
//             category:categories,
//             brand:brands,
//             totalPages,
//             currentPage,
//             count:searchResult.length,
//         })

        
//     } catch (error) {
    
//         console.error(error);
//         res.redirect('/pageNotFound');
        
//     }
// }

// const logout=async (req,res)=>{
//     try {
//         req.session.destroy((err)=>{
//             if (err){
//                console.log("session destruction error",err.message);
//                return res.redirect("pageNotFound");
//             }
//             return res.redirect("/");
//         })
//     } catch (error) {
//         console.log("Logout error",error);
//         res.redirect("pageNotFound")
//     }
// };

const logout = async (req, res) => {
    // try {
    //     if (req.session.user || req.user) {
    //         req.session.user = null; 
    //     }
    
    //     // Optionally clear the session cookie for the user
    //     res.clearCookie('connect.sid');
    
    //     // Redirect or send a response
    //     res.redirect('/login'); // Redirect to login page or another page
    // } catch (error) {
    //     console.log("Logout error:", error.message);
    //     res.redirect("pageNotFound");
    // }

    try {
        req.session.destroy((err) => {
          if (err) {
            console.log("Session destruction error", err.message);
            return res.redirect("/pageNotFound");
          }
          
          return res.redirect("/login");
        });
      } catch (error) {
        console.log("logout error", error);
        // next(error);
      }
};





const productDetails = async (req, res) => {
    try {
        const productId = req.params.id;
        let userId ;
        
        if (req.user) {
            userId = req.user;
          } else if (req.session.user) {
            userId = req.session.user;
          }

          console.log('user id :',userId);
          
        const products = await Product.findById(productId).populate('category').populate('brand').lean().exec();

        if (userId) {
            const userData = await User.findById(userId)
            .populate({
                path: "cart",
                populate: {
                    path: "items.productId", 
                    model: "Product",       
                },
            })
            .exec();
            
            return res.render("product-details", {
              user: userData,
              products,
         
            });
          } else {
            return res.render("product-details", {
              products,
              
            });
          }
       
        // if (!product) {
        //     return res.status(404).send('Product not found');
        // }
        // if (!product.category || !product.category.isListed) {
        //     return res.status(403).send('This product is under an unlisted category.');
        // }

         
        // res.render('product-details', { product});
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
};




module.exports = {
    loadHomepage,
    pageNotFound,
    loadSignup,
    signup,
    verifyOtp,
    resendOtp,
    loadLogin,
    login,
    loadShopping,
    logout,
    productDetails,
    // filterProducts ,
    // filterByPrice,
    // searchProducts,
    
}