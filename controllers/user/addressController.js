const User = require('../../models/userSchema');
const Address = require('../../models/addressSchema');
const session = require("express-session");


const userAddress = async (req,res) =>{

    try {
       // const userId = req.session.user || req.user;

       let userId ;
        
        if (req.user) {
            userId = req.user;
        } else if (req.session.user) {
            userId = req.session.user;
        }

        if (!userId) {
            return res.status(401).send('User not authenticated');
        }

        const user = await User.findById(userId)
        .populate('address')
        .populate({
            path: "cart",
            populate: {
                path: "items.productId", // Populate productId within items array
                model: "Product",       // Refers to the Product model
            },
        })
        .exec();
        

        if (!user || user.address.length === 0) {
            //console.log('No addresses found');
            return res.render('address', { 
                user:user,
                address: [], 
                currentPage: 1, 
                totalPages: 1 
            });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = 1; 
        const skip = (page - 1) * limit;

        const paginatedAddresses = await Address.find({ _id: { $in: user.address } })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const totalAddress = user.address.length;  
        const totalPages = Math.ceil(totalAddress / limit);

        res.render('address', {
            user:user,
            address: paginatedAddresses,
            currentPage: page,
            totalPages: totalPages,
            totalAddress: totalAddress
        });

    } catch (error) {
        
        console.error("Error retriving address :",error);
        res.redirect("/pageNotFound");
        
    }

}

const addAddress = async (req,res) =>{

    try {
        
        const user = req.session.user;
        res.render('add-address',{user : user});
    } catch (error) {

        res.redirect('/pageNotFound');
        
    }
}

const addNewAddress = async (req,res) =>{

    try {

        const { house,city,state,pin,landMark,contactNo} = req.body;
        const userId = req.session.user || req.user;


        const existingAddress = await Address.findOne({ house, pin });
        if (existingAddress) {
            return res.status(400).json({ error: "Address already exists" });
        }

        
        const newAddress = new Address({
            house,
            city,
            state,
            pin,
            landMark,
            contactNo
        });

        await newAddress.save();


         const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        user.address.push(newAddress._id);  
        await user.save();  

        res.status(201).json({message:"Address added successfully"});
        
    } catch (error) {
        console.error("Error addding address :", error);
        res.status(500).json({message:'An error occured while adding the address'});
        
        
    }
};

const getEditAddresss = async (req,res) =>{
   
        const userId = req.session.user || req.user;

    try {
        const id = req.params.id; 

        const user = await User.findById(userId).populate('address').exec();

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

       
        const address = user.address.find(addr => addr._id.toString() === id);

        if (!address) {
            return res.status(404).send("Address not found");
        }

        
        res.render("edit-address", { address: address });
        

    } catch (error) {
        console.error('error editing address:',error);
        
        
    }
};

const updateAddress = async (req,res) =>{

    try {
        const id =req.params.id;

        const {  house, city, state, pin, landMark, contactNo } = req.body;



        const updatedAddress = await Address.findByIdAndUpdate( id,{
             house:house,
             city:city,
             state:state,
             pin:pin,
             landMark:landMark,
             contactNo:contactNo 
            },{ new: true } // Return the updated document
        );

        if (updatedAddress) {
            return res.status(200).json({ message: 'Address update successfully' });
        }else{
            return res.status(404).json({ message: 'Address not found.' });
        }
        
        


    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'An error occurred while updating the address.' });
        
    }


}

const deleteAddress = async (req, res) => {
    try {
        const id = req.query.id;

       
        const deletedAddress = await Address.deleteOne({ _id: id });

        if (deletedAddress.deletedCount > 0) {
            res.json({ 
                status: true, 
                message: `Address successfully deleted` 
            });
        } else {
            res.status(404).json({ status: false, message: 'Address not found' });
        }
    } catch (error) {
        res.status(500).json({ status: false, message: 'Internal server error' });
    }
};



module.exports = {
    userAddress,
    addAddress,
    addNewAddress,
    getEditAddresss,
    updateAddress,
    deleteAddress,
}