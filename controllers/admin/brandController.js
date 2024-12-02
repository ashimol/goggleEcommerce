const Brand = require("../../models/brandSchema");

const Product = require("../../models/productSchema")



const brandInfo = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 4;
        const skip = (page - 1) * limit;

        const search = req.query.search ? req.query.search.trim() : '';

       
        const query = search ? { name: { $regex: search, $options: 'i' } } : {};

        const brandData = await Brand.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const totalBrands = await Brand.countDocuments(query);
        const totalPages = Math.ceil(totalBrands / limit);

        res.render("brand", {
            brand: brandData,
            currentPage: page,
            totalPages: totalPages,
            totalBrands: totalBrands
        });

    } catch (error) {
        console.error(error);
        res.redirect("/admin/pageerror");
    }
};


const addBrand = async (req, res) => {
    const {name, description} = req.body;
    try {
        const existingBrand = await Brand.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
        if(existingBrand) {
            return res.status(400).json({error: "Brand already exists"})
        }
        const newBrand = new Brand({
            name,
            description
        })
        await newBrand.save();
        return res.json({message: "Brand added successfully"})
    } catch (error) {
        console.error('Error adding brand:', error);
        return res.status(500).json({error: "Internal Server Error"})
    }
}


const getBrands = async (req, res) => {
    try {
        const brands = await Brand.find({}).sort({ createdAt: -1 });
        const brandNames = brands.map(brand => brand.name);
        res.json({ brands, brandNames });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}


// const addBrandOffer = async (req,res)=> {
//     try {
//         const percentage = parseInt(req.body.percentage);
//         const brandId = req.body.brandId;
//         const brand = await Brand.findById(brandId);
//         if(!brand){
//             return res.status(404).json({status:false, message:"Brand not found"});
//         }
//         const products = await Product.find({brand:brand._id});
//         const hasProductOffer = products.some((product)=>product.productOffer > percentage);
//         if(hasProductOffer){
//             return res.json({status:false , message:"Products within this brand already have product offfers"})
//         }
//         await Brand.updateOne({_id:brandId}, {$set: {brandOffer:percentage}});

//         for(const product of products){
//           product.productOffer = 0;
//           product.salesPrice = product.regularPrice;
//           await  product.save();
//         }
        
//         res.json({status:true})

//     } catch (error) {
//         res.status(500).json({ status: false, message:"Internal Server Error"});
//     }
// }

// const removeBrandOffer = async (req,res)=> {
//     try {
//         const brandId = req.body.brandId;
//         const brand = await Brand.findById(brandId);

//         if(!brand){
//             return res.status(404).json({status:false, message:"Brand not found"})
//         }
//         const percentage = brand.brandOffer;
//         const products = await Product.find({brand:brand._id});

//         if(products.length > 0) {
//             for(const product of products){
//                 product.salesPrice += Math.floor(product.regularPrice * (percentage/100));
//                 product.productOffer = 0;
//                 await product.save();
//             }
//         };
//         brand.brandOffer = 0;
//         await brand.save()
//         res.json({status:true});
//     } catch (error) {
//         res.status(500).json({status:false, message:"Internal Server Error"})
//     }
// }


const getListBrand = async (req, res) => {
    try {
        let id = req.query.id;
       
        await Brand.updateOne({ _id: id }, { $set: { isBlocked: true } });
        res.redirect("/admin/brand");
    } catch (error) {
        res.redirect("/pageerror");
    }
};

const getUnListBrand = async (req, res) => {
    try {
        let id = req.query.id;
       
        await Brand.updateOne({ _id: id }, { $set: { isBlocked: false } });
        res.redirect("/admin/brand");
    } catch (error) {
        res.redirect("/admin/pageerror");
    }
};

const getEditBrand = async (req,res) => {
    try {
        const id = req.query.id;
        const brand = await Brand.findOne({_id:id});
        res.render("edit-brand",{brand:brand});
    } catch (error) {
        res.redirect("/admin/pageerror")
    }
}


const editBrand = async (req, res) => {
    try {
        const id = req.params.id;
        const { brandName, description } = req.body;

        const currentBrand = await Brand.findById(id);
        if (!currentBrand) {

            return res.status(404).json({ error: "Brand not found" });
        }
    
        if (currentBrand.name !== brandName) {
        
            const existingBrand = await Brand.findOne({ name: brandName });
            if (existingBrand && existingBrand._id.toString() !== id) {
                return res.status(400).json({ error: "Brand exists, please choose another name" });
            }
        }
        
        const updatedBrand = await Brand.findByIdAndUpdate(id, {
            name: brandName,
            description: description,
        }, { new: true });

        if (updatedBrand) {
        
            res.status(200).json({ message: "Brand updated successfully" });
        } else {
    
            res.status(404).json({ error: "Brand not found" });
        }
    } catch (error) {
        console.error('Error in editBrand:', error);
        res.status(500).json({ error: "Internal server error" });
    }
};


const deleteBrand = async (req, res) => {
    try {
      const id = req.query.id;
  
  
      const deletedProducts = await Product.deleteMany({ brand: id });
  
     
      const deletedBrand = await Brand.findByIdAndDelete(id);
  
      if (deletedBrand) {
        res.json({ 
          status: true, 
          message: `Brand and ${deletedProducts.deletedCount} products successfully deleted` 
        });
      } else {
        res.status(404).json({ status: false, message: 'Brand not found' });
      }
    } catch (error) {
      res.status(500).json({ status: false, message: 'Internal server error' });
    }
  };
  
  


module.exports ={
    brandInfo,
    addBrand,
    getBrands,
    getListBrand,
    getUnListBrand,
    getEditBrand,
    editBrand,
    deleteBrand

}