const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        unique: true,
        minlength: [2, 'Name must be at least 2 characters'],
        maxlength: [50, 'Name cannot exceed 50 characters']
    },

    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [
            /^\S+@\S+\.\S+$/,
            'Please enter a valid email address'
        ]
    },

    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [8, 'Password must be at least 6 characters'],
        select: false
    },

    role: {
        type: String,
        enum: {
            values: ['admin', 'instructor', 'student'],
            message: 'Role must be admin, instructor, or student'
        },
        default: 'student'
    }

}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);