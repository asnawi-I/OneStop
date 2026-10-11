// Marketplace prototype — shared interactivity + rendering from Store (js/data.js)
// This is a static, no-backend prototype: data lives in localStorage (see
// data.js), and this file both renders pages from it and fakes real behaviour
// client-side (filtering, selection state, placeholder actions).

function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 24) || ('user' + Date.now());
}

function initialsFromName(name) {
  var parts = name.trim().split(/\s+/);
  var letters = parts.slice(0, 2).map(function (p) { return p.charAt(0).toUpperCase(); });
  return letters.join('') || '??';
}

// Reads an image file, shrinks it so its longest side is at most maxSize,
// and returns it as a JPEG data URL (small enough to keep in localStorage).
function resizeImageToDataURL(file, maxSize, callback) {
  var reader = new FileReader();
  reader.onerror = function () { callback(null); };
  reader.onload = function () {
    var img = new Image();
    img.onerror = function () { callback(null); };
    img.onload = function () {
      var scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      var canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      var ctx = canvas.getContext('2d');
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      callback(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}

// Listings used to have one "image" string; newer ones have an "images" array.
// This reads either shape, so older saved data keeps working without a reset.
function getListingImages(listing) {
  if (Array.isArray(listing.images)) return listing.images;
  if (listing.image) return [listing.image];
  return [];
}

// Swaps a broken <img> for a small text label instead of the browser's
// default broken-image icon. Used by every product photo on the site.
function handleImageError(img) {
  var fallback = document.createElement('span');
  fallback.className = 'image-fallback-text';
  fallback.textContent = '[Image unavailable]';
  img.replaceWith(fallback);
}

// Builds the HTML for one listing card. Used by both the browse grid and a
// seller's own listings grid.
function cardHTML(listing, seller) {
  var photos = getListingImages(listing);
  var photoHTML = photos.length
    ? '<img src="' + photos[0] + '" alt="' + listing.title + '" onerror="handleImageError(this)">'
    : '<span class="image-fallback-text">[Image unavailable]</span>';
  return '' +
    '<div class="card" data-category="' + listing.category + '">' +
      '<a class="card-image" href="listing.html?id=' + listing.id + '">' +
        photoHTML +
      '</a>' +
      '<div class="card-body">' +
        '<a class="card-title" href="listing.html?id=' + listing.id + '">' + listing.title + '</a>' +
        '<a class="card-seller" href="seller.html?id=' + seller.id + '">by ' + seller.name + '</a>' +
        '<span class="card-price">$' + listing.price.toFixed(2) + '</span>' +
      '</div>' +
    '</div>';
}

function runnerCardHTML(runner) {
  var statusClass = runner.active ? 'active' : 'offline';
  var statusLabel = runner.active ? 'Active now' : 'Offline';
  return '' +
    '<div class="runner-card">' +
      '<div class="runner-top">' +
        '<div class="runner-avatar">' + runner.avatar + '</div>' +
        '<div>' +
          '<div class="runner-name">' + runner.name + '</div>' +
          '<div class="runner-rating">&#9733; ' + runner.rating.toFixed(1) + ' (' + runner.trips + ' trips)</div>' +
        '</div>' +
      '</div>' +
      '<span class="status ' + statusClass + '"><span class="status-dot"></span>' + statusLabel + '</span>' +
      '<span class="runner-coverage">' + runner.coverage + '</span>' +
      '<div class="runner-actions">' +
        '<a class="btn btn-outline" href="runner.html?id=' + runner.id + '">View profile</a>' +
        '<a class="btn btn-primary" href="runner.html?id=' + runner.id + '#message-input">Contact</a>' +
      '</div>' +
    '</div>';
}

var STATUS_LABELS = { pending: 'Pending review', approved: 'Approved', rejected: 'Rejected' };

function adminRowHTML(app) {
  var roleLabel = (app.role === 'seller' ? 'Seller' : 'Runner') + (app.kind === 'reactivation' ? ' reactivation' : '');
  var detail = app.kind === 'reactivation'
    ? 'Renewing an inactive account'
    : app.role === 'seller'
      ? 'Category: ' + capitalize(app.category)
      : 'Coverage: ' + app.coverage + ' \u00b7 Pricing: ' + app.pricing;
  var actions = app.status === 'pending'
    ? '<div class="runner-actions"><button class="btn btn-primary" data-action="approve" data-id="' + app.id + '">Approve</button><button class="btn btn-outline" data-action="reject" data-id="' + app.id + '">Reject</button></div>'
    : '';

  return '' +
    '<div class="application-row admin-row">' +
      '<div>' +
        '<div class="application-name">' + app.name + ' (' + roleLabel + ')</div>' +
        '<div class="application-meta">' + app.contact + ' \u00b7 ' + detail + '</div>' +
        '<div class="application-meta">Payment proof: ' + (app.proofAttached ? 'attached' : 'missing') + ' \u00b7 Accepts: ' + app.payment + '</div>' +
      '</div>' +
      (app.proofImage ? '<img class="proof-thumb" src="' + app.proofImage + '" alt="Payment proof (click to enlarge)">' : '') +
      '<div class="admin-row-status">' +
        '<span class="status ' + app.status + '"><span class="status-dot"></span>' + STATUS_LABELS[app.status] + '</span>' +
        actions +
      '</div>' +
    '</div>';
}

// Wires up the star input, submit button, and review list on either
// listing.html (reviewing a seller) or runner.html (reviewing a runner).
// options: { targetType: 'seller'|'runner', targetId, refreshRating }
function setupReviewSection(options) {
  var listEl = document.getElementById('reviews-list');
  if (!listEl || !window.Store) return;

  function renderReviews() {
    var reviews = Store.getReviewsForTarget(options.targetType, options.targetId).slice().reverse();
    if (reviews.length === 0) {
      listEl.innerHTML = '<p class="empty-state">No reviews yet \u2014 be the first to leave one.</p>';
      return;
    }
    listEl.innerHTML = reviews.map(function (r) {
      var stars = '\u2605'.repeat(r.rating) + '\u2606'.repeat(5 - r.rating);
      var dateLabel = new Date(r.submittedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      return '' +
        '<div class="review-row">' +
          '<div class="review-stars">' + stars + '</div>' +
          (r.comment ? '<p class="review-comment">' + r.comment + '</p>' : '') +
          '<div class="review-meta">' + r.author + ' \u00b7 ' + dateLabel + '</div>' +
        '</div>';
    }).join('');
  }
  renderReviews();

  var starsContainer = document.getElementById('review-stars');
  var authorInput = document.getElementById('review-author');
  var commentInput = document.getElementById('review-comment');
  var submitBtn = document.getElementById('review-submit-btn');
  if (!starsContainer || !submitBtn) return;

  var session = Store.getSession();
  var isSelf = !!(session && session.type === options.targetType && session.id === options.targetId);

  if (isSelf) {
    var reviewPanel = submitBtn.closest('.panel');
    if (reviewPanel) {
      reviewPanel.innerHTML = '<span class="panel-title">Leave a review</span><p class="panel-note">You can\'t review your own profile.</p>';
    }
    return;
  }

  var starButtons = Array.prototype.slice.call(starsContainer.querySelectorAll('.star-btn'));
  starButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var val = parseInt(btn.getAttribute('data-star'), 10);
      starsContainer.setAttribute('data-value', val);
      starButtons.forEach(function (b) {
        b.classList.toggle('filled', parseInt(b.getAttribute('data-star'), 10) <= val);
      });
    });
  });

  submitBtn.addEventListener('click', function () {
    var rating = parseInt(starsContainer.getAttribute('data-value'), 10) || 0;
    if (rating === 0) {
      alert('Please select a star rating first.');
      return;
    }
    Store.addReview({
      id: 'review-' + Date.now(),
      targetType: options.targetType,
      targetId: options.targetId,
      author: (authorInput && authorInput.value.trim()) || 'Guest buyer',
      rating: rating,
      comment: commentInput ? commentInput.value.trim() : '',
      submittedAt: new Date().toISOString()
    });

    options.refreshRating();

    if (authorInput) authorInput.value = '';
    if (commentInput) commentInput.value = '';
    starsContainer.setAttribute('data-value', 0);
    starButtons.forEach(function (b) { b.classList.remove('filled'); });
    renderReviews();
  });
}

