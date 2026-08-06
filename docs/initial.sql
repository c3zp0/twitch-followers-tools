create table users (
  id serial,
  login varchar(100) unique
);


create table followers (
  id serial,
  twitch_id int,
  streamer_id int,
  name varchar,
  status varchar,
  last_follow_created_at timestamptz,
  last_unfollow_created_at timestamptz
);

create table followers_actions (
  id serial,
  follower_id int,
  action varchar,
  created_at timestamptz
);
