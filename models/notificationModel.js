const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true,
        index: true 
    },
    title: { 
        type: String, 
        required: true 
    },
    body: { 
        type: String, 
        required: true 
    },
    isRead: { 
        type: Boolean, 
        default: false 
    },
    iconAsset: { 
        type: String, 
        default: 'notification' 
    },
    
}, { timestamps: true }); 

module.exports = mongoose.model('Notification', NotificationSchema);
