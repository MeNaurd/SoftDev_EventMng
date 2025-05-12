const express = require('express');
const router = express.Router();
const { isAdmin } = require('../middleware/auth');
const User = require('../models/User');
const HostRequest = require('../models/HostRequest');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const mongoose = require('mongoose');
const Activity = require('../models/Activity');

// Admin Dashboard
router.get('/dashboard', isAdmin, async (req, res) => {
    try {
        console.log('Accessing admin dashboard...');
        console.log('Session user:', req.session.user);
        
        // Get statistics for the dashboard
        const [
            totalUsers,
            hostUsers,
            pendingHostRequests,
            approvedHostRequests,
            rejectedHostRequests,
            totalEvents,
            upcomingEvents,
            totalRegistrations,
            activeEvents
        ] = await Promise.all([
            User.countDocuments(),
            User.countDocuments({ role: 'host' }),
            HostRequest.countDocuments({ status: 'pending' }),
            HostRequest.countDocuments({ status: 'approved' }),
            HostRequest.countDocuments({ status: 'rejected' }),
            Event.countDocuments(),
            Event.countDocuments({ startDate: { $gt: new Date() } }),
            Registration.countDocuments(),
            Event.countDocuments({ status: 'active' })
        ]);

        console.log('Dashboard statistics retrieved successfully');

        res.render('admin/dashboard', {
            title: 'Admin Dashboard',
            user: req.session.user,
            totalUsers,
            hostUsers,
            pendingHostRequests,
            approvedHostRequests,
            rejectedHostRequests,
            totalEvents,
            upcomingEvents,
            totalRegistrations,
            activeEvents,
            error_msg: req.flash('error'),
            success_msg: req.flash('success')
        });
    } catch (error) {
        console.error('Admin Dashboard Error:', error);
        req.flash('error', 'Error loading admin dashboard');
        res.redirect('/');
    }
});

// User Management
router.get('/users', isAdmin, async (req, res) => {
    try {
        const users = await User.find().sort({ createdAt: -1 });
        res.render('admin/users', {
            title: 'User Management',
            user: req.session.user,
            currentUser: req.session.user,
            users,
            error_msg: req.flash('error'),
            success_msg: req.flash('success')
        });
    } catch (error) {
        console.error('User Management Error:', error);
        req.flash('error', 'Error loading users');
        res.redirect('/admin/dashboard');
    }
});

// Event Management
router.get('/events', isAdmin, async (req, res) => {
    try {
        const events = await Event.find()
            .populate('createdBy', 'name email')
            .sort({ startDate: -1 });
        res.render('admin/events', {
            title: 'Event Management',
            user: req.session.user,
            events,
            error_msg: req.flash('error'),
            success_msg: req.flash('success')
        });
    } catch (error) {
        console.error('Event Management Error:', error);
        req.flash('error', 'Error loading events');
        res.redirect('/admin/dashboard');
    }
});

