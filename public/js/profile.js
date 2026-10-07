// profile.js - the profile page

// the user id comes from the url, for example profile.html?id=2
const params = new URLSearchParams(window.location.search);
let profileId = params.get("id");

// follow or unfollow the user of this profile
async function toggleFollow(userId) {
  const res = await fetch(`/api/users/${userId}/follow`, { method: "POST" });
  const data = await res.json();
  if (data.error) {
    alert(data.error);
    return;
  }
  // easiest way to update the button and the stats is to load the profile again
  loadProfile(userId);
}

// load the profile info + posts from the server
async function loadProfile(id) {
  const res = await fetch("/api/users/" + id);
  const data = await res.json();

  if (data.error) {
    document.getElementById("profile-box").innerHTML = `<div class="card empty">${data.error}</div>`;
    return;
  }

  renderProfile(data);
  renderPosts(data.posts);
}

// build the profile header (avatar, name, stats, follow button)
function renderProfile(data) {
  const u = data.user;
  const box = document.getElementById("profile-box");

  // if it is my own profile we show a badge instead of the follow button
  let buttonHtml = "";
  if (data.isMe) {
    buttonHtml = `<span class="you-badge">This is you</span>`;
  } else if (data.isFollowing) {
    buttonHtml = `<button class="btn btn-ghost" onclick="toggleFollow(${u.id})">Following</button>`;
  } else {
    buttonHtml = `<button class="btn" onclick="toggleFollow(${u.id})">Follow</button>`;
  }

  box.innerHTML = `
  <div class="card">
    <div class="profile-top">
      ${avatarHtml(u, "avatar-big")}
      <div class="profile-info">
        <h2>${escapeHtml(u.full_name)}</h2>
        <p class="muted">@${escapeHtml(u.username)}</p>
        <p class="bio">${escapeHtml(u.bio)}</p>
        <p class="muted small">Joined ${joinedDate(u.created_at)}</p>
      </div>
      <div>${buttonHtml}</div>
    </div>
    <div class="stats">
      <div><b>${data.stats.postCount}</b> posts</div>
      <div><b>${data.stats.followerCount}</b> followers</div>
      <div><b>${data.stats.followingCount}</b> following</div>
    </div>
  </div>`;
}

// log out button
document.getElementById("logout-btn").addEventListener("click", logout);

// start everything
async function init() {
  const me = await getMe();
  if (!me) return;

  // no id in the url means we want to see our own profile
  if (!profileId) {
    profileId = me.id;
  }

  loadProfile(profileId);
}

init();
