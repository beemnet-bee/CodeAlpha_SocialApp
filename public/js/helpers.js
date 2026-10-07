// helpers.js - small functions that we use on every page

// escape special characters so nobody can break our html with a post
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// the database saves the time in UTC, the "Z" tells javascript that
function parseDbTime(dbTime) {
  return new Date(dbTime.replace(" ", "T") + "Z");
}

// turns a db time into "5m ago" style text
function timeAgo(dbTime) {
  const seconds = Math.floor((Date.now() - parseDbTime(dbTime)) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return minutes + "m ago";
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours + "h ago";
  const days = Math.floor(hours / 24);
  if (days < 7) return days + "d ago";
  return parseDbTime(dbTime).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// turns a db time into "Joined March 2025"
function joinedDate(dbTime) {
  return parseDbTime(dbTime).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

// the colors we use for the avatars
const avatarColors = ["#f4a4a4", "#f4c98f", "#e8d06f", "#9fd8a4", "#7fd4c4", "#9cb7f0", "#c39be0", "#ef9fc0"];

// every username always gets the same color
function avatarColor(name) {
  let sum = 0;
  for (let i = 0; i < name.length; i++) {
    sum = sum + name.charCodeAt(i);
  }
  return avatarColors[sum % avatarColors.length];
}

// makes the avatar circle (it shows the first letter of the username)
function avatarHtml(user, extraClass) {
  const letter = user.username.charAt(0).toUpperCase();
  return `<div class="avatar ${extraClass || ""}" style="background:${avatarColor(user.username)}">${letter}</div>`;
}

// ask the server who is logged in, if nobody is logged in go back to the login page
async function getMe() {
  const res = await fetch("/api/me");
  const data = await res.json();
  if (!data.user) {
    window.location.href = "index.html";
  }
  return data.user;
}

// ---------- post stuff (used on the feed page and the profile page) ----------

// load all posts from the server and show them
async function loadPosts() {
  const res = await fetch("/api/posts");
  const data = await res.json();
  if (data.error) {
    window.location.href = "index.html";
    return;
  }
  renderPosts(data.posts);
}

function renderPosts(posts) {
  const box = document.getElementById("posts");
  if (posts.length === 0) {
    box.innerHTML = '<div class="card empty">No posts yet. Be the first one to post something!</div>';
    return;
  }
  box.innerHTML = posts.map(postHtml).join("");
}

// builds the html for one post card
function postHtml(p) {
  return `
  <article class="card post">
    <div class="post-head">
      ${avatarHtml(p)}
      <div>
        <a class="post-author" href="profile.html?id=${p.user_id}">${escapeHtml(p.full_name)}</a>
        <span class="post-meta">@${escapeHtml(p.username)} &middot; ${timeAgo(p.created_at)}</span>
      </div>
    </div>
    <p class="post-content">${escapeHtml(p.content)}</p>
    <div class="post-actions">
      <button class="like-btn ${p.liked_by_me ? "liked" : ""}" onclick="toggleLike(${p.id}, this)">&#9825; <span class="count">${p.like_count}</span></button>
      <button class="comment-btn" onclick="toggleComments(${p.id})">Comments <span class="count">${p.comment_count}</span></button>
    </div>
    <div class="comments" id="comments-${p.id}" hidden>
      <div id="comment-list-${p.id}"></div>
      <div class="comment-form">
        <input id="comment-input-${p.id}" placeholder="Write a comment..." maxlength="200">
        <button class="btn btn-small" onclick="addComment(${p.id})">Send</button>
      </div>
    </div>
  </article>`;
}

// like or unlike a post (the server does the toggling for us)
async function toggleLike(postId, btn) {
  const res = await fetch(`/api/posts/${postId}/like`, { method: "POST" });
  const data = await res.json();
  if (data.error) {
    alert(data.error);
    return;
  }
  btn.classList.toggle("liked", data.liked);
  btn.querySelector(".count").textContent = data.likeCount;
}

// show or hide the comments under a post
async function toggleComments(postId) {
  const box = document.getElementById("comments-" + postId);
  if (box.hidden) {
    await loadComments(postId);
    box.hidden = false;
  } else {
    box.hidden = true;
  }
}

// load the comments of one post from the server
async function loadComments(postId) {
  const res = await fetch(`/api/posts/${postId}/comments`);
  const data = await res.json();
  const list = document.getElementById("comment-list-" + postId);
  if (data.comments.length === 0) {
    list.innerHTML = '<p class="muted small no-comments">No comments yet</p>';
    return;
  }
  list.innerHTML = data.comments.map(commentHtml).join("");
}

// builds the html for one comment
function commentHtml(c) {
  return `
  <div class="comment">
    ${avatarHtml(c, "avatar-small")}
    <div class="comment-body">
      <span class="comment-author">${escapeHtml(c.full_name)}</span>
      <span class="post-meta">@${escapeHtml(c.username)} &middot; ${timeAgo(c.created_at)}</span>
      <p>${escapeHtml(c.content)}</p>
    </div>
  </div>`;
}

// send a new comment to the server
async function addComment(postId) {
  const input = document.getElementById("comment-input-" + postId);
  const content = input.value.trim();
  if (content.length === 0) return; // do nothing when the input is empty

  const res = await fetch(`/api/posts/${postId}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: content }),
  });
  const data = await res.json();
  if (data.error) {
    alert(data.error);
    return;
  }

  input.value = "";
  await loadComments(postId);

  // update the comment count on the button of this post
  const postCard = document.getElementById("comments-" + postId).closest(".post");
  postCard.querySelector(".comment-btn .count").textContent = data.commentCount;
}

// log out (used on the feed, profile and explore page)
async function logout() {
  await fetch("/api/logout", { method: "POST" });
  window.location.href = "index.html";
}
