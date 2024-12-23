const mongoose = require("mongoose"); // Fixed typo here
const { Schema } = mongoose; // Fixed typo here

const wishlistSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        require: true,
    },
    products: [{
        productId: {
            type: Schema.Types.ObjectId,
            ref: "Product",
            required: true
        },
        addedOn: {
            type: Date,
            default: Date.now
        }
    }]
});

const Wishlist = mongoose.model("Wishlist", wishlistSchema); // Now mongoose is correctly imported
module.exports = Wishlist;
