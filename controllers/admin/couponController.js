const Coupon=require("../../models/couponSchema");
const User=require("../../models/userSchema");

const getCoupons = async (req, res) => {
    try {
  
      const search = req.query.search || "";
      const coupons = await Coupon.find({
        code: { $regex: search, $options: "i" },
      }).sort({ createdAt: -1 })
        
      
      res.render("coupons", { 
        coupons,
        search 
      });
    } catch (error) {
      console.error("Error retrieving coupons:", error);
      return res.redirect("/pageerror");
      // res.status(500).send("An error occurred while retrieving the coupons.");
    }
  };


  const createCoupon = async (req, res) => {
    try {
      const {
        code,
        description,
        discountType,
        discountValue,
        minPurchaseAmount,
        maxPurchaseAmount,
        startDate,
        endDate,
        usageLimit,
        status,
      } = req.body;
  
      // Validate form data
      if (
        !code ||
        !description ||
        !discountType ||
        !discountValue ||
        !minPurchaseAmount ||
        !maxPurchaseAmount ||
        !startDate ||
        !endDate ||
        !usageLimit ||
        !status
      ) {
        return res.status(400).json({
          success: false,
          message: "Please fill in all the required fields.",
        });
      }
  
      // Validate that discountValue is below 60
      if (discountValue >= 60) {
        return res.status(400).json({
          success: false,
          message: "Discount value must be below 60.",
        });
      }
  
      const existingCoupon = await Coupon.findOne({ code });
      if (existingCoupon) {
        return res.status(400).json({
          success: false,
          message: "Coupon code already exists. Please try a different code.",
        });
      }
  
      const newCoupon = new Coupon({
        code,
        description,
        discountType,
        discountValue,
        minPurchaseAmount,
        maxPurchaseAmount,
        startDate,
        endDate,
        usageLimit,
        status,
      });
      await newCoupon.save();
  
      const coupons = await Coupon.find();
      // res.render("coupons", { coupons });
      res.status(200).json({
        success: true,
        message: "coupon created successfully",
      });
    } catch (error) {
      console.error("Error creating coupon:", error);
      res.status(500).json({
        success: false,
        message: "An error occurred while creating the coupon",
      });
    }
  };


  const deleteCoupon = async (req, res) => {
    try {
      const { id } = req.params;
      const coupon = await Coupon.findByIdAndDelete(id);
      if (!coupon) {
        return res.status(404).json({ success: false, message: "Coupon not found" });
      }
      res.status(200).json({ success: true, message: "Coupon deleted successfully" });
    } catch (error) {
      console.error("Error deleting coupon:", error);
      res.status(500).json({ success: false, message: "An error occurred while deleting the coupon" });
    }
  };
  


  const updateCoupon = async (req, res) => {
    try {
      const couponId = req.params.id;
      const updates = {
        code: req.body.code,
        description: req.body.description,
        discountType: req.body.discountType,
        discountValue: Number(req.body.discountValue),
        minPurchaseAmount: Number(req.body.minPurchaseAmount),
        maxPurchaseAmount: Number(req.body.maxPurchaseAmount),
        startDate: new Date(req.body.startDate),
        endDate: new Date(req.body.endDate),
        usageLimit: Number(req.body.usageLimit),
        status: req.body.status,
        updatedAt: new Date(),
      };
  
      // Check for duplicate coupon codes (excluding the current coupon)
      const existingCoupon = await Coupon.findOne({
        code: updates.code,
        _id: { $ne: couponId },
      });
  
      if (existingCoupon) {
        return res.status(400).json({
          success: false,
          message: "Coupon code already exists. Please try a different code.",
        });
      }
  
      const coupon = await Coupon.findByIdAndUpdate(
        couponId, 
        { $set: updates }, 
        { new: true, runValidators: true}
      );
  
      if (!coupon) {
        return res.status(404).json({
          success: false,
          message: "Coupon not found.",
        });
      }
  
      res.status(200).json({
        success: true,
        message: "Coupon updated successfully.",
        coupon,
      });
    } catch (error) {
      console.error("Error updating coupon:", error);
      res.status(500).json({
        success: false,
        message: "An error occurred while updating the coupon.",
      });
    }
  };
  
  const editCoupon = async (req, res) => {
    try {
      const couponId = req.params.id;
      const coupon = await Coupon.findById(couponId);
  
      if (!coupon) {
        return res.status(404).send("Coupon not found.");
      }
  
      res.status(200).json(coupon);  
    } catch (error) {
      console.error("Error fetching coupon:", error);
      return res.redirect("/pageerror");
      // res.status(500).send("Internal Server Error.");
    }
  };
  

  module.exports={
    getCoupons,
    createCoupon,
    deleteCoupon,
    editCoupon,
    updateCoupon,
  }