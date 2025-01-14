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
const PDFDocument = require('pdfkit');
const fs = require('fs');
const { console } = require('inspector');

const getCheckout = async (req, res) => {
    try {
      let user ;
      if (req.user) {
          user = req.user;
        } else if (req.session.user) {
          user = req.session.user;
        }
        
        console.log('userid :',user);
        
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

          if(user){
            const userData = await User.findById(user);

        res.render('checkout', {
          user:userData,
            userId, 
            addresses: userAddresses,            
            firstName: cartData.userId.firstName,
            cartData,
            subtotal,
            coupons,
            totalDiscount,

           // orderTotal,
            
        });
      }
    } catch (error) {
        console.error("Error during checkout page load:", error);
        //res.redirect("/pageNotfound");
         res.status(500).send('An error occurred while loading the checkout page');
    }
};

const applyCoupon = async (req, res) => {
    
    try {
        const { couponId,totalDiscount } = req.body; 
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
          
        
         const baseDiscount = cart.items.reduce((total, item) => {
            return total + ((item.productId.regularPrice - item.productId.salePrice) * item.quantity);
        }, 0);

        console.log("base discount :",baseDiscount);
        
        const subtotal = Math.max(0, cartTotal - couponDiscount);
        console.log('subtotal :',subtotal);
        

       
        req.session.couponId = null;
        
       req.session.couponId = couponId;
        
        return res.json({ 
            success: true,
            subtotal,
            baseDiscount,
            couponDiscount,
            totalDiscount,
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
    
      const userId = req.session.user || req.user;

      
      const cart = await Cart.findOne({ userId: userId })
          .populate('items.productId')
          .exec();

      if (!cart || !cart.items || cart.items.length === 0) {
          return res.status(400).json({ 
              message: "Your cart is empty" 
          });
      }

      
      const cartTotal = cart.items.reduce((total, item) => {
          return total + (item.productId.salePrice * item.quantity);
      }, 0);


      console.log("cart total :",cartTotal);
      
      
      const baseDiscount = cart.items.reduce((total, item) => {
          return total + ((item.productId.regularPrice - item.productId.salePrice) * item.quantity);
      }, 0);

      console.log("base discount : ", baseDiscount);
      

     
      req.session.couponId = null;

      
      return res.json({
          success: true,
          subtotal: cartTotal, 
          baseDiscount: baseDiscount,
          couponDiscount: 0, 
          totalDiscount: baseDiscount,
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
     
      const formData = req.body;
      const items = [];
      
     
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

      
      const { userId, addressId, totalAmount, paymentMethod } = formData;

      console.log("totalamount :",totalAmount);
      
      console.log("Restructured items array:", items);

      
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


        try {
          const user = await User.findById(userId).populate('wallet');
          if (!user || !user.wallet) {
            throw new Error('User or wallet not found');
          }
      
          console.log(totalAmount);
          console.log("wallet balance :",user.wallet.balance)
          
          if (user.wallet.balance < totalAmount) {
            throw new Error('Insufficient balance in wallet');
          }
      
          
          user.wallet.balance -= totalAmount;
          user.wallet.transactions.push({
            type: 'debit',
            amount: totalAmount,
            description: `Payment for order`,
            date: new Date()
          });
      
          await user.wallet.save();
          return true;
        } catch (error) {
          console.error('Error processing wallet payment:', error);
          throw error;
        }
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
        if(userId){
          const userData = await User.findById(userId);
       
        res.render('my-orders', {
          user:userData,
            orders,
            currentPage: page,
            totalPages
        });
      }

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

// const getOrderDetails = async (req,res) =>{
//     try {
       
//         let userId;
//         if (req.user) {
//             userId = req.user;
//           } else if (req.session.user) {
//             userId = req.session.user;
//           }
        
//         if (!userId) {
//             return res.status(401).render('order-details', { 
//                 order: null,
//                 error: "Please log in to view order details" 
//             });
//         }

//         const orderId = req.params.orderId;
//         console.log('orderid : ',orderId);
        

        
//         const order = await Order.findOne({ orderId: orderId, userId })
//             .populate('addressId')
//             .populate('items.productId');

//         if (!order) {
//             return res.status(404).render('order-details', { 
//                 order: null,
//                 error: "Order not found" 
//             });
//         }

        
//         res.render('order-details', { order });

//     } catch (error) {
//         console.error('Error fetching order details:', error);
//         res.status(500).render('order-details', { 
//             order: null,
//             error: "An error occurred while fetching order details" 
//         });
//     }

// }

const getOrderDetails = async (req, res) => {
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
              selectedItem: null,
              error: "Please log in to view order details" 
          });
      }

      const { orderId, itemId } = req.params;

      console.log( "ordrer :",orderId);
      console.log("itemid :",itemId);
      
      

      const order = await Order.findOne({ orderId, userId })
          .populate('addressId')
          .populate('items.productId');

      if (!order) {
          return res.status(404).render('order-details', { 
              order: null,
              selectedItem: null,
              error: "Order not found" 
          });
      }

      // Find the specific item using itemId
      const selectedItem = order.items.find(item => item.itemOrderId === itemId);

      if (!selectedItem) {
        return res.status(404).render('order-details', { 
            order, 
            selectedItem: null, 
            error: "Item not found in the order" 
        });
    }
        console.log(order); // Ensure `order` has `items` and `selectedItem` properly set
         console.log(selectedItem); // Ensure `selectedItem` is correctly set


      res.render('order-details', { 
          order, 
          selectedItem 
      });

  } catch (error) {
      console.error('Error fetching order details:', error);
      res.status(500).render('order-details', { 
          order: null,
          selectedItem: null,
          error: "An error occurred while fetching order details" 
      });
  }
};

const downloadInvoice = async (req, res, next) => {
  try {
    const { orderId, itemId } = req.params;

    // Fetch the order along with user, address, and product details
    const order = await Order.findById(orderId)
      .populate('userId', 'name') // Fetch user name
      .populate('addressId') // Fetch address details
      .populate({
        path: 'items.productId',
        populate: {
          path: 'brand',
          select: 'name' // Fetch brand name
        }
      })
      .exec();

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Find the specific item in the order
    const selectedItem = order.items.find(item => item.itemOrderId === itemId);

    if (!selectedItem) {
      return res.status(404).json({ message: 'Item not found in the order' });
    }

    // Prepare the invoice PDF
    const doc = new PDFDocument();
    const chunks = [];

    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => {
      const pdfData = Buffer.concat(chunks);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=Invoice-${order.orderId}.pdf`);
      res.send(pdfData);
    });

    // Invoice Header
    doc.fontSize(20).text('Tax Invoice', { align: 'center' });
    doc.moveDown(2);

    // Seller Details
    const leftColumnX = 50;
    const startY = 110;
    doc.fontSize(12);
    doc.text('Sold by', leftColumnX, startY, { underline: true });
    doc.text('GOOGLE SHOP', leftColumnX, startY + 20);
    doc.text('No 6 ,CM Complex Building', leftColumnX, startY + 40);
    doc.text('Koratty, Thrisssur, Kerala', leftColumnX, startY + 60);
    doc.text('Pin: 680321', leftColumnX, startY + 80);

    // Order Details
    const rightColumnX = 400;
    doc.text(`Order Id: ${order.orderId}`, rightColumnX, startY);
    doc.text(`Order Date: ${order.orderDate.toLocaleString()}`, rightColumnX, startY + 20);

    // Shipping Address
    const shippingAddressStartY = startY + 120;
    doc.text('Shipping Address:', leftColumnX, shippingAddressStartY, { underline: true });
    doc.text(`${order.userId.name}`, leftColumnX, shippingAddressStartY + 20);
    doc.text(`${order.addressId.house}, ${order.addressId.place}`, leftColumnX, shippingAddressStartY + 40);
    doc.text(`${order.addressId.city}, ${order.addressId.state} - ${order.addressId.pin}`, leftColumnX, shippingAddressStartY + 60);
    doc.text(`Phone: ${order.addressId.contactNo}`, leftColumnX, shippingAddressStartY + 80);

    const tableTop = 350;

    // Set column widths
    const columnWidths = {
        name: 75,
        brand: 75,
        qty: 50,
        amount: 75,
        discount: 75,
        taxableValue: 100,
        total: 100,
    };

    // Table Header
    doc.font('Helvetica-Bold');
    doc.text('Name', 50, tableTop, { width: columnWidths.name, ellipsis: true });
    doc.text('Brand', 50 + columnWidths.name, tableTop, { width: columnWidths.brand, ellipsis: true });
    doc.text('Qty', 50 + columnWidths.name + columnWidths.brand, tableTop, { width: columnWidths.qty });
    doc.text('Amount', 50 + columnWidths.name + columnWidths.brand + columnWidths.qty, tableTop, { width: columnWidths.amount });
    doc.text('Discount', 50 + columnWidths.name + columnWidths.brand + columnWidths.qty + columnWidths.amount, tableTop, { width: columnWidths.discount });
    doc.text('Taxable Value', 50 + columnWidths.name + columnWidths.brand + columnWidths.qty + columnWidths.amount + columnWidths.discount, tableTop, { width: columnWidths.taxableValue });
    doc.text('Total', 50 + columnWidths.name + columnWidths.brand + columnWidths.qty + columnWidths.amount + columnWidths.discount + columnWidths.taxableValue, tableTop, { width: columnWidths.total });

    // Table Rows
    doc.font('Helvetica');
    const tableRow = tableTop + 25;
    doc.text(selectedItem.productId.productName, 50, tableRow, { width: columnWidths.name, ellipsis: true });
    doc.text(selectedItem.productId.brand.name, 50 + columnWidths.name, tableRow, { width: columnWidths.brand, ellipsis: true });
    doc.text(selectedItem.quantity.toString(), 50 + columnWidths.name + columnWidths.brand, tableRow, { width: columnWidths.qty });
    doc.text(selectedItem.price.toFixed(2), 50 + columnWidths.name + columnWidths.brand + columnWidths.qty, tableRow, { width: columnWidths.amount });
    const discount = selectedItem.price - selectedItem.price * 0.9; // Example discount calculation
    doc.text(discount.toFixed(2), 50 + columnWidths.name + columnWidths.brand + columnWidths.qty + columnWidths.amount, tableRow, { width: columnWidths.discount });
    const taxableValue = selectedItem.price * 0.9; // Example taxable value
    doc.text(taxableValue.toFixed(2), 50 + columnWidths.name + columnWidths.brand + columnWidths.qty + columnWidths.amount + columnWidths.discount, tableRow, { width: columnWidths.taxableValue });
    doc.text((taxableValue * selectedItem.quantity).toFixed(2), 50 + columnWidths.name + columnWidths.brand + columnWidths.qty + columnWidths.amount + columnWidths.discount + columnWidths.taxableValue, tableRow, { width: columnWidths.total });

    // Total Amount
    const totalRow = tableRow + 30;
    doc.font('Helvetica-Bold');
    doc.text('Total:', 50 + columnWidths.name + columnWidths.brand + columnWidths.qty + columnWidths.amount + columnWidths.discount, totalRow, { width: columnWidths.taxableValue });
    doc.text(`₹${(taxableValue * selectedItem.quantity).toFixed(2)}`, 50 + columnWidths.name + columnWidths.brand + columnWidths.qty + columnWidths.amount + columnWidths.discount + columnWidths.taxableValue, totalRow, { width: columnWidths.total });

    doc.moveDown();
    doc.text('All values are in INR', 50, 600);


    doc.end();
  } catch (error) {
    next(error);
  }
};



const returnOrder = async (req, res) => {
    try {
      const { itemOrderId } = req.params;
      const { returnReason } = req.body;
  
      if (!returnReason?.trim()) {
        return res.status(400).json({
          success: false,
          message: "Return reason is required",
        });
      }
  
      // Find the order containing the specific itemOrderId
      const order = await Order.findOne({ "items.itemOrderId": itemOrderId });
  
      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }
  
      // Locate the specific item within the items array
      const item = order.items.find((i) => i.itemOrderId === itemOrderId);
  
      if (!item) {
        return res.status(404).json({
          success: false,
          message: "Item not found in order",
        });
      }
  
      if (item.itemOrderStatus !== "Delivered") {
        return res.status(400).json({
          success: false,
          message: "Only delivered items can be returned",
        });
      }
  
      // Check 7-day return window
      const returnDeadline = new Date(order.orderDate);
      returnDeadline.setDate(returnDeadline.getDate() + 7);
  
      if (new Date() > returnDeadline) {
        return res.status(400).json({
          success: false,
          message: "Return window has expired (7 days from delivery)",
        });
      }
  
      // Update item status
      item.itemOrderStatus = "Return Requested";
      item.returnRequestedReason = returnReason;
  
      await order.save();
  
      return res.status(200).json({
        success: true,
        message: "Return request submitted successfully",
      });
    } catch (error) {
      console.error("Return request error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
};



module.exports = {
    
    getCheckout,
    applyCoupon,
    removeCoupon,
    placeOrder,
    verifyPayment,
    orderConfirmation,
    getMyOrders,
    getOrderDetails,
    returnOrder,
    downloadInvoice
}