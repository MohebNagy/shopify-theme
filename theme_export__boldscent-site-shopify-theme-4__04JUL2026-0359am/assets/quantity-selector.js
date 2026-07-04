const input = document.getElementById("qtyInput");
const qtyPlus = document.getElementById("qtyPlus");
const qtyMinus = document.getElementById("qtyMinus");

if (input && qtyPlus && qtyMinus) {
  qtyPlus.onclick = () => {
    input.value = parseInt(input.value, 10) + 1;
  };

  qtyMinus.onclick = () => {
    if (parseInt(input.value, 10) > 1) {
      input.value = parseInt(input.value, 10) - 1;
    }
  };
}
