const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Event = require('../models/Event');
const { isAuthenticated } = require('../middleware/auth');

// View user profile
router.get('/:userId', isAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        
        if (!user) {
            req.flash('error_msg', 'User not found');
            return res.redirect('/');
        }

        // If user is a host or admin, get their hosted events
        let hostedEvents = [];
        if (user.role === 'host' || user.role === 'admin') {
            hostedEvents = await Event.find({ createdBy: user._id })
                .sort({ date: -1 })
                .limit(5);
        }

        res.render('user/profile', { 
            profileUser: user,
            hostedEvents,
            isOwnProfile: req.session.user._id === user._id.toString()
        });
    } catch (err) {
        req.flash('error_msg', 'Error loading user profile');
        res.redirect('/');
    }
});

module.exports = router; 