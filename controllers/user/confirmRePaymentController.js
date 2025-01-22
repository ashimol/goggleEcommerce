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
//const razorpay = require('../../config/razorPay'); 
const razorpayInstance = require('../../config/razorPay');  

const env=require("dotenv").config();
const nodemailer=require("nodemailer");
const bcrypt=require("bcrypt");
const crypto = require('crypto');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const { console } = require('inspector');
const { verifyPayment} = require('./orderController');



const confirmRePayment = async (req, res) => {
    try {
        const { orderId, razorpayOrderId } = req.body;
        console.log("Processing payment for orderId:", orderId);

        const order = await Order.findOne({ orderId });
        
        if (!order) {
            console.log("Order not found:", orderId);
            return res.status(404).json({ 
                success: false, 
                message: 'Order not found' 
            });
        }

        const payment = order.payment[0];

        if (payment.status === 'completed') {
            return res.status(400).json({ 
                success: false, 
                message: 'Payment already completed for this order' 
            });
        }

        let razorpayOrder;
        try {
            if (razorpayOrderId) {
                console.log("Fetching existing Razorpay order:", razorpayOrderId);
                razorpayOrder = await razorpayInstance.orders.fetch(razorpayOrderId);
            } else {
                console.log("Creating new Razorpay order for amount:", order.totalAmount);
                razorpayOrder = await razorpayInstance.orders.create({
                    amount: Math.round(order.totalAmount * 100),
                    currency: 'INR',
                    receipt: `order_rcptid_${order.orderId}`,
                    payment_capture: 1,
                });
                
                payment.razorpayOrderId = razorpayOrder.id;
                await order.save();
            }
        } catch (razorpayError) {
            console.error("Razorpay operation failed:", razorpayError);
            return res.status(500).json({ 
                success: false, 
                message: 'Failed to create/fetch Razorpay order',
                error: razorpayError.message 
            });
        }

        console.log("Successfully processed Razorpay order");
        res.status(200).json({
            success: true,
            razorpayOrder: {
                key: process.env.RAZOR_PAY_KEY_ID,
                amount: razorpayOrder.amount,
                currency: razorpayOrder.currency,
                id: razorpayOrder.id
            }
        });
    } catch (error) {
        console.error('Error in confirmRePayment:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error', 
            error: error.message 
        });
    }
};
  module.exports = {
    confirmRePayment,
  }