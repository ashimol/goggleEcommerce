const User = require("../../models/userSchema");
const Category = require('../../models/categorySchema');
const Product = require('../../models/productSchema');
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
        quantity: { $gt: 0 },
      });
  
       
      if (req.user) {
        userId = req.user;
      } else if (req.session.user) {
        userId = req.session.user;
      }
  
      if (userId) {
        const userData = await User.findById(userId);

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
     console.log(otp);
     
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
            quantity: { $gt: 0 },
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

        //res.redirect("/");    
        res.render('home',{user:user,
            products});

    } catch (error) {
        console.error("login error",error);
        res.render("login",{message:"login failed.Please try again later"});
    }
}

  
const loadShopping = async (req,res)=>{
    try{
        return res.render("shop");
    } catch(error){
        console.log("home page not found");
        res.status(500).send("Server error");
        
    }
};


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
    try {
        if (req.session.user) {
            req.session.user = null; // Or use req.session.destroy() if needed
        }
    
        // Optionally clear the session cookie for the user
        res.clearCookie('connect.sid');
    
        // Redirect or send a response
        res.redirect('/login'); // Redirect to login page or another page
    } catch (error) {
        console.log("Logout error:", error.message);
        res.redirect("pageNotFound");
    }
};



// const productDetails = async (req, res) => {
//     try {
//         const productId = req.params.id;
//         const userId = req.session.user || req.user; 
        
//         // console.log('Session:', req.session);
//         // console.log('User ID:', userId);

//         // if (!userId) {
//         //     return res.status(401).json({ success: false, message: 'Please login' });
            
//         // }
       

//         const product = await Product.findById(productId).populate('category').lean().exec();
       
//         if (!product) {
//             return res.status(404).send('Product not found');
//         }
//         if (!product.category || !product.category.isListed) {
//             return res.status(403).send('This product is under an unlisted category.');
//         }

         
//         res.render('product-details', { product});
//     } catch (error) {
//         console.error(error);
//         res.status(500).send('Internal Server Error');
//     }
// };

const productDetails = async (req, res) => {
    try {
        const productId = req.params.id;
        let userId ;
        
        if (req.user) {
            userId = req.user;
          } else if (req.session.user) {
            userId = req.session.user;
          }
        const products = await Product.findById(productId).populate('category').lean().exec();

        if (userId) {
            const userData = await User.findById(userId);
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
    
}