const User = require("../models/userSchema");


const userAuth = (req, res, next) => {

    if (req.session.user  || req.user) {
    
        if(req.user){
            req.session.user = req.user;
        }
        

        User.findById(req.session.user)
            .then(user => {
                if (user && !user.isBlocked) {
                    next();
                } else if (user && user.isBlocked) {
                    req.session.user = null;
                    return res.render("login", {
                        message: "Your account is blocked by admin",
                    });
                } else {
                    res.redirect('/login');
                }
            })
            .catch(err => {
                console.log("Error in user authentication middleware", err);
                res.status(500).send("Internal Server Error");
            });
    } else {
        next();
    }
};





const  adminAuth = (req,res,next)=>{
    User.findOne({isAdmin:true})
    .then(data=>{
        if(data && req.session.admin){
            // console.log("The user exist")
        next();
        }else{
            res.redirect("/admin/login")
        }
    })
    .catch(error=>{
        console.log("Error in admin auth middleware",error);
        res.status(500).send("Internal Server error")
    })
}


module.exports = {
    userAuth,
    adminAuth
}


// const User = require("../models/userSchema");

// const userAuth = (req,res,next) => {
//     if(req.session.user){
//         User.findById(req.session.user)
//         .then(data => {
//             if(data && !data.isBlocked){
//                 next();
//             }else{
//                 res.redirect('/login')
//             }
//         }) 
//         .catch (error => {
//             console.log('Error in user auth middileware');
//             res.status(500).send("Internal Server Error");
            
//         }) 
//     }else{
//         res.redirect('/login');
//     }
// }


// const adminAuth = (req,res,next) =>{
//     User.findOne({isAdmin:true})
//     .then(data => {
//         if(data){
//             next();
//         }else{
//             res.redirect('/admin/login');
//         }
//     })
//     .catch(error =>{
//         console.log("Error in Admin auth middileware",error);
//         res.status(500).send('Internal Server ERror');
        
//     })
// }

// module.exports = {
//     userAuth,
//     adminAuth
// }