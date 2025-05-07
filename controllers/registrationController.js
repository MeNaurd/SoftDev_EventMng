const registrations = [];

exports.registerToEvent = (req, res) => {
    const { eventId } = req.body;
    registrations.push({ user: req.session.user.username, eventId });
    res.send('Successfully registered!');
};
