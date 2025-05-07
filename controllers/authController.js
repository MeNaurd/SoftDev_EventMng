// Simple in-memory user database
const users = {
    admin: 'password',
    user: 'password',
};

exports.getLogin = (req, res) => {
    res.render('login');
};

exports.getRegister = (req, res) => {
    res.render('register');
};

exports.postRegister = (req, res) => {
    const { username, password } = req.body;
    users.push({ username, password });
    res.redirect('/login');
};

exports.postLogin = (req, res) => {
    const { username, password } = req.body;

    if (users[username] && users[username] === password) {
        req.session.user = username;
        res.redirect('/events'); // or wherever your dashboard is
    } else {
        res.send('Login failed: Invalid credentials');
    }

    console.log('Username:', username, 'Password:', password);

};

