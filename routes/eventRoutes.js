const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { body, validationResult } = require('express-validator');
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

// Middleware to check if user is host or admin
const isHostOrAdmin = (req, res, next) => {
    if (req.session.user && (req.session.user.role === 'host' || req.session.user.role === 'admin')) {
        return next();
    }
    req.flash('error_msg', 'You need to be a host or admin to perform this action');
    res.redirect('/events');
};

// Get all events
router.get('/', async (req, res) => {
    try {
        const { category, search, timeFilter } = req.query;
        let query = {};

        // Category filter
        if (category && category !== '') {
            query.category = category;
        }

        // Search filter
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { location: { $regex: search, $options: 'i' } }
            ];
        }

        // Time filter
        const now = new Date();
        if (timeFilter === 'upcoming') {
            query.date = { $gte: now };
        } else if (timeFilter === 'past') {
            query.date = { $lt: now };
        }

        const events = await Event.find(query)
            .populate('createdBy', 'name')
            .sort({ date: 1 });

        // Get unique categories for filter dropdown
        const categories = await Event.distinct('category');

        res.render('events/index', {
            events,
            categories,
            selectedCategory: category || '',
            search: search || '',
            timeFilter: timeFilter || 'all'
        });
    } catch (err) {
        console.error('Error fetching events:', err);
        req.flash('error_msg', 'Error loading events');
        res.redirect('/');
    }
});

// Show create event form
router.get('/create', isAuthenticated, isHostOrAdmin, (req, res) => {
    res.render('events/create');
});

// Create new event
router.post('/create',
    isAuthenticated,
    isHostOrAdmin,
    upload.single('image'),
    [
        body('name').trim().notEmpty().withMessage('Event name is required.').isLength({ max: 100 }).escape(),
        body('date').notEmpty().withMessage('Event date is required.').isISO8601().withMessage('Invalid date.'),
        body('location').trim().notEmpty().withMessage('Location is required.').isLength({ max: 100 }).escape(),
        body('description').trim().notEmpty().withMessage('Description is required.').isLength({ max: 500 }).escape(),
        body('category').trim().notEmpty().withMessage('Category is required.').escape()
    ],
    async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.render('events/create', {
            error_msg: errors.array().map(e => e.msg).join(' ')
        });
    }
    try {
        const { name, date, location, description, category } = req.body;
        const imageUrl = req.file ? `/uploads/events/${req.file.filename}` : null;

        // Validate date (future)
        const eventDate = new Date(date);
        if (eventDate < new Date()) {
            return res.render('events/create', {
                error_msg: 'Event date must be in the future.'
            });
        }

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
            phone: 'N/A',
            additionalInfo: 'Event Host'
        });

        await hostRegistration.save();
        event.registrations.push(hostRegistration._id);
        await event.save();

        req.flash('success_msg', 'Event created successfully');
        res.redirect('/events');
    } catch (err) {
        console.error('Error creating event:', err);
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

        if (!event) {
            req.flash('error_msg', 'Event not found');
            return res.redirect('/events');
        }

        // Check if the current user is the host
        const isHost = req.session.user && event.createdBy._id.toString() === req.session.user._id.toString();
        // Check if the current user is a moderator
        const isModerator = req.session.user && (req.session.user.role === 'moderator' || req.session.user.role === 'admin');
        
        // Check if event is in the past
        const isPastEvent = new Date(event.date) < new Date();
        
        res.render('events/show', { event, isHost, isModerator, isPastEvent });
    } catch (err) {
        console.error('Error fetching event:', err);
        req.flash('error_msg', 'Error loading event');
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
router.post('/:id/delete', isAuthenticated, async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        
        if (!event) {
            req.flash('error_msg', 'Event not found');
            return res.redirect('/events');
        }

        // Check if user is host or moderator
        const isHost = event.createdBy.toString() === req.session.user._id.toString();
        const isModerator = req.session.user.role === 'moderator' || req.session.user.role === 'admin';

        if (!isHost && !isModerator) {
            req.flash('error_msg', 'Not authorized to delete this event');
            return res.redirect('/events');
        }

        // Delete all registrations for this event
        await Registration.deleteMany({ event: event._id });

        // Delete the event
        await Event.findByIdAndDelete(event._id);

        req.flash('success_msg', 'Event deleted successfully');
        res.redirect('/events');
    } catch (err) {
        console.error('Delete error:', err);
        req.flash('error_msg', 'Error deleting event');
        res.redirect('/events');
    }
});

module.exports = router;
