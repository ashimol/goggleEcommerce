const Product = require('../../models/productSchema');
const Category = require('../../models/categorySchema');
const User = require('../../models/userSchema');

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');


const getProductAddPage = async (req,res) =>{

    try {
        
        const category = await Category.find({isListed:true});
        res.render('productsAdd',{
            cat:category,
        });


    } catch (error) {
        console.log(error);
        
        res.redirect('/pageerror');
    }
}

module.exports ={
    getProductAddPage,
}