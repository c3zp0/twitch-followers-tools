const { Router } = require('express');
const { signIn, signUp } = require('./auth.controller');

const router = Router();

router.post('/auth/signup', signUp);
router.post('/auth/signin', signIn);

module.exports = { authRouter: router };
