const Product = require('../../models/productSchema');
const Category = require('../../models/categorySchema');
const User = require('../../models/userSchema');
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const sharp = require("sharp");
//const { log } = require('console');


const getProductAddPage = async (req,res) => {
    try {
        const category = await Category.find({isListed: true });

        res.render("productsAdd", {
            cat:category,
           
        });


    } catch (error) {

        res.redirect("/admin/pageerror")
        
    }
};


const addProducts = async (req, res) => {
    try {
        const products = req.body;
        console.log("Request files:", req.files);

        const productExists = await Product.findOne({ productName: products.productName });
        
        if (productExists) {
            return res.status(400).json("Product already exists, please try with another name");
        } 

        const images = [];
                    
        if (req.files && req.files.length > 0) {
            for (let i = 0; i < req.files.length; i++) {
              const originalImagePath = req.files[i].path;
              console.log(`Originalfilename: ${req.files[i].filename}`);
    
              const resizedImagePath = path.join("public", "uploads", "product-images", req.files[i].filename);
              
              await sharp(originalImagePath)
                .resize({ width: 440, height: 440 })
                .toFile(resizedImagePath);
              images.push(req.files[i].filename);
        }
        } else {
            console.log("No files found in req.files");
        }

        console.log("Images array after processing:", images);

        const categoryId = await Category.findOne({ name: products.category });

        if (!categoryId) {
            return res.status(400).json("Invalid category name");
        }

        let productStatus = products.quantity > 0 ? "Available" : "Out of stock";

        const newProduct = new Product({
            productName: products.productName,
            description: products.description,
            SKUNumber: products.SKUNumber,
            category: categoryId._id,
            regularPrice: products.regularPrice,
            salePrice: products.salePrice,
            createdOn: new Date(),
            quantity: products.quantity,
            size: products.size,
            color: products.color,
            productImage: images,
            status: productStatus,
        });

        try {
            await newProduct.save();
            console.log("Product saved successfully:", newProduct);
        } catch (saveError) {
            console.error("Error saving product:", saveError);
            return res.redirect("/admin/pageerror");
        }

        return res.redirect("/admin/addProducts");
                
    } catch (error) {
        console.error("Error in addProducts:", error);
        return res.redirect("/admin/pageerror");
    }
};

module.exports ={
    getProductAddPage,
    addProducts,

}