function showConfirmModal(message, confirmLabel, onConfirm) {
  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML =
    '<div class="modal-box">' +
      '<p class="modal-message"></p>' +
      '<div class="modal-actions">' +
        '<button class="btn btn-outline" data-modal-cancel>Cancel</button>' +
        '<button class="btn btn-primary" data-modal-confirm></button>' +
      '</div>' +
    '</div>';
  overlay.querySelector('.modal-message').textContent = message;
  overlay.querySelector('[data-modal-confirm]').textContent = confirmLabel;
  document.body.appendChild(overlay);

  function close() {
    overlay.remove();
  }
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) close();
  });
  overlay.querySelector('[data-modal-cancel]').addEventListener('click', close);
  overlay.querySelector('[data-modal-confirm]').addEventListener('click', function () {
    close();
    onConfirm();
  });
}

function showImageModal(src) {
  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML =
    '<div class="modal-box modal-box-wide">' +
      '<img class="modal-image" alt="Payment proof">' +
      '<div class="modal-actions"><button class="btn btn-outline" data-modal-cancel>Close</button></div>' +
    '</div>';
  overlay.querySelector('.modal-image').src = src;
  document.body.appendChild(overlay);
  function close() { overlay.remove(); }
  overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
  overlay.querySelector('[data-modal-cancel]').addEventListener('click', close);
}

