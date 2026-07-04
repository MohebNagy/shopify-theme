const menu = document.getElementById("mobileMenu");
const openBtn = document.getElementById("mobileMenuBtn");
const closeBtn = document.getElementById("closeMenu");

openBtn?.addEventListener("click", () => {
  menu?.classList.add("active");
  document.body.style.overflow = "hidden";
});

closeBtn?.addEventListener("click", () => {
  menu?.classList.remove("active");
  document.body.style.overflow = "";
});
