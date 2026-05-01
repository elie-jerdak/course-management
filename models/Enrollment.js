const mongoose = require('mongoose');

const enrollmentSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Student is required']
    },

    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: [true, 'Course is required']
    },

    status: {
        type: String,
        enum: {
            values: ['active', 'completed', 'dropped'],
            message: 'Status must be active, completed, or dropped'
        },
        default: 'active'
    }

}, {
    timestamps: true
});

enrollmentSchema.index(
    { student: 1, course: 1 },
    { unique: true }
);
module.exports = mongoose.model('Enrollment', enrollmentSchema);