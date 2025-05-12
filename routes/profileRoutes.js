const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const User = require('../models/User');
const { isAuthenticated } = require('../middleware/auth');
const Event = require('../models/Event');

// Configure multer for profile picture uploads
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, 'public/uploads/profiles');
    },
    filename: function(req, file, cb) {
        cb(null, `profile-${req.session.user._id}${path.extname(file.originalname)}`);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 2000000 }, // 2MB limit
    fileFilter: function(req, file, cb) {
        const filetypes = /jpeg|jpg|png/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb('Error: Images Only!');
        }
    }
});

// View profile
router.get('/', isAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.session.user._id);
        const hostedEvents = user.role === 'host' || user.role === 'admin' 
            ? await Event.find({ host: user._id }).sort({ date: -1 }).limit(5)
            : [];
        res.render('user/profile', { 
            profileUser: user,
            hostedEvents,
            isOwnProfile: true
        });
    } catch (err) {
        req.flash('error_msg', 'Error loading profile');
        res.redirect('/');
    }
});

// Edit profile form
router.get('/edit', isAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.session.user._id);
        res.render('profile/edit', { user });
    } catch (err) {
        req.flash('error_msg', 'Error loading profile');
        res.redirect('/profile');
    }
});

// Update profile
router.post('/update', isAuthenticated, upload.single('profilePicture'), async (req, res) => {
    try {
        const { name, bio, phone, location, website, twitter, linkedin, facebook } = req.body;
        
        const updateData = {
            name,
            bio,
            phone,
            location,
            website,
            socialLinks: {
                twitter,
                linkedin,
                facebook
            }
        };

        if (req.file) {
            updateData.profilePicture = `/uploads/profiles/${req.file.filename}`;
        }

        await User.findByIdAndUpdate(req.session.user._id, updateData);
        
        req.flash('success_msg', 'Profile updated successfully');
        res.redirect('/user/' + req.session.user._id);
    } catch (err) {
        req.flash('error_msg', 'Error updating profile');
        res.redirect('/profile/edit');
    }
});

// Change password
router.post('/change-password', isAuthenticated, async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;
        
        if (newPassword !== confirmPassword) {
            req.flash('error_msg', 'New passwords do not match');
            return res.redirect('/profile/edit');
        }

        const user = await User.findById(req.session.user._id);
        const isMatch = await user.comparePassword(currentPassword);
        
        if (!isMatch) {
            req.flash('error_msg', 'Current password is incorrect');
            return res.redirect('/profile/edit');
        }

        user.password = newPassword;
        await user.save();

        req.flash('success_msg', 'Password changed successfully');
        res.redirect('/profile');
    } catch (err) {
        req.flash('error_msg', 'Error changing password');
        res.redirect('/profile/edit');
    }
});

module.exports = router; 