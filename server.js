// server.js - the express server for our mini social media app
const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const path = require("path");
const db = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;

// this lets express read the json we send in fetch requests
app.use(express.json());

// this keeps track of who is logged in (it uses cookies)
app.use(
  session({
    secret: "my-super-secret-key-123",
    resave: false,
    saveUninitialized: false,
  })
);

// this serves the html/css/js files from the public folder
app.use(express.static(path.join(__dirname, "public")));

// ---------- small helper functions ----------

// returns the logged in user or null if nobody is logged in
function getLoggedInUser(req) {
  if (!req.session.userId) {
    return null;
  }
  const user = db
    .prepare("SELECT id, username, full_name, bio, created_at FROM users WHERE id = ?")
    .get(req.session.userId);
  return user || null;
}

// check if user A follows user B
function isFollowing(followerId, followingId) {
  const row = db
    .prepare("SELECT id FROM follows WHERE follower_id = ? AND following_id = ?")
    .get(followerId, followingId);
  return row ? true : false;
}

// ---------- auth routes ----------

// register a new account
app.post("/api/register", (req, res) => {
  const username = (req.body.username || "").trim().toLowerCase();
  const password = req.body.password || "";
  const fullName = (req.body.fullName || "").trim();

  // basic checks before we save anything
  if (username.length < 3) {
    return res.status(400).json({ error: "Username must be at least 3 characters" });
  }
  if (!/^[a-z0-9_]+$/.test(username)) {
    return res.status(400).json({ error: "Username can only have letters, numbers and _" });
  }
  if (password.length < 4) {
    return res.status(400).json({ error: "Password must be at least 4 characters" });
  }

  // check if the username is already taken
  const existing = db.prepare("SELECT id FROM users WHERE username = ?").get(username);
  if (existing) {
    return res.status(400).json({ error: "That username is already taken" });
  }

  // never save the password as normal text! hash it first
  const hash = bcrypt.hashSync(password, 10);

  const result = db
    .prepare("INSERT INTO users (username, password, full_name) VALUES (?, ?, ?)")
    .run(username, hash, fullName || username);

  // log the new user in right away
  req.session.userId = result.lastInsertRowid;
  console.log("new user registered:", username);

  res.json({ ok: true });
});

// login with username and password
app.post("/api/login", (req, res) => {
  const username = (req.body.username || "").trim().toLowerCase();
  const password = req.body.password || "";

  const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username);

  if (!user) {
    return res.status(400).json({ error: "Wrong username or password" });
  }

  // bcrypt compare checks if the password matches the hash we saved
  const passwordOk = bcrypt.compareSync(password, user.password);

  if (!passwordOk) {
    return res.status(400).json({ error: "Wrong username or password" });
  }

  req.session.userId = user.id;
  console.log("user logged in:", user.username);

  res.json({ ok: true });
});

