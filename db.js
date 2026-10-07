// db.js - sets up the sqlite database and adds some demo data
// we use better-sqlite3 because it is easy (no callbacks needed)
const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");

// this creates the database file in our project folder
const db = new Database("social.db");

// create the tables if they do not exist yet
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  full_name TEXT NOT NULL,
  bio TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL REFERENCES posts(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- a user can only like the same post one time (that is why UNIQUE)
CREATE TABLE IF NOT EXISTS likes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  post_id INTEGER NOT NULL REFERENCES posts(id),
  UNIQUE(user_id, post_id)
);

-- a user can only follow the same person one time
CREATE TABLE IF NOT EXISTS follows (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  follower_id INTEGER NOT NULL REFERENCES users(id),
  following_id INTEGER NOT NULL REFERENCES users(id),
  UNIQUE(follower_id, following_id)
);
`);

// if the database is empty we add some demo data so the app does not look empty
const userCount = db.prepare("SELECT COUNT(*) AS count FROM users").get().count;

if (userCount === 0) {
  console.log("database is empty, adding demo users and posts...");

  // all demo users have the password 1234
  const hash = bcrypt.hashSync("1234", 10);

  const insertUser = db.prepare(
    "INSERT INTO users (username, password, full_name, bio, created_at) VALUES (?, ?, ?, ?, ?)"
  );

  insertUser.run("alex", hash, "Alex Rivera", "Coffee addict. Learning web dev one tutorial at a time.", datetime("-34 days"));
  insertUser.run("maya", hash, "Maya Chen", "Designer who also writes code sometimes.", datetime("-30 days"));
  insertUser.run("sam", hash, "Sam Okafor", "Music, basketball and late night coding sessions.", datetime("-21 days"));
  insertUser.run("priya", hash, "Priya Sharma", "Biology student. Cat lover. New here!", datetime("-3 days"));

  const insertPost = db.prepare(
    "INSERT INTO posts (user_id, content, created_at) VALUES (?, ?, ?)"
  );

  insertPost.run(1, "Just finished building my first ever Express server! It only took me 3 hours to figure out why my routes were not working... turns out I forgot a next() in one middleware. Anyway, super happy today!", datetime("-2 hours"));
  insertPost.run(4, "Hello everyone! Joined this app today to follow my friends and maybe learn some coding too.", datetime("-6 hours"));
  insertPost.run(2, "New portfolio layout is finally done. Went with a simple grid this time instead of my usual chaos.", datetime("-9 hours"));
  insertPost.run(3, "Hot take: 2am is the best time to debug code. No distractions, just you and the bug.", datetime("-1 day"));
  insertPost.run(1, "Does anyone else keep forgetting that array indexes start at 0 or is it just me?", datetime("-2 days"));
  insertPost.run(2, "Color palette tip: pick one strong color and then just use grey for everything else. Works every time.", datetime("-3 days"));
  insertPost.run(3, "New playlist for coding sessions is ready. 3 hours of lofi, no ads.", datetime("-4 days"));
  insertPost.run(1, "Weekend plan: rebuild my todo app for the 5th time. Maybe the 5th time is the one I actually finish.", datetime("-6 days"));

  const insertComment = db.prepare(
    "INSERT INTO comments (post_id, user_id, content, created_at) VALUES (?, ?, ?, ?)"
  );

  insertComment.run(1, 2, "Congrats! The middleware struggle is real.", datetime("-1 hour"));
  insertComment.run(1, 3, "We have all been there. Welcome to the backend club.", datetime("-45 minutes"));
  insertComment.run(2, 3, "Welcome Priya!", datetime("-5 hours"));
  insertComment.run(3, 1, "Would love to see it. Post a screenshot!", datetime("-8 hours"));
  insertComment.run(4, 4, "It is 2am and I am reading this instead of sleeping.", datetime("-20 hours"));

  const insertLike = db.prepare(
    "INSERT INTO likes (user_id, post_id) VALUES (?, ?)"
  );

  insertLike.run(2, 1); insertLike.run(3, 1); insertLike.run(4, 1);
  insertLike.run(1, 2); insertLike.run(2, 2);
  insertLike.run(1, 3); insertLike.run(4, 3);
  insertLike.run(1, 4); insertLike.run(2, 4);
  insertLike.run(2, 5); insertLike.run(3, 5);
  insertLike.run(3, 8); insertLike.run(4, 8);

  const insertFollow = db.prepare(
    "INSERT INTO follows (follower_id, following_id) VALUES (?, ?)"
  );

  insertFollow.run(2, 1); insertFollow.run(3, 1); insertFollow.run(4, 1);
  insertFollow.run(1, 2); insertFollow.run(3, 2); insertFollow.run(4, 2);
  insertFollow.run(1, 3); insertFollow.run(4, 3);
  insertFollow.run(3, 4);

  console.log("demo data added. you can login with username: alex password: 1234");
}

// small helper to get a sqlite datetime string in the past
// example: datetime("-2 hours") gives the time from 2 hours ago
function datetime(ago) {
  return db.prepare("SELECT datetime('now', ?) AS t").get(ago).t;
}

module.exports = db;
