const User = require('../../models/userSchema');
const Product=require("../../models/productSchema");
const Category=require("../../models/categorySchema");
const Address=require("../../models/addressSchema");
const Order=require("../../models/orderSchema");



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

  
const getOrderDetails = async (req, res) => {
    try {
        const orderId = req.params.orderId;  
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

        res.render('orderDetails', { order, currentStatus });
    } catch (error) {
        console.error('Error fetching order details:', error);
        res.status(500).render('error', { message: 'Server error' });
    }
};



const updateItemStatus = async (req, res) => {
  try {
    console.log("req.body :" ,req.body);
    const { orderId, itemId, itemStatus } = req.body;

    if (!orderId || !itemId || !itemStatus) {
        return res.status(400).send({ message: 'Invalid input data.' });
    }

    const order = await Order.findOne({ orderId });

    if (!order) {
        return res.status(404).send({ message: 'Order not found.' });
    }

    const item = order.items.find(item => item._id.toString() === itemId);
    console.log('item : ',item);

    if (!item) {
        return res.status(404).send({ message: 'Item not found in order.' });
    }

    //order.status = itemStatus;
    console.log('item.iemstatus :',item.itemOrderStatus)
    item.itemOrderStatus = itemStatus;

    await order.save();
    // res.redirect(`/orderDetails/${orderId}`);
   
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