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
                    //req.session.user = null;
                    return res.render("login", {
                        message: "Your account is blocked by admin",
                    });
                } else {
                    res.redirect('/logout');
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

    try{
        if(req.session.admin){
            next();
        }
        else{
            res.redirect("/admin/login");
        }
    }catch(error){
        console.log("Error in admin auth middleware",error);
        res.status(500).send("Internal Server error")
        

    }
    
    
}

// const  adminAuth = (req,res,next)=>{
//     User.findOne({isAdmin:true})
//     .then(data=>{
//         if(data && req.session.admin){
           
//             next();
            
//         }else{
//             res.redirect("/admin/login")
//         }
//     })
//     .catch(error=>{
//         console.log("Error in admin auth middleware",error);
//         res.status(500).send("Internal Server error")
//     })
// }


module.exports = {
    userAuth,
    adminAuth
}


