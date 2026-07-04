document.querySelectorAll(".thumb").forEach(img => {
  img.addEventListener("click", () => {
    const main = document.getElementById("mainProductImage");
    if (!main) return;

    document.querySelectorAll(".thumb").forEach(t => t.classList.remove("active"));
    img.classList.add("active");
    main.src = img.dataset.full;
  });
});

if (document.querySelector(".thumb")) {
  document.querySelector(".thumb").classList.add("active");
}
