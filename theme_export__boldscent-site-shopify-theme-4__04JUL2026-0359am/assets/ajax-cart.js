function formatMoney(cents) {
  const amount = (cents / 100).toFixed(2);
  if (window.theme?.moneyFormat) {
    return window.theme.moneyFormat.replace(/\{\{\s*amount\s*\}\}/, amount);
  }
  return `LE ${amount}`;
}

async function addToCart(variantId, quantity = 1) {
  try {
    const res = await fetch("/cart/add.js", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ id: variantId, quantity: quantity })
    });

    if (!res.ok) throw new Error("Add to cart failed");

    await updateCartDrawer();
    openCartDrawer();
    return await res.json();
  } catch (err) {
    console.error("Add to cart error:", err);
  }
}

async function getCart() {
  const res = await fetch("/cart.js");
  return await res.json();
}

async function changeQuantity(lineIndex, newQuantity) {
  try {
    const res = await fetch("/cart/change.js", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ line: lineIndex, quantity: newQuantity })
    });

    if (!res.ok) throw new Error("Change quantity failed");
    await updateCartDrawer();
  } catch (err) {
    console.error("Change quantity error:", err);
  }
}

async function switchVariant(lineIndex, currentQty, newVariantId) {
  try {
    await fetch("/cart/change.js", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ line: lineIndex, quantity: 0 })
    });

    await fetch("/cart/add.js", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ id: newVariantId, quantity: currentQty })
    });

    await updateCartDrawer();
  } catch (err) {
    console.error("Switch variant error:", err);
  }
}

function updateFreeShippingBar(totalPriceCents) {
  const targetAmount = 1500; 
  const currentTotal = totalPriceCents / 100;
  const progressFill = document.getElementById("shippingProgressFill");
  const goalText = document.getElementById("shippingGoalText");

  if (!progressFill || !goalText) return;

  const percentage = Math.min((currentTotal / targetAmount) * 100, 100);
  progressFill.style.width = `${percentage}%`;

  if (currentTotal >= targetAmount) {
    goalText.innerHTML = `🎉 Delightful! You've unlocked <span>Free Shipping</span>`;
  } else {
    const remaining = targetAmount - currentTotal;
    goalText.innerHTML = `You are <span>LE ${remaining.toFixed(2)}</span> away from Free Shipping`;
  }
}

async function updateCartDrawer() {
  const cart = await getCart();
  const container = document.querySelector(".cart-drawer-items");
  const counts = document.querySelectorAll(".cart-count");
  const subtotalElement = document.getElementById("cartDrawerSubtotal");
  const totalElement = document.getElementById("cartDrawerTotal");
  
  const shippingWrapper = document.getElementById("shippingGoalWrapper");
  const footerWrapper = document.getElementById("cartFooterWrapper");
  const emptyState = document.getElementById("cartEmptyState");

  counts.forEach(el => { el.textContent = cart.item_count; });

  // 🌟 تحديث فوري وصارم للقيم بالـ DOM لإنهاء مشكلة الـ LE 0.00 الثابتة
  if (subtotalElement) subtotalElement.textContent = formatMoney(cart.total_price);
  if (totalElement) totalElement.textContent = formatMoney(cart.total_price);

  if (!container) return;

  if (cart.items.length === 0) {
    container.innerHTML = "";
    container.style.display = "none";
    if (shippingWrapper) shippingWrapper.style.display = "none";
    if (footerWrapper) footerWrapper.style.display = "none";
    if (emptyState) emptyState.style.display = "flex";
    return;
  }

  container.style.display = "block";
  if (shippingWrapper) shippingWrapper.style.display = "block";
  if (footerWrapper) footerWrapper.style.display = "flex";
  if (emptyState) emptyState.style.display = "none";

  updateFreeShippingBar(cart.total_price);

  const itemsHTML = await Promise.all(cart.items.map(async (item, index) => {
    const linePosition = index + 1;
    
    let variantOptionsHTML = "";
    try {
      const pRes = await fetch(`/products/${item.handle}.js`);
      if (pRes.ok) {
        const productData = await pRes.json();
        if (productData.variants && productData.variants.length > 1) {
          variantOptionsHTML = `
            <select class="cart-item-variant-select" data-line="${linePosition}" data-current-qty="${item.quantity}">
              ${productData.variants.map(v => `
                <option value="${v.id}" ${v.id === item.variant_id ? "selected" : ""}>
                  ${v.title} - ${formatMoney(v.price)}
                </option>
              `).join("")}
            </select>
          `;
        } else {
          variantOptionsHTML = item.variant_title && item.variant_title !== "Default Title" 
            ? `<span style="font-size:12px; color:#666; margin-bottom:8px; display:block;">${item.variant_title}</span>` 
            : "";
        }
      }
    } catch (err) {
      console.error("Error fetching product variants:", err);
    }

    // 🌟 تم تعديل الـ Input وتمرير الـ data attributes بشكل صارم للأزرار لتجنب أي تجميد للكمية
    return `
      <div class="cart-item">
        <img src="${item.image}" alt="${item.product_title}">
        
        <div class="cart-item-details">
          <h4 class="cart-item-title">${item.product_title}</h4>
          
          ${variantOptionsHTML}
          
          <button class="cart-item-remove" data-line="${linePosition}" data-current-qty="${item.quantity}" type="button" aria-label="Remove item">✕</button>
          
          <div class="cart-item-price-qty">
            <div class="cart-item-qty-selector">
              <button type="button" class="qty-btn qty-minus" data-line="${linePosition}" data-current-qty="${item.quantity}">-</button>
              <input type="text" class="qty-input" value="${item.quantity}" readonly aria-label="Quantity">
              <button type="button" class="qty-btn qty-plus" data-line="${linePosition}" data-current-qty="${item.quantity}">+</button>
            </div>
            <span class="cart-item-price">${formatMoney(item.final_line_price)}</span>
          </div>
        </div>
      </div>
    `;
  }));

  container.innerHTML = itemsHTML.join("");
}

