const User = require("../../models/userSchema");
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const session=require('express-session');

const customerInfo  = async (req, res) => {
    try {
      let search = "";
      if (req.query.search) {
        search = req.query.search; 
        console.log(search);
        
      }
  
      let page = 1;
      if (req.query.page) {
        page = req.query.page;
      }
  
      const limit = 5;
      
      const userData = await User.find({
        isAdmin: false,  
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ],
      })
        .limit(limit * 1) 
        .skip((page - 1) * limit)  
        .exec();
      console.log("user date " ,userData);
      
      
      const count = await User.find({
        isAdmin: false,
        $or: [
          { name: { $regex: "." + search + ".", $options: 'i' } },
          { email: { $regex: "." + search + ".", $options: 'i' } },
        ],
      }).countDocuments();
  
      
      res.render("customers", {
        data: userData,        
        totalPages: Math.ceil(count / limit),  
        currentPage: parseInt(page),  
        search: search        
      });
  
    } catch (error) {
      console.log("Error in user management page", error);
      res.redirect("/pageError"); 
    }
  };


  const customerBlocked = async (req,res) =>{
    try {
      let id = req.query.id;
      await User.updateOne({_id:id},{$set :{isBlocked:true}});
      res.redirect('/admin/users');
    } catch (error) {
      res.redirect('/pageerror');
      
    }
  };


 const customerunBlocked =async (req,res) =>{
  try {
    let id =req.query.id;
    await User.updateOne({_id:id},{$set:{isBlocked:false}});
    res.redirect('/admin/users');

  } catch (error) {
    res.redirect('pageerror');
  }
 };
  

module.exports={
    customerInfo,
    customerBlocked,
    customerunBlocked,

}