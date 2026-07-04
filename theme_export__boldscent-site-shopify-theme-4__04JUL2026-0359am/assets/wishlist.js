class BoldWishlistEngine {
  constructor() {
    this.storageKey = 'bold_wishlist';
    this.isCustomer = window.BoldCustomerWishlistValue !== null;
    this.init();
  }

  init() {
    this.syncInitialData();
    this.updateHeartsUI();
    this.exposeGlobalToggle();
    this.renderWishlistPage();
  }

  getLocalStorageData() {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data).map(id => String(id).trim()) : [];
    } catch (e) { return []; }
  }

  setLocalStorageData(array) {
    localStorage.setItem(this.storageKey, JSON.stringify(array));
  }

  syncInitialData() {
    let localData = this.getLocalStorageData();
    if (this.isCustomer) {
      let cloudData = window.BoldCustomerWishlistValue
        ? window.BoldCustomerWishlistValue.split(',').map(id => String(id).trim()).filter(id => id)
        : [];
      if (cloudData.length > 0 && localData.length === 0) {
        this.setLocalStorageData(cloudData);
      } else if (localData.length > 0) {
        let mergedData = [...new Set([...localData, ...cloudData])];
        this.setLocalStorageData(mergedData);
        if (mergedData.length !== cloudData.length) { this.syncWithServer(mergedData); }
      }
    }
  }

  updateHeartsUI() {
    const currentList = this.getLocalStorageData();
    document.querySelectorAll('.custom-wishlist-trigger').forEach(trigger => {
      const productId = String(trigger.getAttribute('data-product-id')).trim();
      if (currentList.includes(productId)) {
        trigger.classList.add('is-active');
        trigger.setAttribute('data-active', 'true');
      } else {
        trigger.classList.remove('is-active');
        trigger.removeAttribute('data-active');
      }
    });
  }

  exposeGlobalToggle() {
    // رفع الدالة مباشرة على الـ window لتخطي حواجز الـ Event Bubbling
    window.toggleBoldWishlist = (element, event) => {
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }

      const productId = String(element.getAttribute('data-product-id')).trim();
      let currentList = this.getLocalStorageData();

      if (currentList.includes(productId)) {
        currentList = currentList.filter(id => id !== productId);
        element.classList.remove('is-active');
        element.removeAttribute('data-active');
      } else {
        currentList.push(productId);
        element.classList.add('is-active');
        element.setAttribute('data-active', 'true');
        
        // أنيميشن نبض خفيف وفخم
        element.style.transform = 'scale(1.25)';
        setTimeout(() => element.style.transform = '', 180);
      }

      this.setLocalStorageData(currentList);
      if (this.isCustomer) { this.syncWithServer(currentList); }
      
      // مزامنة بقية القلوب لنفس المنتج في الصفحة إن وجدت
      this.updateHeartsUI();
    };
  }

  syncWithServer(list) {
    const formInput = document.getElementById('ajax-wishlist-note-input');
    const form = document.getElementById('ajax-wishlist-sync-form');
    if (!formInput || !form) return;
    formInput.value = list.join(',');
    fetch('/contact', { method: 'POST', body: new FormData(form), headers: { 'X-Requested-With': 'XMLHttpRequest' } });
  }

  renderWishlistPage() {
    const wishlistGrid = document.getElementById('bold-wishlist-grid');
    const wishlistEmptyState = document.getElementById('bold-wishlist-empty');
    if (!wishlistGrid) return;

    const savedItems = this.getLocalStorageData();
    if (savedItems.length === 0) {
      wishlistGrid.style.display = 'none';
      wishlistEmptyState.style.display = 'block';
      return;
    }

    wishlistGrid.innerHTML = '';
    
    savedItems.forEach(productId => {
      fetch(`/products/${productId}.js`)
        .then(res => {
          if(!res.ok) { return fetch(`/search/suggest.json?q=id:${productId}&resources[type]=product`).then(r => r.json()).then(d => d.resources.results.products[0]); }
          return res.json();
        })
        .then(product => {
          if (!product) return;
          
          const image = product.featured_image || product.image || '';
          const price = (product.price / 100).toFixed(2);
          const title = product.title;
          const url = product.url;
          
          const cardHtml = `
            <div class="product-card-wrapper" data-wishlist-item-wrapper>
              <a href="${url}" class="product-card scale-hover">
                <span class="custom-wishlist-trigger is-active" data-product-id="${product.id}" data-active="true" onclick="if(window.toggleBoldWishlist){ window.toggleBoldWishlist(this, event); }">
                  <svg class="icon-heart-clean" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                  </svg>
                </span>
                <div class="product-card-media">
                  <img src="${image}" alt="${title}">
                </div>
                <div class="product-card-info">
                  <h3>${title}</h3>
                  <div class="product-card__variants-display">
                    <div class="variant-price-item">
                      <span class="variant-size-label">50ML</span>
                      <span class="variant-divider">-</span>
                      <span class="variant-price-value">LE ${price}</span>
                    </div>
                  </div>
                </div>
              </a>
            </div>
          `;
          wishlistGrid.insertAdjacentHTML('beforeend', cardHtml);
        }).catch(err => console.log(err));
    });

    // مراقبة الحذف داخل صفحة الـ Wishlist لإخفاء الكارت فوراً
    window.addEventListener('click', () => {
      setTimeout(() => {
        document.querySelectorAll('#bold-wishlist-grid [data-wishlist-item-wrapper]').forEach(wrapper => {
          const trigger = wrapper.querySelector('.custom-wishlist-trigger');
          if (trigger && !trigger.classList.contains('is-active')) {
            wrapper.remove();
            if (wishlistGrid.children.length === 0) {
              wishlistGrid.style.display = 'none';
              wishlistEmptyState.style.display = 'block';
            }
          }
        });
      }, 100);
    });
  }
}

// التشغيل الفوري والآمن للمحرك
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => { window.BoldWishlistInstance = new BoldWishlistEngine(); });
} else {
  window.BoldWishlistInstance = new BoldWishlistEngine();
}