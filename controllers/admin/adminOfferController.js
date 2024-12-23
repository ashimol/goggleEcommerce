const mongoose = require("mongoose");
const Offer = require("../../models/offerSchema");
const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");

const offer = async (req, res) => {
  try {
    const searchQuery = req.query.search;
    let query = {};

    if (searchQuery) {
      query = {
        $or: [
          { offerCode: { $regex: searchQuery, $options: 'i' } },
          { title: { $regex: searchQuery, $options: 'i' } },
          { status: { $regex: searchQuery, $options: 'i' } }
        ]
      };

      
      const datePattern = /^\d{4}-\d{2}-\d{2}$/; 
      if (datePattern.test(searchQuery)) {
        const searchDate = new Date(searchQuery);
        query.$or.push(
          { startDate: { $lte: searchDate }, endDate: { $gte: searchDate } }
        );
      }
    }

    const offers = await Offer.find(query)
      .populate('product')
      .populate('category')
      .exec();
    
    return res.render("adminOffer", { offers, searchQuery });

  } catch (error) {
    console.error('Error fetching or updating offers:', error);
    res.status(500).send("An error occurred while processing offers");
  }
};

const createOffer = async (req, res) => {
    try {
      const products = await Product.find({}, 'productName _id');
      const categories = await Category.find({}, 'name _id');
      return res.render("createOffer", { products, categories });
    } catch (error) {
      console.error('Error fetching products and categories:', error);
      res.status(500).send("An error occurred while preparing the create offer page");
    }
  };

  const addOffer = async (req, res) => {
    try {
      const {
        offerCode,
        title,
        description,
        offerType,
        discountType,
        discountValue,
        product,
        category,
        startDate,
        endDate,
        status
      } = req.body;
  
     
      const existingOffer = await Offer.findOne({ offerCode: offerCode });
      if (existingOffer) {
        return res.status(400).json({
          success: false,
          message: "Offer code already exists. Please try a different code."
        });
      }
  
      
      const newOffer = new Offer({
        offerCode,
        title,
        description,
        offerType,
        discountType,
        discountValue: Number(discountValue),
        product: product === 'all' ? null : product ? new mongoose.Types.ObjectId(product) : undefined,
        category: category === 'all' ? null : category ? new mongoose.Types.ObjectId(category) : undefined,        
        startDate,
        endDate,
        status
      });
  
      await newOffer.save();
  
      
      await updateProductOfferPrice();
  
      res.status(201).json({
        success: true,
        message: "Offer created successfully",
        offer: newOffer
      });
    } catch (error) {
      console.error("Error creating offer:", error);
      res.status(500).json({
        success: false,
        message: "An error occurred while creating the offer"
      });
    }
  };
  
  const deleteOffer = async (req, res) => {
    try {
      const { offerId } = req.params;
      const offer = await Offer.findById(offerId);
      if (!offer) {
        return res.status(404).json({
          success: false,
          message: "Offer not found"
        });
      }
  
     
      const deletedOffer = await Offer.findByIdAndDelete(offerId);
      if (!deletedOffer) {
        return res.status(500).json({
          success: false,
          message: "Failed to delete offer",
        });
      }
  
     
      await updateProductOfferPrice();
  
      res.status(200).json({
        success: true,
        message: "Offer deleted successfully"
      });
    } catch (error) {
      console.error("Error deleting offer:", error);
      res.status(500).json({
        success: false,
        message: "An error occurred while deleting the offer"
      });
    }
  };
  
  const updateProductOfferPrice = async () => {
    try {
      
      const offers = await Offer.find().populate('product').populate('category').exec();
  
      
      await Product.updateMany({}, { offerPrice: 0 });
  
      for (const offer of offers) {
        let productsToUpdate = [];
  
        
        if (offer.product) {
          productsToUpdate = await Product.find({ _id: offer.product });
  
        
        } else if (offer.category) {
          productsToUpdate = await Product.find({ category: offer.category });
  
        
        } else if (!offer.product && !offer.category) {
          productsToUpdate = await Product.find({});
        }
  
        
        for (const product of productsToUpdate) {
  
          let offerValue;
  
       
          if (offer.discountType === 'percentage') {
            offerValue = product.salePrice * (offer.discountValue / 100);
          } else {
          
            offerValue = offer.discountValue;
          }
  
          
          const offerPrice = product.salePrice - offerValue;
  
          product.offerPrice = Math.max(offerPrice, 0);
  
          
          await product.save();
        }
      }
    } catch (error) {
      console.error("Error updating product offer prices:", error);
    }
  };
  
  


module.exports = {
    offer,
    createOffer,
    addOffer,
    deleteOffer,
    updateProductOfferPrice
  };