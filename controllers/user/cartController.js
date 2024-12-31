const User = require("../../models/userSchema");
const Category = require('../../models/categorySchema');
const Product = require('../../models/productSchema');
const Cart = require('../../models/cartSchema');
const mongoose = require("mongoose");
const env = require("dotenv").config();
const session = require('express-session');
const { use } = require("passport");
const { ObjectId } = mongoose.Types; // Import ObjectId



const addToCart = async (req, res) => {
    try {
        const { productId, quantity } = req.body;

        let userId ;
        if (req.user) {
            userId = req.user;
          } else if (req.session.user) {
            userId = req.session.user;
          }
        console.log('user id :',userId);
        
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
            // return res.status(400).json({ 
            //     message: 'This product is already in the cart.' 
            // });
            return res.json({ alreadyInCart: true });
        } else {
            const totalPrice = product.salePrice * quantityNumber;
            const price = product.regularPrice * quantityNumber;
            cart.items.push({
                productId: productId,
                price: price,
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
    
    try {
        let userId ;
    if (req.user) {
        userId = req.user;
      } else if (req.session.user) {
        userId = req.session.user;
      }
      
      console.log('userid :',userId);
      

        if (!userId) {
            return res.redirect('/login'); 
        }
        let cart = await Cart.findOne({ userId: userId })
        .populate({
          path: 'items.productId',
          populate: [{ path: 'brand' }, { path: 'category' }]
        })
        .exec();
  
         
          if (!cart) {
              cart = new Cart({
                  userId: userId,
                  items: []
              });
              await cart.save();
          }
  
          
          if (cart.items.length > 0 && cart.items.some(item => item.productId && item.productId.isBlocked)) {

              const blockedItems = cart.items.filter(item => item.productId.isBlocked);

              cart.items = cart.items.filter(item => !item.productId.isBlocked);
  
              for (const item of blockedItems) {
                  await Product.findByIdAndUpdate(item.productId, {
                      $inc: { quantity: item.quantity },
                  });
              }
              await cart.save();
          }
  
          
          let totalPrice = 0;
          let totalItems = 0;
          let distinctProductCount = 0;
          let totalDiscount = 0;  
          const deliveryCharges = 0;
          let cartUpdated = false;
          
  
          if (cart.items.length > 0) {
              const distinctProducts = new Set(); 
              
              for (const item of cart.items) {
                  if (item.productId) {

                    const currentPrice = item.productId.salePrice < item.productId.regularPrice 
                    ? item.productId.salePrice : item.productId.regularPrice;

                    const currentDiscountAmount =  item.productId.salePrice < item.productId.regularPrice 
                    ? item.productId.regularPrice - item.productId.salePrice : 0;
                            
             
            
                    if (item.price !== currentPrice || 
                    item.discountAmount !== currentDiscountAmount || 
                    item.regularPrice !== item.productId.regularPrice
                    ) {
                        item.price = currentPrice;
                        item.discountAmount = currentDiscountAmount;
                        item.regularPrice = item.productId.regularPrice;
                        cartUpdated = true;
                    }
        
                    totalPrice += item.regularPrice * item.quantity;
                    totalDiscount += currentDiscountAmount * item.quantity;
                    totalItems += item.quantity;
                    distinctProducts.add(item.productId._id.toString());
                }
            }
  
            distinctProductCount = distinctProducts.size;
  
      
            if (cartUpdated) {
            await cart.save();
            }
        }  
        const totalAmount = totalPrice - totalDiscount + deliveryCharges;
        
                
        return res.render("cart", { 
             
              cart, 
              totalItems, 
              totalPrice, 
              totalDiscount,  
              deliveryCharges, 
              totalAmount,
              distinctProductCount,
          });

    }catch (error) {
        console.error('Error fetching cart:', error);
        res.status(500).send('Internal Server Error');
    }
};


const MAX_QUANTITY_PER_PRODUCT = 5;
const updateQuantity = async (req, res) => {
    const { productId, change} = req.body;
    // const userId = req.session.user || req.user;

    let userId ;
    if (req.user) {
        userId = req.user;
      } else if (req.session.user) {
        userId = req.session.user;
      }
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

        
        if (newQuantity < 1) {
            return res.status(400).json({ 
                success: false, 
                error: 'Minimum quantity is 1. Use remove button instead.' 
            });
        }

       
        if (newQuantity > MAX_QUANTITY_PER_PRODUCT) {
            return res.status(400).json({ 
                success: false, 
                error: `Maximum quantity limit is ${MAX_QUANTITY_PER_PRODUCT}` 
            });
        }

       
        const product = await Product.findById(productId);
       

       
        const quantityDifference = change;
        product.quantity -= quantityDifference;
        product.status = product.quantity === 0 ? "Out of stock" : "Available";
        await product.save();

       
        cart.items[itemIndex].quantity = newQuantity;
        await cart.save();

        

        const cartSummary = calculateCartSummary(cart);

        res.json({
            success: true,
            updatedQuantity: newQuantity,
            productStatus: product.status,
            productQuantity: product.quantity,
            cartSummary
        });

    } catch (error) {
        console.error('Error updating quantity:', error);
        res.status(500).json({ 
            success: false, 
            error: 'An error occurred while updating the quantity' 
        });
    }
};


const calculateCartSummary = (cart) => {
    let totalPrice = 0;
    let totalDiscount=0;
    
    const deliveryCharges = 0;

    cart.items.forEach(item => {
        if (item.product) {
            let currentPrice = item.product.salePrice < item.product.regularPrice ? item.product.salePrice :item.product.regularPrice ;
                

            const discountAmount = item.product.regularPrice - currentPrice;
            
            //totalPrice += item.product.regularPrice * item.quantity;
            totalPrice += (currentPrice * item.quantity);
            

            console.log("total last : ", totalPrice);
            
            
            totalDiscount += discountAmount * item.quantity;
            console.log("total last disc: ", totalDiscount);
            
        }
    });

    const totalAmount = totalPrice - totalDiscount + deliveryCharges;
    //const totalAmount = currentPrice * item.quantity +deliveryCharges;

    return {
        totalPrice,
        totalDiscount,
        deliveryCharges,
        totalAmount
    };
};



const removeFromCart = async (req,res) =>{

    
    try {
        const  {productId} =req.body;
        let userId;

        if (req.user) {
            userId = req.user;
          } else if (req.session.user) {
            userId = req.session.user;
          }

          if (!userId) {
            return res.status(401).json({ success: false, message: 'User  not authenticated' });
        }
    

         let cart = await Cart.findOne({ userId }).populate('items.productId');
         console.log('cart detail : ',cart);

        if(!cart){
            return res.status(404).json({ success: false, message: 'Cart not found' });
        }
        
       // const itemIndex = cart.items.findIndex(item => item.productId.toString() ===productId);
       //const itemIndex = cart.items.findIndex(item => item.productId.toString() === mongoose.Types.ObjectId(productId).toString());
       const itemIndex = cart.items.findIndex(item => item.productId._id.equals(new ObjectId(productId)));
       console.log('item index: ', itemIndex)

        if (itemIndex === -1) {
            return res.status(404).json({ success: false, message: 'Item not found in cart' });
        }

        const itemToRemove = cart.items[itemIndex];

        cart.items.splice(itemIndex, 1);

        const product = await Product.findById(productId);

        product.quantity += itemToRemove.quantity;
        
        product.status = product.quantity > 0 ? "Available" : "Out of stock";
        await product.save();

        await cart.save();

        res.json({ success: true, message: 'Item removed from cart' });

    } catch (error) {
     
        console.error('Error removing item from cart:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    
    }
}


// const removeDeletedItem = async (req, res) => {
//     try {
//         const { itemId } = req.body;
//         console.log(itemId)

//         await Cart.updateMany(
//             { "items._id": itemId },
//             { $pull: { items: { _id: itemId } } }
//         );

//         res.json({ success: true, message: 'Deleted item removed from cart' });
        
//     } catch (error) {
//         console.error("Error in removing deleted item from cart:", error);
//         res.status(500).json({ success: false, message: 'Internal server error' });
//     } removeDeletedItem,
// };


module.exports = {
    addToCart,
    getCart,
    updateQuantity,
    removeFromCart,
  
}
