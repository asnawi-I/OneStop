// Marketplace prototype — shared interactivity
// This is a static, no-backend prototype: everything below fakes real behaviour
// client-side (filtering, selection state, placeholder actions) so the flow can
// be clicked through convincingly without a server.

document.addEventListener('DOMContentLoaded', function () {

  // ---- Generic single-select chip groups (category chips, runner filter) ----
  // Any group of .chip buttons inside a .chips or .filter-row container becomes
  // a single-select toggle, and fires a "chipchange" event on the group when
  // the selection changes so page-specific code below can react to it.
  document.querySelectorAll('.chips, .filter-row').forEach(function (group) {
    var chips = group.querySelectorAll('.chip');
    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        chips.forEach(function (c) { c.classList.remove('active'); });
        chip.classList.add('active');
        group.dispatchEvent(new CustomEvent('chipchange'));
      });
    });
  });

  // ---- Browse page: search + category filter (index.html) ----
  var listingGrid = document.querySelector('.listing-grid');
  if (listingGrid) {
    var cards = Array.prototype.slice.call(listingGrid.querySelectorAll('.card'));
    var searchInput = document.getElementById('search');
    var categoryChips = document.querySelector('.chips');

    var emptyState = document.createElement('p');
    emptyState.className = 'empty-state';
    emptyState.textContent = 'No listings match your search.';
    listingGrid.appendChild(emptyState);

    function applyListingFilters() {
      var query = searchInput ? searchInput.value.trim().toLowerCase() : '';
      var activeChip = categoryChips ? categoryChips.querySelector('.chip.active') : null;
      var category = activeChip ? activeChip.textContent.trim().toLowerCase() : 'all';
      var visibleCount = 0;

      cards.forEach(function (card) {
        var title = card.querySelector('.card-title').textContent.toLowerCase();
        var seller = card.querySelector('.card-seller').textContent.toLowerCase();
        var cardCategory = (card.getAttribute('data-category') || '').toLowerCase();
        var matchesQuery = !query || title.indexOf(query) !== -1 || seller.indexOf(query) !== -1;
        var matchesCategory = category === 'all' || cardCategory === category;
        var visible = matchesQuery && matchesCategory;
        card.style.display = visible ? '' : 'none';
        if (visible) visibleCount++;
      });

      emptyState.style.display = visibleCount === 0 ? 'block' : 'none';
    }

    if (searchInput) searchInput.addEventListener('input', applyListingFilters);
    if (categoryChips) categoryChips.addEventListener('chipchange', applyListingFilters);

    var searchForm = document.querySelector('.search-bar');
    if (searchForm) {
      searchForm.addEventListener('submit', function (e) {
        e.preventDefault();
        applyListingFilters();
      });
    }

    applyListingFilters();
  }

  // ---- Runner directory: All / Active now filter (runners.html) ----
  var runnerGrid = document.querySelector('.runner-grid');
  if (runnerGrid) {
    var runnerCards = Array.prototype.slice.call(runnerGrid.querySelectorAll('.runner-card'));
    var runnerFilter = document.querySelector('.filter-row');

    var runnerEmptyState = document.createElement('p');
    runnerEmptyState.className = 'empty-state';
    runnerEmptyState.textContent = 'No runners match this filter right now.';
    runnerGrid.appendChild(runnerEmptyState);

    function applyRunnerFilter() {
      var activeChip = runnerFilter ? runnerFilter.querySelector('.chip.active') : null;
      var mode = activeChip ? activeChip.textContent.trim().toLowerCase() : 'all';
      var visibleCount = 0;

      runnerCards.forEach(function (card) {
        var isActive = !!card.querySelector('.status.active');
        var visible = mode === 'all' || isActive;
        card.style.display = visible ? '' : 'none';
        if (visible) visibleCount++;
      });

      runnerEmptyState.style.display = visibleCount === 0 ? 'block' : 'none';
    }

    if (runnerFilter) runnerFilter.addEventListener('chipchange', applyRunnerFilter);

    // Placeholder feedback for View profile / Contact — no profile pages exist yet
    runnerGrid.querySelectorAll('.runner-actions .btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var card = btn.closest('.runner-card');
        var name = card ? card.querySelector('.runner-name').textContent : 'this runner';
        if (btn.classList.contains('btn-primary')) {
          alert(name + ': this would open a way to contact them directly (WhatsApp, phone, etc).');
        } else {
          alert(name + ': this would open their full profile page.');
        }
      });
    });
  }

  // ---- Listing detail: pickup vs runner choice (listing.html) ----
  var pickupBtn = document.getElementById('pickup-btn');
  var chooseRunnerLink = document.getElementById('choose-runner-link');
  var pickupConfirm = document.getElementById('pickup-confirm');
  if (pickupBtn) {
    pickupBtn.addEventListener('click', function () {
      var alreadySelected = pickupBtn.classList.contains('btn-primary');
      if (alreadySelected) {
        pickupBtn.classList.remove('btn-primary');
        pickupBtn.classList.add('btn-outline');
        if (pickupConfirm) pickupConfirm.classList.remove('visible');
      } else {
        pickupBtn.classList.remove('btn-outline');
        pickupBtn.classList.add('btn-primary');
        if (chooseRunnerLink) {
          chooseRunnerLink.classList.remove('btn-primary');
          chooseRunnerLink.classList.add('btn-outline');
        }
        if (pickupConfirm) pickupConfirm.classList.add('visible');
      }
    });
  }
  if (chooseRunnerLink && pickupBtn) {
    chooseRunnerLink.addEventListener('click', function () {
      pickupBtn.classList.remove('btn-primary');
      pickupBtn.classList.add('btn-outline');
      if (pickupConfirm) pickupConfirm.classList.remove('visible');
    });
  }

  // ---- Sign in placeholder (every page) ----
  document.querySelectorAll('.site-header .btn-outline').forEach(function (btn) {
    if (btn.textContent.trim() === 'Sign in') {
      btn.addEventListener('click', function () {
        alert('Sign in / registration isn\'t built yet — this is just a prototype.');
      });
    }
  });

});