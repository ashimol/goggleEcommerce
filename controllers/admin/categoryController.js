const Category = require('../../models/categorySchema');

const categoryInfo = async (req,res) =>{
    //if(req.session.admin){
    try {
        const page = parseInt(req.query.page) || 1;
        const limit =4;
        const skip=(page-1)*limit;

        const categoryData = await Category.find({})
        .sort({createdAt:-1})
        .skip(skip)
        .limit(limit);

        const totalCategories = await Category.countDocuments();
        const totalPages = Math.ceil(totalCategories/limit);
        res.render('category',{
            cat:categoryData,
            currentPage:page,
            totalPages:totalPages,
            totalCategories:totalCategories
        });
    } catch (error) {

        console.error(error);
        res.redirect('/pageerror');
        
        
    }
    // }else{
    //     res.redirect('/admin/login');
    // }
}

const addCategory = async (req, res) => {
    const { name, description } = req.body;
    console.log("Received data:", name, description); 

    try {
        const existingCategory = await Category.findOne({ name });
        if (existingCategory) {
            return res.status(400).json({ error: "Category already exists" });
        }
        const newCategory = new Category({ name, description });
        await newCategory.save();
        console.log("New category created:", newCategory); 
        return res.json({ message: "Category added successfully" });
    } catch (error) {
        console.error("Error creating category:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};

const getUnlistCategory = async (req, res) => {
    try {
        let id = req.query.id;
        await Category.updateOne({ _id: id }, { $set: { isListed: false } });
        console.log(`Category ${id} unlisted`);
        res.redirect("/admin/category");
    } catch (error) {
        res.redirect('/pageerror');
    }
};

const getListCategory = async (req, res) => {
    try {
        let id = req.query.id;
        await Category.updateOne({ _id: id }, { $set: { isListed: true } });
        console.log(`Category ${id} listed`);
        res.redirect("/admin/category");
    } catch (error) {
        res.redirect('/pageerror');
    }
};

const getEditCategory = async (req,res) =>{
    try {
        
        const id = req.query.id;
        const category =await Category.findOne({_id:id});
        res.render("edit-category",{category:category});

    } catch (error) {

        res.redirect('/pageerror');
        
    }

};

// const editCategory = async (req,res) =>{
//     try {
//         const id = req.params.id;
//         const {categoryName,description} = req.body;
//         const existingCategory = await Category.findOne({name:categoryName ,description:description});

//         if(existingCategory){
//             return res.status(400).json({error:"Category exists ,Please choose anotheer name"});
//         }

//         const updateCategory = await Category.findByIdAndUpdate(id,{
//             name:categoryName,
//             description:description,
//         },{new:true});

//         if(updateCategory){
//             res.redirect('/admin/category');

//         }else{
//             res.status(404).json({erro:"Category not found"});
//         }

//     } catch (error) {
//         res.status(500).json({error:"Internal Server Error"})
        
//     }
// }



const editCategory = async (req, res) => {
    try {
        const id = req.params.id;
        const { categoryName, description } = req.body;
    
        console.log(`Editing category ${id}. New name: ${categoryName}, New description: ${description}`);

        const currentCategory = await Category.findById(id);
        if (!currentCategory) {
            console.log(`Category with id ${id} not found`);
            return res.status(404).json({ error: "Category not found" });
        }
    
        if (currentCategory.name !== categoryName) {
            console.log(`Category name changed from ${currentCategory.name} to ${categoryName}. Checking for duplicates.`);
            const existingCategory = await Category.findOne({ name: categoryName });
            if (existingCategory && existingCategory._id.toString() !== id) {
                console.log(`Duplicate category name found: ${categoryName}`);
                return res.status(400).json({ error: "Category exists, please choose another name" });
            }
        }
        
        const updatedCategory = await Category.findByIdAndUpdate(id, {
            name: categoryName,
            description: description,
        }, { new: true });

        if (updatedCategory) {
            console.log(`Category updated successfully: ${JSON.stringify(updatedCategory)}`);
            res.status(200).json({ message: "Category updated successfully" });
        } else {
            console.log(`Failed to update category ${id}`);
            res.status(404).json({ error: "Category not found" });
        }
    } catch (error) {
        console.error('Error in editCategory:', error);
        res.status(500).json({ error: "Internal server error" });
    }
};


module.exports ={
    categoryInfo,
    addCategory,
    getListCategory,
    getUnlistCategory,
    getEditCategory,
    editCategory,

}