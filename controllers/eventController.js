const events = [];

exports.getEvents = (req, res) => {
    res.render('events', { events });
};

exports.getCreateEvent = (req, res) => {
    res.render('createEvent');
};

exports.postCreateEvent = (req, res) => {
    const { title, date, location } = req.body;
    events.push({ id: events.length + 1, title, date, location });
    res.redirect('/events');
};
