const searchDrawer = document.getElementById("searchDrawer");
const searchBtn = document.getElementById("searchBtn");
const closeSearchBtn = document.getElementById("closeSearch");
const searchInput = document.querySelector("#searchInput");
const resultsBox = document.querySelector(".search-results");

function openSearchDrawer() {
  searchDrawer?.classList.add("active");
  searchInput?.focus();
  document.body.style.overflow = "hidden";
}

function closeSearchDrawer() {
  searchDrawer?.classList.remove("active");
  document.body.style.overflow = "";
  if (searchInput) searchInput.value = "";
  if (resultsBox) resultsBox.innerHTML = "";
}

searchBtn?.addEventListener("click", openSearchDrawer);
closeSearchBtn?.addEventListener("click", closeSearchDrawer);

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeSearchDrawer();
});

async function fetchSearch(query) {
  const res = await fetch(`/search/suggest.json?q=${encodeURIComponent(query)}&resources[type]=product&resources[limit]=6`);
  return await res.json();
}

searchInput?.addEventListener("input", async (e) => {
  const query = e.target.value.trim();

  if (query.length < 2) {
    if (resultsBox) resultsBox.innerHTML = "";
    return;
  }

  try {
    const data = await fetchSearch(query);
    const products = data.resources?.results?.products || [];

    if (!resultsBox) return;

    resultsBox.innerHTML = products.map(p => `
      <a href="${p.url}" class="search-item">
        <img src="${p.image}" alt="${p.title}" width="50" height="50">
        <span>${p.title}</span>
      </a>
    `).join("");
  } catch (err) {
    console.error("Search error:", err);
  }
});
