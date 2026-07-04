(function () {
  function splitMetafieldLines(value) {
    if (!value) return [];
    // Metafields might come as multiline text; normalize to lines
    return String(value)
      .split(/\r?\n/)
      .map(function (s) {
        return s.trim();
      })
      .filter(Boolean);
  }

  function renderList(ul, lines) {
    if (!ul) return;
    ul.innerHTML = '';
    lines.forEach(function (note) {
      var li = document.createElement('li');
      li.textContent = note;
      ul.appendChild(li);
    });
  }

  function getDataSet(el, key) {
    if (!el || !el.dataset) return null;
    var val = el.dataset[key];
    return val == null ? null : String(val);
  }

  document.addEventListener('DOMContentLoaded', function () {
    var root = document.querySelector('[data-fragrance-notes]');
    if (!root) return;

    // Values may be provided by Liquid on the page.
    // Expected dataset keys:
    // - data-top-notes
    // - data-heart-notes
    // - data-base-notes
    var topNotesRaw = getDataSet(root, 'topNotes');
    var heartNotesRaw = getDataSet(root, 'heartNotes');
    var baseNotesRaw = getDataSet(root, 'baseNotes');

    var top = splitMetafieldLines(topNotesRaw);
    var heart = splitMetafieldLines(heartNotesRaw);
    var base = splitMetafieldLines(baseNotesRaw);

    var topList = document.querySelector('ul[data-notes-list="top"]');
    var heartList = document.querySelector('ul[data-notes-list="heart"]');
    var baseList = document.querySelector('ul[data-notes-list="base"]');

    renderList(topList, top);
    renderList(heartList, heart);
    renderList(baseList, base);
  });
})();

