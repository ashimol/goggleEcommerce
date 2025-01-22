const User = require('../../models/userSchema');
const Product=require("../../models/productSchema");
const Category=require("../../models/categorySchema");
const Address=require("../../models/addressSchema");
const Order=require("../../models/orderSchema");
const Wallet = require('../../models/walletSchema');



const getAdminOrders = async (req, res) => {
  try {
    const searchQuery = req.query.search || '';
    const page = parseInt(req.query.page) || 1; 
    const limit = 5; 
    const skip = (page - 1) * limit;

    
    const searchCondition = {
      $or: [
        { orderId: { $regex: searchQuery, $options: "i" } },
        // { 'userId.name': { $regex: searchQuery, $options: "i" } },
        
      ]
    };

    
    const totalOrders = await Order.countDocuments(searchCondition);

    
    const orders = await Order.find(searchCondition)
      .populate({
        path: 'userId',
        select: 'name email' 
      })
      .populate({
        path: 'items.productId',
        select: 'productName'
      })
      .sort({ orderDate: -1 })
      .skip(skip)
      .limit(limit)
      .lean(); 

    // Calculate total pages
    const totalPages = Math.ceil(totalOrders / limit);

    
    res.render("orders", {
      orders,
      search: searchQuery,
      currentPage: page,
      totalPages,
      totalOrders 
    });

  } catch (error) {
    console.error("Error fetching orders: ", error);
    res.redirect("/admin/error");
  }
};

  
// const getOrderDetails = async (req, res) => {
//     try {
//         const orderId = req.params.orderId;  
//         const currentStatus = req.query.status;
//         const order = await Order.findById(orderId) 
//             .populate('userId')
//             .populate('addressId')
//             .populate({
//               path: 'items.productId',
//               populate: {
//                 path: 'brand',
//                 select: 'productName' 
//               }
//             })
//             .exec();
            
//         if (!order) {
//             return res.status(404).render('error', { message: 'Order not found' });
//         }

//         res.render('orderDetails', { order, currentStatus });
//     } catch (error) {
//         console.error('Error fetching order details:', error);
//         res.status(500).render('error', { message: 'Server error' });
//     }
// };

const getOrderDetails = async (req, res) => {
  try {
      const orderId = req.params.orderId;  
      const itemId = req.query.itemOrderId; // Assume itemId is passed as a query parameter
      const currentStatus = req.query.status;

      const order = await Order.findById(orderId)
          .populate('userId')
          .populate('addressId')
          .populate({
              path: 'items.productId',
              populate: {
                  path: 'brand',
                  select: 'productName'
              }
          })
          .exec();

      if (!order) {
          return res.status(404).render('error', { message: 'Order not found' });
      }

      // Filter the specific item based on itemOrderId
      const currentItem = order.items.find(item => item.itemOrderId === itemId);

      if (!currentItem) {
          return res.status(404).render('error', { message: 'Item not found in order' });
      }

      res.render('orderDetails', { order, currentItem ,currentStatus});

  } catch (error) {
      console.error('Error fetching order details:', error);
      res.status(500).render('error', { message: 'Server error' });
  }
};


// const updateItemStatus = async (req, res) => {
//   try {
//     console.log("req.body :", req.body);
//     const { orderId, itemId, itemStatus } = req.body;

//     if (!orderId || !itemId || !itemStatus) {
//       return res.status(400).send({ message: 'Invalid input data.' });
//     }

//     const order = await Order.findOne({ orderId });

//     if (!order) {
//       return res.status(404).send({ message: 'Order not found.' });
//     }

//     const item = order.items.find(item => item._id.toString() === itemId);
//     console.log('item : ', item);

//     if (!item) {
//       return res.status(404).send({ message: 'Item not found in order.' });
//     }

//     console.log('Current item status:', item.itemOrderStatus);

//     // Check Eligibility for Refund
//     const refundStatuses = ["Cancelled", "Returned"];
//     const isRefundEligible = refundStatuses.includes(itemStatus);

//     if (isRefundEligible) {
    
//       const user = await User.findById(order.userId).populate('wallet');

