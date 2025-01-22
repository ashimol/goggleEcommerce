const Razorpay = require('razorpay'); 
const env = require("dotenv").config();

if (!process.env.RAZOR_PAY_KEY_ID || !process.env.RAZOR_PAY_KEY_SECRET) {
    console.error('Razorpay credentials are not properly configured!');
}


const razorpayInstance = new Razorpay({  
    key_id: process.env.RAZOR_PAY_KEY_ID,
    key_secret: process.env.RAZOR_PAY_KEY_SECRET
});

module.exports = razorpayInstance;