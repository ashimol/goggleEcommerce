const mongoose = require("mongoose");
const {Schema} = mongoose;
const {v4:uuidv4} = require("uuid");


const orderSchema = new Schema({
    orderId: {
        type: String,
        default: () => uuidv4().split('-')[0],
        unique: true
      },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    addressId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Address'
    },
    items: [{
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'Product'
        },
        quantity: {
            type: Number,
            required: true
        },
        price: {
            type: Number,
            required: true
        }
    }],
    totalAmount: {
        type: Number,
        required: true
    },
    paymentMethod: {
        type: String,
        enum: ['Online Payment', 'Cash On Delivery'],
        required: true
    },
    orderDate: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        required: false,
        enum: ["Pending", "Processing", "Shipped", "Delivered", "Cancelled", "Return Requested","Return Approved","Return Rejected","Returned"],
        default: 'Pending'
    }
    
})

const Order = mongoose.model("Order",orderSchema);
module.exports = Order;