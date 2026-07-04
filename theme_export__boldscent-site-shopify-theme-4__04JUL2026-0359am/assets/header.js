window.addEventListener("scroll", () => {
  const header = document.getElementById("siteHeader");
  if (!header) return;

  if (window.scrollY > 50) {
    header.style.borderBottom = "1px solid #C8A060";
  } else {
    header.style.borderBottom = "1px solid #242424";
  }
});
