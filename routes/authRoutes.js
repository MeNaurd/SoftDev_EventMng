const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Notification = require('../models/Notification');

// Show login form
router.get('/login', (req, res) => {
    res.render('auth/login');
});

// Show register form
router.get('/register', (req, res) => {
    res.render('auth/register');
});

// Handle login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            req.flash('error_msg', 'Invalid email or password');
            return res.redirect('/login');
        }

        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            req.flash('error_msg', 'Invalid email or password');
            return res.redirect('/login');
        }

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        // Convert Mongoose document to plain object and store in session
        req.session.user = user.toObject();

        req.flash('success_msg', 'You are now logged in');
        res.redirect('/events');
    } catch (err) {
        console.error('Login error:', err);
        req.flash('error_msg', 'Error logging in');
        res.redirect('/login');
    }
});

// Handle registration
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, confirmPassword } = req.body;

        // Check if passwords match
        if (password !== confirmPassword) {
            req.flash('error_msg', 'Passwords do not match');
            return res.redirect('/register');
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            req.flash('error_msg', 'Email already registered');
            return res.redirect('/register');
        }

        // Create new user
        const user = new User({
            name,
            email,
            password
        });

        await user.save();

        req.flash('success_msg', 'You are now registered and can log in');
        res.redirect('/login');
    } catch (err) {
        req.flash('error_msg', 'Error registering user');
        res.redirect('/register');
    }
});

// Handle logout
router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

router.post('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

// Create test moderator account
router.get('/create-moderator', async (req, res) => {
    try {
        const moderator = new User({
            name: 'Test Moderator',
            email: 'moderator@test.com',
            password: 'moderator123',
            role: 'moderator'
        });
        await moderator.save();
        req.flash('success_msg', 'Test moderator account created successfully');
        res.redirect('/login');
    } catch (err) {
        req.flash('error_msg', 'Error creating moderator account');
        res.redirect('/login');
    }
});

// Create admin account
router.get('/create-admin', async (req, res) => {
    try {
        const admin = new User({
            name: 'Admin User',
            email: 'admin@example.com',
            password: 'admin123',
            role: 'admin'
        });
        await admin.save();
        req.flash('success_msg', 'Admin account created successfully');
        res.redirect('/login');
    } catch (err) {
        req.flash('error_msg', 'Error creating admin account');
        res.redirect('/login');
    }
});

// Mark notification as read
router.get('/notifications/:id/read', async (req, res) => {
    try {
        const notification = await Notification.findById(req.params.id);
        if (notification && req.session.user && notification.user.toString() === req.session.user._id.toString()) {
            notification.read = true;
            await notification.save();
        }
        // Optionally redirect to event if eventId is provided
        if (req.query.eventId) {
            return res.redirect(`/events/${req.query.eventId}`);
        }
        const referer = req.get('Referer');
        if (referer) {
            return res.redirect(referer);
        }
        res.redirect('/events');
    } catch (err) {
        res.redirect('/events');
    }
});

module.exports = router;