// logout
app.post("/api/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

// who am i? the frontend calls this to know if we are logged in
app.get("/api/me", (req, res) => {
  res.json({ user: getLoggedInUser(req) });
});

// ---------- posts ----------

// get all posts for the feed (newest first)
app.get("/api/posts", (req, res) => {
  const me = getLoggedInUser(req);
  if (!me) {
    return res.status(401).json({ error: "You need to log in first" });
  }

  // the two sub-selects count the likes and comments for every post
  const posts = db
    .prepare(
      `
      SELECT posts.*, users.username, users.full_name,
        (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id) AS like_count,
        (SELECT COUNT(*) FROM comments WHERE comments.post_id = posts.id) AS comment_count
      FROM posts
      JOIN users ON users.id = posts.user_id
      ORDER BY posts.created_at DESC
    `
    )
    .all();

  // check for every post if the logged in user liked it already
  for (const post of posts) {
    const liked = db
      .prepare("SELECT id FROM likes WHERE post_id = ? AND user_id = ?")
      .get(post.id, me.id);
    post.liked_by_me = liked ? true : false;
  }

  res.json({ posts: posts });
});

// create a new post
app.post("/api/posts", (req, res) => {
  const me = getLoggedInUser(req);
  if (!me) {
    return res.status(401).json({ error: "You need to log in first" });
  }

  const content = (req.body.content || "").trim();

  if (content.length === 0) {
    return res.status(400).json({ error: "Post cannot be empty" });
  }
  if (content.length > 300) {
    return res.status(400).json({ error: "Post is too long (max 300 characters)" });
  }

  const result = db
    .prepare("INSERT INTO posts (user_id, content) VALUES (?, ?)")
    .run(me.id, content);

  console.log("new post added, id:", result.lastInsertRowid);
  res.json({ ok: true });
});

// get the comments of one post
app.get("/api/posts/:id/comments", (req, res) => {
  const me = getLoggedInUser(req);
  if (!me) {
    return res.status(401).json({ error: "You need to log in first" });
  }

  const comments = db
    .prepare(
      `
      SELECT comments.*, users.username, users.full_name
      FROM comments
      JOIN users ON users.id = comments.user_id
      WHERE comments.post_id = ?
      ORDER BY comments.created_at ASC
    `
    )
    .all(req.params.id);

  res.json({ comments: comments });
});

// add a comment to a post
app.post("/api/posts/:id/comments", (req, res) => {
  const me = getLoggedInUser(req);
  if (!me) {
    return res.status(401).json({ error: "You need to log in first" });
  }

  const post = db.prepare("SELECT id FROM posts WHERE id = ?").get(req.params.id);
  if (!post) {
    return res.status(404).json({ error: "Post not found" });
  }

  const content = (req.body.content || "").trim();
  if (content.length === 0) {
    return res.status(400).json({ error: "Comment cannot be empty" });
  }

  db.prepare("INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)").run(
    req.params.id,
    me.id,
    content
  );

  const commentCount = db
    .prepare("SELECT COUNT(*) AS count FROM comments WHERE post_id = ?")
    .get(req.params.id).count;

  res.json({ ok: true, commentCount: commentCount });
});

// like / unlike a post (it is a toggle)
app.post("/api/posts/:id/like", (req, res) => {
  const me = getLoggedInUser(req);
  if (!me) {
    return res.status(401).json({ error: "You need to log in first" });
  }

  const post = db.prepare("SELECT id FROM posts WHERE id = ?").get(req.params.id);
  if (!post) {
    return res.status(404).json({ error: "Post not found" });
  }

  // check if we already liked this post
  const existingLike = db
    .prepare("SELECT id FROM likes WHERE post_id = ? AND user_id = ?")
    .get(req.params.id, me.id);

  if (existingLike) {
    // already liked so we take the like back
    db.prepare("DELETE FROM likes WHERE id = ?").run(existingLike.id);
  } else {
    db.prepare("INSERT INTO likes (user_id, post_id) VALUES (?, ?)").run(me.id, req.params.id);
  }

  const likeCount = db
    .prepare("SELECT COUNT(*) AS count FROM likes WHERE post_id = ?")
    .get(req.params.id).count;

  res.json({ ok: true, liked: !existingLike, likeCount: likeCount });
});

// ---------- users / profiles ----------

// get all users for the explore page
app.get("/api/users", (req, res) => {
  const me = getLoggedInUser(req);
  if (!me) {
    return res.status(401).json({ error: "You need to log in first" });
  }

  const users = db
    .prepare(
      `
      SELECT users.id, users.username, users.full_name, users.bio,
        (SELECT COUNT(*) FROM posts WHERE posts.user_id = users.id) AS post_count,
        (SELECT COUNT(*) FROM follows WHERE follows.following_id = users.id) AS follower_count
      FROM users
      ORDER BY users.username ASC
    `
    )
    .all();

  for (const user of users) {
    user.is_following = isFollowing(me.id, user.id);
  }

  res.json({ users: users });
});

// get one users profile with all their posts
app.get("/api/users/:id", (req, res) => {
  const me = getLoggedInUser(req);
  if (!me) {
    return res.status(401).json({ error: "You need to log in first" });
  }

  const user = db
    .prepare("SELECT id, username, full_name, bio, created_at FROM users WHERE id = ?")
    .get(req.params.id);

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  // the stats for the profile page
  const postCount = db
    .prepare("SELECT COUNT(*) AS count FROM posts WHERE user_id = ?")
    .get(user.id).count;
  const followerCount = db
    .prepare("SELECT COUNT(*) AS count FROM follows WHERE following_id = ?")
    .get(user.id).count;
  const followingCount = db
    .prepare("SELECT COUNT(*) AS count FROM follows WHERE follower_id = ?")
    .get(user.id).count;

  const posts = db
    .prepare(
      `
      SELECT posts.*, users.username, users.full_name,
        (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id) AS like_count,
        (SELECT COUNT(*) FROM comments WHERE comments.post_id = posts.id) AS comment_count
      FROM posts
      JOIN users ON users.id = posts.user_id
      WHERE posts.user_id = ?
      ORDER BY posts.created_at DESC
    `
    )
    .all(user.id);

  for (const post of posts) {
    const liked = db
      .prepare("SELECT id FROM likes WHERE post_id = ? AND user_id = ?")
      .get(post.id, me.id);
    post.liked_by_me = liked ? true : false;
  }

  res.json({
    user: user,
    stats: {
      postCount: postCount,
      followerCount: followerCount,
      followingCount: followingCount,
    },
    isFollowing: isFollowing(me.id, user.id),
    isMe: me.id === user.id,
    posts: posts,
  });
});

// follow / unfollow a user (also a toggle)
app.post("/api/users/:id/follow", (req, res) => {
  const me = getLoggedInUser(req);
  if (!me) {
    return res.status(401).json({ error: "You need to log in first" });
  }

  const userId = Number(req.params.id);

  if (userId === me.id) {
    return res.status(400).json({ error: "You cannot follow yourself" });
  }

  const user = db.prepare("SELECT id FROM users WHERE id = ?").get(userId);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const existingFollow = db
    .prepare("SELECT id FROM follows WHERE follower_id = ? AND following_id = ?")
    .get(me.id, userId);

  if (existingFollow) {
    db.prepare("DELETE FROM follows WHERE id = ?").run(existingFollow.id);
  } else {
    db.prepare("INSERT INTO follows (follower_id, following_id) VALUES (?, ?)").run(
      me.id,
      userId
    );
  }

  const followerCount = db
    .prepare("SELECT COUNT(*) AS count FROM follows WHERE following_id = ?")
    .get(userId).count;

  res.json({ ok: true, following: !existingFollow, followerCount: followerCount });
});

// start the server
app.listen(PORT, () => {
  console.log("server running on http://localhost:" + PORT);
});
