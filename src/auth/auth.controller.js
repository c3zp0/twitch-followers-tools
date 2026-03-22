const { findByEmail, createUser } = require('../user/user.service');
const jwt = require('jsonwebtoken');

const signIn = async (req, res) => {
    const email = req.body.email;
    const user = await findByEmail(email);
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
    const email = req.body.email;
    const isUserExists = await findByEmail(email);
    if (isUserExists) {
        throw new Error('User already exists');
    }
    const user = await createUser(email);
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
