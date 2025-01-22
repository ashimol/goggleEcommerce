const User=require("../../models/userSchema");
const Cart = require('../../models/cartSchema');
const nodemailer=require("nodemailer");
const bcrypt=require("bcrypt");
const env=require("dotenv").config();
const session=require("express-session");



const userprofile = async (req,res) =>{
    try {
        let userId ;
        
        if (req.user) {
            userId = req.user;
        } else if (req.session.user) {
            userId = req.session.user;
        }

        //const userData = await User.findById(userId);
        const userData = await User.findById(userId)
        .populate({
            path: "cart",
            populate: {
                path: "items.productId", // Populate productId within items array
                model: "Product",       // Refers to the Product model
            },
        })
        .exec();
    
        console.log("User with Populated Cart:", userData);
    

        res.render('profile',{
            user:userData,
        })

    } catch (error) {
        console.error("Error for retrive profile data :" , error);
        res.redirect('/pageNotFound');
        
    }

}

const userAccount = async (req,res,next) => {

    try {
        let userId ;
        
        if (req.user) {
            userId = req.user;
        } else if (req.session.user) {
            userId = req.session.user;
        }
        //const user = await User.findById(userId);
        const user = await User.findById(userId)
        .populate({
            path: "cart",
            populate: {
                path: "items.productId", 
                model: "Product",       
            },
        })
        .exec();
        
        res.render("user-account-edit", {user});


    } catch (error) {
        next(error)
    }

}

const editUser = async (req,res) =>{

    try {

        const id = req.params.id;
        const {name,email,mobile} = req.body;
        
        const user = await User.findById(id);
        if(!user){

            return res.status(400).json({error:"User not found"});
        }

        if(user.googleId){
            return res.status(400).json({message: "You can update contact details from Google or update them in the address  fileld."});
        }

        //const phoneNum = await User.findOne({phone:mobile});
        
        // if (phoneNum) {
        //     return res.status(400).json({ message: "Mobile number already exists" });
        // }
        

        const updatedUser = await User.findByIdAndUpdate(id,{
            name,
            email,
            phone:mobile
        },{new:true});
       

        if(updatedUser){
            console.log("update usere succesfullly");
            
            return res.status(200).json({success:"Details updated succesfully"});
        }else{
            console.log("user not found");
            
            return res.status(404).json({error:"User not found"})
        }
        
    } catch (error) {

        console.error("Error updaing user",error)
        
    }
}

function generateOtp(){
    const digits="1234567890";
    let otp="";
    for(let i=0;i<6;i++){
        otp+=digits[Math.floor(Math.random()*10)];    
    }
    return otp;
}

const sendVerificationEmail=async(email,otp)=>{
    try {
        const transporter=nodemailer.createTransport({
            service:"gmail",
            port:587,
            secure:false,
            requireTLS:true,
            auth:{
                user:process.env.NODEMAILER_EMAIL,
                pass:process.env.NODEMAILER_PASSWORD,     
            }
        })
         const mailOptions={
            from:process.env.NODEMAILER_EMAIL,
            to:email,
            subject:"Your OTP for password reset",
            text:`Your OTP is ${otp}`,
            html:`<b><h4>Your OTP: ${otp}</h4><br></b>`
         }
         const info=await transporter.sendMail(mailOptions);
         console.log("Email sent:",info.messageId);
         return true;
    } catch (error) {
        
        console.error("Error sending email",error);
        return false;
    }
}

const securePassword=async(password)=>{
    try {
       const passwordHash=await bcrypt.hash(password,10);
       return passwordHash; 
    } catch (error) {
        
    }
}

const getForgotPassPage=async(req,res)=>{
    try {
        res.render("forgot-password");
    } catch (error) {
        res.redirect("/pageNotFound");
    }
}

const forgotEmailValid=async(req,res)=>{
    try {
        const {email}=req.body;
        const findUser=await User.findOne({email:email});
        if(findUser){
            const otp=generateOtp();
            const emailSent=await sendVerificationEmail(email,otp);
             if(emailSent){
                req.session.userOtp=otp;
                req.session.email=email;
                res.render("forgotPass-otp");
                console.log("OTP",otp);           
             }else{
                res.json({success:false,message:"Failed to send OTP.Please try again"});
             }
        }else{
            res.render("forgot-password",{
                message:"User with this email doesnot exist"
            });

        }
    } catch (error) {
        res.redirect("/pageNotFound");
    }
}

const verifyForgotPassOtp=async(req,res)=>{
    try {
        const enteredOtp=req.body.otp;
        if(enteredOtp===req.session.userOtp){
            res.json({success:true,redirectUrl:"/reset-password"})
        }else{
            res.json({success:false,message:"OTP not matching"});
        }
    } catch (error) {
        res.status(500).json({success:false,message:"An error occured.Please try again"});   
    }
}

const getResetPassPage=async(req,res)=>{
    try {
        res.render("reset-password");
    } catch (error) {
        res.redirect("/pageNotFound");
    }
}

const resendOtp=async(req,res)=>{
 try {
    const otp=generateOtp();
    req.session.userOtp=otp;
    const email=req.session.email;
    console.log("resending OTP to email: ",email);
    const emailSent=await sendVerificationEmail(email,otp);
    if(emailSent){
          console.log("Resend OTP:",otp);
          res.status(200).json({success:true,message:"Resend OTP Successful"});
          
    }

 } catch (error) {
    console.error("Error in resend otp",error);
    res.status(500).json({success:false,message:'Internal Server Error'});
 }
}

const postNewPassword=async(req,res)=>{
    try {
        const {newPass1,newPass2}=req.body;
        const email=req.session.email;
        if(newPass1===newPass2){
            const passwordHash=await securePassword(newPass1);
            await User.updateOne(
                {email:email},
                {$set:{password:passwordHash}}
            )
            res.redirect("/login");
        }else{
            res.render("reset-password",{message:'Passwords do not match'});   
        }
    } catch (error) {
        res.redirect("/pageNotFound");
    }
}

module.exports = {
    userprofile,
    editUser,
    userAccount,
    getForgotPassPage, 
    forgotEmailValid, 
    verifyForgotPassOtp,
    getResetPassPage,
    resendOtp,
    postNewPassword,

}