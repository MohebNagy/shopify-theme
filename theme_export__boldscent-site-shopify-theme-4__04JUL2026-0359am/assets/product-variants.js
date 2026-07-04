const buttons = document.querySelectorAll(".variant-btn");
const addToCartBtn = document.getElementById("addToCartBtn");
const addToCartBtnSticky = document.getElementById("addToCartBtnSticky");
const priceEl = document.getElementById("productPrice");
const inventoryEl = document.getElementById("productInventory");

buttons.forEach(btn => {
  btn.addEventListener("click", () => {
    buttons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    const variantId = btn.dataset.variantId;
    const variantPrice = btn.dataset.variantPrice;

    if (variantId) {
      if (addToCartBtn) addToCartBtn.dataset.variantId = variantId;
      if (addToCartBtnSticky) addToCartBtnSticky.dataset.variantId = variantId;
    }


    if (priceEl && variantPrice) {
      priceEl.textContent = variantPrice;
    }

    if (inventoryEl) {
      inventoryEl.textContent = btn.disabled ? "Out of stock" : "In stock";
    }
  });
});

