const Product = require('../../models/productSchema');
const Category = require('../../models/categorySchema');
const User = require('../../models/userSchema');
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const sharp = require("sharp");



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

        return res.redirect("/admin/products");
                
    } catch (error) {
        console.error("Error in addProducts:", error);
        return res.redirect("/admin/pageerror");
    }
};

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
         .exec();

         const count = await Product.find({
            $or:[
                { productName:{$regex:new RegExp(".*"+search+".*","i")}},
            ],
         }).countDocuments();
         const category = await Category.find({isListed:true});
         if(category){
            res.render("products",{
                data:productData,
                currentPage:page,
                totalPages:Math.ceil(count/limit),
                cat:category,   
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
        res.render('edit-product',{
            product:product,
            cat:category,

        })
    } catch (error) {
        
        res.redirect('/pageerror');
    }
};



// const editProduct = async (req, res) => {
//     try {
//         const id = req.params.id;
//         const data = req.body;

//         const existingProduct = await Product.findOne({
//             productName: data.productName,
//             _id: { $ne: id }
//         });

//         if (existingProduct) {
//             return res.status(400).json({ error: "Product with this name already exists. Please try another name." });
//         }

//         const category = await Category.findOne({ name: data.category });
//         if (!category) {
//             return res.status(400).json({ error: "Invalid category name" });
//         }

//         const updateFields = {
//             productName: data.productName,
//             category: category._id, 
//             regularPrice: data.regularPrice,
//             salePrice: data.salePrice,
//             quantity: data.quantity,
            
//         };

       
//         const currentProduct = await Product.findById(id);
//         let updatedImages = [...currentProduct.productImage];

//         for (let i = 0; i < 3; i++) {

//             if (req.files[`images${i+1}`] && req.files[`images${i+1}`].length > 0) {
              
//                 let originalImagePath = req.files[`images${i+1}`][0].path;
//                 let filename = `product_${id}_${i+1}_${Date.now()}.jpg`;
//                 let resizedImagePath = path.join('public', 'uploads', 're-images', filename);

//                 await sharp(originalImagePath)
//                     .resize({ width: 440, height: 440 })
//                     .toFile(resizedImagePath);

            
//                 try {
//                     if (fs.existsSync(originalImagePath)) {
//                         fs.unlinkSync(originalImagePath);
//                         console.log(`Original file ${originalImagePath} deleted successfully`);
//                     }
//                 } catch (err) {
//                     console.error('Error deleting original file:', err);
//                 }

               
//                 if (i < updatedImages.length) {
                  
//                     if (updatedImages[i]) {
//                         let oldImagePath = path.join('public', 'uploads', 're-images', updatedImages[i]);
//                         try {
//                             if (fs.existsSync(oldImagePath)) {
//                                 fs.unlinkSync(oldImagePath);
//                                 console.log(`Old image file ${oldImagePath} deleted successfully`);
//                             }
//                         } catch (err) {
//                             console.error('Error deleting old image file:', err);
//                         }
//                     }
//                     updatedImages[i] = filename;
//                 } else {
//                     updatedImages.push(filename);
//                 }
//             }
//         }

       
//         while (updatedImages.length > 3) {
//             let removedImage = updatedImages.pop();
//             let removedImagePath = path.join('public', 'uploads', 'product-images', removedImage);
//             try {
//                 if (fs.existsSync(removedImagePath)) {
//                     fs.unlinkSync(removedImagePath);
//                     console.log(`Excess image file ${removedImagePath} deleted successfully`);
//                 }
//             } catch (err) {
//                 console.error('Error deleting excess image file:', err);
//             }
//         }

//         updateFields.productImage = updatedImages;



//         const updatedProduct = await Product.findByIdAndUpdate(id, updateFields, { new: true });

//         // if (updatedProduct.quantity == 0) {
//         //     updatedProduct.status = "out of stock";
//         // } else {
//         //     updatedProduct.status = "Available";
//         // }

//         await updatedProduct.save();

        
//         res.redirect("/admin/products");

//     } catch (error) {
//         console.error(error);
//         res.redirect("/admin/pageerror");
//     }
// };

const editProduct = async (req, res) => {
    try {
        console.log('Received edit product request:', req.body);
        const id = req.params.id;
        const product = await Product.findOne({ _id: id });
        if (!product) {
            return res.status(404).json({ error: "Product not found" });
        }
        
        const data = req.body;
        
        console.log('Checking for existing product...');
        const existingProduct = await Product.findOne({
            productName: data.productName,
            _id: { $ne: id }
        });
        
        if (existingProduct) {
            console.log('Product with this name already exists');
            return res.status(400).json({ error: "Product with this name already exists. Please try with another name" });
        }
        
        console.log('Processing images...');
        const images = [];

        if (req.files && req.files.length > 0) {
            for (let i = 0; i < req.files.length; i++) {
                images.push(req.files[i].filename);
            }
        }
        
       
        console.log('Preparing update fields...');

        const updateFields = {
            productName: data.productName,
            description: data.descriptionData,
            regularPrice: data.regularPrice,
            salePrice: data.salePrice,
            color: data.color,
            
        };

        // Handle category update
        if (data.category) {
            // If category is stored as ObjectId in the database
            const category = await Category.findOne({ name: data.category });
            if (category) {
                updateFields.category = category._id;
            } else {
                console.log('Category not found:', data.category);
                // Handle the case where the category doesn't exist
                // You might want to create a new category here, or skip updating this field
            }
        }
        
        if (req.files.length > 0) {
            updateFields.$push = { productImage: { $each: images } };
        }
        
        console.log('Updating product...');
        const updatedProduct = await Product.findByIdAndUpdate(id, updateFields, { new: true });

       
        if (!updatedProduct) {
            console.log('Failed to update product');
            return res.status(500).json({ error: "Failed to update product" });
        }
        
        console.log('Product updated successfully');
        res.redirect("/admin/products");
    } catch (error) {
        console.error('Error in editProduct:', error);
        res.status(500).json({ error: 'An error occurred while updating the product. Please try again.', details: error.message });
    }
};

const deleteSingleImage = async (req,res)=>{
    try {
        
      const {imageNameToServer,productIdToServer} = req.body;
      const product = await Product.findByIdAndUpdate(productIdToServer,{$pull:{productImage:imageNameToServer}});
      const imagePath = path.join("public","uploads","re-images",imageNameToServer);
      if(fs.existsSync(imagePath)){
        await fs.unlinkSync(imagePath);
        console.log(`Image ${imageNameToServer} deleted succesfully`);
      }else{
        console.log(`Image ${imageNameToServer} not found`);
      }
      res.send({status:true});

    } catch (error) {
        
    res.redirect("/pageerror")

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
    deleteSingleImage,
    
}


