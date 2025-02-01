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
                path: "items.productId", 
                model: "Product",      
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
                path: "items.productId", 
                model: "Product",       
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
  

const loadShopping = async (req, res) => {
    try {

        
        let userId = req.user || req.session.user;

        
        const searchQuery = req.query.searchQuery?.trim() || "";
        const sortBy = req.query.sortBy || "";

        
        const selectedCategory = req.query.category === 'all' ? '' : (req.query.category || req.session.lastCategory || "");
        const page = parseInt(req.query.page) || 1;
        const limit = 8;
        const skip = (page - 1) * limit;

        
        req.session.lastCategory = selectedCategory;

       
        let searchCondition = { isBlocked: false };

       
        if (searchQuery !== "") {
            const regex = new RegExp(searchQuery, "i");
            searchCondition.$or = [
                { productName: regex }               
            ];
        }

        
        if (selectedCategory && selectedCategory !== ' ') {
            searchCondition.category = selectedCategory;
        } else {
            
            const listedCategories = await Category.find({ isListed: true })
                .select("_id")
                .lean();
            searchCondition.category = { 
                $in: listedCategories.map(cat => cat._id) 
            };
        }

        
        const sortOptions = {
            priceLowToHigh: { salePrice: 1 },
            priceHighToLow: { salePrice: -1 },
            aToZ: { productName: 1 },
            zToA: { productName: -1 }
        }[sortBy] || { createdAt: -1 }; 

        
        req.session.filterState = {
            searchQuery,
            selectedCategory,
            sortBy,
            page
        };

        
        const [products, totalProducts, categories] = await Promise.all([
            Product.find(searchCondition)
                .populate("category")
                .populate("brand")
                .sort(sortOptions)
                .skip(skip)
                .limit(limit)
                .lean(),
            Product.countDocuments(searchCondition),
            Category.find({ isListed: true })
                .select("name")
                .lean()
        ]);

        const totalPages = Math.ceil(totalProducts / limit);

        
        const userData = userId ? 
            await User.findById(userId)
                .populate({
                    path: "cart",
                    populate: {
                        path: "items.productId",
                        model: "Product"
                    }
                })
                .lean() : null;

        
        const responseData = {
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
                resultsPerPage: limit,
                appliedFilters: {
                    category: selectedCategory,
                    search: searchQuery,
                    sort: sortBy
                }
            }
        };

       
        if (userData) {
            responseData.user = userData;
        }

        res.render("shop", responseData);

    } catch (error) {
        console.error("Shop page error:", error);
        res.status(500).send("An error occurred while loading the shop page");
    }
};


const logout = async (req, res) => {
    

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
        
}