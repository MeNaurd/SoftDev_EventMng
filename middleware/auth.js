const User = require('../models/User');

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        return next();
    }
    req.flash('error_msg', 'Please log in to access this page');
    res.redirect('/login');
};

// Middleware to check if user is admin
const isAdmin = async (req, res, next) => {
    console.log('Checking admin access...');
    console.log('Session user:', req.session.user);
    
    if (!req.session.user) {
        console.log('No user in session');
        req.flash('error_msg', 'Please log in to access this page');
        return res.redirect('/login');
    }

    try {
        // Get fresh user data from database
        const user = await User.findById(req.session.user._id);
        if (!user || user.role !== 'admin') {
            console.log('User is not an admin');
            req.flash('error_msg', 'Access denied. Admin privileges required.');
            return res.redirect('/login');
        }
        
        // Update session with fresh user data
        req.session.user = user.toObject();
        console.log('Admin access granted');
        next();
    } catch (err) {
        console.error('Admin check error:', err);
        req.flash('error_msg', 'Error checking user privileges');
        res.redirect('/login');
    }
};

// Middleware to check if user is host
const isHost = async (req, res, next) => {
    if (!req.session.user) {
        req.flash('error_msg', 'Please log in to access this page');
        return res.redirect('/login');
    }

    try {
        const user = await User.findById(req.session.user._id);
        if (!user || (user.role !== 'host' && user.role !== 'admin')) {
            req.flash('error_msg', 'Access denied. Host privileges required.');
            return res.redirect('/');
        }
        next();
    } catch (err) {
        console.error('Host check error:', err);
        req.flash('error_msg', 'Error checking user privileges');
        res.redirect('/');
    }
};

module.exports = {
    isAuthenticated,
    isAdmin,
    isHost
}; 