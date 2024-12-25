const User = require('../../models/userSchema');
const Product = require('../../models/productSchema');
const Category = require('../../models/categorySchema');
const Brand = require('../../models/brandSchema');
const Cart = require('../../models/cartSchema');
const Order = require('../../models/orderSchema');
const Address= require('../../models/addressSchema');
const Coupon=require("../../models/couponSchema");
const Wallet=require("../../models/walletSchema");
const mongoose = require('mongoose');
const razorpay = require('../../config/razorPay'); 

const env=require("dotenv").config();
const nodemailer=require("nodemailer");
const bcrypt=require("bcrypt");
const crypto = require('crypto');
const { console } = require('inspector');

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

        const coupons = await Coupon.find({ status: "Active" }); 
          
          
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
            coupons
           // orderTotal,
            
        });
    } catch (error) {
        console.error("Error during checkout page load:", error);
        //res.redirect("/pageNotfound");
         res.status(500).send('An error occurred while loading the checkout page');
    }
};

const applyCoupon = async (req, res) => {
    
    try {
        const { couponId } = req.body; 
        const userId = req.session.user || req.user;
        const cart = await Cart.findOne({ userId: userId }).populate('items.productId').exec();
    
        if (!cart || !cart.items || cart.items.length === 0) {
          return res.status(400).json({ message: "Your cart is empty" });
        }
    
        const coupon = await Coupon.findById(couponId);
        console.log("coupon value :" ,coupon.discountValue);
        
        if (!coupon) {
          return res.status(404).json({ message: "Coupon not found" });
        }
    
      
        const today = new Date();
        if (today > coupon.endDate) {
          return res.status(400).json({ message: "Coupon has expired" });
        }
    
      
        const usedCoupon = await Order.findOne({ user: userId, coupon: couponId });
        if (usedCoupon) {
          return res.status(400).json({ message: "Coupon has already been used. Please try another one." });
        }
    
        const cartTotal = cart.items.reduce((total, item) => {
            return total + (item.productId.salePrice * item.quantity);
        }, 0);

        console.log("cart total :",cartTotal);
        

          
        // cart.items.forEach(item => {
        //   totalPrice += item.productId.regularPrice * item.quantity;
        //   totalDiscount += item.discountAmount * item.quantity; 
        // });
          
        //const netAmount = totalPrice - totalDiscount;
       
        if (cartTotal < coupon.minPurchaseAmount) {
            return res.status(400).json({ message: `Minimum purchase amount is ${coupon.minPurchaseAmount} for this coupon.` });
          }
          
          if (cartTotal > coupon.maxPurchaseAmount) {
            return res.status(400).json({ message: `Maximum purchase amount is ${coupon.maxPurchaseAmount} for this coupon.` });
          }
     
          
      
        let couponDiscount  = 0;
        if (coupon.discountType === "fixed") {
            couponDiscount  = coupon.discountValue;
          } else if (coupon.discountType === "percentage") {
            couponDiscount  = Math.min((cartTotal * coupon.discountValue) / 100, cartTotal);

          }
          console.log( "Discount :",couponDiscount);
          
         // Calculate base discount (regular price - sale price)
         const baseDiscount = cart.items.reduce((total, item) => {
            return total + ((item.productId.regularPrice - item.productId.salePrice) * item.quantity);
        }, 0);

        console.log("base discount :",baseDiscount);
        
        const subtotal = Math.max(0, cartTotal - couponDiscount);
        console.log('subtotal :',subtotal);
        

       // Clear any existing coupon before setting new one
        req.session.couponId = null;
        //Set new coupon
       req.session.couponId = couponId;
        
        return res.json({ 
            success: true,
            subtotal,
            baseDiscount,
            couponDiscount,
            originalTotal: cartTotal,
            couponApplied: true
        });


    
      } catch (error) {
        console.error('Error in addCoupon:', error);
        res.status(500).json({ message: "An error occurred while applying the coupon" });
        
      }
 };

 const removeCoupon = async (req, res) => {
  try {
      // Get user ID from session
      const userId = req.session.user || req.user;

      // Find the user's cart and populate product information
      const cart = await Cart.findOne({ userId: userId })
          .populate('items.productId')
          .exec();

      if (!cart || !cart.items || cart.items.length === 0) {
          return res.status(400).json({ 
              message: "Your cart is empty" 
          });
      }

      // Calculate cart total without any coupon discount
      const cartTotal = cart.items.reduce((total, item) => {
          return total + (item.productId.salePrice * item.quantity);
      }, 0);


      console.log("cart total :",cartTotal);
      
      // Calculate base discount (regular price - sale price)
      const baseDiscount = cart.items.reduce((total, item) => {
          return total + ((item.productId.regularPrice - item.productId.salePrice) * item.quantity);
      }, 0);

      console.log("base discount : ", baseDiscount);
      

      // We don't need to find the coupon or calculate coupon discount 
      // since we're removing it

      // Remove coupon from session
      req.session.couponId = null;

      // Return updated cart totals with original prices
      return res.json({
          success: true,
          subtotal: cartTotal, // Original cart total without coupon discount
          baseDiscount: baseDiscount,
          couponDiscount: 0, // Reset coupon discount to 0
          originalTotal: cartTotal,
          couponApplied: false
      });

  } catch (error) {
      console.error('Error in removeCoupon:', error);
      return res.status(500).json({ 
          message: "An error occurred while removing the coupon" 
      });
  }
};


  
    
