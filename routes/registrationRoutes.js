const express = require('express');
const router = express.Router();
const Registration = require('../models/Registration');
const Event = require('../models/Event');

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        return next();
    }
    req.flash('error_msg', 'Please log in to register for events');
    res.redirect('/login');
};

// Show registration form for an event
router.get('/:eventId', isAuthenticated, async (req, res) => {
    try {
        const event = await Event.findById(req.params.eventId);
        if (!event) {
            req.flash('error_msg', 'Event not found');
            return res.redirect('/events');
        }
        res.render('registrations/create', { event });
    } catch (err) {
        req.flash('error_msg', 'Error loading registration form');
        res.redirect('/events');
    }
});

// Create new registration
router.post('/:eventId', isAuthenticated, async (req, res) => {
    try {
        const { fullName, email, phone, additionalInfo } = req.body;
        const eventId = req.params.eventId;

        // Check if user has already registered
        const existingRegistration = await Registration.findOne({
            event: eventId,
            attendee: req.session.user._id
        });

        if (existingRegistration) {
            req.flash('error_msg', 'You have already registered for this event');
            return res.redirect(`/events/${eventId}`);
        }

        const registration = new Registration({
            event: eventId,
            attendee: req.session.user._id,
            fullName,
            email,
            phone,
            additionalInfo
        });

        await registration.save();

        // Add registration to event
        await Event.findByIdAndUpdate(eventId, {
            $push: { registrations: registration._id }
        });

        req.flash('success_msg', 'Registration successful!');
        res.redirect(`/events/${eventId}`);
    } catch (err) {
        req.flash('error_msg', 'Error processing registration');
        res.redirect(`/events/${req.params.eventId}`);
    }
});

// View user's registrations
router.get('/user/registrations', isAuthenticated, async (req, res) => {
    try {
        const registrations = await Registration.find({ attendee: req.session.user._id })
            .populate('event')
            .sort({ registrationDate: -1 });
        res.render('registrations/user-registrations', { registrations });
    } catch (err) {
        req.flash('error_msg', 'Error fetching registrations');
        res.redirect('/events');
    }
});

module.exports = router;
