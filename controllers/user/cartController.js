const User = require("../../models/userSchema");
const Category = require('../../models/categorySchema');
const Product = require('../../models/productSchema');
const Cart = require('../../models/cartSchema');
const mongoose = require("mongoose");
const env = require("dotenv").config();
const session = require('express-session');

// const addToCart = async (req, res) => {
//     try {
//         const { productId ,quantity} = req.body;
//         const userId = req.session.user?._id || req.user?._id;

//         console.log('Received in server:', { productId,quantity, userId });

//         if (!userId) {
//             return res.status(401).json({ message: 'Please login' });
//         }

//         const product = await Product.findById(productId);

//         if (!product) {
//             return res.status(404).json({ message: 'Product not found' });
//         }


//         const quantityNumber = parseInt(quantity, 10);
//         if (isNaN(quantityNumber) || quantityNumber <= 0) {
//             return res.status(400).json({ message: 'Invalid quantity' });
//         }
       
//         // Check if requested quantity exceeds available quantity
//         // if (quantity > sizeDetails.quantity) {
//         //     return res.status(400).json({ 
//         //         message:` Only ${sizeDetails.quantity} units available for size ${selectedSize}.` 
//         //     });
//         // }

//         let cart = await Cart.findOne({ userId });

//         if (!cart) {
//             cart = new Cart({ userId, items: [] });
//         }

//         const itemIndex = cart.items.findIndex(item =>
//             item.productId.toString() === productId 
//         );

//         if (itemIndex > -1) {
//             return res.status(400).json({ 
//                 message: 'This product is already in the cart.' 
//             });
//         } else {
//             const totalPrice = product.salePrice * quantityNumber;
//             cart.items.push({
//                 productId: productId,
//                 price:  product.salePrice,
//                 totalPrice:totalPrice,
//                 quantity:quantityNumber,
//                 status:'placed',
//                 cancellationReason:'none',
                

//             });
//         }

//         //Reduce the quantity from the product size
//         // quantity -= quantity;

//         // if (quantity === 0) {
//         //     product.status = "out of stock";
//         // }

//         console.log('Cart before saving:', JSON.stringify(cart, null, 2));
//         console.log('Product after quantity update:', JSON.stringify(product, null, 2));

//         // Save both cart and product updates
//         await cart.save();
//         await product.save();

//         res.json({ message: 'Product added to cart successfully.' });
//     } catch (error) {
//         console.error('Error adding to cart:', error);
//         res.status(500).json({ message: 'Internal Server Error', error: error.message });
//     }
// };



const addToCart = async (req, res) => {
    try {
        const { productId, quantity } = req.body;

        let userId ;
        if (req.user) {
            userId = req.user;
          } else if (req.session.user) {
            userId = req.session.user;
          }

        console.log('Received in server:', { productId, quantity, userId });

        if (!userId) {
            return res.status(401).json({ message: 'Please login' });
        }

        const product = await Product.findById(productId);

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        const quantityNumber = parseInt(quantity, 10);
        if (isNaN(quantityNumber) || quantityNumber <= 0) {
            return res.status(400).json({ message: 'Invalid quantity' });
        }

        // Check if requested quantity exceeds available quantity
        if (quantityNumber > product.quantity) {
            return res.status(400).json({ 
                message: `Only ${product.quantity} units available.` 
            });
        }

        let cart = await Cart.findOne({ userId });

        if (!cart) {
            cart = new Cart({ userId, items: [] });
        }

        const itemIndex = cart.items.findIndex(item =>
            item.productId.toString() === productId 
        );

        if (itemIndex > -1) {
            return res.status(400).json({ 
                message: 'This product is already in the cart.' 
            });
        } else {
            const totalPrice = product.salePrice * quantityNumber;
            cart.items.push({
                productId: productId,
                price: product.salePrice,
                totalPrice: totalPrice,
                quantity: quantityNumber,
                //status: 'placed',
                cancellationReason: 'none',
            });

            // Reduce the quantity from the product
            product.quantity -= quantityNumber;

            // If quantity reaches zero, mark as out of stock
            if (product.quantity <= 0) {
                product.status = "Out of Stock";
            }
        }

        console.log('Cart before saving:', JSON.stringify(cart, null, 2));
        console.log('Product after quantity update:', JSON.stringify(product, null, 2));

        // Save both cart and product updates
        await cart.save();
        await product.save();

        res.json({ message: 'Product added to cart successfully.' });
    } catch (error) {
        console.error('Error adding to cart:', error);
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
};


const getCart = async (req, res) => {
    let userId ;
    if (req.user) {
        userId = req.user;
      } else if (req.session.user) {
        userId = req.session.user;
      }


    if (!userId) {
        return res.redirect('/login'); // Redirect to login if not authenticated
    }

    try {
        const cart = await Cart.findOne({ userId }).populate('items.productId');
        res.render('cart', { cart }); // Render the cart page with cart data
    } catch (error) {
        console.error('Error fetching cart:', error);
        res.status(500).send('Internal Server Error');
    }
};


const MAX_QUANTITY_PER_PRODUCT = 5;
const updateQuantity = async (req, res) => {
    const { productId, change} = req.body;
    const userId = req.session.user || req.user;

    try {
        let cart = await Cart.findOne({ userId }).populate('items.productId');
        if (!cart) {
            return res.status(404).json({ success: false, error: 'Cart not found' });
        }

        const itemIndex = cart.items.findIndex(item => 
            item.productId._id.toString() === productId           
        );

        if (itemIndex === -1) {
            return res.status(404).json({ success: false, error: 'Item not found in cart' });
        }

        const item = cart.items[itemIndex];
        const newQuantity = item.quantity + change;

        // Validate minimum quantity
        if (newQuantity < 1) {
            return res.status(400).json({ 
                success: false, 
                error: 'Minimum quantity is 1. Use remove button instead.' 
            });
        }

        // Validate maximum quantity
        if (newQuantity > MAX_QUANTITY_PER_PRODUCT) {
            return res.status(400).json({ 
                success: false, 
                error: `Maximum quantity limit is ${MAX_QUANTITY_PER_PRODUCT}` 
            });
        }

        // Check stock availability
        const product = await Product.findById(productId);
       // const sizeIndex = product.sizes.findIndex(s => s.size === size);
        
        // if (sizeIndex === -1 || product.sizes[sizeIndex].quantity < newQuantity) {
        //     return res.status(400).json({ 
        //         success: false, 
        //         error: 'Not enough stock available' 
        //     });
        // }

        // Update stock quantity
        const quantityDifference = change;
        product.quantity -= quantityDifference;
        product.status = product.quantity === 0 ? "Out of stock" : "Available";
        await product.save();

        // Update cart quantity
        cart.items[itemIndex].quantity = newQuantity;
        await cart.save();

        // Calculate updated cart summary
        //const cartSummary = calculateCartSummary(cart);

        res.json({
            success: true,
            updatedQuantity: newQuantity,
            productStatus: product.status,
            productQuantity: product.quantity,
            //cartSummary
        });

    } catch (error) {
        console.error('Error updating quantity:', error);
        res.status(500).json({ 
            success: false, 
            error: 'An error occurred while updating the quantity' 
        });
    }
};
module.exports = {
    addToCart,
    getCart,
    updateQuantity,
}