function renderLapsedNotice(container, type, account, isOwner) {
  if (!container) return;
  var boxStyle = 'margin: 24px 48px 0; max-width: 480px;';

  if (!isOwner) {
    container.innerHTML =
      '<section class="panel" style="' + boxStyle + '">' +
        '<span class="panel-title">This ' + type + ' is currently inactive</span>' +
        '<p class="panel-note">They haven\'t been active for a while, so they\'re hidden from browse until they renew.</p>' +
      '</section>';
    return;
  }

  var pending = Store.getApplications().filter(function (a) {
    return a.kind === 'reactivation' && a.accountType === type && a.accountId === account.id && a.status === 'pending';
  })[0];

  if (pending) {
    container.innerHTML =
      '<section class="panel" style="' + boxStyle + '">' +
        '<span class="panel-title">Reactivation requested</span>' +
        '<p class="panel-note">We\'ve received your proof of payment. Your account goes live again as soon as it\'s approved.</p>' +
      '</section>';
    return;
  }

  container.innerHTML =
    '<section class="panel" style="' + boxStyle + '">' +
      '<span class="panel-title">Your account is inactive</span>' +
      '<p class="panel-note">There\'s been no activity for 3 months, so your account is hidden from browse. Nothing has been deleted. Pay the one-time registration fee again and upload proof to reactivate.</p>' +
      '<label class="form-label" for="reactivate-proof">Proof of payment (screenshot or photo)</label>' +
      '<input class="form-input" type="file" id="reactivate-proof" accept="image/*">' +
      '<button class="btn btn-primary btn-full" id="reactivate-btn">Request reactivation</button>' +
    '</section>';

  document.getElementById('reactivate-btn').addEventListener('click', function () {
    var file = document.getElementById('reactivate-proof').files[0];
    if (!file) {
      alert('Please attach your proof of payment first.');
      return;
    }
    resizeImageToDataURL(file, 600, function (dataUrl) {
      if (!dataUrl) {
        alert('Couldn\'t read that file \u2014 please attach an image of your receipt.');
        return;
      }
      try {
        Store.addApplication({
          id: 'app-' + Date.now(),
          kind: 'reactivation',
          role: type,
          accountType: type,
          accountId: account.id,
          name: account.name,
          contact: '(existing account)',
          payment: account.payment,
          proofAttached: true,
          proofImage: dataUrl,
          status: 'pending',
          submittedAt: new Date().toISOString()
        });
      } catch (err) {
        alert('Couldn\'t save this \u2014 the browser\'s storage is full. Try a smaller image.');
        return;
      }
      renderLapsedNotice(container, type, account, true);
    });
  });
}

