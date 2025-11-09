require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('./config/db');
const Food = require('./models/foodModel');
const User = require('./models/userModel');
const foodData = require('./data/food_data.json');

connectDB();

const importData = async () => {
    try {
        await Food.deleteMany();
        await Food.insertMany(foodData);
        console.log('Data Makanan Berhasil Diimpor!');
        process.exit();
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

const deleteData = async () => {
    try {
        await Food.deleteMany();
        console.log('Data Makanan Berhasil Dihapus!');
        process.exit();
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

const createAdmin = async () => {
    try {
        const adminEmail = 'admin@nutribalance.com';
        const adminPassword = 'adminpassword123';

        const adminExists = await User.findOne({ email: adminEmail });
        if (adminExists) {
            console.log('Akun admin sudah ada.');
            process.exit();
            return;
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(adminPassword, salt);

        const adminUser = new User({
            name: 'Admin NutriBalance',
            email: adminEmail,
            password: hashedPassword,
            role: 'admin',
            profile: null
        });

        await adminUser.save();
        console.log('Akun Admin Berhasil Dibuat!');
        console.log(`Email: ${adminEmail}`);
        console.log(`Password: ${adminPassword}`);
        process.exit();

    } catch (error) {
        console.error(`Error saat membuat admin: ${error.message}`);
        process.exit(1);
    }
};

if (process.argv[2] === '-d') {
    deleteData();
} else if (process.argv[2] === '-admin') {
    createAdmin();
} else {
    importData();
}