const mongoose = require("mongoose");
const {Schema} = mongoose;

const brandSchema = new Schema({
   name: {
        type:String,
        required:true,
        unique:true
    },
    description : {
        type : String,
        required : true,
    },
    isBlocked: {
        type:Boolean,
        default:true
    },
    brandOffer:{
        type:Number,
        default:0
    },
    createdAt: {
        type: Date,
        default:Date.now
    }
}) 

const Brand = mongoose.model("Brand",brandSchema);
module.exports = Brand;