document.addEventListener('DOMContentLoaded', () => {
  const container = document.querySelector('[data-cart-items]');
  if (!container) return;

  const updateLine = async (line, quantity) => {
    const q = Math.max(0, parseInt(quantity, 10) || 0);

    // Shopify cart line updates are handled by /cart/change.
    // We redirect after change for reliability.
    const changeUrl = `${window.theme?.routes?.cartChange || '/cart/change'}?line=${encodeURIComponent(line)}&quantity=${encodeURIComponent(q)}`;

    window.location.href = changeUrl;
  };

  container.querySelectorAll('[data-line-qty-minus]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const line = btn.getAttribute('data-line-qty-minus');
      const input = container.querySelector(`[data-line-qty-input="${line}"]`);
      const current = input ? parseInt(input.value, 10) : 1;
      const next = Math.max(1, current - 1);
      if (input) input.value = next;
      updateLine(line, next);
    });
  });

  container.querySelectorAll('[data-line-qty-plus]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const line = btn.getAttribute('data-line-qty-plus');
      const input = container.querySelector(`[data-line-qty-input="${line}"]`);
      const current = input ? parseInt(input.value, 10) : 1;
      const next = current + 1;
      if (input) input.value = next;
      updateLine(line, next);
    });
  });

  container.querySelectorAll('[data-line-qty-input]').forEach(input => {
    input.addEventListener('change', () => {
      const line = input.getAttribute('data-line-qty-input');
      const quantity = parseInt(input.value, 10) || 1;
      updateLine(line, quantity);
    });
  });

  document.querySelectorAll('[data-cart-remove-line]').forEach(link => {
    link.addEventListener('click', (e) => {
      // Keep native remove link behavior; this handler just stops accidental ripple/spans.
      // Quantity changes handle redirects.
      // No-op.
    });
  });
});