// Statistics
router.get('/statistics', isAdmin, async (req, res) => {
    try {
        // Get total users and hosts
        const totalUsers = await User.countDocuments();
        const hostUsers = await User.countDocuments({ role: 'host' });

        // Get event statistics
        const totalEvents = await Event.countDocuments();
        const upcomingEvents = await Event.countDocuments({ date: { $gte: new Date() } });
        const activeEvents = await Event.countDocuments({ 
            date: { $lte: new Date() },
            endDate: { $gte: new Date() }
        });

        // Get total registrations
        const totalRegistrations = await Registration.countDocuments();

        // Get user growth data (last 6 months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        
        const userGrowth = await User.aggregate([
            {
                $match: {
                    createdAt: { $gte: sixMonthsAgo }
                }
            },
            {
                $group: {
                    _id: { $month: "$createdAt" },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { _id: 1 }
            }
        ]);

        // Get monthly event registrations
        const monthlyRegistrations = await Event.aggregate([
            {
                $match: {
                    createdAt: { $gte: sixMonthsAgo }
                }
            },
            {
                $group: {
                    _id: { $month: "$createdAt" },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { _id: 1 }
            }
        ]);

        res.render('admin/statistics', {
            totalUsers,
            hostUsers,
            totalEvents,
            upcomingEvents,
            activeEvents,
            totalRegistrations,
            userGrowth,
            monthlyRegistrations,
            error_msg: req.flash('error'),
            success_msg: req.flash('success')
        });
    } catch (error) {
        console.error('Error fetching statistics:', error);
        req.flash('error', 'Error loading statistics');
        res.redirect('/admin/dashboard');
    }
});

// Content Management
router.get('/content', isAdmin, async (req, res) => {
    try {
        res.render('admin/content', {
            title: 'Content Management',
            user: req.session.user,
            error_msg: req.flash('error'),
            success_msg: req.flash('success')
        });
    } catch (error) {
        console.error('Content Management Error:', error);
        req.flash('error', 'Error loading content management');
        res.redirect('/admin/dashboard');
    }
});

// System Settings
router.get('/settings', isAdmin, async (req, res) => {
    try {
        res.render('admin/settings', {
            title: 'System Settings',
            user: req.session.user,
            error_msg: req.flash('error'),
            success_msg: req.flash('success')
        });
    } catch (error) {
        console.error('Settings Error:', error);
        req.flash('error', 'Error loading settings');
        res.redirect('/admin/dashboard');
    }
});

// Quick Actions Routes
router.get('/users/new', isAdmin, (req, res) => {
    res.render('admin/users/new', {
        title: 'Add New User',
        user: req.session.user,
        error_msg: req.flash('error'),
        success_msg: req.flash('success')
    });
});

router.get('/events/new', isAdmin, (req, res) => {
    res.render('admin/events/new', {
        title: 'Create New Event',
        user: req.session.user,
        error_msg: req.flash('error'),
        success_msg: req.flash('success')
    });
});

router.get('/content/announcement', isAdmin, (req, res) => {
    res.render('admin/content/announcement', {
        title: 'Post Announcement',
        user: req.session.user,
        error_msg: req.flash('error'),
        success_msg: req.flash('success')
    });
});

router.get('/settings/backup', isAdmin, (req, res) => {
    res.render('admin/settings/backup', {
        title: 'System Backup',
        user: req.session.user,
        error_msg: req.flash('error'),
        success_msg: req.flash('success')
    });
});

// System Health API
router.get('/api/system-health', isAdmin, async (req, res) => {
    try {
        const health = {
            server: {
                status: 'healthy',
                uptime: process.uptime(),
                memory: process.memoryUsage()
            },
            database: {
                status: 'connected',
                collections: await mongoose.connection.db.listCollections().toArray()
            },
            storage: {
                status: 'warning',
                used: '75%'
            },
            backup: {
                status: 'healthy',
                lastBackup: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
            }
        };
        res.json(health);
    } catch (error) {
        console.error('System Health Error:', error);
        res.status(500).json({ error: 'Failed to get system health' });
    }
});

// Activity Feed API
router.get('/api/activity-feed', isAdmin, async (req, res) => {
    try {
        const activities = await Activity.find()
            .sort({ createdAt: -1 })
            .limit(10)
            .populate('user', 'name')
            .lean();

        res.json(activities);
    } catch (error) {
        console.error('Activity Feed Error:', error);
        res.status(500).json({ error: 'Failed to get activity feed' });
    }
});

// Quick Search
router.get('/search', isAdmin, async (req, res) => {
    try {
        const query = req.query.q;
        if (!query) {
            return res.redirect('/admin/dashboard');
        }

        const [users, events, hostRequests] = await Promise.all([
            User.find({
                $or: [
                    { name: { $regex: query, $options: 'i' } },
                    { email: { $regex: query, $options: 'i' } }
                ]
            }).limit(5),
            Event.find({
                $or: [
                    { title: { $regex: query, $options: 'i' } },
                    { description: { $regex: query, $options: 'i' } }
                ]
            }).limit(5),
            HostRequest.find({
                $or: [
                    { reason: { $regex: query, $options: 'i' } },
                    { adminResponse: { $regex: query, $options: 'i' } }
                ]
            }).populate('user', 'name email').limit(5)
        ]);

        res.render('admin/search', {
            title: 'Search Results',
            user: req.session.user,
            query,
            users,
            events,
            hostRequests,
            error_msg: req.flash('error'),
            success_msg: req.flash('success')
        });
    } catch (error) {
        console.error('Search Error:', error);
        req.flash('error', 'Error performing search');
        res.redirect('/admin/dashboard');
    }
});

// Host Applications Management
router.get('/host-applications', isAdmin, async (req, res) => {
    try {
        console.log('Accessing host applications page...');
        console.log('Session user:', req.session.user);
        
        const hostRequests = await HostRequest.find()
            .populate({
                path: 'user',
                select: 'name email',
                model: 'User'
            })
            .sort({ createdAt: -1 });
        
        console.log('Found host requests:', hostRequests.length);
        
        // Filter out any requests with null users
        const validHostRequests = hostRequests.filter(request => request.user);
        
        res.render('admin/host-applications', {
            title: 'Host Applications',
            user: req.session.user,
            hostRequests: validHostRequests,
            error_msg: req.flash('error'),
            success_msg: req.flash('success')
        });
    } catch (error) {
        console.error('Host Applications Error:', error);
        req.flash('error', 'Error loading host applications');
        res.redirect('/admin/dashboard');
    }
});

// Handle Host Application
router.post('/host-applications/:id/handle', isAdmin, async (req, res) => {
    try {
        const { status, adminResponse } = req.body;
        const hostRequest = await HostRequest.findById(req.params.id);
        
        if (!hostRequest) {
            req.flash('error', 'Host application not found');
            return res.redirect('/admin/host-applications');
        }

        hostRequest.status = status;
        hostRequest.adminResponse = adminResponse;
        hostRequest.handledAt = new Date();
        await hostRequest.save();

        // If approved, update user role to host
        if (status === 'approved') {
            await User.findByIdAndUpdate(hostRequest.user, { role: 'host' });
        }

        // Log the activity
        await Activity.create({
            user: req.session.user._id,
            action: 'host_application_handled',
            description: `Host application ${status} for user ${hostRequest.user}`,
            metadata: { hostRequestId: hostRequest._id, status }
        });

        req.flash('success', `Host application ${status} successfully`);
        res.redirect('/admin/host-applications');
    } catch (error) {
        console.error('Handle Host Application Error:', error);
        req.flash('error', 'Error handling host application');
        res.redirect('/admin/host-applications');
    }
});

// Remove host status
router.post('/users/:id/remove-host', isAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/admin/users');
        }
        if (user.role !== 'host') {
            req.flash('error', 'User is not a host');
            return res.redirect('/admin/users');
        }
        user.role = 'user';
        await user.save();
        req.flash('success', 'Host status removed successfully');
        res.redirect('/admin/users');
    } catch (error) {
        console.error('Remove Host Error:', error);
        req.flash('error', 'Error removing host status');
        res.redirect('/admin/users');
    }
});

