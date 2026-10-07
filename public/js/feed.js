// feed.js - the main feed page

const postText = document.getElementById("post-text");
const charCount = document.getElementById("char-count");
const postBtn = document.getElementById("post-btn");

// count the characters while typing
postText.addEventListener("input", () => {
  charCount.textContent = postText.value.length + " / 300";
});

// create a new post
postBtn.addEventListener("click", async () => {
  const content = postText.value.trim();
  if (content.length === 0) return; // do nothing when the box is empty

  const res = await fetch("/api/posts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: content }),
  });
  const data = await res.json();

  if (data.error) {
    alert(data.error);
    return;
  }

  // clear the box and load the posts again (easy way to show the new post)
  postText.value = "";
  charCount.textContent = "0 / 300";
  loadPosts();
});

// log out button
document.getElementById("logout-btn").addEventListener("click", logout);

// start everything
async function init() {
  const me = await getMe();
  if (!me) return; // getMe sends us to the login page if we are not logged in
  loadPosts();
}

init();
