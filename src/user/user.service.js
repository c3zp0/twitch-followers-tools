const SQL = require('sql-template-strings');
const { pool } = require('../common/db');

const findByEmail = async email => {
    const stmt = await pool.query(SQL`select u.id, u.email from users u where u.email = ${email};`);
    if (stmt.rowCount) {
        const user = {
            id: stmt.rows[0].id,
            email: stmt.rows[0].email,
        };
        return user;
    }
    return null;
};

const findById = async id => {
    const stmt = await pool.query(SQL`select u.id, u.email from users u where u.id = ${id};`);
    if (stmt.rowCount) {
        const user = {
            id: stmt.rows[0].id,
            email: stmt.rows[0].email,
        };
        return user;
    }
    return null;
};

const createUser = async email => {
    const query = SQL`insert into users(email) values (${email}) returning id;`;
    const stmt = await pool.query(query);
    if (stmt.rowCount) {
        const user = {
            id: stmt.rows[0].id,
            email,
        };
        return user;
    }
};

const getFollowers = async userId => {
    const stmt = await pool.query(SQL`
        select 
          f.id, 
          f.name, 
          f.streamer_id, 
          f.last_follow_created_at,
          f.last_unfollow_created_at
        from followers f
        where f.streamer_id = ${userId};`);

    if (stmt.rowCount) {
        return stmt.rows.map(_row => ({
            id: _row.id,
            followerName: _row.name,
            streamerId: _row.streamer_id,
            lastFollowCreatedAt: _row.last_follow_created_at,
            lastUnfollowCreatedAt: _row.last_unfollow_created_at,
        }));
    }
    return [];
};

const updateFollowers = async (userId, actualFollowers) => {
    const actualFollowersMap = new Map();
    const followers = await getFollowers(userId);
    actualFollowers.forEach(_follower => {
        const isFollowerInMap = actualFollowersMap.get(_follower.followerName);
        if (!isFollowerInMap) {
            actualFollowersMap.set(_follower.followerName, _follower);
        }
    });
    const unfollowed = [];
    const newFollowers = [];
    const refollowed = [];
    const storedFollowersMap = new Map();
    followers.forEach(_follower => {
        const isFollowerInMap = storedFollowersMap.get(_follower.followerName);
        const isUserStillFollower = actualFollowersMap.get(_follower.followerName);
        if (!isFollowerInMap) {
            storedFollowersMap.set(_follower.followerName, _follower);
        }
        if (!isUserStillFollower) {
            unfollowed.push(_follower);
        }
    });
    actualFollowers.forEach(_follower => {
        const isFollowerExists = storedFollowersMap.get(_follower.followerName);
        if (!isFollowerExists) {
            newFollowers.push(_follower);
        }
        if (isFollowerExists && _follower.lastFollowCreatedAt !== null) {
            const lastUnfollowDate = new Date(_follower.lastUnfollowCreatedAt);
            const lastFollowDate = new Date(_follower.lastFollowCreatedAt);
            if (lastFollowDate.getTime() < lastUnfollowDate.getTime()) {
                refollowed.push(_follower);
            }
        }
    });
    if (newFollowers.length) {
        await addFollowers(userId, newFollowers);
    }
    if (refollowed.length) {
        await updateRefollowed(userId, refollowed);
    }
    if (unfollowed.length) {
        await updateUnfollowed(userId, unfollowed);
    }
    return getFollowers(userId);
};

const addFollowers = async (userId, followers) => {
    const query = SQL`insert into followers (streamer_id, name, last_follow_created_at) values `;

    followers.forEach((_follower, index) => {
        if (index < followers.length - 1) {
            query.append(
                SQL`(${userId}, ${_follower.followerName}, ${_follower.lastFollowCreatedAt}), `,
            );
        }
    });

    const i = followers.length - 1;
    query.append(
        SQL`(${userId}, ${followers[i].followerName}, ${followers[i].lastFollowCreatedAt} ) returning id;`,
    );
    console.log(query.text);
    const stmt = await pool.query(query);
    if (stmt.rowCount) {
        return true;
    }
    return false;
};

const updateUnfollowed = async (userId, followers) => {
    const query = SQL`update followers set last_unfollow_created_at = ${new Date().toISOString()} where streamer_id = ${userId} and name in (`;

    followers.forEach(_follower => {
        query.append(SQL`${_follower.followerName}, `);
    });

    query.append(SQL`'') returning id;`);

    const stmt = await pool.query(query);
    if (stmt.rowCount) {
        return true;
    }
    return false;
};

const updateRefollowed = async (userId, followers) => {
    const query = SQL`update followers set last_follow_created_at = ${new Date().toISOString()} where streamer_id = ${userId} and name in (`;

    followers.forEach(_follower => {
        query.append(SQL`${_follower.followerName}, `);
    });

    query.append(SQL`'') returning id;`);

    const stmt = await pool.query(query);
    if (stmt.rowCount) {
        return true;
    }
    return false;
};

module.exports = { findByEmail, createUser, findById, getFollowers, updateFollowers };
