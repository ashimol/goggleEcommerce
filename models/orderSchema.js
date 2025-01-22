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
    coupon: {
        type: Schema.Types.ObjectId,
        ref:'Coupon',
        required:false
      },  
    items: [{

        itemOrderId: {
          type: String,
          default: () => uuidv4().split('-')[0],
          unique: true
        },
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
        },
        itemOrderStatus: {
          type: String,
          required: false,
          enum: ["Pending", "Processing", "Shipped", "Delivered", "Cancelled", "Return Requested","Return Approved","Return Rejected","Returned"],
          default: "Pending"
        },
        returnRequestedReason: {
          type: String,
          required: false,
        },
    }],
    totalAmount: {
        type: Number,
        required: true
    },
    
    payment: [{
        method: {
          type: String,
          required: true,
          enum: ["Cash On Delivery", "Online Payment", "WalletPayment"]
        },
        status: {
          type: String,
          required: true,
          enum: ["pending", "completed",'Failed','Refunded']
        },
        razorpayOrderId: {
          type: String,
          required: false  
        }
      }],
      returnRequestedReason: {
        type: String
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