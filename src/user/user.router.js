const { Router } = require('express');
const { verifyUser } = require('../common/auth.middleware');
const { updateFollowers, getFollowers } = require('./user.controller');
const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const router = Router();

router.get('/users/me/followers', verifyUser, getFollowers);
router.post('/users/me/followers', verifyUser, upload.single('file'), updateFollowers);

module.exports = { usersRouter: router };
