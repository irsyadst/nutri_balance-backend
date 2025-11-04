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
    body: { // Kita ganti 'subtitle' menjadi 'body' agar lebih standar
        type: String, 
        required: true 
    },
    isRead: { 
        type: Boolean, 
        default: false 
    },
    // 'type' atau 'iconAsset' untuk membantu frontend styling
    iconAsset: { 
        type: String, 
        default: 'notification' // Ikon default
    },
    
}, { timestamps: true }); // timestamps akan otomatis menambah createdAt & updatedAt

module.exports = mongoose.model('Notification', NotificationSchema);
