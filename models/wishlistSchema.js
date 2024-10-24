const mongooge = require("mongoose");
const {Schema} = mongooge;

const wishlistSchema = new Schema({
    userId : {
        type : Schema.Types.ObjectId,
        ref : "User",
        require :true,
    },
    products : [{
        productId : {
            type :Schema.Types.ObjectId,
            ref : "Product",
            required: true
        },
        addedOn : {
            type :Date,
            default :Date.now
        }
    }]
})


const Wishlist = mongoose.model("Wishlist",wishlistSchema);
module.exports = Wishlist;