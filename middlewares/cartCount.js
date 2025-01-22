const User = require("../models/userSchema");


const cartCount = async (req, res, next) => {

    try {
        const userId = req.session.user || req.user;

        if (userId) {
            
            //const user = await User.findById(userId).populate('cart').exec();

            const userCartData = await User.findById(userId)
            .populate({
                path: "cart",
                populate: {
                    path: "items", // Populate productId within items array
                          
                },
            })
            .exec();

            if (userCartData) {
                if (!userCartData.isBlocked) {
                    
                    res.locals.user = userCartData;

                
                    if (!userCartData.cart) {
                        userCartData.cart = { items: [] }; 
                    } else if (!userCartData.cart.items) {
                        userCartData.cart.items = []; 
                    }

                    return next();  
                } else {
                    console.log("User is blocked:", userId);
                    return res.render("login");  
                }
            } else {
                console.log("User not found in database:", userId);
                return res.redirect("/login");  
            }
        } else {
            return res.redirect("/login");  
        }
    } catch (error) {
        console.error("Error in cart population middleware:", error);
        return next(error);
    }
};


module.exports = {
    cartCount
}