const User = require("../../models/userSchema");
const nodemailer = require("nodemailer");
const session = require("express-session");


const userprofile = async (req,res) =>{
    try {
        let userId ;
        
        if (req.user) {
            userId = req.user;
        } else if (req.session.user) {
            userId = req.session.user;
        }

        const userData = await User.findById(userId);

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
        const user = await User.findById(userId);
        
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

        const phoneNum = await User.findOne({phone:mobile});
        
        if (phoneNum) {
            return res.status(400).json({ message: "Mobile number already exists" });
        }
        

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




module.exports = {
    userprofile,
    editUser,
    userAccount,

}