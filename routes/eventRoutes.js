const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const Notification = require('../models/Notification');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, 'public/uploads/events');
    },
    filename: function(req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5000000 }, // 5MB limit
    fileFilter: function(req, file, cb) {
        checkFileType(file, cb);
    }
});

// Check file type
function checkFileType(file, cb) {
    const filetypes = /jpeg|jpg|png|gif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb('Error: Images Only!');
    }
}

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        return next();
    }
    req.flash('error_msg', 'Please log in to access this page');
    res.redirect('/login');
};

// Middleware to check if user is moderator or admin
const isModerator = (req, res, next) => {
    if (req.session.user && (req.session.user.role === 'moderator' || req.session.user.role === 'admin')) {
        return next();
    }
    req.flash('error_msg', 'You do not have permission to perform this action');
    res.redirect('/events');
};

// Get all events (with optional category filter)
router.get('/', async (req, res) => {
    try {
        const category = req.query.category;
        let query = {};
        if (category && category !== 'All') {
            query.category = category;
        }
        const events = await Event.find(query).sort({ date: 1 });
        res.render('events/index', { events, selectedCategory: category || 'All' });
    } catch (err) {
        req.flash('error_msg', 'Error fetching events');
        res.redirect('/');
    }
});

// Show create event form
router.get('/create', isAuthenticated, (req, res) => {
    res.render('events/create');
});

// Create new event
router.post('/', isAuthenticated, upload.single('image'), async (req, res) => {
    try {
        const { name, date, location, description, category } = req.body;
        const imageUrl = req.file ? `/uploads/events/${req.file.filename}` : null;

        // Create the event
        const event = new Event({
            name,
            date,
            location,
            description,
            imageUrl,
            category,
            createdBy: req.session.user._id
        });

        await event.save();

        // Automatically create a registration for the host
        const hostRegistration = new Registration({
            event: event._id,
            attendee: req.session.user._id,
            fullName: req.session.user.name,
            email: req.session.user.email,
            phone: 'N/A', // Host doesn't need to provide phone
            additionalInfo: 'Event Host'
        });

        await hostRegistration.save();

        // Add the host registration to the event
        event.registrations.push(hostRegistration._id);
        await event.save();

        req.flash('success_msg', 'Event created successfully');
        res.redirect('/events');
    } catch (err) {
        req.flash('error_msg', 'Error creating event');
        res.redirect('/events/create');
    }
});

// Show single event
router.get('/:id', async (req, res) => {
    try {
        const event = await Event.findById(req.params.id)
            .populate('createdBy', 'name')
            .populate({
                path: 'registrations',
                populate: {
                    path: 'attendee',
                    select: 'name email'
                }
            });

        // Check if the current user is the host
        const isHost = req.session.user && event.createdBy._id.toString() === req.session.user._id.toString();
        // Check if the current user is a moderator
        const isModerator = req.session.user && (req.session.user.role === 'moderator' || req.session.user.role === 'admin');
        
        res.render('events/show', { event, isHost, isModerator });
    } catch (err) {
        req.flash('error_msg', 'Event not found');
        res.redirect('/events');
    }
});

// Show edit event form
router.get('/:id/edit', isAuthenticated, async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) {
            req.flash('error_msg', 'Event not found');
            return res.redirect('/events');
        }
        const isHost = req.session.user && event.createdBy.toString() === req.session.user._id.toString();
        const isModerator = req.session.user && (req.session.user.role === 'moderator' || req.session.user.role === 'admin');
        if (!isHost && !isModerator) {
            req.flash('error_msg', 'You are not authorized to edit this event');
            return res.redirect('/events');
        }
        res.render('events/edit', { event });
    } catch (err) {
        req.flash('error_msg', 'Error loading event for editing');
        res.redirect('/events');
    }
});

// Handle edit event form submission
router.post('/:id/edit', isAuthenticated, upload.single('image'), async (req, res) => {
    try {
        const event = await Event.findById(req.params.id).populate({
            path: 'registrations',
            populate: { path: 'attendee', select: 'name email' }
        });
        if (!event) {
            req.flash('error_msg', 'Event not found');
            return res.redirect('/events');
        }
        const isHost = req.session.user && event.createdBy.toString() === req.session.user._id.toString();
        const isModerator = req.session.user && (req.session.user.role === 'moderator' || req.session.user.role === 'admin');
        if (!isHost && !isModerator) {
            req.flash('error_msg', 'You are not authorized to edit this event');
            return res.redirect('/events');
        }
        // Update fields
        event.name = req.body.name;
        event.date = req.body.date;
        event.location = req.body.location;
        event.description = req.body.description;
        event.category = req.body.category;
        if (req.file) {
            event.imageUrl = `/uploads/events/${req.file.filename}`;
        }
        await event.save();
        // Notify registered users (except the editor)
        const editorId = req.session.user._id.toString();
        const notifications = event.registrations
            .filter(reg => reg.attendee && reg.attendee._id.toString() !== editorId)
            .map(reg => ({
                user: reg.attendee._id,
                message: `Event "${event.name}" has been updated. Please check the details.`
            }));
        if (notifications.length > 0) {
            await Notification.insertMany(notifications);
        }
        req.flash('success_msg', 'Event updated successfully');
        res.redirect(`/events/${event._id}`);
    } catch (err) {
        req.flash('error_msg', 'Error updating event');
        res.redirect(`/events/${req.params.id}/edit`);
    }
});

// Delete event (only host or moderator can delete)
router.delete('/:id', isAuthenticated, async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        // Check if user is host or moderator
        const isHost = event.createdBy.toString() === req.session.user._id.toString();
        const isModerator = req.session.user.role === 'moderator' || req.session.user.role === 'admin';

        if (!isHost && !isModerator) {
            return res.status(403).json({ message: 'Not authorized to delete this event' });
        }

        // Delete all registrations for this event
        await Registration.deleteMany({ event: event._id });

        // Delete the event
        await Event.findByIdAndDelete(event._id);

        req.flash('success_msg', 'Event deleted successfully');
        res.json({ message: 'Event deleted successfully' });
    } catch (err) {
        console.error('Delete error:', err);
        req.flash('error_msg', 'Error deleting event');
        res.status(500).json({ message: 'Error deleting event' });
    }
});

module.exports = router;