//       if (!user) {
//         return res.status(404).send({ message: 'User not found.' });
//       }

//       if (!user.wallet) {
//         return res.status(400).send({ message: 'User wallet not found.' });
//       }

      
//       const refundAmount = item.price * item.quantity;

//       console.log(`Refund Amount: ${refundAmount}`);

     
//       const wallet = await Wallet.findById(user.wallet);

//       if (!wallet) {
//         return res.status(404).send({ message: 'Wallet not found.' });
//       }

//       wallet.balance = (wallet.balance || 0) + refundAmount;
      
//       await wallet.save();

//       console.log(`Refunded ${refundAmount} to user's wallet.`);
//     }

//     // Update the item's order status
//     item.itemOrderStatus = itemStatus;

//     await order.save();
//     console.log('Item status updated successfully.');

//     res.status(200).send({ message: 'Item status updated successfully.' });
//   } catch (error) {
//     console.error('Error updating item status:', error);
//     res.status(500).send({ message: 'Internal server error.' });
//   }
// };
const updateItemStatus = async (req, res) => {
  try {
    console.log("req.body :", req.body);
    const { orderId, itemId, itemStatus } = req.body;

    if (!orderId || !itemId || !itemStatus) {
      return res.status(400).send({ message: 'Invalid input data.' });
    }

    const order = await Order.findOne({ orderId });

    if (!order) {
      return res.status(404).send({ message: 'Order not found.' });
    }

    const item = order.items.find(item => item._id.toString() === itemId);
    console.log('item : ', item);

    if (!item) {
      return res.status(404).send({ message: 'Item not found in order.' });
    }

    console.log('Current item status:', item.itemOrderStatus);

    // Check if the payment method is online
    //const isOnlinePayment = order.payment[0].method === "Online Payment";
    
    const isPaymentCompleted = order.payment[0].status === "completed";

    const isOnlinePayment = order.payment[0].method === "Online Payment" ? true : false;
    const isCashOnDelivery = order.payment[0].method === "Cash On Delivery" ? true : false;
    const isWalletPayment = !isOnlinePayment && !isCashOnDelivery;

    // Check Eligibility for Refund
    const refundStatuses = ["Cancelled", "Returned"];
    const isRefundEligible = refundStatuses.includes(itemStatus);

    if ((isRefundEligible && isOnlinePayment && isPaymentCompleted) || (isRefundEligible && isWalletPayment)||(isCashOnDelivery && itemStatus === "Returned")) {
      const user = await User.findById(order.userId).populate('wallet');

      if (!user) {
        return res.status(404).send({ message: 'User not found.' });
      }

      if (!user.wallet) {
        return res.status(400).send({ message: 'User wallet not found.' });
      }

      const refundAmount = item.price * item.quantity;

      console.log(`Refund Amount: ${refundAmount}`);

      const wallet = await Wallet.findById(user.wallet);

      if (!wallet) {
        return res.status(404).send({ message: 'Wallet not found.' });
      }

      wallet.balance = (wallet.balance || 0) + refundAmount;

      await wallet.save();

      console.log(`Refunded ${refundAmount} to user's wallet.`);
    }

    // Adjust product quantity only if payment is online and completed
    if ((isRefundEligible && isOnlinePayment && isPaymentCompleted) || (isWalletPayment) || isCashOnDelivery) {
      const product = await Product.findById(item.productId);

      if (product) {
        const newQuantity = product.quantity + item.quantity;

        await Product.findByIdAndUpdate(item.productId, {
          $inc: { quantity: item.quantity },
          $set: { status: newQuantity > 0 ? "Available" : "Out of Stock" },
        });

        console.log('Product quantity updated.');
      }
    }

    // Update the item's order status
    item.itemOrderStatus = itemStatus;

    await order.save();
    console.log('Item status updated successfully.');

    res.status(200).send({ message: 'Item status updated successfully.' });
  } catch (error) {
    console.error('Error updating item status:', error);
    res.status(500).send({ message: 'Internal server error.' });
  }
};











module.exports={
    getAdminOrders,
    getOrderDetails,
    updateItemStatus,
    
 }