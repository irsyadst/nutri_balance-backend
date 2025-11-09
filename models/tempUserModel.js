const mongoose = require('mongoose');

const TempUserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    otp: { type: String, required: true },
    expiresAt: { type: Date, default: () => Date.now() + 10*60*1000, index: { expires: '10m' } },
}, { timestamps: true });

module.exports = mongoose.model('TempUser', TempUserSchema);