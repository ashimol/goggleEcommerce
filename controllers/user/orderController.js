const User = require('../../models/userSchema');
const Product = require('../../models/productSchema');
const Category = require('../../models/categorySchema');
const Brand = require('../../models/brandSchema');
const Cart = require('../../models/cartSchema');
const Order = require('../../models/orderSchema');
const Address= require('../../models/addressSchema');

const env=require("dotenv").config();
const nodemailer=require("nodemailer");
const bcrypt=require("bcrypt");
const crypto = require('crypto');

const getCheckout = async (req, res) => {
    try {
        
        const cartId = req.params.id;
        
        const cartData = await Cart.findOne({ _id: cartId })
            .populate('items.productId')
            .populate('userId');
        
        if (!cartData) {
            return res.status(404).send('Cart not found');
        }

        const userId = cartData.userId._id;

        const userWithAddresses = await User.findById(userId).populate('address');

        const userAddresses = userWithAddresses.address;

        let totalPrice = 0;
        let totalDiscount = 0;
       // const shippingCost = 0; 
        let cartUpdated = false; 

          
          
          cartData.items.forEach(item => {
            const product = item.productId;
    
        
            const price = product.salePrice < product.regularPrice   ? product.salePrice  : product.regularPrice;  
    
            const discountAmount =  product.salePrice < product.regularPrice  ? product.regularPrice - product.salePrice  : 0;
    
            
            if (item.price !== price || item.discountAmount !== discountAmount) {
              item.price = price;
              item.discountAmount = discountAmount;
              item.regularPrice = product.regularPrice;
              cartUpdated = true; 
            }
    
            totalPrice += product.regularPrice * item.quantity;
            totalDiscount += discountAmount * item.quantity;

          });
    
             const subtotal = totalPrice - totalDiscount 

           //  const orderTotal = subtotal + shippingCost;
    
          
          if (cartUpdated) {
            await cartData.save();
          }


        res.render('checkout', {
            userId, 
            addresses: userAddresses,            
            firstName: cartData.userId.firstName,
            cartData,
            subtotal,
           // orderTotal,
            
        });
    } catch (error) {
        console.error("Error during checkout page load:", error);
        //res.redirect("/pageNotfound");
         res.status(500).send('An error occurred while loading the checkout page');
    }
};


const placeOrder = async (req, res) => {
    try {

        //const userId = req.session.userId; 
        
        const { userId, addressId, items,totalAmount, paymentMethod } = req.body;
        console.log(req.body);
        

        // Validate the data
        if (!userId || !addressId || !items || items.length === 0 || !paymentMethod) {
            return res.status(400).json({ message: 'All fields are required.' });
        }

        // Check if the address exists
        const address = await Address.findById(addressId);
        if (!address) {
            return res.status(404).json({ message: 'Address not found.' });
        }

        // Check if each product exists and calculate total price
        let orderItems = [];
        for (const item of items) {
            const product = await Product.findById(item.productId);
            if (!product) {
                return res.status(404).json({ message: `Product with ID ${item.productId} not found.` });
            }
            orderItems.push({
                productId: product._id,
                quantity: item.quantity,
                price: product.salePrice < product.regularPrice ? product.salePrice : product.regularPrice
            });
        }

        // Create the order
        const newOrder = new Order({
            userId,
            addressId,
            items: orderItems,
            totalAmount,
            paymentMethod
        });

        await newOrder.save();
        return res.status(201).json({ message: 'Order placed successfully.', order: newOrder });
    } catch (error) {
        console.error('Error placing order:', error);
        return res.status(500).json({ message: 'Internal server error.' });
    }
};


module.exports = {
    
    getCheckout,
    placeOrder

}