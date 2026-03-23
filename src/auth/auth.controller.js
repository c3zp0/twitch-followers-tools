const { findByLogin, createUser } = require('../user/user.service');
const jwt = require('jsonwebtoken');

const signIn = async (req, res) => {
    const login = req.body.login;
    if (!login) {
        throw new Error('Send Login');
    }
    const user = await findByLogin(login);
    if (!user) {
        throw Error('User not found');
    }
    const token = jwt.sign(
        {
            id: user.id,
        },
        process.env.JWT_SECRET,
        {
            expiresIn: '365d',
            algorithm: 'HS256',
        },
    );
    return res.status(200).json({ ...user, token });
};

const signUp = async (req, res) => {
    const login = req.body.login;
    if (!login) {
        throw new Error('Send Login');
    }
    const isUserExists = await findByLogin(login);
    if (isUserExists) {
        throw new Error('User already exists');
    }
    const user = await createUser(login);
    const token = jwt.sign(
        {
            id: user.id,
        },
        process.env.JWT_SECRET,
        {
            expiresIn: '365d',
            algorithm: 'HS256',
        },
    );
    return res.status(200).json({ ...user, token });
};

module.exports = { signIn, signUp };
