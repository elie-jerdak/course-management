
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');

const run = async () => {
    await connectDB();

    const db = mongoose.connection.db;

    console.log("Starting migration...");

    // 1. copy old field (name → username)
    await db.collection('users').updateMany(
        {},
        [
            {
                $set: {
                    username: "$name"
                }
            }
        ]
    );

    // 2. remove old field
    await db.collection('users').updateMany(
        {},
        {
            $unset: { name: "" }
        }
    );

    console.log("Migration completed");

    process.exit();
};

run();