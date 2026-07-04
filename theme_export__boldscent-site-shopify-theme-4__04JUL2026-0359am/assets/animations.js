document.querySelectorAll("button, .btn-primary, .btn-secondary").forEach(btn => {
  btn.addEventListener("click", function (e) {
    if (this.classList.contains("variant-btn")) return;

    const ripple = document.createElement("span");
    ripple.classList.add("ripple");

    const rect = this.getBoundingClientRect();
    ripple.style.left = `${e.clientX - rect.left}px`;
    ripple.style.top = `${e.clientY - rect.top}px`;

    this.style.position = "relative";
    this.style.overflow = "hidden";
    this.appendChild(ripple);

    setTimeout(() => ripple.remove(), 600);
  });
});

window.addEventListener("scroll", () => {
  const header = document.querySelector(".site-header");
  if (!header) return;

  const inner = header.querySelector(".header-inner");
  if (!inner) return;

  if (window.scrollY > 80) {
    inner.style.padding = "10px 0";
  } else {
    inner.style.padding = "20px 0";
  }
});

window.addEventListener("scroll", () => {
  const hero = document.querySelector(".hero-media img");
  if (!hero) return;

  const offset = window.scrollY * 0.2;
  hero.style.transform = `translateY(${offset}px)`;
});