function openCartDrawer() {
  document.getElementById("cartDrawer")?.classList.add("active");
  document.getElementById("cartOverlay")?.classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeCartDrawer() {
  document.getElementById("cartDrawer")?.classList.remove("active");
  document.getElementById("cartOverlay")?.classList.remove("active");
  document.body.style.overflow = "";
  
  const drawer = document.getElementById("cartDrawer");
  if (drawer) drawer.style.transform = "";
}

document.addEventListener("DOMContentLoaded", () => {
  const closeCartBtn = document.getElementById("closeCart");
  const cartBtn = document.getElementById("cartBtn");
  const cartOverlay = document.getElementById("cartOverlay");
  const addToCartBtn = document.getElementById("addToCartBtn");
  const container = document.querySelector(".cart-drawer-items");
  const continueShoppingBtn = document.getElementById("continueShoppingBtn");

  closeCartBtn?.addEventListener("click", closeCartDrawer);
  cartOverlay?.addEventListener("click", closeCartDrawer);
  continueShoppingBtn?.addEventListener("click", closeCartDrawer);

  cartBtn?.addEventListener("click", async () => {
    await updateCartDrawer();
    openCartDrawer();
  });

  container?.addEventListener("click", async (e) => {
    const target = e.target;
    const line = target.dataset.line;
    if (!line) return;

    const currentQty = parseInt(target.dataset.currentQty, 10);

    if (target.classList.contains("qty-plus")) {
      e.preventDefault();
      await changeQuantity(line, currentQty + 1);
    }

    if (target.classList.contains("qty-minus")) {
      e.preventDefault();
      if (currentQty > 1) {
        await changeQuantity(line, currentQty - 1);
      } else {
        await changeQuantity(line, 0);
      }
    }

    if (target.classList.contains("cart-item-remove")) {
      e.preventDefault();
      await changeQuantity(line, 0);
    }
  });

  container?.addEventListener("change", async (e) => {
    const target = e.target;
    if (target.classList.contains("cart-item-variant-select")) {
      const line = target.dataset.line;
      const currentQty = parseInt(target.dataset.currentQty, 10);
      const newVariantId = target.value;
      if (line && newVariantId) {
        target.style.opacity = "0.4";
        await switchVariant(line, currentQty, newVariantId);
      }
    }
  });

  const drawer = document.getElementById("cartDrawer");
  let touchStartX = 0;
  let touchCurrentX = 0;

  drawer?.addEventListener("touchstart", (e) => {
    touchStartX = e.touches[0].clientX;
  }, { passive: true });

  drawer?.addEventListener("touchmove", (e) => {
    touchCurrentX = e.touches[0].clientX;
    const swipeDistance = touchCurrentX - touchStartX;
    
    if (swipeDistance > 0 && drawer.classList.contains("active")) {
      drawer.style.transform = `translateX(${swipeDistance}px)`;
    }
  }, { passive: true });

  drawer?.addEventListener("touchend", (e) => {
    const swipeDistance = touchCurrentX - touchStartX;
    drawer.style.transform = "";

    if (swipeDistance > 50) {
      closeCartDrawer();
    }
    touchStartX = 0;
    touchCurrentX = 0;
  });

  addToCartBtn?.addEventListener("click", () => {
    const variantId = addToCartBtn.dataset.variantId;
    const qtyInput = document.getElementById("qtyInput");
    const quantity = qtyInput ? parseInt(qtyInput.value, 10) || 1 : 1;
    if (variantId) addToCart(variantId, quantity);
  });

  document.querySelectorAll(".btn-quick-add[data-variant-id]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const variantId = btn.dataset.variantId;
      if (!variantId) return;
      await addToCart(variantId, 1);
    });
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeCartDrawer();
  });
});