// const placeOrder = async (req, res) => {
//   try {
//       const userId = req.session.userId || req.session.user || req.user;
//       if (!userId) {
//           return res.status(401).json({ error: "User not logged in" });
//       }

//       const { addressId, paymentMethod, cartId, appliedCouponId,totalAmount } = req.body;

//       // Validate required fields
//       if (!addressId) {
//           return res.status(400).json({ error: "Please select a delivery address" });
//       }

//       if (!paymentMethod) {
//           return res.status(400).json({ error: "Please select a payment method" });
//       }

//       // Validate address
//       const selectedAddress = await Address.findById(addressId);
//       if (!selectedAddress) {
//           return res.status(400).json({ error: "Invalid address selected" });
//       }

//       // Validate payment method
//       if (!['Online Payment', 'Cash On Delivery', 'WalletPayment'].includes(paymentMethod)) {
//           return res.status(400).json({ error: 'Invalid payment method selected' });
//       }

//       // Get cart with populated products
//       const cart = await Cart.findOne({ _id: cartId, userId })
//           .populate('items.productId');
      
//       if (!cart || cart.items.length === 0) {
//           return res.status(400).json({ error: "No items in cart" });
//       }

//       let totalPrice = 0;
//       let actualPrice = 0;
//       const preparedItems = [];

//       // Calculate total and item-wise details
//       for (const item of cart.items) {
//           actualPrice += item.productId.regularPrice * item.quantity;

//           let itemPrice = item.productId.salePrice || item.productId.regularPrice;
//           totalPrice += itemPrice * item.quantity;

//           preparedItems.push({
//               product: item.productId,
//               quantity: item.quantity,
//               size: item.size,
//               regularPrice: item.productId.regularPrice,
//               salePrice: itemPrice,
//               saledPrice: itemPrice * item.quantity, 
//               itemCouponDiscount: 0 
//           });
//       }

//       let finalTotal = totalPrice;
//       let discountAmount = 0;

//       if (appliedCouponId) {
//           const appliedCoupon = await Coupon.findById(appliedCouponId);
//           if (appliedCoupon && appliedCoupon.status !== "Not available") {
//               discountAmount = calculateCouponDiscount(appliedCoupon, totalPrice);
//               finalTotal = totalPrice - discountAmount;

//               // Distribute discount proportionally among items
//               preparedItems.forEach(item => {
//                   const itemShare = (item.saledPrice / totalPrice); 
//                   const itemDiscount = discountAmount * itemShare;
//                   item.saledPrice -= itemDiscount; 
//                   item.itemCouponDiscount = itemDiscount; 
//               });
//           }
//       }

