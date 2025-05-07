// app.js

const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const mongoose = require('mongoose');
const flash = require('connect-flash');
const multer = require('multer');
const methodOverride = require('method-override');
require('dotenv').config();
const Notification = require('./models/Notification');

const app = express();

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/event-management', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({ 
    secret: process.env.SESSION_SECRET || 'secret-key',
    resave: false,
    saveUninitialized: false
}));
app.use(flash());
app.use(methodOverride('_method'));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Global variables middleware
app.use(async (req, res, next) => {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.user = req.session.user || null;
    if (req.session.user) {
        try {
            const notifications = await Notification.find({ user: req.session.user._id })
                .sort({ createdAt: -1 })
                .limit(10)
                .lean();
            const unreadNotifications = notifications.filter(n => !n.read).length;
            res.locals.notifications = notifications;
            res.locals.unreadNotifications = unreadNotifications;
        } catch (err) {
            res.locals.notifications = [];
            res.locals.unreadNotifications = 0;
        }
    } else {
        res.locals.notifications = [];
        res.locals.unreadNotifications = 0;
    }
    next();
});

// Routes
const authRoutes = require('./routes/authRoutes');
const eventRoutes = require('./routes/eventRoutes');
const registrationRoutes = require('./routes/registrationRoutes');

app.use('/', authRoutes);
app.use('/events', eventRoutes);
app.use('/register', registrationRoutes);

// Root path handler
app.get('/', (req, res) => {
    if (req.session.user) {
        return res.redirect('/events');
    }
    res.render('landing');
});

// Multer error handler middleware
app.use((err, req, res, next) => {
    if (err && err.code === 'LIMIT_FILE_SIZE') {
        req.flash('error_msg', 'File too large. Maximum allowed size is 5MB.');
        return res.redirect('back');
    }
    if (err && err.message && err.message.includes('Images Only')) {
        req.flash('error_msg', 'Only image files are allowed.');
        return res.redirect('back');
    }
    next(err);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

/*
    List of dummy users:
    John Doe: john@example.com, password: password
    Jane Doe: jane@example.com, password: 1234
    Test Moderator: moderator@test.com, password: moderator123
*/
