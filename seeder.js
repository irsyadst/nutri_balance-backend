const fs = require('fs');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const connectDB = require('./config/db'); // Sesuaikan path jika perlu

// Load model
const Food = require('./models/foodModel'); // Path ke model Food Anda

// Load env vars
dotenv.config();

// Connect to DB
connectDB();

// Read JSON files
const foods = JSON.parse(
  fs.readFileSync(`${__dirname}/data/food_data.json`, 'utf-8')
);

// Import data into DB
const importData = async () => {
  try {
    // Hapus data lama
    await Food.deleteMany();

    // Masukkan data baru
    await Food.insertMany(foods);

    console.log('Data Imported successfully!');
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

// Destroy data from DB
const destroyData = async () => {
  try {
    await Food.deleteMany();
    console.log('Data Destroyed successfully!');
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

// Cek argumen command line
if (process.argv[2] === '-i') {
  // node seeder.js -i (untuk import)
  importData();
} else if (process.argv[2] === '-d') {
  // node seeder.js -d (untuk destroy/hapus)
  destroyData();
} else {
  console.log('Please add -i to import data or -d to destroy data');
  process.exit();
}