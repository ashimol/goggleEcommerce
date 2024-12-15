const User = require('../../models/userSchema');
const Product = require('../../models/productSchema');
const Category = require('../../models/categorySchema');
const Brand = require('../../models/brandSchema');
const Cart = require('../../models/cartSchema');
const Order = require('../../models/orderSchema');
const Address= require('../../models/addressSchema');
const mongoose = require('mongoose');

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


// const placeOrder = async (req, res) => {
//     try {

//         //const userId = req.session.userId; 
        
//         const { userId, addressId, items,totalAmount, paymentMethod } = req.body;
//         console.log(req.body);
        

//         // Validate the data
//         if (!userId || !addressId || !items || items.length === 0 || !paymentMethod) {
//             return res.status(400).json({ message: 'All fields are required.' });
//         }

//         // Check if the address exists
//         const address = await Address.findById(addressId);
//         if (!address) {
//             return res.status(404).json({ message: 'Address not found.' });

//         }

        

//         // Check if each product exists and calculate total price
//         let orderItems = [];
//         for (const item of items) {
//             const product = await Product.findById(item.productId);
//             if (!product) {
//                 return res.status(404).json({ message: `Product with ID ${item.productId} not found.` });
//             }
//             orderItems.push({
//                 productId: product._id,
//                 quantity: item.quantity,
//                 price: product.salePrice < product.regularPrice ? product.salePrice : product.regularPrice
//             });
//         }

        
//         const newOrder = new Order({
//             userId,
//             addressId,
//             items: orderItems,
//             totalAmount,
//             paymentMethod
//         });

//         await newOrder.save();
       
//         return res.render('order-confirmation')

//         //return res.status(201).json({ message: 'Order placed successfully.', order: newOrder });
//     } catch (error) {
//         console.error('Error placing order:', error);
//         return res.status(500).json({ message: 'Internal server error.' });
//     }
// };


const placeOrder = async (req, res) => {
    try {
        const { userId, addressId, items, totalAmount, paymentMethod } = req.body;
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

        // Create a new order
        const newOrder = new Order({
            userId,
            addressId,
            items: orderItems,
            totalAmount,
            paymentMethod
        });

        // Save the order
        await newOrder.save();

        // Remove items from the cart
        const cart = await Cart.findOne({ userId }); // Assuming you have a Cart model
        if (cart) {
            // Remove the ordered items from the cart
            cart.items = cart.items.filter(cartItem => 
                !items.some(orderItem => orderItem.productId.toString() === cartItem.productId.toString())
            );
            await cart.save();
        }

        // Render order confirmation page
        return res.render('order-confirmation', { order: newOrder });

    } catch (error) {
        console.error('Error placing order:', error);
        return res.status(500).json({ message: 'Internal server error.' });
    }
};


const orderConfirmation=async (req, res) => {
    try {
       return res.render('orderConfirmation');
    } catch (error) {
        console.error(error);
        res.redirect("/pageNotfound");
      }
}

const getMyOrders = async (req, res) => {
    try {
        
        let userId;
        if (req.user) {
            userId = req.user._id;
        } else if (req.session.user) {
            userId = req.session.user._id;
        }

       
        if (!userId) {
            return res.status(401).render('my-orders', { 
                orders: [], 
                currentPage: 1, 
                totalPages: 0,
                error: "Please log in to view your orders" 
            });
        }

        // Pagination
        const page = parseInt(req.query.page) || 1;
        const limit = 3; 
        const skip = (page - 1) * limit;

        const totalOrders = await Order.countDocuments({ userId });
        
        const orders = await Order.find({ userId })
            .populate('items.productId')
            .sort({ orderDate: -1 })
            .skip(skip)
            .limit(limit);

        
        const totalPages = Math.ceil(totalOrders / limit);

       
        res.render('my-orders', {
            orders,
            currentPage: page,
            totalPages
        });

    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).render('my-orders', { 
            orders: [], 
            currentPage: 1, 
            totalPages: 0,
            error: "An error occurred while fetching orders" 
        });
    }
};

const getOrderDetails = async (req,res) =>{
    try {
        // Determine the user ID
        let userId;
        if (req.user) {
            userId = req.user._id;
        } else if (req.session.user) {
            userId = req.session.user._id;
        }

        // Check if user is authenticated
        if (!userId) {
            return res.status(401).render('order-details', { 
                order: null,
                error: "Please log in to view order details" 
            });
        }

        // Get the order ID from the request parameters
        const orderId = req.params.orderId;
        console.log('orderid : ',orderId);
        

        // Find the order for the user
        const order = await Order.findOne({ orderId: orderId, userId })
            .populate('addressId')
            .populate('items.productId');

        if (!order) {
            return res.status(404).render('order-details', { 
                order: null,
                error: "Order not found" 
            });
        }

        // Render the order details page
        res.render('order-details', { order });

    } catch (error) {
        console.error('Error fetching order details:', error);
        res.status(500).render('order-details', { 
            order: null,
            error: "An error occurred while fetching order details" 
        });
    }

}


const cancelOrder = async (req,res) => {


    try {
        const orderId = req.params.orderId;
        const userSession = req.session.user || req.user; 
    
        if (!userSession) {
          return res.status(401).json({ message: "User not authenticated" });
        }
    
        
        const order = await Order.findOne({orderId : orderId, userId: userSession._id })
          .populate("items.productId");
    
        if (!order) {
          return res.status(404).json({ message: "Order not found" });
        }
    
        
        if (order.status === "Cancelled" || order.status === "Delivered") {
          return res.status(400).json({ message: "Cannot cancel this order" });
        }
    
        
        order.status = "Cancelled";
        await order.save();
    
       
        for (const item of order.items) {
          await Product.findOneAndUpdate(
            { _id: item.productId },
            { $inc: { "quantity": item.quantity } }
          );
        }
    
      
        const user = await User.findById(userSession._id);
        if (!user) {
          return res.status(404).send("User not found");
        }
    
        
        res.status(200).json({ message: "Order cancelled successfully" });
    
      } catch (error) {
        console.error("Error cancelling order:", error);
        res.status(500).json({ message: "Internal Server Error" });
      }
  
}

module.exports = {
    
    getCheckout,
    placeOrder,
    orderConfirmation,
    getMyOrders,
    getOrderDetails,
    cancelOrder,
}