// Delete user
router.post('/users/:id/delete', isAdmin, async (req, res) => {
    try {
        if (req.session.user._id === req.params.id) {
            req.flash('error', 'You cannot delete your own account');
            return res.redirect('/admin/users');
        }
        const user = await User.findById(req.params.id);
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/admin/users');
        }
        // Optionally: Remove user's events and registrations here
        await User.findByIdAndDelete(req.params.id);
        req.flash('success', 'User deleted successfully');
        res.redirect('/admin/users');
    } catch (error) {
        console.error('Delete User Error:', error);
        req.flash('error', 'Error deleting user');
        res.redirect('/admin/users');
    }
});

// Edit user details
router.post('/users/:id/edit', isAdmin, async (req, res) => {
    try {
        const { name, email, role } = req.body;
        const user = await User.findById(req.params.id);
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/admin/users');
        }
        // Prevent admin from changing their own role
        if (user._id.toString() === req.session.user._id.toString()) {
            user.name = name;
            user.email = email;
            // Do not update role
        } else {
            user.name = name;
            user.email = email;
            user.role = role;
        }
        await user.save();
        req.flash('success', 'User updated successfully');
        res.redirect('/admin/users');
    } catch (error) {
        console.error('Edit User Error:', error);
        req.flash('error', 'Error updating user');
        res.redirect('/admin/users');
    }
});

// Edit event details
router.post('/events/:id/edit', isAdmin, async (req, res) => {
    try {
        const { name, date, location, status, description } = req.body;
        const event = await Event.findById(req.params.id);
        if (!event) {
            req.flash('error', 'Event not found');
            return res.redirect('/admin/events');
        }
        event.name = name;
        event.date = new Date(date);
        event.location = location;
        event.status = status;
        event.description = description;
        await event.save();
        req.flash('success', 'Event updated successfully');
        res.redirect('/admin/events');
    } catch (error) {
        console.error('Edit Event Error:', error);
        req.flash('error', 'Error updating event');
        res.redirect('/admin/events');
    }
});

module.exports = router; 