//         // Check if Cash On Delivery is allowed for this order
//       //   if (paymentMethod === "Cash On Delivery" && finalTotal > 1000) {
//       //     return res.status(400).json({ error: "Cash on Delivery is not available for orders above Rs 1000" });
//       // }

//       const orderData = {
//           user: userId,
//           address:addressId,
//           items: preparedItems,
//           totalAmount: totalAmount,
//           coupon: appliedCouponId || undefined,
//           status: 'Processing',
//           payment: [{
//               method: paymentMethod,
//               status: 'pending'
//           }],
//           totalPrice: finalTotal,
         
//       };

//       const order = new Order(orderData);
//       await order.save();

//       // Clear cart
//       await Cart.findByIdAndUpdate(cartId, { $set: { items: [] } });

//       // Handle payment methods
//       if (paymentMethod === "Online Payment") {
//           const razorpayOptions = {
//               amount: Math.round(finalTotal * 100),
//               currency: "INR",
//               receipt: `order_rcptid_${order._id}`
//           };

//           const razorpayOrder = await razorpay.orders.create(razorpayOptions);
          
//           order.payment[0].razorpayOrderId = razorpayOrder.id;
//           await order.save();

//           return res.status(200).json({
//               success: true,
//               orderId: order._id,
//               razorpayOrder: {
//                   id: razorpayOrder.id,
//                   amount: finalTotal,
//                   currency: "INR",
//                   key: process.env.RAZORPAY_KEY_ID
//               }
//           });


//       } else {
//           // Cash On Delivery
//           return res.status(200).json({
//               success: true,
//               orderId: order._id,
//               redirectTo: '/user/order-confirmation'
//           });
//       }

//   } catch (error) {
//       console.error("Error placing order:", error);
//       return res.status(500).json({ 
//           error: error.message || "An error occurred while placing the order" 
//       });
//   }
// };

// const placeOrder = async (req, res) => {
//     try {

       
//         const { userId, addressId, items, totalAmount, paymentMethod } = req.body;
//         console.log(req.body);

        
//         if (!userId || !addressId || !items || !Array.isArray(items) || items.length === 0 || !paymentMethod) {
//           return res.status(400).json({ message: 'All fields are required.' });
//       }
      
//         console.log("haiii .......  ");
        
//         const address = await Address.findById(addressId);
//         if (!address) {
//             return res.status(404).json({ message: 'Address not found.' });
//         }

//         console.log("haiii");
       
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
       
//         console.log("haiii aaaaa");
        
//         const orderData = new Order({
//             userId,
//             addressId,
//             items: orderItems,
//             totalAmount,
//             payment: [{
//               method: paymentMethod,
//               status: 'pending'
//           }],
//         });

      
//         const order = new Order(orderData);
//         await order.save();

        
//         const cart = await Cart.findOne({ userId }); 
//         if (cart) {
            
//             cart.items = cart.items.filter(cartItem => 
//                 !items.some(orderItem => orderItem.productId.toString() === cartItem.productId.toString())
//             );
//             await cart.save();
//         }

//              // Handle payment methods
//             if (paymentMethod === "Online Payment") {
//                 const razorpayOptions = {
//                     amount: Math.round(totalAmount * 100),
//                     currency: "INR",
//                     receipt: `order_rcptid_${order._id}`
//                 };

//                 const razorpayOrder = await razorpay.orders.create(razorpayOptions);
                
//                 order.payment[0].razorpayOrderId = razorpayOrder.id;
//                 await order.save();

//                 return res.status(200).json({
//                     success: true,
//                     orderId: order._id,
//                     razorpayOrder: {
//                         id: razorpayOrder.id,
//                         amount: totalAmount,
//                         currency: "INR",
//                         key: process.env.RAZOR_PAY_KEY_ID
//                     }
//                 });


