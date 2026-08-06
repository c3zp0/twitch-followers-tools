const SQL = require('sql-template-strings');
const { pool } = require('../common/db');

const findByLogin = async login => {
    const stmt = await pool.query(SQL`select u.id, u.login from users u where u.login = ${login};`);
    if (stmt.rowCount) {
        const user = {
            id: stmt.rows[0].id,
            login: stmt.rows[0].login,
        };
        return user;
    }
    return null;
};

const findById = async id => {
    const stmt = await pool.query(SQL`select u.id, u.login from users u where u.id = ${id};`);
    if (stmt.rowCount) {
        const user = {
            id: stmt.rows[0].id,
            login: stmt.rows[0].login,
        };
        return user;
    }
    return null;
};

const createUser = async login => {
    const query = SQL`insert into users(login) values (${login}) returning id;`;
    const stmt = await pool.query(query);
    if (stmt.rowCount) {
        const user = {
            id: stmt.rows[0].id,
            login,
        };
        return user;
    }
};

const getFollowers = async userId => {
    const stmt = await pool.query(SQL`
        select 
          f.id, 
          f.twitch_id,
          f.name, 
          f.status,
          f.streamer_id, 
          f.last_follow_created_at,
          f.last_unfollow_created_at
        from followers f
        where f.streamer_id = ${userId}
        order by f.id asc;`);

    if (stmt.rowCount) {
        return stmt.rows.map(_row => ({
            id: _row.id,
            twitchId: _row.twitch_id,
            followerName: _row.name,
            status: _row.status,
            streamerId: _row.streamer_id,
            lastFollowCreatedAt: _row.last_follow_created_at,
            lastUnfollowCreatedAt: _row.last_unfollow_created_at,
        }));
    }
    return [];
};

const updateFollowers = async (userId, actualFollowers) => {
    const actualFollowersMap = new Map();
    const storedFollowers = await getFollowers(userId);
    actualFollowers.forEach(_follower => {
        const isFollowerInMap = actualFollowersMap.get(_follower.twitchId);
        if (!isFollowerInMap) {
            actualFollowersMap.set(_follower.twitchId, _follower);
        }
    });
    const unfollowed = [];
    const newFollowers = [];
    const refollowed = [];
    const newNames = [];
    const storedFollowersMap = new Map();
    storedFollowers.forEach(_follower => {
        const isFollowerInMap = storedFollowersMap.get(_follower.twitchId);
        const isUserStillFollower = actualFollowersMap.get(_follower.twitchId);
        if (!isFollowerInMap) {
            storedFollowersMap.set(_follower.twitchId, _follower);
        }
        if (!isUserStillFollower && _follower.status !== 'unfollow') {
            _follower.status = 'unfollow';
            unfollowed.push(_follower);
        }
    });
    actualFollowers.forEach(_follower => {
        const isFollowerExists = storedFollowersMap.get(_follower.twitchId);
        if (!isFollowerExists) {
            _follower.status = 'follow';
            newFollowers.push(_follower);
        }
        if (isFollowerExists && _follower.status === 'unfollow') {
            _follower.status = 'refollow';
            refollowed.push(_follower);
        }
        if (isFollowerExists) {
            const followerName = isFollowerExists.followerName.split(',')[0].trim();
            if (_follower.followerName !== followerName) {
                _follower.followerName += `, ${isFollowerExists.followerName}`;
                newNames.push(_follower);
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
    if (newNames.length) {
        await updateNames(newNames);
    }
    return getFollowers(userId);
};

const addFollowers = async (userId, followers) => {
    console.log('add followers');
    const query = SQL`insert into followers (streamer_id, twitch_id, name, status, last_follow_created_at) values `;

    followers.forEach((_follower, index) => {
        if (index < followers.length - 1) {
            query.append(
                SQL`(${userId}, ${_follower.twitchId}, ${_follower.followerName}, ${_follower.status}, ${_follower.lastFollowCreatedAt}), `,
            );
        }
    });

    const i = followers.length - 1;
    const last = followers[i];
    query.append(
        SQL`(${userId}, ${last.twitchId}, ${last.followerName}, ${last.status}, ${last.lastFollowCreatedAt} ) returning id;`,
    );
    const stmt = await pool.query(query);
    if (stmt.rowCount) {
        return true;
    }
    return false;
};

const updateUnfollowed = async (userId, followers) => {
    console.log('unfollowed');
    const query = SQL`
    update followers 
    set 
        last_unfollow_created_at = ${new Date().toISOString()}, 
        status = 'unfollow' 
    where 
        streamer_id = ${userId} 
        and twitch_id in (`;

    followers.forEach((_follower, index) => {
        if (index < followers.length - 1) {
            query.append(SQL`${_follower.twitchId}, `);
        }
    });

    const i = followers.length - 1;
    const last = followers[i];
    query.append(SQL`${last.twitchId}) returning id;`);

    const stmt = await pool.query(query);
    if (stmt.rowCount) {
        return true;
    }
    return false;
};

const updateRefollowed = async (userId, followers) => {
    console.log('refollowed');
    const query = SQL`
    update followers 
    set 
        last_follow_created_at = ${new Date().toISOString()},
        status = 'refollow' 
    where 
        streamer_id = ${userId} 
        and twitch_id in (`;

    followers.forEach((_follower, index) => {
        if (index < followers.length - 1) {
            query.append(SQL`${_follower.twitchId}, `);
        }
    });

    const i = followers.length - 1;
    const last = followers[i];
    query.append(SQL`${last.twitchId}) returning id;`);

    const stmt = await pool.query(query);
    if (stmt.rowCount) {
        return true;
    }
    return false;
};

const updateNames = async followers => {
    console.log(followers);
    await Promise.all(
        followers.map(_follower => {
            console.log(_follower);
            const query = SQL`
            update followers 
            set 
                name = ${_follower.followerName}
            where 
                twitch_id = ${_follower.twitchId};`;
            return pool.query(query);
        }),
    );
};

module.exports = { findByLogin, createUser, findById, getFollowers, updateFollowers };
