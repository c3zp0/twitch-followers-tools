const userService = require('./user.service');

const getFollowers = async (req, res) => {
    const userId = req.user.id;
    const followers = await userService.getFollowers(userId);
    return res.status(200).json(followers);
};

const updateFollowers = async (req, res) => {
    const userId = req.user.id;
    const csv = req.file.buffer.toString().trim().split('\n');
    csv.shift();
    const followers = csv.map(row => {
        const columns = row.split(/,(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/);
        return {
            followerName: columns[0],
            lastFollowCreatedAt: columns[3],
        };
    });
    const updates = await userService.updateFollowers(userId, followers);
    return res.status(200).json(updates);
};

module.exports = { getFollowers, updateFollowers };
