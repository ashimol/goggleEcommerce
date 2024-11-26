const mongoose = require("mongoose");
const {Schema} = mongoose;

const addressSchema = new Schema({
    
        house :{
            type :String,
            required : true
        },
        city :{
            type: String,
            required: true
        },
        state:{
            type:String,
            required :true,
        },
        landMark : {
            type: String,
            required :true
        },
        pin:{
            type : Number,
            required :true
        },
        contactNo:{
            type: String,
            required :true
        },
        isDeliveryAddress: {
            type:Boolean,
            required:false
        }
   
})

const Address = mongoose.model("Address",addressSchema);

module.exports = Address;