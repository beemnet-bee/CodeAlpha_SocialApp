// explore.js - the page with all users

// load all users from the server and show them
async function loadUsers() {
  const res = await fetch("/api/users");
  const data = await res.json();
  if (data.error) {
    window.location.href = "index.html";
    return;
  }

  const me = data.users.find((u) => u.username === myUsername);
  const box = document.getElementById("user-list");

  // build the list without showing myself
  const others = data.users.filter((u) => u.id !== myId);

  if (others.length === 0) {
    box.innerHTML = '<div class="card empty">No other users yet. Invite your friends!</div>';
    return;
  }

  box.innerHTML = others.map(userHtml).join("");
}

// remember who I am so the list can skip me
let myId = null;
let myUsername = null;

// follow or unfollow someone
async function toggleFollow(userId) {
  const res = await fetch(`/api/users/${userId}/follow`, { method: "POST" });
  const data = await res.json();
  if (data.error) {
    alert(data.error);
    return;
  }
  // easiest way to update the buttons is to load the list again
  loadUsers();
}

// builds the html for one user row
function userHtml(u) {
  const button = u.is_following
    ? `<button class="btn btn-ghost btn-small" onclick="toggleFollow(${u.id})">Following</button>`
    : `<button class="btn btn-small" onclick="toggleFollow(${u.id})">Follow</button>`;

  return `
  <div class="card user-row">
    ${avatarHtml(u)}
    <div class="user-row-info">
      <a class="user-name" href="profile.html?id=${u.id}">${escapeHtml(u.full_name)}</a>
      <span class="muted small">@${escapeHtml(u.username)} &middot; ${u.post_count} posts &middot; ${u.follower_count} followers</span>
      ${u.bio ? `<p class="bio small">${escapeHtml(u.bio)}</p>` : ""}
    </div>
    ${button}
  </div>`;
}

// log out button
document.getElementById("logout-btn").addEventListener("click", logout);

// start everything
async function init() {
  const me = await getMe();
  if (!me) return;
  myId = me.id;
  myUsername = me.username;
  loadUsers();
}

init();
