/* CampusFind – Lost & Found Portal
   Static site: all data lives in the browser's localStorage. */
(function () {
  'use strict';

  var STORAGE_KEY = 'campusfind.items.v1';
  var CATEGORIES = [
    'Bags & backpacks', 'Electronics', 'ID & cards', 'Keys',
    'Books & notes', 'Clothing', 'Bottles & lunch boxes', 'Other'
  ];

  var state = { type: 'all', category: 'all', status: 'open', q: '' };
  var items = [];
  var openId = null;

  /* ---------- helpers ---------- */
  function $(sel, root) { return (root || document).querySelector(sel); }

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'class') node.className = attrs[k];
      else if (k === 'text') node.textContent = attrs[k];
      else node.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) node.appendChild(c); });
    return node;
  }

  function isoDaysAgo(n) {
    var d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
  }

  function todayISO() {
    var d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
  }

  function fmtDate(iso) {
    var d = new Date(iso + 'T00:00:00');
    if (isNaN(d)) return iso;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  var toastTimer;
  function toast(msg) {
    var t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2800);
  }

  /* ---------- storage ---------- */
  function seed() {
    return [
      { id: uid(), type: 'lost', title: 'Black Wildcraft backpack', category: 'Bags & backpacks',
        location: 'Central library, reading hall', date: isoDaysAgo(1),
        desc: 'Black backpack with a red zip pull. Has a laptop sleeve and a blue notebook inside.',
        name: 'Aman', contact: 'aman.cs24@college.edu', photo: '', status: 'open' },
      { id: uid(), type: 'found', title: 'Student ID card', category: 'ID & cards',
        location: 'Canteen, near the billing counter', date: isoDaysAgo(2),
        desc: 'ID card of a second-year B.Tech student. Handed to me, collect it with your name and roll number.',
        name: 'Simran', contact: '98765 43210', photo: '', status: 'open' },
      { id: uid(), type: 'lost', title: 'Bunch of keys with a green tag', category: 'Keys',
        location: 'Sports ground', date: isoDaysAgo(3),
        desc: 'Three keys on a ring with a green plastic tag and a small football keychain.',
        name: 'Rohit', contact: 'rohit.m@college.edu', photo: '', status: 'open' },
      { id: uid(), type: 'found', title: 'Silver water bottle', category: 'Bottles & lunch boxes',
        location: 'Block C, room 204', date: isoDaysAgo(4),
        desc: 'Steel bottle with a dent near the base. Left on the last bench after the morning lecture.',
        name: 'Neha', contact: 'neha.k@college.edu', photo: '', status: 'open' },
      { id: uid(), type: 'lost', title: 'Casio scientific calculator', category: 'Electronics',
        location: 'Exam hall 3', date: isoDaysAgo(6),
        desc: 'Casio fx-991 with my initials scratched on the back cover.',
        name: 'Karan', contact: '99887 76655', photo: '', status: 'open' },
      { id: uid(), type: 'found', title: 'Grey hoodie', category: 'Clothing',
        location: 'Bus stop outside Gate 2', date: isoDaysAgo(8),
        desc: 'Grey zip hoodie, size M, with a small logo on the chest.',
        name: 'Priya', contact: 'priya.s@college.edu', photo: '', status: 'returned' }
    ];
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) { /* fall through to seed data */ }
    var s = seed();
    save(s);
    return s;
  }

  function save(list) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      return true;
    } catch (e) {
      toast('Could not save. Browser storage is full or blocked.');
      return false;
    }
  }

  /* ---------- filtering ---------- */
  function visibleItems() {
    var words = state.q.toLowerCase().split(/\s+/).filter(Boolean);
    return items
      .filter(function (it) {
        if (state.type !== 'all' && it.type !== state.type) return false;
        if (state.category !== 'all' && it.category !== state.category) return false;
        if (state.status !== 'all' && it.status !== state.status) return false;
        if (!words.length) return true;
        var hay = (it.title + ' ' + it.desc + ' ' + it.location + ' ' + it.category).toLowerCase();
        return words.every(function (w) { return hay.indexOf(w) !== -1; });
      })
      .sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; });
  }

  /* ---------- rendering ---------- */
  function renderStats() {
    $('#statLost').textContent = items.filter(function (i) { return i.type === 'lost' && i.status === 'open'; }).length;
    $('#statFound').textContent = items.filter(function (i) { return i.type === 'found' && i.status === 'open'; }).length;
    $('#statReturned').textContent = items.filter(function (i) { return i.status === 'returned'; }).length;
  }

  function card(it) {
    var li = el('li');
    var article = el('article', { class: 'tag ' + it.type + (it.status === 'returned' ? ' is-returned' : '') });

    var head = el('div', { class: 'tag-head' }, [
      el('span', { class: 'badge', text: it.type === 'lost' ? 'Lost' : 'Found' }),
      el('span', { class: 'hole', 'aria-hidden': 'true' })
    ]);
    article.appendChild(head);

    if (it.status === 'returned') article.appendChild(el('span', { class: 'returned-flag', text: 'Returned' }));

    if (it.photo) {
      var img = el('img', { src: it.photo, alt: '', loading: 'lazy' });
      article.appendChild(el('div', { class: 'tag-photo' }, [img]));
    }

    var btn = el('button', { type: 'button', 'data-id': it.id, text: it.title });
    btn.setAttribute('aria-haspopup', 'dialog');
    article.appendChild(el('div', { class: 'tag-body' }, [
      el('h3', { class: 'tag-title' }, [btn]),
      el('p', { class: 'tag-cat', text: it.category }),
      el('p', { class: 'tag-desc', text: it.desc })
    ]));

    article.appendChild(el('div', { class: 'tag-foot' }, [
      el('span', { text: it.location }),
      el('span', { text: fmtDate(it.date) })
    ]));

    li.appendChild(article);
    return li;
  }

  function render() {
    var list = visibleItems();
    var grid = $('#grid');
    grid.textContent = '';
    list.forEach(function (it) { grid.appendChild(card(it)); });

    $('#empty').hidden = list.length !== 0;

    var line = list.length + (list.length === 1 ? ' ticket' : ' tickets');
    if (state.q.trim()) line += ' matching “' + state.q.trim() + '”';
    $('#resultLine').textContent = line;

    renderStats();
  }

  /* ---------- modal ---------- */
  function openModal(id) {
    var it = items.filter(function (i) { return i.id === id; })[0];
    if (!it) return;
    openId = id;
    var body = $('#modalBody');
    body.textContent = '';

    var close = el('button', { type: 'button', class: 'm-close', 'aria-label': 'Close', text: '×' });
    close.addEventListener('click', closeModal);
    body.appendChild(el('div', { class: 'm-head ' + it.type }, [
      el('span', { class: 'badge', text: (it.type === 'lost' ? 'Lost' : 'Found') + (it.status === 'returned' ? ' – returned' : '') }),
      close
    ]));

    if (it.photo) body.appendChild(el('img', { class: 'm-photo', src: it.photo, alt: 'Photo of ' + it.title }));

    var meta = el('dl', { class: 'm-meta' });
    [['Category', it.category],
     [it.type === 'lost' ? 'Lost at' : 'Found at', it.location],
     [it.type === 'lost' ? 'Date lost' : 'Date found', fmtDate(it.date)],
     ['Posted by', it.name]
    ].forEach(function (pair) {
      meta.appendChild(el('div', {}, [el('dt', { text: pair[0] }), el('dd', { text: pair[1] })]));
    });

    var title = el('h3', { id: 'mTitle', text: it.title });
    var main = el('div', { class: 'm-main' }, [
      title, meta,
      el('p', { class: 'm-desc', text: it.desc }),
      el('div', { class: 'm-contact' }, [
        el('p', { text: 'Contact ' + it.name + ': ' + it.contact })
      ])
    ]);
    body.appendChild(main);

    var actions = el('div', { class: 'm-actions' });
    var copy = el('button', { type: 'button', class: 'btn btn-dark', text: 'Copy contact' });
    copy.addEventListener('click', function () { copyText(it.contact); });
    actions.appendChild(copy);

    if (it.status === 'open') {
      var done = el('button', { type: 'button', class: 'btn btn-ghost', text: 'Mark as returned' });
      done.addEventListener('click', function () { setStatus(it.id, 'returned'); });
      actions.appendChild(done);
    } else {
      var reopen = el('button', { type: 'button', class: 'btn btn-ghost', text: 'Reopen ticket' });
      reopen.addEventListener('click', function () { setStatus(it.id, 'open'); });
      actions.appendChild(reopen);
    }

    var del = el('button', { type: 'button', class: 'btn btn-danger', text: 'Remove ticket' });
    del.addEventListener('click', function () {
      if (window.confirm('Remove this ticket for good?')) removeItem(it.id);
    });
    actions.appendChild(del);
    body.appendChild(actions);

    var dlg = $('#modal');
    if (typeof dlg.showModal === 'function') dlg.showModal();
    else dlg.setAttribute('open', '');
  }

  function closeModal() {
    var dlg = $('#modal');
    if (typeof dlg.close === 'function') dlg.close();
    else dlg.removeAttribute('open');
    openId = null;
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () { toast('Contact copied'); },
        function () { toast('Copy failed. Select the text and copy it manually.'); }
      );
    } else {
      toast('Copy is not supported here. Select the text and copy it manually.');
    }
  }

  function setStatus(id, status) {
    items.forEach(function (i) { if (i.id === id) i.status = status; });
    if (save(items)) {
      closeModal();
      render();
      toast(status === 'returned' ? 'Marked as returned' : 'Ticket reopened');
    }
  }

  function removeItem(id) {
    items = items.filter(function (i) { return i.id !== id; });
    if (save(items)) {
      closeModal();
      render();
      toast('Ticket removed');
    }
  }

  /* ---------- filters & search ---------- */
  function setType(type) {
    state.type = type;
    document.querySelectorAll('.seg-btn').forEach(function (b) {
      var on = b.getAttribute('data-type') === type;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  function goToBoard() {
    $('#browse').scrollIntoView();
  }

  function initFilters() {
    var catFilter = $('#filterCategory');
    var catForm = $('#category');
    CATEGORIES.forEach(function (c) {
      catFilter.appendChild(el('option', { value: c, text: c }));
      catForm.appendChild(el('option', { value: c, text: c }));
    });

    document.querySelectorAll('.seg-btn').forEach(function (b) {
      b.addEventListener('click', function () { setType(b.getAttribute('data-type')); render(); });
    });
    catFilter.addEventListener('change', function () { state.category = catFilter.value; render(); });
    $('#filterStatus').addEventListener('change', function (e) { state.status = e.target.value; render(); });

    var q = $('#q');
    q.addEventListener('input', function () { state.q = q.value; render(); });
    $('#heroSearch').addEventListener('submit', function (e) {
      e.preventDefault();
      state.q = q.value;
      render();
      goToBoard();
    });

    document.querySelectorAll('.chip').forEach(function (c) {
      c.addEventListener('click', function () {
        q.value = c.getAttribute('data-q');
        state.q = q.value;
        render();
        goToBoard();
      });
    });

    $('#clearFilters').addEventListener('click', function () {
      state = { type: 'all', category: 'all', status: 'open', q: '' };
      q.value = '';
      catFilter.value = 'all';
      $('#filterStatus').value = 'open';
      setType('all');
      render();
    });

    $('#grid').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-id]');
      if (b) openModal(b.getAttribute('data-id'));
    });
  }

  /* ---------- modal wiring ---------- */
  function initModal() {
    var dlg = $('#modal');
    dlg.addEventListener('click', function (e) { if (e.target === dlg) closeModal(); });
    dlg.addEventListener('close', function () { openId = null; });
  }

  /* ---------- report form ---------- */
  var photoData = '';

  function resizeImage(file, cb) {
    var reader = new FileReader();
    reader.onload = function () {
      var img = new Image();
      img.onload = function () {
        var max = 640;
        var scale = Math.min(1, max / Math.max(img.width, img.height));
        var canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        cb(canvas.toDataURL('image/jpeg', 0.72));
      };
      img.onerror = function () { cb(''); };
      img.src = reader.result;
    };
    reader.onerror = function () { cb(''); };
    reader.readAsDataURL(file);
  }

  function clearPhoto() {
    photoData = '';
    $('#photo').value = '';
    $('#preview').hidden = true;
    $('#previewImg').removeAttribute('src');
  }

  function updateTypeLabels() {
    var lost = document.querySelector('input[name="type"]:checked').value === 'lost';
    $('#locLabel').textContent = lost ? 'Where did you lose it?' : 'Where did you find it?';
    $('#dateLabel').textContent = lost ? 'Date lost' : 'Date found';
  }

  function validate(form) {
    var rules = {
      title: 'Enter the item name.',
      location: 'Enter the place.',
      date: 'Pick a date.',
      desc: 'Add a short description.',
      name: 'Enter your name.',
      contact: 'Enter an email or phone number.'
    };
    var ok = true;
    var firstBad = null;

    Object.keys(rules).forEach(function (field) {
      var input = form.elements[field];
      var msg = $('.err[data-for="' + field + '"]');
      var value = input.value.trim();
      var error = '';

      if (!value) error = rules[field];
      else if (field === 'date' && value > todayISO()) error = 'The date can’t be in the future.';
      else if (field === 'contact') {
        var isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        var digits = value.replace(/\D/g, '');
        var isPhone = /^[\d\s+\-()]+$/.test(value) && digits.length >= 8 && digits.length <= 15;
        if (!isEmail && !isPhone) error = 'Use a valid email or a phone number.';
      }

      input.classList.toggle('invalid', !!error);
      if (msg) msg.textContent = error;
      if (error) { ok = false; if (!firstBad) firstBad = input; }
    });

    if (firstBad) firstBad.focus();
    return ok;
  }

  function initForm() {
    var form = $('#reportForm');
    var dateInput = $('#date');
    dateInput.max = todayISO();
    dateInput.value = todayISO();

    document.querySelectorAll('input[name="type"]').forEach(function (r) {
      r.addEventListener('change', updateTypeLabels);
    });

    form.addEventListener('input', function (e) {
      if (e.target.classList && e.target.classList.contains('invalid')) {
        e.target.classList.remove('invalid');
        var m = $('.err[data-for="' + e.target.name + '"]');
        if (m) m.textContent = '';
      }
    });

    $('#photo').addEventListener('change', function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) { clearPhoto(); return; }
      if (file.type.indexOf('image/') !== 0) { toast('Choose an image file.'); clearPhoto(); return; }
      resizeImage(file, function (data) {
        if (!data) { toast('That image could not be read.'); clearPhoto(); return; }
        photoData = data;
        $('#previewImg').src = data;
        $('#preview').hidden = false;
      });
    });
    $('#removePhoto').addEventListener('click', clearPhoto);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!validate(form)) return;

      var type = form.elements.type.value;
      var item = {
        id: uid(),
        type: type,
        title: form.elements.title.value.trim(),
        category: form.elements.category.value,
        location: form.elements.location.value.trim(),
        date: form.elements.date.value,
        desc: form.elements.desc.value.trim(),
        name: form.elements.name.value.trim(),
        contact: form.elements.contact.value.trim(),
        photo: photoData,
        status: 'open'
      };

      items.unshift(item);
      if (!save(items)) { items.shift(); return; }

      form.reset();
      dateInput.value = todayISO();
      clearPhoto();
      updateTypeLabels();

      // show the new ticket straight away
      state = { type: type, category: 'all', status: 'open', q: '' };
      $('#q').value = '';
      $('#filterCategory').value = 'all';
      $('#filterStatus').value = 'open';
      setType(type);
      render();
      goToBoard();
      toast('Ticket posted to the board');
    });
  }

  /* ---------- init ---------- */
  items = load();
  initFilters();
  initModal();
  initForm();
  render();
})();
