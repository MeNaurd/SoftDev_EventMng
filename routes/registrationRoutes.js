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
        const event = await Event.findById(eventId);

        if (!event) {
            req.flash('error_msg', 'Event not found');
            return res.redirect('/events');
        }

        // Validate form data
        if (!fullName || !email || !phone) {
            req.flash('error_msg', 'Please fill in all required fields');
            return res.redirect(`/register/${eventId}`);
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            req.flash('error_msg', 'Please enter a valid email address');
            return res.redirect(`/register/${eventId}`);
        }

        // Validate phone number (basic validation)
        const phoneRegex = /^[\d\s-+()]{10,}$/;
        if (!phoneRegex.test(phone)) {
            req.flash('error_msg', 'Please enter a valid phone number');
            return res.redirect(`/register/${eventId}`);
        }

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
        console.error('Error processing registration:', err);
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

// Rescind registration
router.post('/:registrationId/rescind', isAuthenticated, async (req, res) => {
    try {
        const registration = await Registration.findById(req.params.registrationId)
            .populate('event');
        
        if (!registration) {
            req.flash('error_msg', 'Registration not found');
            return res.redirect('/events');
        }

        // Check if user owns the registration
        if (registration.attendee.toString() !== req.session.user._id.toString()) {
            req.flash('error_msg', 'Not authorized to rescind this registration');
            return res.redirect('/events');
        }

        // Check if event is in the past
        if (new Date(registration.event.date) < new Date()) {
            req.flash('error_msg', 'Cannot rescind registration for past events');
            return res.redirect('/register/user/registrations');
        }

        // Remove registration from event
        await Event.findByIdAndUpdate(registration.event._id, {
            $pull: { registrations: registration._id }
        });

        // Delete the registration
        await Registration.findByIdAndDelete(registration._id);

        req.flash('success_msg', 'Registration rescinded successfully');
        res.redirect('/register/user/registrations');
    } catch (err) {
        console.error('Error rescinding registration:', err);
        req.flash('error_msg', 'Error rescinding registration');
        res.redirect('/events');
    }
});

module.exports = router;