//             } else {
//                 // Cash On Delivery
//                 return res.status(200).json({
//                     success: true,
//                     orderId: order._id,
//                     redirectTo: '/user/order-confirmation'
//                 });
//             }

              
       
//        // return res.render('order-confirmation', { order: newOrder });

//     } catch (error) {
//         console.error('Error placing order:', error);
//         return res.status(500).json({ message: 'Internal server error.' });
//     }
// };
const placeOrder = async (req, res) => {
  try {
      // First restructure the items data from form submission
      const formData = req.body;
      const items = [];
      
      // Convert form data structure to array format
      Object.keys(formData).forEach(key => {
          if (key.startsWith('items[')) {
              const matches = key.match(/items\[(\d+)\]\[(\w+)\]/);
              if (matches) {
                  const [, index, field] = matches;
                  if (!items[index]) {
                      items[index] = {};
                  }
                  items[index][field] = formData[key];
              }
          }
      });

      // Get other form data
      const { userId, addressId, totalAmount, paymentMethod } = formData;

      console.log("totalamount :",totalAmount);
      
      console.log("Restructured items array:", items);

      // Validate required fields
      if (!userId || !addressId || !items || items.length === 0 || !paymentMethod) {
          return res.status(400).json({ 
              success: false,
              message: 'All fields are required.',
              debug: {
                  userId: !!userId,
                  addressId: !!addressId,
                  items: !!items && items.length > 0,
                  paymentMethod: !!paymentMethod
              }
          });
      }

      const address = await Address.findById(addressId);
      if (!address) {
          return res.status(404).json({ success: false, message: 'Address not found.' });
      }

      if (!['Online Payment', 'Cash On Delivery', 'WalletPayment'].includes(paymentMethod)) {
        return res.status(400).json({ error: 'Invalid payment method selected' });
      }

      let orderItems = [];
      for (const item of items) {
          const product = await Product.findById(item.productId);
          if (!product) {
              return res.status(404).json({ 
                  success: false, 
                  message: `Product with ID ${item.productId} not found`
              });
          }
          orderItems.push({
              productId: product._id,
              quantity: parseInt(item.quantity),
              price: parseFloat(item.salePrice)
          });
      }

      const orderData = new Order({
          userId,
          addressId,
          items: orderItems,
          totalAmount: parseFloat(totalAmount),
          payment: [{
              method: paymentMethod,
              status: 'pending'
          }],
      });

      const order = new Order(orderData);
      await order.save();

      // Clear cart items
      const cart = await Cart.findOne({ userId }); 
      if (cart) {
          cart.items = cart.items.filter(cartItem => 
              !items.some(orderItem => orderItem.productId.toString() === cartItem.productId.toString())
          );
          await cart.save();
      }

      // Handle payment methods
      if (paymentMethod === "Online Payment") {
          const razorpayOptions = {
              amount: Math.round(parseFloat(totalAmount) * 100),
              currency: "INR",
              receipt: `order_rcptid_${order._id}`
          };

          const razorpayOrder = await razorpay.orders.create(razorpayOptions);
          
          order.payment[0].razorpayOrderId = razorpayOrder.id;
          await order.save();

          return res.status(200).json({
              success: true,
              orderId: order._id,
              razorpayOrder: {
                  id: razorpayOrder.id,
                  amount: totalAmount,
                  currency: "INR",
                  key: process.env.RAZOR_PAY_KEY_ID
              }
          });
      }else if (paymentMethod === "WalletPayment") {
        const wallet = await Wallet.findOne({ user: userId });
        
        if (!wallet || wallet.balance < totalAmount) {
            return res.status(400).json({ error: "Insufficient wallet balance" });
        }

        wallet.balance -= totalAmount;
        await wallet.save();

        order.payment[0].status = "completed";
        await order.save();

        return res.status(200).json({
            success: true,
            orderId: order._id,
            redirectTo: '/user/order-confirmation'
        });

      } else {
          // Cash On Delivery
          return res.status(200).json({
              success: true,
              orderId: order._id,
              redirectTo: '/user/order-confirmation'
          });
      }

  } catch (error) {
      console.error('Error placing order:', error);
      return res.status(500).json({ 
          success: false, 
          message: 'Internal server error.',
          error: error.message 
   });
  }
};

