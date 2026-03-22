const jwt = require('jsonwebtoken');
const { findById } = require('../user/user.service');

const verifyUser = async (req, res, next) => {
    const { authorization } = req.headers;

    try {
        const payload = await new Promise((resolve, reject) =>
            jwt.verify(authorization, process.env.JWT_SECRET, {}, (error, decoded) =>
                error ? reject(error) : resolve(decoded),
            ),
        );

        const user = await findById(payload.id);

        if (!user) {
            return next(new Error('User not found'));
        }

        req.user = user;
        return next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return next(new Error('Invalid token'));
        }
        return next(error);
    }
};

module.exports = { verifyUser };
