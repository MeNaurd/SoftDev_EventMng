const mongoose = require('mongoose');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const User = require('../models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/event-management';

mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    // Keep the moderator (change the email if needed)
    const moderator = await User.findOne({ email: 'moderator@test.com' });
    if (!moderator) {
      console.log('Moderator account not found! Aborting.');
      process.exit(1);
    }
    await Event.deleteMany({});
    await Registration.deleteMany({});
    await User.deleteMany({ _id: { $ne: moderator._id } });
    console.log('Database cleaned! Moderator account preserved.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error cleaning database:', err);
    process.exit(1);
  });