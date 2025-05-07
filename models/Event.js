const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    date: {
        type: Date,
        required: true
    },
    location: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    imageUrl: {
        type: String,
        required: false
    },
    category: {
        type: String,
        enum: ['Conference', 'Workshop', 'Meetup', 'Webinar', 'Seminar', 'Social', 'Other'],
        required: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    registrations: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Registration'
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Add a virtual for checking if a user is the host
eventSchema.virtual('isHost').get(function() {
    return this.createdBy;
});

module.exports = mongoose.model('Event', eventSchema); 