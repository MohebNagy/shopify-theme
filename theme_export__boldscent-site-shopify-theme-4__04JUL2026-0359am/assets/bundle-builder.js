/* ============================================================
   bundle-builder.js
   BOLD - Bundle Builder Page Logic
   ============================================================
   State machine بسيطة بتدير:
   1. اختيار نوع التركيبة (pure-50 / pure-100 / mixed)
   2. اختيار الـ combo الفرعي لو mixed
   3. اختيار البرفانات والكميات (single list أو dual accordion)
   4. الـ validation + تفعيل زرار الإضافة للسلة
   ============================================================ */

document.addEventListener("DOMContentLoaded", function () {
  const variantsDataEl = document.getElementById("bundleVariantsData");
  if (!variantsDataEl) return; // السكشن ده مش موجود في الصفحة

  const variantsData = JSON.parse(variantsDataEl.textContent);
  const bundleSize = (window.bundleBuilderData && window.bundleBuilderData.bundleSize) || 0;

  // ---- DOM refs ----
  const compositionBtns = document.querySelectorAll(".composition-btn");
  const comboStep = document.getElementById("comboStep");
  const comboSelector = document.getElementById("comboSelector");
  const singleListStep = document.getElementById("singleListStep");
  const accordionStep = document.getElementById("accordionStep");

  const addToCartBtn = document.getElementById("bundleAddToCartBtn");
  const stickyBtn = document.getElementById("bundleStickyAddToCartBtn");
  const stickyBar = document.getElementById("bundleStickyAtcBar");

  const priceDisplay = document.getElementById("bundleCurrentPrice");
  const comparePriceDisplay = document.getElementById("bundleComparePrice");
  const propertiesContainer = document.getElementById("bundleHiddenProperties");

  const singleSelectionCounter = document.getElementById("singleSelectionCounter");
  const singleLimitDisplay = document.getElementById("singleLimitDisplay");

  const summaryTotalSelected = document.getElementById("summaryTotalSelected");
  const summaryFinalPrice = document.getElementById("summaryFinalPrice");

  // ---- Derived variant data ----
  const pure50Variant = variantsData.find((v) => v.type === "pure-50");
  const pure100Variant = variantsData.find((v) => v.type === "pure-100");
  const mixedVariants = variantsData.filter((v) => v.type === "mixed");

  // ملحوظة: variant.price في الـ Liquid بيرجع كـ integer بالـ piastres/cents (مثلاً 2838 جنيه = 283800)
  // فلازم نقسم على 100 الأول قبل ما نقسم على bundleSize عشان نطلع بالسعر الفعلي بالجنيه
  const pricePer50 = pure50Variant && bundleSize ? pure50Variant.rawPrice / 100 / bundleSize : 0;
  const pricePer100 = pure100Variant && bundleSize ? pure100Variant.rawPrice / 100 / bundleSize : 0;

  // ---- State ----
  let state = {
    compositionType: null, // 'pure-50' | 'pure-100' | 'mixed'
    activeVariant: null,
    target50: 0,
    target100: 0,
    selections: {}, // key: `${size}-${handle}` -> { handle, title, size, qty }
  };

  // ============================================================
  // Helpers
  // ============================================================
  function formatMoney(amount) {
    const sample = (pure50Variant && pure50Variant.price) || (pure100Variant && pure100Variant.price) || "";
    const match = sample.match(/^([^\d]*)([\d.,]+)([^\d]*)$/);
    if (!match) return amount.toFixed(2);
    return `${match[1]}${amount.toFixed(2)}${match[3]}`;
  }

  function sumQtyForSize(size) {
    return Object.values(state.selections)
      .filter((s) => s.size === size)
      .reduce((sum, s) => sum + s.qty, 0);
  }

  function isValidBundle() {
    const total50 = sumQtyForSize("50");
    const total100 = sumQtyForSize("100");
    const hasTarget = state.target50 + state.target100 > 0;
    return !!state.activeVariant && total50 === state.target50 && total100 === state.target100 && hasTarget;
  }

  // ============================================================
  // Shopify AJAX Add To Cart Implementation (Native Theme Integration)
  // ============================================================
  if (addToCartBtn) {
    addToCartBtn.type = "submit";

    let bundleForm = addToCartBtn.closest("form");
    if (!bundleForm) {
      bundleForm = document.createElement("form");
      bundleForm.method = "POST";
      bundleForm.action = "/cart/add";
      bundleForm.id = "bundleDynamicForm";
      bundleForm.setAttribute("data-type", "add-to-cart-form");
      
      addToCartBtn.parentNode.insertBefore(bundleForm, addToCartBtn);
      if (propertiesContainer) bundleForm.appendChild(propertiesContainer);
      bundleForm.appendChild(addToCartBtn);
    }

    let masterVariantInput = bundleForm.querySelector('input[name="id"]');
    if (!masterVariantInput) {
      masterVariantInput = document.createElement("input");
      masterVariantInput.type = "hidden";
      masterVariantInput.name = "id";
      bundleForm.appendChild(masterVariantInput);
    }

    if (stickyBtn) {
      stickyBtn.addEventListener("click", function (e) {
        e.preventDefault();
        if (!addToCartBtn.disabled) {
          addToCartBtn.click();
        }
      });
    }

    const originalCheckValidation = checkValidation;
    checkValidation = function() {
      originalCheckValidation();
      if (state.activeVariant && masterVariantInput) {
        masterVariantInput.value = state.activeVariant.id;
      }
    };
  }

  function shake(el) {
    el.style.animation = "shake 0.3s ease";
    setTimeout(() => (el.style.animation = ""), 300);
  }

  function hideEl(el) {
    if (!el || el.style.display === "none") return;
    el.classList.remove("step-visible");
    el.classList.add("step-hiding");
    setTimeout(() => {
      el.style.display = "none";
      el.classList.remove("step-hiding");
    }, 350);
  }

  function showEl(el) {
    if (!el) return;
    el.style.display = "block";
    el.classList.remove("step-hiding");
    requestAnimationFrame(() => el.classList.add("step-visible"));
  }

  // ============================================================
  // Composition Type Selection
  // ============================================================
  compositionBtns.forEach((btn) => {
    btn.addEventListener("click", function () {
      compositionBtns.forEach((b) => b.classList.remove("active"));
      this.classList.add("active");
      selectComposition(this.dataset.type);
    });
  });

  function selectComposition(type) {
    clearSelections();
    state.compositionType = type;

    if (type === "pure-50" || type === "pure-100") {
      const variant = type === "pure-50" ? pure50Variant : pure100Variant;
      state.activeVariant = variant;
      state.target50 = type === "pure-50" ? bundleSize : 0;
      state.target100 = type === "pure-100" ? bundleSize : 0;

      updatePriceDisplay(variant);
      hideEl(comboStep);
      hideEl(accordionStep);
      if (singleLimitDisplay) singleLimitDisplay.textContent = bundleSize;
      showEl(singleListStep);
    } else {
      state.activeVariant = null;
      buildComboSelector();
      hideEl(singleListStep);
      hideEl(accordionStep);
      showEl(comboStep);
      resetPriceDisplay();
    }

    afterSelectionChange();
  }

  function buildComboSelector() {
    comboSelector.innerHTML = "";
    mixedVariants.forEach((v) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "variant-btn combo-btn";
      btn.dataset.variantId = v.id;
      btn.textContent = `${v.count50}x 50ML + ${v.count100}x 100ML`;
      btn.addEventListener("click", function () {
        comboSelector.querySelectorAll(".combo-btn").forEach((b) => b.classList.remove("active"));
        this.classList.add("active");
        selectCombo(v);
      });
      comboSelector.appendChild(btn);
    });
  }

  function selectCombo(variant) {
    clearSelections();
    state.activeVariant = variant;
    state.target50 = variant.count50;
    state.target100 = variant.count100;

    updatePriceDisplay(variant);
    hideEl(singleListStep);
    showEl(accordionStep);
    afterSelectionChange();
  }

  function updatePriceDisplay(variant) {
    if (priceDisplay) priceDisplay.textContent = variant.price;
    if (addToCartBtn) addToCartBtn.setAttribute("data-variant-id", variant.id);
    
    const masterInput = document.getElementById("bundleMasterVariantInput");
    if (masterInput) masterInput.value = variant.id;

    if (comparePriceDisplay) {
      if (variant.comparePrice) {
        comparePriceDisplay.textContent = variant.comparePrice;
        comparePriceDisplay.style.display = "inline-block";
      } else {
        comparePriceDisplay.style.display = "none";
      }
    }
  }

  function resetPriceDisplay() {
    if (priceDisplay) priceDisplay.textContent = "Select a composition";
    if (comparePriceDisplay) comparePriceDisplay.style.display = "none";
  }

  // ============================================================
  // Card Selection (works for single list AND both accordion lists)
  // ============================================================
  document.querySelectorAll(".scent-card").forEach((card) => {
    const stepper = card.querySelector(".qty-stepper");
    const plusBtn = card.querySelector(".qty-plus");
    const minusBtn = card.querySelector(".qty-minus");
    const qtyValue = card.querySelector(".qty-value");

    card.addEventListener("click", function (e) {
      if (e.target.closest(".qty-stepper")) return;
      if (card.classList.contains("selected")) {
        deselectCard(card);
      } else {
        selectCard(card);
      }
    });

    plusBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      const size = effectiveSize(card);
      const target = size === "50" ? state.target50 : state.target100;
      const currentTotal = sumQtyForSize(size);
      if (currentTotal >= target) {
        shake(card);
        return;
      }
      const key = size + "-" + card.dataset.handle;
      state.selections[key].qty++;
      qtyValue.textContent = state.selections[key].qty;
      afterSelectionChange();
    });

    minusBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      const size = effectiveSize(card);
      const key = size + "-" + card.dataset.handle;
      const sel = state.selections[key];
      if (!sel) return;
      sel.qty--;
      if (sel.qty <= 0) {
        deselectCard(card);
      } else {
        qtyValue.textContent = sel.qty;
        afterSelectionChange();
      }
    });
  });

  function effectiveSize(card) {
    return card.dataset.size || (state.compositionType === "pure-50" ? "50" : "100");
  }

  function selectCard(card) {
    const size = effectiveSize(card);
    const target = size === "50" ? state.target50 : state.target100;
    const currentTotal = sumQtyForSize(size);

    if (target === 0 || currentTotal >= target) {
      shake(card);
      return;
    }

    const key = size + "-" + card.dataset.handle;
    state.selections[key] = { handle: card.dataset.handle, title: card.dataset.name, size, qty: 1 };
    card.classList.add("selected");

    const stepper = card.querySelector(".qty-stepper");
    stepper.querySelector(".qty-value").textContent = 1;
    requestAnimationFrame(() => stepper.classList.add("stepper-visible"));

    afterSelectionChange();
  }

  function deselectCard(card) {
    const size = effectiveSize(card);
    const key = size + "-" + card.dataset.handle;
    delete state.selections[key];
    card.classList.remove("selected");

    const stepper = card.querySelector(".qty-stepper");
    stepper.classList.remove("stepper-visible");

    afterSelectionChange();
  }

  function clearSelections() {
    state.selections = {};
    document.querySelectorAll(".scent-card.selected").forEach((c) => {
      c.classList.remove("selected");
      const stepper = c.querySelector(".qty-stepper");
      if (stepper) stepper.classList.remove("stepper-visible");
    });
  }

  // ============================================================
  // Summary / Validation / Cart Properties
  // ============================================================
  function afterSelectionChange() {
    updateSummary();
    updateHiddenProperties();
    checkValidation();
    refreshOpenAccordionHeight();
  }

  function updateSummary() {
    const total50 = sumQtyForSize("50");
    const total100 = sumQtyForSize("100");

    const count50El = document.getElementById("summaryCount50");
    const count100El = document.getElementById("summaryCount100");
    const pricePer50El = document.getElementById("summaryPricePer50");
    const pricePer100El = document.getElementById("summaryPricePer100");

    if (count50El) count50El.textContent = `${total50} / ${state.target50}`;
    if (count100El) count100El.textContent = `${total100} / ${state.target100}`;
    if (pricePer50El) pricePer50El.textContent = pure50Variant ? formatMoney(pricePer50) + " each" : "—";
    if (pricePer100El) pricePer100El.textContent = pure100Variant ? formatMoney(pricePer100) + " each" : "—";

    if (singleSelectionCounter) {
      singleSelectionCounter.textContent = state.compositionType === "pure-50" ? total50 : total100;
    }

    if (summaryTotalSelected) {
      summaryTotalSelected.textContent = `${total50 + total100} / ${state.target50 + state.target100}`;
    }
    if (summaryFinalPrice) {
      summaryFinalPrice.textContent = state.activeVariant ? state.activeVariant.price : "—";
    }
  }

  function updateHiddenProperties() {
    if (!propertiesContainer) return;
    propertiesContainer.innerHTML = "";

    let index = 1;
    Object.values(state.selections).forEach((sel) => {
      if (sel.qty <= 0) return;
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = `properties[Item ${index}]`;
      input.value = `${sel.title} - ${sel.size}ML x${sel.qty}`;
      propertiesContainer.appendChild(input);
      index++;
    });

    const compInput = document.createElement("input");
    compInput.type = "hidden";
    compInput.name = "properties[Composition]";
    compInput.value = state.activeVariant ? state.activeVariant.title : "";
    propertiesContainer.appendChild(compInput);
  }

  function checkValidation() {
    const total50 = sumQtyForSize("50");
    const total100 = sumQtyForSize("100");
    const hasTarget = state.target50 + state.target100 > 0;
    const valid = !!state.activeVariant && total50 === state.target50 && total100 === state.target100 && hasTarget;

    [addToCartBtn, stickyBtn].forEach((btn) => {
      if (!btn) return;
      if (valid) {
        btn.disabled = false;
        btn.classList.remove("disabled-builder-btn", "disabled");
        btn.textContent = "Add Bundle to Cart";
      } else {
        btn.disabled = true;
        btn.classList.add(btn === addToCartBtn ? "disabled-builder-btn" : "disabled");
        if (!state.activeVariant) {
          btn.textContent = "Select Your Composition First";
        } else {
          const remaining = state.target50 - total50 + (state.target100 - total100);
          btn.textContent = `Select ${remaining} More To Add`;
        }
      }
    });

    updateStickyVisibility();
  }

  // ============================================================
  // Accordion behavior
  // ============================================================
  function closeAccordion(header) {
    const body = header.nextElementSibling;
    if (body.style.maxHeight === "none" || body.style.maxHeight === "") {
      body.style.maxHeight = body.scrollHeight + "px";
      body.offsetHeight;
    }
    header.classList.remove("open");
    requestAnimationFrame(() => {
      body.style.maxHeight = "0px";
    });
  }

  function openAccordion(header) {
    const body = header.nextElementSibling;
    header.classList.add("open");
    body.style.maxHeight = body.scrollHeight + "px";

    body.addEventListener(
      "transitionend",
      function handler(e) {
        if (e.propertyName === "max-height" && header.classList.contains("open")) {
          body.style.maxHeight = "none";
        }
        body.removeEventListener("transitionend", handler);
      }
    );
  }

  document.querySelectorAll(".bundle-accordion-header").forEach((header) => {
    header.addEventListener("click", function () {
      const isOpen = this.classList.contains("open");

      document.querySelectorAll(".bundle-accordion-header").forEach((h) => {
        if (h.classList.contains("open")) closeAccordion(h);
      });

      if (!isOpen) openAccordion(this);
    });
  });

  function refreshOpenAccordionHeight() {
    const openHeader = document.querySelector(".bundle-accordion-header.open");
    if (!openHeader) return;
    const body = openHeader.nextElementSibling;
    if (body.style.maxHeight !== "none") {
      body.style.maxHeight = body.scrollHeight + "px";
    }
  }

  // ============================================================
  // Sticky Add to Cart bar
  // ============================================================
  function updateStickyVisibility() {
    if (!stickyBar || !addToCartBtn) return;
    const mainBtnBounding = addToCartBtn.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    const isMainBtnVisible = mainBtnBounding.top >= 0 && mainBtnBounding.bottom <= windowHeight;
    const hasCompositionChosen = !!state.activeVariant;

    if (hasCompositionChosen && !isMainBtnVisible) {
      stickyBar.classList.add("show");
    } else {
      stickyBar.classList.remove("show");
    }
  }

  window.addEventListener("scroll", updateStickyVisibility);
  window.addEventListener("resize", updateStickyVisibility);

  // ============================================================
  // Form Submit Handler & Theme Cart Drawer Refresh flow
  // ============================================================
  const dynamicForm = document.getElementById("bundleDynamicForm");
  if (dynamicForm) {
    dynamicForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      if (addToCartBtn.disabled || addToCartBtn.getAttribute("aria-busy") === "true") return;

      const originalText = addToCartBtn.textContent;
      addToCartBtn.disabled = true;
      addToCartBtn.setAttribute("aria-busy", "true");
      addToCartBtn.classList.add("is-loading");

      try {
        const addResponse = await fetch("/cart/add.js", {
          method: "POST",
          body: new FormData(dynamicForm),
          headers: { "X-Requested-With": "XMLHttpRequest" }
        });

        if (!addResponse.ok) throw new Error("Add to cart failed");

        if (typeof updateCartDrawer === "function") {
          await updateCartDrawer();
        }

        if (typeof openCartDrawer === "function") {
          openCartDrawer();
        }

      } catch (error) {
        console.error("Cart AJAX flow error:", error);
      } finally {
        addToCartBtn.disabled = false;
        addToCartBtn.removeAttribute("aria-busy");
        addToCartBtn.classList.remove("is-loading");
        addToCartBtn.textContent = originalText;
      }
    });
  }

  // ============================================================
  // Init
  // ============================================================
  checkValidation();

  window.addEventListener("load", () => {
    const items = document.querySelectorAll("#bundleInfoContainer > *");
    items.forEach((item, index) => {
      setTimeout(() => {
        item.classList.add("info-visible");
      }, index * 120);
    });
  });
});