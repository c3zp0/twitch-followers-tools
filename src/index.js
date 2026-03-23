const express = require('express');
const dotenv = require('dotenv');
dotenv.config();
const db = require('./common/db');
const { authRouter } = require('./auth/auth.router');
const { usersRouter } = require('./user/user.router');

const app = express();
app.use(express.json());

app.use(authRouter);
app.use(usersRouter);
app.use((error, req, res, next) => {
    res.status(500).json({ message: error.message });
});

app.listen(process.env.APP_PORT, async () => {
    await db.pool.connect();
    console.log('Server started');
});
