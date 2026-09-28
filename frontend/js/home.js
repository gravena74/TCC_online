import { requireAuth } from "./guard.js";

const user = await requireAuth();
if (user) {
  const firstName = user.name ? user.name.trim().split(/\s+/)[0] : "tutor";
  document.getElementById("userName").textContent = firstName;
  document.getElementById("authLoading").style.display = "none";
  document.getElementById("screen").style.display = "flex";
}