function ownedListingRowHTML(listing) {
  return '' +
    '<div class="application-row">' +
      '<div>' +
        '<div class="application-name">' + listing.title + '</div>' +
        '<div class="application-meta">$' + listing.price.toFixed(2) + ' \u00b7 ' + capitalize(listing.category) + '</div>' +
      '</div>' +
      '<div class="row-actions">' +
        '<button class="btn btn-outline" data-edit-listing="' + listing.id + '">Edit</button>' +
        '<button class="btn btn-outline" data-delete-listing="' + listing.id + '">Delete</button>' +
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
    var listings = Store.getListings().filter(function (l) {
      return !Store.isLapsed('seller', l.sellerId);
    }).map(function (l) {
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

    if (listing && seller && Store.isLapsed('seller', seller.id)) {
      listingDetail.innerHTML = '<p class="empty-state">This listing is currently unavailable \u2014 the seller is inactive.</p>';
    } else if (listing && seller) {
      document.title = 'User 1 \u2014 ' + listing.title;
      var photos = getListingImages(listing);
      var mainImageEl = document.getElementById('listing-image');
      var thumbsEl = document.getElementById('listing-thumbs');

      function showMainImage(src) {
        mainImageEl.innerHTML = '<img src="' + src + '" alt="' + listing.title + '" onerror="handleImageError(this)">';
      }

      if (photos.length === 0) {
        mainImageEl.innerHTML = '<span class="image-fallback-text">[Image unavailable]</span>';
      } else {
        showMainImage(photos[0]);
      }

      if (thumbsEl && photos.length > 1) {
        thumbsEl.innerHTML = photos.map(function (src, i) {
          return '<button type="button" class="thumb-btn' + (i === 0 ? ' active' : '') + '" data-src="' + src + '">' +
            '<img src="' + src + '" alt="Photo ' + (i + 1) + '" onerror="handleImageError(this)">' +
          '</button>';
        }).join('');
        thumbsEl.querySelectorAll('.thumb-btn').forEach(function (btn) {
          btn.addEventListener('click', function () {
            thumbsEl.querySelectorAll('.thumb-btn').forEach(function (b) { b.classList.remove('active'); });
            btn.classList.add('active');
            showMainImage(btn.getAttribute('data-src'));
          });
        });
      }
      document.getElementById('listing-title').textContent = listing.title;
      document.getElementById('listing-price').textContent = '$' + listing.price.toFixed(2);
      document.getElementById('listing-description').textContent = listing.description;
      document.getElementById('listing-category').textContent = 'Category: ' + capitalize(listing.category);
      document.getElementById('seller-name').textContent = seller.name;
      document.getElementById('seller-rating').innerHTML = '&#9733; ' + seller.rating.toFixed(1) + ' (' + seller.reviews + ' reviews)';
      document.getElementById('seller-link').setAttribute('href', 'seller.html?id=' + seller.id);
      document.getElementById('message-seller-link').setAttribute('href', 'seller.html?id=' + seller.id + '#message-input');
      document.getElementById('pickup-confirm').textContent = 'Pickup selected \u2014 arrange a time with ' + seller.name + ' directly.';

      var saveBtn = document.getElementById('save-listing-btn');
      if (saveBtn) {
        function refreshSaveButton() {
          saveBtn.textContent = Store.isListingSaved(listing.id) ? '\u2605 Saved' : '\u2606 Save for later';
        }
        refreshSaveButton();
        saveBtn.addEventListener('click', function () {
          Store.toggleSavedListing(listing.id);
          refreshSaveButton();
        });
      }

      var reviewTargetName = document.getElementById('review-target-name');
      if (reviewTargetName) reviewTargetName.textContent = seller.name;
      setupReviewSection({
        targetType: 'seller',
        targetId: seller.id,
        refreshRating: function () {
          var updated = Store.getSellerById(seller.id);
          document.getElementById('seller-rating').innerHTML = '&#9733; ' + updated.rating.toFixed(1) + ' (' + updated.reviews + ' reviews)';
        }
      });
    }
  }

  // ---- Seller profile page: populate from ?id= (seller.html) ----
  var sellerHeader = document.getElementById('seller-profile');
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

      var session = Store.getSession();
      var isOwner = !!(session && session.type === 'seller' && session.id === sellerData.id);
      var manageSection = document.getElementById('seller-manage-section');

      var sellerLapsed = Store.isLapsed('seller', sellerData.id);
      if (sellerLapsed) {
        renderLapsedNotice(document.getElementById('lapsed-notice'), 'seller', sellerData, isOwner);
        if (!isOwner) sellerGrid.innerHTML = '';
      }

      if (isOwner && manageSection && !sellerLapsed) {
        manageSection.style.display = 'block';
        var manageListEl = document.getElementById('seller-manage-list');

        function refreshSellerViews() {
          var owned = Store.getListingsBySeller(sellerData.id);
          sellerGrid.innerHTML = owned.map(function (l) { return cardHTML(l, sellerData); }).join('');

          if (owned.length === 0) {
            manageListEl.innerHTML = '<p class="empty-state">You have no listings yet \u2014 add one below.</p>';
          } else {
            manageListEl.innerHTML = owned.map(function (l) { return ownedListingRowHTML(l); }).join('');
            manageListEl.querySelectorAll('[data-edit-listing]').forEach(function (btn) {
              btn.addEventListener('click', function () {
                startEditing(btn.getAttribute('data-edit-listing'));
              });
            });
            manageListEl.querySelectorAll('[data-delete-listing]').forEach(function (btn) {
              btn.addEventListener('click', function () {
                var id = btn.getAttribute('data-delete-listing');
                showConfirmModal('Delete this listing? This can\'t be undone.', 'Delete', function () {
                  Store.deleteListing(id);
                  if (editingId === id) resetListingForm();
                  refreshSellerViews();
                });
              });
            });
          }
        }
        refreshSellerViews();

        // ---- Drag-and-drop photos for the new listing ----
        var pendingPhotos = [];
         var editingId = null;
        var dropzone = document.getElementById('photo-dropzone');
        var photoInput = document.getElementById('new-listing-photos');
        var previewsEl = document.getElementById('photo-previews');

        function renderPhotoPreviews() {
          previewsEl.innerHTML = pendingPhotos.map(function (src, i) {
            return '<div class="drop-preview">' +
              '<img src="' + src + '" alt="Photo ' + (i + 1) + '">' +
              '<button type="button" class="drop-preview-remove" data-index="' + i + '" aria-label="Remove photo">&times;</button>' +
            '</div>';
          }).join('');
          previewsEl.querySelectorAll('.drop-preview-remove').forEach(function (btn) {
            btn.addEventListener('click', function () {
              pendingPhotos.splice(parseInt(btn.getAttribute('data-index'), 10), 1);
              renderPhotoPreviews();
            });
          });
        }

        function addPhotoFiles(fileList) {
          var files = Array.prototype.slice.call(fileList).filter(function (f) {
            return f.type && f.type.indexOf('image/') === 0;
          });
          if (files.length === 0) return;
          var results = new Array(files.length);
          var remaining = files.length;
          files.forEach(function (file, i) {
            resizeImageToDataURL(file, 800, function (dataUrl) {
              results[i] = dataUrl;
              remaining--;
              if (remaining === 0) {
                results.forEach(function (r) { if (r) pendingPhotos.push(r); });
                renderPhotoPreviews();
              }
            });
          });
        }

        dropzone.addEventListener('click', function () { photoInput.click(); });
        photoInput.addEventListener('change', function () {
          addPhotoFiles(photoInput.files);
          photoInput.value = '';
        });
        ['dragenter', 'dragover'].forEach(function (evt) {
          dropzone.addEventListener(evt, function (e) {
            e.preventDefault();
            dropzone.classList.add('dragover');
          });
        });
        ['dragleave', 'drop'].forEach(function (evt) {
          dropzone.addEventListener(evt, function (e) {
            e.preventDefault();
            dropzone.classList.remove('dragover');
          });
        });
        dropzone.addEventListener('drop', function (e) {
          addPhotoFiles(e.dataTransfer.files);
        });

        var formTitleEl = document.getElementById('listing-form-title');
        var submitBtn = document.getElementById('add-listing-btn');
        var cancelBtn = document.getElementById('cancel-edit-btn');

        function resetListingForm() {
          editingId = null;
          document.getElementById('new-listing-title').value = '';
          document.getElementById('new-listing-price').value = '';
          document.getElementById('new-listing-description').value = '';
          pendingPhotos = [];
          renderPhotoPreviews();
          formTitleEl.textContent = 'Add a listing';
          submitBtn.textContent = 'Add listing';
          cancelBtn.style.display = 'none';
        }

        function startEditing(id) {
          var l = Store.getListingById(id);
          if (!l || l.sellerId !== sellerData.id) return;
          editingId = id;
          document.getElementById('new-listing-title').value = l.title;
          document.getElementById('new-listing-price').value = l.price;
          document.getElementById('new-listing-category').value = l.category;
          document.getElementById('new-listing-description').value = l.description || '';
          pendingPhotos = getListingImages(l).slice();
          renderPhotoPreviews();
          formTitleEl.textContent = 'Edit listing';
          submitBtn.textContent = 'Save changes';
          cancelBtn.style.display = 'inline-flex';
          formTitleEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        cancelBtn.addEventListener('click', resetListingForm);

        submitBtn.addEventListener('click', function () {
          var title = document.getElementById('new-listing-title').value.trim();
          var price = parseFloat(document.getElementById('new-listing-price').value);
          var category = document.getElementById('new-listing-category').value;
          var description = document.getElementById('new-listing-description').value.trim();

          if (!title || isNaN(price)) {
            alert('Please fill in at least a title and a valid price.');
            return;
          }

          try {
            if (editingId) {
              Store.updateListing(editingId, {
                title: title, price: price, category: category,
                description: description, images: pendingPhotos.slice()
              });
            } else {
              Store.addListing({
                id: slugify(title) + '-' + Date.now(),
                title: title, price: price, category: category,
                sellerId: sellerData.id, description: description,
                images: pendingPhotos.slice()
              });
            }
          } catch (err) {
            alert('Couldn\'t save this listing — the browser\'s storage is full. Try fewer or smaller photos, or run Store.reset() in the console.');
            return;
          }

          resetListingForm();
          refreshSellerViews();
        });
      }

      var messageThreadList = document.getElementById('message-thread-list');
      var messageInput = document.getElementById('message-input');
      var messageSendBtn = document.getElementById('message-send-btn');
      if (messageThreadList && messageInput && messageSendBtn) {
        var mySender = isOwner ? 'seller' : 'buyer';

        function renderMessageThread() {
          var thread = Store.getThread('seller', sellerData.id);
          var messages = thread ? thread.messages : [];
          if (messages.length === 0) {
            messageThreadList.innerHTML = '<p class="empty-state">No messages yet \u2014 say hello. </p>';
            return;
          }
          messageThreadList.innerHTML = messages.map(function (m) {
            var who = m.sender === 'buyer' ? 'Buyer' : sellerData.name;
            var mine = m.sender === mySender;
            return '<div class="message-bubble ' + (mine ? 'mine' : 'theirs') + '"><div class="message-sender">' + who + '</div><div class="message-text">' + m.text + '</div></div>';
          }).join('');
          messageThreadList.scrollTop = messageThreadList.scrollHeight;
        }
        renderMessageThread();

        function sendMessage() {
          var text = messageInput.value.trim();
          if (!text) return;
          Store.sendMessage('seller', sellerData.id, mySender, text);
          messageInput.value = '';
          renderMessageThread();
        }
        messageSendBtn.addEventListener('click', sendMessage);
        messageInput.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') sendMessage();
        });

        if (window.location.hash === '#message-input') {
          messageInput.focus();
        }
      }
    }
  }

  // ---- Runner directory: render from Store, then All / Active now filter ----
  var runnerGrid = document.getElementById('runner-grid');
  if (runnerGrid && window.Store) {
    var runners = Store.getRunners().filter(function (r) {
      return !Store.isLapsed('runner', r.id);
    });
    runnerGrid.innerHTML = runners.map(function (r) { return runnerCardHTML(r); }).join('');

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
  }

  // ---- Runner profile page: populate from ?id= (runner.html) ----
  var runnerProfile = document.getElementById('runner-profile');
  if (runnerProfile && window.Store) {
    var runnerParams = new URLSearchParams(window.location.search);
    var runnerId = runnerParams.get('id') || 'hafiz';
    var runnerData = Store.getRunnerById(runnerId);

    if (runnerData) {
      document.title = 'User 1 \u2014 ' + runnerData.name;
      document.getElementById('runner-avatar').textContent = runnerData.avatar;
      document.getElementById('runner-name').textContent = runnerData.name;
      document.getElementById('runner-rating').innerHTML = '&#9733; ' + runnerData.rating.toFixed(1) + ' (' + runnerData.trips + ' trips)';

      var statusEl = document.getElementById('runner-status');
      statusEl.className = 'status ' + (runnerData.active ? 'active' : 'offline');
      statusEl.innerHTML = '<span class="status-dot"></span>' + (runnerData.active ? 'Active now' : 'Offline');

      var toggleBtn = document.getElementById('runner-toggle-active-btn');
      var statusNote = document.getElementById('runner-status-note');
      var session = Store.getSession();
      var isOwner = !!(session && session.type === 'runner' && session.id === runnerData.id);

      var runnerLapsed = Store.isLapsed('runner', runnerData.id);
      if (runnerLapsed) {
        renderLapsedNotice(document.getElementById('lapsed-notice'), 'runner', runnerData, isOwner);
      }

      if (toggleBtn && isOwner && !runnerLapsed) {
        function refreshToggleButton() {
          toggleBtn.textContent = runnerData.active ? 'Mark yourself offline' : 'Mark yourself active now';
        }
        refreshToggleButton();
        toggleBtn.addEventListener('click', function () {
          runnerData.active = !runnerData.active;
          Store.setRunnerActive(runnerData.id, runnerData.active);
          statusEl.className = 'status ' + (runnerData.active ? 'active' : 'offline');
          statusEl.innerHTML = '<span class="status-dot"></span>' + (runnerData.active ? 'Active now' : 'Offline');
          refreshToggleButton();
        });
      } else if (toggleBtn) {
        toggleBtn.style.display = 'none';
        if (statusNote) {
          statusNote.textContent = (isOwner && runnerLapsed)
            ? 'Reactivate your account to manage your status.'
            : 'Sign in as ' + runnerData.name + ' to manage this.';
        }
      }

      document.getElementById('runner-coverage').textContent = runnerData.coverage;
      document.getElementById('runner-payment').textContent = 'Accepts: ' + runnerData.payment;

      var messageThreadList = document.getElementById('message-thread-list');
      var messageInput = document.getElementById('message-input');
      var messageSendBtn = document.getElementById('message-send-btn');
      if (messageThreadList && messageInput && messageSendBtn) {
        var mySender = isOwner ? 'runner' : 'buyer';

        function renderMessageThread() {
          var thread = Store.getThread('runner', runnerData.id);
          var messages = thread ? thread.messages : [];
          if (messages.length === 0) {
            messageThreadList.innerHTML = '<p class="empty-state">No messages yet \u2014 say hello.</p>';
            return;
          }
          messageThreadList.innerHTML = messages.map(function (m) {
            var who = m.sender === 'buyer' ? 'Buyer' : runnerData.name;
            var mine = m.sender === mySender;
            return '<div class="message-bubble ' + (mine ? 'mine' : 'theirs') + '"><div class="message-sender">' + who + '</div><div class="message-text">' + m.text + '</div></div>';
          }).join('');
          messageThreadList.scrollTop = messageThreadList.scrollHeight;
        }
        renderMessageThread();

        function sendMessage() {
          var text = messageInput.value.trim();
          if (!text) return;
          Store.sendMessage('runner', runnerData.id, mySender, text);
          messageInput.value = '';
          renderMessageThread();
        }
        messageSendBtn.addEventListener('click', sendMessage);
        messageInput.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') sendMessage();
        });

        if (window.location.hash === '#message-input') {
          messageInput.focus();
        }
      }

      setupReviewSection({
        targetType: 'runner',
        targetId: runnerData.id,
        refreshRating: function () {
          var updated = Store.getRunnerById(runnerData.id);
          document.getElementById('runner-rating').innerHTML = '&#9733; ' + updated.rating.toFixed(1) + ' (' + updated.trips + ' trips)';
        }
      });
    }
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

  // ---- Application form (apply.html) ----
  var applyForm = document.getElementById('apply-form');
  if (applyForm && window.Store) {
    var roleSeller = document.getElementById('role-seller');
    var roleRunner = document.getElementById('role-runner');
    var sellerFields = document.getElementById('seller-fields');
    var runnerFields = document.getElementById('runner-fields');
    var categorySelect = document.getElementById('apply-category');

    // Pre-select the role based on which nav link ("Become a seller" /
    // "Become a runner") the person clicked to get here.
    var applyParams = new URLSearchParams(window.location.search);
    if (applyParams.get('role') === 'runner') {
      roleRunner.checked = true;
    } else {
      roleSeller.checked = true;
    }

    function updateRoleFields() {
      var isSeller = roleSeller.checked;
      sellerFields.style.display = isSeller ? 'block' : 'none';
      runnerFields.style.display = isSeller ? 'none' : 'block';
    }
    roleSeller.addEventListener('change', updateRoleFields);
    roleRunner.addEventListener('change', updateRoleFields);
    updateRoleFields();

    applyForm.addEventListener('submit', function (e) {
      e.preventDefault();

      var role = roleSeller.checked ? 'seller' : 'runner';
      var application = {
        id: 'app-' + Date.now(),
        role: role,
        name: document.getElementById('apply-name').value,
        contact: document.getElementById('apply-contact').value,
        bio: document.getElementById('apply-bio').value,
        payment: document.getElementById('apply-payment').value,
        proofAttached: document.getElementById('apply-proof').files.length > 0,
        status: 'pending',
        submittedAt: new Date().toISOString()
      };

      if (role === 'seller') {
        application.category = categorySelect.value;
      } else {
        application.coverage = document.getElementById('apply-coverage').value;
        application.pricing = document.getElementById('apply-pricing').value;
      }

      function finishSubmit(proofDataUrl) {
        if (proofDataUrl) application.proofImage = proofDataUrl;
        try {
          Store.addApplication(application);
        } catch (err) {
          alert('Couldn\'t save your application \u2014 the browser\'s storage is full. Try a smaller proof image.');
          return;
        }

        applyForm.style.display = 'none';
        var confirmation = document.getElementById('apply-confirmation');
        var confirmationText = document.getElementById('apply-confirmation-text');
        confirmationText.textContent = 'Thanks, ' + application.name + '! We\'ve received your ' +
          role + ' application and payment proof. You\'ll be able to start ' +
          (role === 'seller' ? 'listing' : 'accepting runs') +
          ' once it\'s approved \u2014 usually within 1\u20132 business days.';
        confirmation.style.display = 'block';
      }

      // Keep a (shrunk) copy of the proof so admin can actually look at it.
      // Non-image files (e.g. a PDF receipt) are just noted as attached.
      var proofFile = document.getElementById('apply-proof').files[0];
      if (proofFile && proofFile.type.indexOf('image/') === 0) {
        resizeImageToDataURL(proofFile, 600, finishSubmit);
      } else {
        finishSubmit(null);
      }
    });
  }

  // ---- Profile page: shortcut to your own seller/runner page if signed in as one ----
  var accountPanel = document.getElementById('account-shortcut-panel');
  var buyerSections = document.getElementById('buyer-profile-sections');
  if (accountPanel && window.Store) {
    var profileSession = Store.getSession();
    var isSellerOrRunner = !!(profileSession && (profileSession.type === 'seller' || profileSession.type === 'runner' || profileSession.type === 'admin'));
    if (buyerSections) buyerSections.style.display = isSellerOrRunner ? 'none' : 'block';

    if (profileSession && profileSession.type === 'seller') {
      var ownedSeller = Store.getSellerById(profileSession.id);
      if (ownedSeller) {
        document.getElementById('account-shortcut-title').textContent = 'You\'re signed in as a seller';
        document.getElementById('account-shortcut-note').textContent = 'Manage your listings from your seller profile.';
        var shortcutLink = document.getElementById('account-shortcut-link');
        shortcutLink.textContent = 'Go to your seller profile';
        shortcutLink.setAttribute('href', 'seller.html?id=' + ownedSeller.id);
        accountPanel.style.display = 'block';
      }
    } else if (profileSession && profileSession.type === 'runner') {
      var ownedRunner = Store.getRunnerById(profileSession.id);
      if (ownedRunner) {
        document.getElementById('account-shortcut-title').textContent = 'You\'re signed in as a runner';
        document.getElementById('account-shortcut-note').textContent = 'Manage your active status from your runner profile.';
        var shortcutLink2 = document.getElementById('account-shortcut-link');
        shortcutLink2.textContent = 'Go to your runner profile';
        shortcutLink2.setAttribute('href', 'runner.html?id=' + ownedRunner.id);
        accountPanel.style.display = 'block';
      }
    } else if (profileSession && profileSession.type === 'admin') {
      document.getElementById('account-shortcut-title').textContent = 'You\'re signed in as an admin';
      document.getElementById('account-shortcut-note').textContent = 'Review applications and renewals from the admin panel.';
      var shortcutLink3 = document.getElementById('account-shortcut-link');
      shortcutLink3.textContent = 'Go to the admin panel';
      shortcutLink3.setAttribute('href', 'admin.html');
      accountPanel.style.display = 'block';
    }
  }

  // ---- Buyer profile page: saved listings + applications (profile.html) ----
  var savedGrid = document.getElementById('saved-listings-grid');
  if (savedGrid && window.Store) {
    var savedIds = Store.getSavedListingIds();
    var savedListings = savedIds.map(function (id) { return Store.getListingById(id); }).filter(Boolean).filter(function (l) {
      return !Store.isLapsed('seller', l.sellerId);
    });

    if (savedListings.length === 0) {
      var savedEmpty = document.createElement('p');
      savedEmpty.className = 'empty-state';
      savedEmpty.textContent = 'You haven\'t saved anything yet \u2014 tap "Save for later" on a listing to add it here.';
      savedGrid.appendChild(savedEmpty);
    } else {
      savedGrid.innerHTML = savedListings.map(function (l) {
        var listingSeller = Store.getSellerById(l.sellerId);
        return cardHTML(l, listingSeller);
      }).join('');
    }
  }

  var applicationsList = document.getElementById('applications-list');
  if (applicationsList && window.Store) {
    var myApplications = Store.getApplications().filter(function (a) { return a.kind !== 'reactivation'; });

    if (myApplications.length === 0) {
      var appsEmpty = document.createElement('p');
      appsEmpty.className = 'empty-state';
      appsEmpty.innerHTML = 'You haven\'t applied to become a seller or runner yet. <a class="panel-link" href="apply.html">Apply here</a>.';
      applicationsList.appendChild(appsEmpty);
    } else {
      applicationsList.innerHTML = myApplications.slice().reverse().map(function (app) {
        var submitted = new Date(app.submittedAt);
        var dateLabel = submitted.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        var roleLabel = app.role === 'seller' ? 'Seller' : 'Runner';
        var detail = app.role === 'seller' ? ('Category: ' + capitalize(app.category)) : ('Coverage: ' + app.coverage);
        return '' +
          '<div class="application-row">' +
            '<div>' +
              '<div class="application-name">' + app.name + ' (' + roleLabel + ')</div>' +
              '<div class="application-meta">Submitted ' + dateLabel + ' \u00b7 ' + detail + '</div>' +
            '</div>' +
            '<span class="status ' + app.status + '"><span class="status-dot"></span>' + STATUS_LABELS[app.status] + '</span>' +
          '</div>';
      }).join('');
    }
  }

  // ---- Admin panel: review/approve/reject applications (admin.html) ----
  var adminList = document.getElementById('admin-applications-list');
  var adminContent = document.getElementById('admin-content');
  var adminDenied = document.getElementById('admin-denied');
  var adminSession = window.Store ? Store.getSession() : null;
  var isAdmin = !!(adminSession && adminSession.type === 'admin');
  if (adminContent) adminContent.style.display = isAdmin ? 'block' : 'none';
  if (adminDenied) adminDenied.style.display = isAdmin ? 'none' : 'block';

  if (adminList && window.Store && isAdmin) {
    var adminFilter = document.querySelector('.filter-row');

    function renderAdminList() {
      var apps = Store.getApplications().slice().reverse();
      var activeChip = adminFilter ? adminFilter.querySelector('.chip.active') : null;
      var mode = activeChip ? activeChip.textContent.trim().toLowerCase() : 'all';
      var filtered = mode === 'all' ? apps : apps.filter(function (a) { return a.status === mode; });

      if (filtered.length === 0) {
        adminList.innerHTML = '';
        var empty = document.createElement('p');
        empty.className = 'empty-state';
        empty.textContent = 'No applications match this filter.';
        adminList.appendChild(empty);
        return;
      }

      adminList.innerHTML = filtered.map(function (app) { return adminRowHTML(app); }).join('');
      adminList.querySelectorAll('.proof-thumb').forEach(function (img) {
        img.addEventListener('click', function () { showImageModal(img.src); });
      });

      adminList.querySelectorAll('[data-action]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var id = btn.getAttribute('data-id');
          var action = btn.getAttribute('data-action');
          var app = Store.getApplications().filter(function (a) { return a.id === id; })[0];
          if (!app) return;

          if (app.kind === 'reactivation') {
            if (action === 'approve') Store.reactivateAccount(app.accountType, app.accountId);
            Store.updateApplicationStatus(id, action === 'approve' ? 'approved' : 'rejected');
          } else if (action === 'approve') {
            var newId = slugify(app.name);
            var initials = initialsFromName(app.name);
            if (app.role === 'seller') {
              Store.addSeller({
                id: newId, name: app.name, avatar: initials, rating: 0, reviews: 0,
                bio: app.bio, payment: app.payment
              });
            } else {
              Store.addRunner({
                id: newId, name: app.name, avatar: initials, rating: 0, trips: 0, active: false,
                coverage: app.coverage, payment: app.payment
              });
            }
            Store.updateApplicationStatus(id, 'approved');
          } else {
            Store.updateApplicationStatus(id, 'rejected');
          }

          renderAdminList();
        });
      });
    }

    if (adminFilter) adminFilter.addEventListener('chipchange', renderAdminList);
    renderAdminList();

    // Testing tool: fast-forward an account's inactivity.
    var ageSelect = document.getElementById('age-account-select');
    var ageBtn = document.getElementById('age-account-btn');
    var ageNote = document.getElementById('age-account-note');
    if (ageSelect && ageBtn) {
      function renderAgeOptions() {
        var previous = ageSelect.value;
        var accounts = [];
        Store.getSellers().forEach(function (s) { accounts.push({ type: 'seller', id: s.id, name: s.name }); });
        Store.getRunners().forEach(function (r) { accounts.push({ type: 'runner', id: r.id, name: r.name }); });
        ageSelect.innerHTML = accounts.map(function (a) {
          var state = Store.isLapsed(a.type, a.id) ? 'inactive' : 'active';
          return '<option value="' + a.type + ':' + a.id + '">' + a.name + ' (' + a.type + ') \u2014 ' + state + '</option>';
        }).join('');
        if (previous) ageSelect.value = previous;
      }
      renderAgeOptions();

      ageBtn.addEventListener('click', function () {
        var parts = ageSelect.value.split(':');
        Store.ageAccount(parts[0], parts[1], 91);
        if (ageNote) ageNote.textContent = 'Done \u2014 that account now counts as inactive and is hidden from browse. Sign in as it to see the renew panel.';
        renderAgeOptions();
      });
    }
  }

    // ---- Auth nav: reflect the current mock session on every page ----
  document.querySelectorAll('.site-header .btn-outline').forEach(function (btn) {
    if (btn.textContent.trim() !== 'Sign in' || !window.Store) return;
    var session = Store.getSession();

    if (session) {
      var name = session.type === 'admin' ? 'Admin' : 'Buyer';
      if (session.type === 'seller') {
        var s = Store.getSellerById(session.id);
        if (s) name = s.name;
      } else if (session.type === 'runner') {
        var r = Store.getRunnerById(session.id);
        if (r) name = r.name;
      }
      btn.textContent = 'Signed in as ' + name;
      btn.addEventListener('click', function () {
        showConfirmModal('Sign out of "' + name + '"?', 'Sign out', function () {
          Store.clearSession();
          window.location.reload();
        });
      });
    } else {
      btn.addEventListener('click', function () {
        window.location.href = 'signin.html';
      });
    }
  });

  // ---- Sign in page: pick buyer / seller / runner to browse as (signin.html) ----
  var signinForm = document.getElementById('signin-form');
  if (signinForm && window.Store) {
    var signinBuyer = document.getElementById('signin-buyer');
    var signinSeller = document.getElementById('signin-seller');
    var signinRunner = document.getElementById('signin-runner');
    var signinAdmin = document.getElementById('signin-admin');
    var sellerFieldsEl = document.getElementById('signin-seller-fields');
    var runnerFieldsEl = document.getElementById('signin-runner-fields');
    var sellerSelect = document.getElementById('signin-seller-select');
    var runnerSelect = document.getElementById('signin-runner-select');

    sellerSelect.innerHTML = Store.getSellers().map(function (s) {
      return '<option value="' + s.id + '">' + s.name + '</option>';
    }).join('');
    runnerSelect.innerHTML = Store.getRunners().map(function (r) {
      return '<option value="' + r.id + '">' + r.name + '</option>';
    }).join('');

    function updateSigninFields() {
      sellerFieldsEl.style.display = signinSeller.checked ? 'block' : 'none';
      runnerFieldsEl.style.display = signinRunner.checked ? 'block' : 'none';
    }
    signinBuyer.addEventListener('change', updateSigninFields);
    signinSeller.addEventListener('change', updateSigninFields);
    signinRunner.addEventListener('change', updateSigninFields);
    signinAdmin.addEventListener('change', updateSigninFields);
    updateSigninFields();

    signinForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var session;
      if (signinSeller.checked) {
        session = { type: 'seller', id: sellerSelect.value };
      } else if (signinRunner.checked) {
        session = { type: 'runner', id: runnerSelect.value };
      } else if (signinAdmin.checked) {
        session = { type: 'admin', id: 'admin' };
      } else {
        session = { type: 'buyer', id: null };
      }
      Store.setSession(session);
      // Signing in counts as account activity (unless the account has already lapsed).
      if (session.type === 'seller' || session.type === 'runner') Store.touch(session.type, session.id);
      window.location.href = session.type === 'admin' ? 'admin.html' : 'index.html';
    });
  }

});