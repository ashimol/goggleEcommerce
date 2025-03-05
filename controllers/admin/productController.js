const Product = require('../../models/productSchema');
const Category = require('../../models/categorySchema');
const Brand=require("../../models/brandSchema");
const User = require('../../models/userSchema');

const fs = require("fs");
const path = require("path");
const multer = require("multer");
const sharp = require("sharp");



const getProductAddPage = async (req,res) => {
    try {
        const category = await Category.find({isListed: true });
        const brand=await Brand.find({isBlocked:false});

        res.render("productsAdd", {
            cat:category,
            brand:brand
           
        });


    } catch (error) {

        res.redirect("/admin/pageerror")
        
    }
};


const addProducts = async (req, res) => {

    try {

        console.log("Request Body:", req.body);
        console.log("Files:", req.files);


        const products = req.body;
        const productExists = await Product.findOne({ productName: products.productName });
        
        if (productExists) {
            return res.status(400).json("Product already exists, please try with another name");
        } else {
            let images = [];
            
            if (req.files && req.files.length > 0) {
                for (let i = 0; i < req.files.length; i++) {
                    const originalImagePath = req.files[i].path;
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
    
            console.log(products.brand);
            
            const brandId = await Brand.findOne({name:products.brand});
            console.log('brandId :',brandId);
            
            if (!brandId) {
                return res.status(400).json("Invalid brand ID");
            }
            
            const categoryId = await Category.findOne({ name: products.category });
            
            if (!categoryId) {
                return res.status(400).json("Invalid category name");
            }
            
            let productStatus = products.quantity > 0 ? "Available" : "Out of stock";         
            
          
            
            const newProduct = new Product({
                productName : products.productName,
                description: products.description,
                brand: brandId._id,
                category: categoryId._id,
                regularPrice: products.regularPrice,
                salePrice:products.salePrice,
                createdOn: new Date(),
                quantity: products.quantity,
                color: products.color,
                productImage: images,
                status: productStatus,
            });
            console.log("product :" ,newProduct);

            await newProduct.save();

           

            return res.redirect("/admin/addProducts");
        }
    } catch (error) {
        console.error("Error Saving product", error);
        return res.redirect("/admin/pageerror");
    }
};

// const addProducts = async (req, res) => {
//     try {
//         const products = req.body;
//         console.log("Request files:", req.files);

//         const productExists = await Product.findOne({ productName: products.productName });
        
//         if (productExists) {
//             return res.status(400).json("Product already exists, please try with another name");
//         } 

//         const images = [];
                    
//         if (req.files && req.files.length > 0) {
//             for (let i = 0; i < req.files.length; i++) {
//               const originalImagePath = req.files[i].path;
//               console.log(`Originalfilename: ${req.files[i].filename}`);
    
//               const resizedImagePath = path.join("public", "uploads", "product-images", req.files[i].filename);
              
//               await sharp(originalImagePath)
//                 .resize({ width: 440, height: 440 })
//                 .toFile(resizedImagePath);
//               images.push(req.files[i].filename);
//         }
//         } else {
//             console.log("No files found in req.files");
//         }

//         console.log("Images array after processing:", images);

//         const brandId = await Brand.findOne({name:products.brand});

//         console.log(brandId);

//             if (!brandId) {
//                 return res.status(400).json("Invalid brand ID");
//             }

//         const categoryId = await Category.findOne({ name: products.category });

//         if (!categoryId) {
//             return res.status(400).json("Invalid category name");
//         }

//         let productStatus = products.quantity > 0 ? "Available" : "Out of stock";

//         const newProduct = new Product({
//             productName: products.productName,
//             description: products.description,
//             brand: brandId._id,
//             category: categoryId._id,
//             regularPrice: products.regularPrice,
//             salePrice: products.salePrice,
//             createdOn: new Date(),
//             quantity: products.quantity,
//             color: products.color,
//             productImage: images,
//             status: productStatus,
//         });

//         try {
//             await newProduct.save();
//             console.log("Product saved successfully:", newProduct);
//         } catch (saveError) {
//             console.error("Error saving product:", saveError);
//             return res.redirect("/admin/pageerror");
//         }

//         return res.redirect("/admin/products");
                
//     } catch (error) {
//         console.error("Error in addProducts:", error);
//         return res.redirect("/admin/pageerror");
//     }
// };

const getAllProduct = async (req,res) =>{
    try {
         const search = req.query.search || "";
         const page =req.query.page || 1;
         const limit =4;

         const productData = await Product.find({
            $or:[
                {productName:{$regex:new RegExp(".*"+search+".*","i")}},
            ],
         })
         .limit(limit*1)
         .skip((page-1)*limit)
         .populate('category')
         .populate('brand')   
         .exec();

         const count = await Product.find({
            $or:[
                { productName:{$regex:new RegExp(".*"+search+".*","i")}},
            ],
         }).countDocuments();

         const category = await Category.find({isListed:true});
         const brand = await Brand.find({ isListed: true });

         if(category && brand){
            res.render("products",{
                data:productData,
                currentPage:page,
                totalPages:Math.ceil(count/limit),
                cat:category, 
                brand: brand  
             })
         }else{
            res.render("page-404");
         }

    } catch (error) {
        
        res.redirect("/pageerror");
    }
};

const blockProduct = async (req,res) =>{
    try {
        
        let id = req.query.id;
        await Product.updateOne({_id:id},{$set:{isBlocked:true}});
        res.redirect("/admin/products");

    } catch (error) {

        res.redirect('pageerror');
        
    }
};

const unblockProduct = async (req,res) =>{
    try {
        let id= req.query.id;

        await Product.updateOne({_id:id},{$set:{isBlocked:false}});
        
        res.redirect("/admin/products");

    } catch (error) {
        
        res.redirect("/pageerror");
    }
};

const getEditProduct = async (req,res) =>{
    try {
        
        const id =req.query.id;
        const product = await Product.findOne({_id:id});
        const category = await Category.find({});
        const brand = await Brand.find();
        
        res.render('edit-product',{
            product:product,
            cat:category,
            brand:brand
        })
    } catch (error) {
        
        res.redirect('/pageerror');
    }
};




// const editProduct = async (req, res) => {
    
//     try {

//         console.log('Received edit product request:', req.body);
//         const id = req.params.id;

//         const product = await Product.findOne({ _id: id });

//         if (!product) {
//             return res.status(404).json({ error: "Product not found" });
//         }
        
//         const data = req.body;
        
//         console.log('Checking for existing product...');
//         const existingProduct = await Product.findOne({
//             productName: data.productName,
//             _id: { $ne: id }
//         });
        
//         if (existingProduct) {
//             console.log('Product with this name already exists');
//             return res.status(400).json({ error: "Product with this name already exists. Please try with another name" });
//         }


//         const category = await Category.findOne({ name: data.category });
//         if (!category) {
//             return res.status(400).json({ error: "Invalid category name" });
//         }

//         const brand = await Brand.findOne({ name: data.brand });
//         if (!brand) { 
//             return res.status(400).json({ error: "Invalid Brand name" });
//         }
        
//         console.log('Processing images...');
//         const images = [];

//         if (req.files && req.files.length > 0) {
//             for (let i = 0; i < req.files.length; i++) {

//                 images.push(req.files[i].filename);
                
//             }
//         }
        
       
//         console.log('Preparing update fields...');

       

//         const updateFields = {
//             productName: data.productName,
//             description: data.descriptionData,
//             category: category._id, 
//             brand: brand._id,
//             regularPrice: data.regularPrice,
//             salePrice:data.regularPrice,
//             color: data.color,
//             quantity:data.quantity,
//         };

       
//         if (data.category) {
          
//             const category = await Category.findOne({ name: data.category });
//             if (category) {
//                 updateFields.category = category._id;
//             } else {
//                 console.log('Category not found:', data.category);
                
//             }
//         }
        
//         if (req.files.length > 0) {
//             updateFields.$push = { productImage: { $each: images } };
//         }
        
//         console.log('Updating product...');
//         const updatedProduct = await Product.findByIdAndUpdate(id, updateFields, { new: true });

       
//         if (!updatedProduct) {
//             console.log('Failed to update product');
//             return res.status(500).json({ error: "Failed to update product" });
//         }
        
//         console.log('Product updated successfully');
//         res.redirect("/admin/products");
//     } catch (error) {
//         console.error('Error in editProduct:', error);
//         res.status(500).json({ error: 'An error occurred while updating the product. Please try again.', details: error.message });
//     }
// };



const editProduct = async (req, res) => {
    try {
        console.log("Request Body:", req.body);
        console.log("Files:", req.files);
        
        const id = req.params.id;
        const product = await Product.findOne({ _id: id });
        
        if (!product) {
            return res.status(404).json({ error: "Product not found" });
        }
        
        const data = req.body;
        const existingProduct = await Product.findOne({
            productName: data.productName,
            _id: { $ne: id }
        });
        
        if (existingProduct) {
            return res.status(400).json({ error: "Product already exists, please try with another name" });
        }

        let images = [...product.productImage]; 
        
        if (req.files && req.files.length > 0) {
            // Check total number of images won't exceed 3
            if (images.length + req.files.length > 3) {
                return res.status(400).json({ error: "Maximum 3 images allowed. Please remove existing images first." });
            }

            // Process new images
            for (let i = 0; i < req.files.length; i++) {
                const originalImagePath = req.files[i].path;
                const resizedImagePath = path.join("public", "uploads", "product-images", req.files[i].filename);

                await sharp(originalImagePath)
                    .resize({ width: 440, height: 440 })
                    .toFile(resizedImagePath);
                images.push(req.files[i].filename);
            }
        }

        const brandId = await Brand.findOne({ name: data.brand });
        if (!brandId) {
            return res.status(400).json("Invalid brand ID");
        }

        const categoryId = await Category.findOne({ name: data.category });
        if (!categoryId) {
            return res.status(400).json("Invalid category name");
        }

        let productStatus = data.quantity > 0 ? "Available" : "Out of stock";

        const updateFields = {
            productName: data.productName,
            description: data.descriptionData,
            brand: brandId._id,
            category: categoryId._id,
            regularPrice: data.regularPrice,
            salePrice: data.regularPrice,
            quantity: data.quantity,
            color: data.color,
            productImage: images,
            status: productStatus
        };

        const updatedProduct = await Product.findByIdAndUpdate(
            id, 
            updateFields,
            { new: true }
        );

        if (!updatedProduct) {
            return res.status(500).json({ error: "Failed to update product" });
        }

        return res.redirect("/admin/products");
    } catch (error) {
        console.error("Error updating product", error);
        return res.redirect("/admin/pageerror");
    }
};

const deleteSingleImage = async (req, res) => {
    try {
        const { imageNameToServer, productIdToServer } = req.body;
        
        const product = await Product.findById(productIdToServer);
        if (!product) {
            return res.status(404).json({ status: false, message: "Product not found" });
        }

        // Remove image from array
        const updatedImages = product.productImage.filter(img => img !== imageNameToServer);
        
        // Update product
        await Product.findByIdAndUpdate(productIdToServer, {
            productImage: updatedImages
        });

        // Delete file from filesystem
        const imagePath = path.join("public", "uploads", "product-images", imageNameToServer);
        if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
        }

        res.json({ status: true });
    } catch (error) {
        console.error("Error deleting image:", error);
        res.status(500).json({ status: false, message: "Error deleting image" });
    }
};

const addProductOffer = async (req, res) => {
    try {
        const { productId, percentage } = req.body;
        const product = await Product.findOne({ _id: productId });

        if (product === 'false') {
            return res.json({ status: false, message: 'Product not found' });
        }

        product.productOffer = percentage;
        product.salePrice = product.salePrice - Math.floor(product.regularPrice * (percentage / 100));
        await product.save();

        res.json({ status: true });
    } catch (error) {
        console.error(error);
        res.json({ status: false, message: 'An error occurred' });
    }
};



const removeProductOffer=async(req,res)=>{
    try {
        const {productId}=req.body;

        const findProduct=await Product.findOne({_id:productId});

        const percentage=findProduct.productOffer;

        findProduct.salePrice=findProduct.salePrice+Math.floor(findProduct.regularPrice*(percentage/100));

         findProduct.productOffer=0;

         await findProduct.save();
         
         res.json({status:true});
  
    } catch (error) {
        res.redirect("/pageerror");
    }
  }



module.exports ={
    getProductAddPage,
    addProducts,
    getAllProduct,
    blockProduct,
    unblockProduct,
    getEditProduct,
    editProduct,
    addProductOffer,
    removeProductOffer,
    deleteSingleImage
    
}