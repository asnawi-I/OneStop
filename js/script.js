// Marketplace prototype — shared interactivity + rendering from Store (js/data.js)
// This is a static, no-backend prototype: data lives in localStorage (see
// data.js), and this file both renders pages from it and fakes real behaviour
// client-side (filtering, selection state, placeholder actions).

function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

// Builds the HTML for one listing card. Used by both the browse grid and a
// seller's own listings grid.
function cardHTML(listing, seller) {
  return '' +
    '<div class="card" data-category="' + listing.category + '">' +
      '<a class="card-image" href="listing.html?id=' + listing.id + '">[photo]</a>' +
      '<div class="card-body">' +
        '<a class="card-title" href="listing.html?id=' + listing.id + '">' + listing.title + '</a>' +
        '<a class="card-seller" href="seller.html?id=' + seller.id + '">by ' + seller.name + '</a>' +
        '<span class="card-price">$' + listing.price.toFixed(2) + '</span>' +
      '</div>' +
    '</div>';
}

document.addEventListener('DOMContentLoaded', function () {

  // ---- Generic single-select chip groups (category chips, runner filter) ----
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

  // ---- Browse page: render grid from Store, then search + category filter ----
  var listingGrid = document.getElementById('listing-grid');
  if (listingGrid && window.Store) {
    var listings = Store.getListings().map(function (l) {
      return { listing: l, seller: Store.getSellerById(l.sellerId) };
    });
    listingGrid.innerHTML = listings.map(function (pair) {
      return cardHTML(pair.listing, pair.seller);
    }).join('');

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

  // ---- Listing detail page: populate from ?id= (listing.html) ----
  var listingDetail = document.querySelector('.listing-layout');
  if (listingDetail && window.Store) {
    var params = new URLSearchParams(window.location.search);
    var listingId = params.get('id') || 'kuih-mor';
    var listing = Store.getListingById(listingId);
    var seller = listing ? Store.getSellerById(listing.sellerId) : null;

    if (listing && seller) {
      document.title = 'User 1 \u2014 ' + listing.title;
      document.getElementById('listing-title').textContent = listing.title;
      document.getElementById('listing-price').textContent = '$' + listing.price.toFixed(2);
      document.getElementById('listing-description').textContent = listing.description;
      document.getElementById('listing-category').textContent = 'Category: ' + capitalize(listing.category);
      document.getElementById('seller-name').textContent = seller.name;
      document.getElementById('seller-rating').innerHTML = '&#9733; ' + seller.rating.toFixed(1) + ' (' + seller.reviews + ' reviews)';
      document.getElementById('seller-link').setAttribute('href', 'seller.html?id=' + seller.id);
      document.getElementById('pickup-confirm').textContent = 'Pickup selected \u2014 arrange a time with ' + seller.name + ' directly.';
    }
  }

  // ---- Seller profile page: populate from ?id= (seller.html) ----
  var sellerHeader = document.querySelector('.seller-header');
  if (sellerHeader && window.Store) {
    var sellerParams = new URLSearchParams(window.location.search);
    var sellerId = sellerParams.get('id') || 'khalita';
    var sellerData = Store.getSellerById(sellerId);

    if (sellerData) {
      document.title = 'User 1 \u2014 ' + sellerData.name;
      document.getElementById('seller-avatar').textContent = sellerData.avatar;
      document.getElementById('seller-name').textContent = sellerData.name;
      document.getElementById('seller-rating').innerHTML = '&#9733; ' + sellerData.rating.toFixed(1) + ' (' + sellerData.reviews + ' reviews)';
      document.getElementById('seller-bio').textContent = sellerData.bio;
      document.getElementById('seller-payment').textContent = 'Accepts: ' + sellerData.payment;
      document.getElementById('seller-listings-heading').textContent = 'Listings by ' + sellerData.name;

      var sellerListings = Store.getListingsBySeller(sellerData.id);
      var sellerGrid = document.getElementById('seller-listings-grid');
      sellerGrid.innerHTML = sellerListings.map(function (l) {
        return cardHTML(l, sellerData);
      }).join('');
    }
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
        alert('Sign in / registration isn\'t built yet \u2014 this is just a prototype.');
      });
    }
  });

});