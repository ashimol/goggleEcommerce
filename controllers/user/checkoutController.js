const User = require('../../models/userSchema');
const Product = require('../../models/productSchema');
const Category = require('../../models/categorySchema');
const Brand = require('../../models/brandSchema');
const Cart = require('../../models/cartSchema');


const getCheckout = async (req,res) =>{

    const checkoutData = req.session.checkoutData;

    if (!checkoutData) {
        return res.redirect('/cart'); // Redirect back if no data
    }

    res.render('checkout', { checkoutData });

}

const addToCheckout = async (req,res) =>{
    try {
        const { totalPrice, totalDiscount, deliveryCharges, address } = req.body;
        req.session.checkoutData = {
            totalPrice,
            totalDiscount,
            deliveryCharges,
        //    address: JSON.parse(address), // Convert back to object
        };
    
        // Redirect to the checkout page
        res.redirect('/checkout-page');

    } catch (error) {

        console.error('Error adding to checkuot:', error);
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
        
    }
}


module.exports = {
    
    getCheckout,
    addToCheckout,

}