const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const HostRequest = require('../models/HostRequest');
const User = require('../models/User');
const { isAuthenticated, isAdmin } = require('../middleware/auth');

// Create upload directory if it doesn't exist
const uploadDir = 'public/uploads/host-applications';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for PDF uploads
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, 'public/uploads/host-applications');
    },
    filename: function(req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'application-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: function(req, file, cb) {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed'));
        }
    }
});

// Show host request form
router.get('/apply', isAuthenticated, async (req, res) => {
    try {
        // Check if user already has a pending request
        const existingRequest = await HostRequest.findOne({
            user: req.session.user._id,
            status: 'pending'
        });

        if (existingRequest) {
            req.flash('error_msg', 'You already have a pending host request');
            return res.redirect('/profile');
        }

        res.render('host/apply');
    } catch (err) {
        req.flash('error_msg', 'Error loading host request form');
        res.redirect('/profile');
    }
});

// Submit host request
router.post('/apply', isAuthenticated, upload.single('document'), async (req, res) => {
    try {
        const { reason } = req.body;

        if (!req.file) {
            req.flash('error_msg', 'Please upload a PDF document');
            return req.session.save(() => res.redirect('/host/apply'));
        }

        // Check if user already has a pending request
        const existingRequest = await HostRequest.findOne({
            user: req.session.user._id,
            status: 'pending'
        });

        if (existingRequest) {
            req.flash('error_msg', 'You already have a pending host request');
            return req.session.save(() => res.redirect('/profile'));
        }

        const hostRequest = new HostRequest({
            user: req.session.user._id,
            reason,
            document: `/uploads/host-applications/${req.file.filename}`
        });

        await hostRequest.save();

        req.flash('success_msg', 'Your host request has been submitted successfully');
        return req.session.save(() => res.redirect('/profile'));
    } catch (err) {
        req.flash('error_msg', 'Error submitting host request');
        return req.session.save(() => res.redirect('/host/apply'));
    }
});

// Admin: View all host requests
router.get('/admin/requests', isAdmin, async (req, res) => {
    try {
        const requests = await HostRequest.find()
            .populate('user', 'name email')
            .sort({ createdAt: -1 });
        res.render('host/admin/requests', { requests });
    } catch (err) {
        req.flash('error_msg', 'Error loading host requests');
        res.redirect('/');
    }
});

// Admin: Handle host request
router.post('/admin/handle/:requestId', isAdmin, async (req, res) => {
    try {
        const { status, adminResponse } = req.body;
        const request = await HostRequest.findById(req.params.requestId)
            .populate('user');

        if (!request) {
            req.flash('error_msg', 'Host request not found');
            return res.redirect('/host/admin/requests');
        }

        request.status = status;
        request.adminResponse = adminResponse;
        await request.save();

        if (status === 'approved') {
            // Update user role to host
            await User.findByIdAndUpdate(request.user._id, { role: 'host' });
        }

        req.flash('success_msg', `Host request ${status} successfully`);
        res.redirect('/host/admin/requests');
    } catch (err) {
        req.flash('error_msg', 'Error handling host request');
        res.redirect('/host/admin/requests');
    }
});

module.exports = router; 