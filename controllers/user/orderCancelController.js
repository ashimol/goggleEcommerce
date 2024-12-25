const Order = require('../../models/orderSchema');
const Wallet = require('../../models/walletSchema');
const Product =require('../../models/productSchema');



const cancelOrder = async (req, res) => {
    try {
        console.log("Route hit - before cancelOrder");
        console.log("Parameters received:", {
            itemOrderId: req.params.itemOrderId,
            cancelReason: req.params.cancelReason
        });
        
        const { itemOrderId, cancelReason } = req.params;
        
        if (!itemOrderId) {
            throw new Error('ItemOrderId is required');
        }

        const order = await Order.findOne({ "items.itemOrderId": itemOrderId })
            .populate('userId')
            .populate('items.productId');

        console.log("Order found:", order ? 'Yes' : 'No');
        if (!order) {
            return res.status(404).json({ 
                success: false, 
                message: 'Order not found' 
            });
        }

        console.log("Payment details:", {
            method: order.payment[0]?.method,
            status: order.payment[0]?.status
        });

        const itemIndex = order.items.findIndex(item => item.itemOrderId === itemOrderId);
        console.log("Item index in order:", itemIndex);

        if (itemIndex === -1) {
            return res.status(404).json({ 
                success: false, 
                message: 'Item not found in order' 
            });
        }

        // Check if the item can be cancelled
        if (['Cancelled', 'Delivered', 'Return Requested', 'Return Approved', 'Return Rejected', 'Returned']
            .includes(order.items[itemIndex].itemOrderStatus)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Order cannot be cancelled in its current status' 
            });
        }

        const paymentMethod = order.payment[0].method;
        const paymentStatus = order.payment[0].status;

        // Update item status
        order.items[itemIndex].itemOrderStatus = 'Cancelled';
        order.items[itemIndex].cancelReason = cancelReason || "No reason provided";

        // Handle refund for online payments
        if (['Online Payment', 'WalletPayment'].includes(paymentMethod) && paymentStatus === "completed") {
            console.log("Processing refund for online payment");
            
            try {
                let wallet = null;
                
                // Check if user and wallet exist
                if (!order.userId) {
                    throw new Error('User reference is missing');
                }

                if (order.userId.wallet) {
                    wallet = await Wallet.findById(order.userId.wallet);
                    console.log("Existing wallet found:", wallet ? 'Yes' : 'No');
                }

                // Create new wallet if needed
                if (!wallet) {
                    console.log("Creating new wallet");
                    wallet = new Wallet({ balance: 0, transactions: [] });
                    await wallet.save();
                    
                    order.userId.wallet = wallet._id;
                    await order.userId.save();
                    console.log("New wallet created and linked to user");
                }

                // Process refund
                const itemTotal = order.items[itemIndex].price * order.items[itemIndex].quantity;
                console.log("Refund amount:", itemTotal);

                wallet.balance += itemTotal;
                wallet.transactions.push({
                    type: "credit",
                    amount: itemTotal,
                    description:` Refund for cancelled order item: ${itemOrderId}`,
                    date: new Date()
                });

                await wallet.save();
                console.log("Refund processed successfully");
            } catch (error) {
                console.error("Error processing refund:", error);
                throw new Error(`Refund processing failed: ${error.message}`);
            }
        }

        // Update product quantity
        const productId = order.items[itemIndex].productId._id;
        const returnQuantity = order.items[itemIndex].quantity;
        
        await Product.findByIdAndUpdate(
            productId,
            { $inc: { quantity: returnQuantity } },
            { new: true }
        );

        // Update overall order status if needed
        if (order.items.every(item => item.itemOrderStatus === 'Cancelled')) {
            order.status = 'Cancelled';
        }

        await order.save();
        console.log("Order updated successfully");

        res.status(200).json({ 
            success: true, 
            message: 'Order cancelled successfully' 
        });
        
    } catch (error) {
        console.error("Error in cancelOrder:", error);
        res.status(500).json({ 
            success: false, 
            message: 'Error cancelling order',
            error: error.message,
            stack: error.stack // Remove this in production
        });
    }
  };

module.exports = {
    cancelOrder,
  }