const orderConfirmation=async (req, res) => {
    try {
       return res.render('order-confirmation');
    } catch (error) {
        console.error(error);
        res.redirect("/pageNotfound");
      }
}


const verifyPayment = async (req, res) => {
  try {
      const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;
      
      // Verify signature
      const sign = razorpay_order_id + "|" + razorpay_payment_id;
      const expectedSign = crypto
          .createHmac("sha256", process.env.RAZOR_PAY_KEY_SECRET)
          .update(sign)
          .digest("hex");

      if (razorpay_signature === expectedSign) {
          // Update order status
          const order = await Order.findOne({ "payment.razorpayOrderId": razorpay_order_id });
          if (order) {
              order.payment[0].status = "completed";
              order.payment[0].paymentId = razorpay_payment_id;
              await order.save();
              return res.status(200).json({ success: true, orderId: order._id });
          }
      }
      
      return res.status(400).json({ error: "Payment verification failed" });
  } catch (error) {
      console.error("Payment verification error:", error);
      return res.status(500).json({ error: "Payment verification failed" });
  }
};

const getMyOrders = async (req, res) => {
    try {
        
        let userId;
        if (req.user) {
            userId = req.user;
          } else if (req.session.user) {
            userId = req.session.user;
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
       
        let userId;
        if (req.user) {
            userId = req.user;
          } else if (req.session.user) {
            userId = req.session.user;
          }
        
        if (!userId) {
            return res.status(401).render('order-details', { 
                order: null,
                error: "Please log in to view order details" 
            });
        }

        const orderId = req.params.orderId;
        console.log('orderid : ',orderId);
        

        
        const order = await Order.findOne({ orderId: orderId, userId })
            .populate('addressId')
            .populate('items.productId');

        if (!order) {
            return res.status(404).render('order-details', { 
                order: null,
                error: "Order not found" 
            });
        }

        
        res.render('order-details', { order });

    } catch (error) {
        console.error('Error fetching order details:', error);
        res.status(500).render('order-details', { 
            order: null,
            error: "An error occurred while fetching order details" 
        });
    }

}


// const cancelOrder = async (req, res) => {
//     console.log("Starting cancelOrder function");
//     try {
//         console.log("Route hit - before cancelOrder");
//         console.log("Parameters received:", {
//             itemOrderId: req.params.itemOrderId,
//             cancelReason: req.params.cancelReason
//         });
        
//         const { itemOrderId, cancelReason } = req.params;
        
//         if (!itemOrderId) {
//             throw new Error('ItemOrderId is required');
//         }

//         const order = await Order.findOne({ "items.itemOrderId": itemOrderId })
//             .populate('userId')
//             .populate('items.productId');

//         console.log("Order found:", order ? 'Yes' : 'No');
//         if (!order) {
//             return res.status(404).json({ 
//                 success: false, 
//                 message: 'Order not found' 
//             });
//         }

//         console.log("Payment details:", {
//             method: order.payment[0]?.method,
//             status: order.payment[0]?.status
//         });

//         const itemIndex = order.items.findIndex(item => item.itemOrderId === itemOrderId);
//         console.log("Item index in order:", itemIndex);

//         if (itemIndex === -1) {
//             return res.status(404).json({ 
//                 success: false, 
//                 message: 'Item not found in order' 
//             });
//         }

//         // Check if the item can be cancelled
//         if (['Cancelled', 'Delivered', 'Return Requested', 'Return Approved', 'Return Rejected', 'Returned']
//             .includes(order.items[itemIndex].itemOrderStatus)) {
//             return res.status(400).json({ 
//                 success: false, 
//                 message: 'Order cannot be cancelled in its current status' 
//             });
//         }

//         const paymentMethod = order.payment[0].method;
//         const paymentStatus = order.payment[0].status;

//         // Update item status
//         order.items[itemIndex].itemOrderStatus = 'Cancelled';
//         order.items[itemIndex].cancelReason = cancelReason || "No reason provided";

//         // Handle refund for online payments
//         if (['Online Payment', 'WalletPayment'].includes(paymentMethod) && paymentStatus === "completed") {
//             console.log("Processing refund for online payment");
            
//             try {
//                 let wallet = null;
                
//                 // Check if user and wallet exist
//                 if (!order.userId) {
//                     throw new Error('User reference is missing');
//                 }

//                 if (order.userId.wallet) {
//                     wallet = await Wallet.findById(order.userId.wallet);
//                     console.log("Existing wallet found:", wallet ? 'Yes' : 'No');
//                 }

//                 // Create new wallet if needed
//                 if (!wallet) {
//                     console.log("Creating new wallet");
//                     wallet = new Wallet({ balance: 0, transactions: [] });
//                     await wallet.save();
                    
//                     order.userId.wallet = wallet._id;
//                     await order.userId.save();
//                     console.log("New wallet created and linked to user");
//                 }

//                 // Process refund
//                 const itemTotal = order.items[itemIndex].price * order.items[itemIndex].quantity;
//                 console.log("Refund amount:", itemTotal);

//                 wallet.balance += itemTotal;
//                 wallet.transactions.push({
//                     type: "credit",
//                     amount: itemTotal,
//                     description: `Refund for cancelled order item: ${itemOrderId}`,
//                     date: new Date()
//                 });

//                 await wallet.save();
//                 console.log("Refund processed successfully");
//             } catch (error) {
//                 console.error("Error processing refund:", error);
//                 throw new Error(`Refund processing failed: ${error.message}`);
//             }
//         }

//         // Update product quantity
//         const productId = order.items[itemIndex].productId._id;
//         const returnQuantity = order.items[itemIndex].quantity;
        
//         await Product.findByIdAndUpdate(
//             productId,
//             { $inc: { quantity: returnQuantity } },
//             { new: true }
//         );

//         // Update overall order status if needed
//         if (order.items.every(item => item.itemOrderStatus === 'Cancelled')) {
//             order.status = 'Cancelled';
//         }

//         await order.save();
//         console.log("Order updated successfully");

//         res.status(200).json({ 
//             success: true, 
//             message: 'Order cancelled successfully' 
//         });
        
//     } catch (error) {
//         console.error("Error in cancelOrder:", error);
//         res.status(500).json({ 
//             success: false, 
//             message: 'Error cancelling order',
//             error: error.message,
//             stack: error.stack // Remove this in production
//         });
//         }
//     
// };



const returnOrder = async (req, res) => {
      try {
      const { orderId, returnReason } = req.body;

      if (!returnReason?.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Return reason is required'
        });
      }

      const order = await Order.findOne({ orderId });
      
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      if (order.status !== 'Delivered') {
        return res.status(400).json({
          success: false,
          message: 'Only delivered orders can be returned'
        });
      }

      // Check 7-day return window
      const orderDate = new Date(order.orderDate);
      const returnDeadline = new Date(orderDate.setDate(orderDate.getDate() + 7));

      if (new Date() > returnDeadline) {
        return res.status(400).json({
          success: false,
          message: 'Return window has expired (7 days from delivery)'
        });
      }

      order.status = 'Return Requested';
      order.returnRequestedReason = returnReason;

      await order.save();

      return res.status(200).json({
        success: true,
        message: 'Return request submitted successfully'
      });

    } catch (error) {
      console.error('Return request error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }




module.exports = {
    
    getCheckout,
    applyCoupon,
    removeCoupon,
    placeOrder,
    verifyPayment,
    orderConfirmation,
    getMyOrders,
    getOrderDetails,
    //cancelOrder,
    returnOrder
}