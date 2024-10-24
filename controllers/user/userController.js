const mongoose = require("mongoose");
const User = require("../../models/userSchema");



const pageNotFound = async (req,res) =>{
    try{
        res.render("page-404");
    } catch(error){
        res.redirect("/pageNotFound");
    }
};


const loadHomepage = async (req,res)=>{
    try{
        return res.render("home");
    } catch(error){
        console.log("home page not found");
        res.status(500).send("Server error");
        
    }
}

const loadSignup = async (req,res) =>{
    try{
        return res.render('signup');
    } catch (error){
        console.log('signup page not loadding');
        res.status(500).send('Server Error');
        
    }
}

// const signup = async (req,res) =>{
//     const {name,email,phone,password} = req.body;
//     try{
//         const newUser = new User({name,email,phone,password});
//         await newUser.save();
//         console.log(newUser);
        
//         return res.redirect("/signup");

//     } catch (error){
//         console.log("error for save user",error);
//         res.status(500).send("internal server error");
        
//     }

// }

const signup = async (req, res) => {
    const { name, email,phone, password } = req.body;
    
    try {
      // Check if user with the email already exists
      const existingUser = await User.findOne({ email });
  
      if (existingUser) {
        return res.status(400).json({ message: 'Email already registered' });
      }
  
      // If the email does not exist, create a new user
      const newUser = new User({
        name,
        email,
        phone,
        password,
      });
  
      await newUser.save();
      res.status(201).json({ message: 'User created successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
      console.error(error);
    }
  };


module.exports = {
    loadHomepage,
    pageNotFound,
    loadSignup,
    signup,
}