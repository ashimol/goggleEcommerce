const mongoose = require("mongoose");
const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Wishlist = require("../../models/wishlistSchema");

const loadWishlist = async (req, res) => {
  try {
    const userId = req.session.user;
    if (!userId) {
      return res
        .status(401)
        .render("error", { message: "User  not authenticated" });
    }

    const wishlist = await Wishlist.findOne({ userId }).populate({
      path: "products.productId",
      select: "productName productImage salePrice category brand",
    });

    const products = wishlist ? wishlist.products : [];

    if (userId) {
      
      const userData = await User.findById(userId)
        .populate({
          path: "cart",
          populate: {
            path: "items.productId", 
            model: "Product", 
          },
        })
        .exec();

      res.render("wishlist", { wishlist: products, user: userData });
    }
  } catch (error) {
    console.error("Error in fetching wishlist:", error);
    next(error);
  }
};

const addToWishlist = async (req, res) => {
  try {
    console.log("Request body:", req.body);

    const userId = req.session.user;
    if (!userId) {
      return res.status(401).json({ message: "User  not authenticated" });
    }

    const { productId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    let wishlist = await Wishlist.findOne({ userId });
    if (!wishlist) {
      wishlist = new Wishlist({ userId, products: [] });
    }

    const productExists = wishlist.products.find(
      (item) => item.productId.toString() === productId
    );
    if (productExists) {
      return res.status(400).json({ message: "Product already in wishlist" });
    }

    wishlist.products.push({ productId });
    await wishlist.save();

    return res
      .status(200)
      .json({ message: "Product added to wishlist successfully" });
  } catch (error) {
    console.error("Error adding product to wishlist:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const deleteWishlistItem = async (req, res) => {
  try {
    let userId;
    if (req.user) {
      userId = req.user;
    } else if (req.session.user) {
      userId = req.session.user;
    }
    const wishlistId = req.params.wishlistId;
    console.log("wishlist id:", wishlistId);
    console.log("user :", userId);

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, error: "User not authenticated" });
    }

    console.log("User ID:", userId);
    console.log("Wishlist ID to delete:", wishlistId);

    const wishlist = await Wishlist.findOneAndUpdate(
      { userId, "products._id": wishlistId },
      { $pull: { products: { _id: wishlistId } } },
      { new: true }
    );

    if (!wishlist) {
      return res
        .status(404)
        .json({ success: false, error: "Item not found in wishlist" });
    }

    console.log("Updated Wishlist:", wishlist);

    return res
      .status(200)
      .json({ success: true, message: "Item removed successfully" });
  } catch (error) {
    console.error("Error deleting wishlist item:", error);
    res.redirect("/pageNotfound");
  }
};

module.exports = {
  loadWishlist,
  addToWishlist,
  deleteWishlistItem,
};
