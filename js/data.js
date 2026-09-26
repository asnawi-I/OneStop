// Marketplace prototype — mock "database" backed by localStorage.
// No real backend yet: this seeds a small dataset into localStorage on first
// load, and every page reads/writes through the Store API below. Swapping
// this out for real API calls later shouldn't require changing the pages —
// just the functions inside Store.

(function () {

  var STORAGE_KEY = 'onestop_prototype_data_v1';
  var SESSION_KEY = 'onestop_prototype_session_v1';

  var SEED = {
    sellers: [
      { id: 'khalita', name: 'Khalita', avatar: 'KH', rating: 4.8, reviews: 32,
        bio: 'Home baker in Gadong specialising in traditional kuih, made fresh to order every morning.',
        payment: 'Bank transfer (BIBD), Cash on pickup' },
      { id: 'upindanipin', name: 'Upin dan Ipin', avatar: 'UI', rating: 4.6, reviews: 19,
        bio: 'Serves traditional ambuyat sets, prepared fresh with your choice of side dishes.',
        payment: 'Bank transfer (Baiduri), Cash on pickup' },
      { id: 'siticrafts', name: 'Siti Crafts', avatar: 'SC', rating: 4.9, reviews: 44,
        bio: 'Handmade tudung and headscarves in breathable cotton, sewn to order.',
        payment: 'Bank transfer (BIBD), Cash on delivery' },
      { id: 'johncena', name: 'John Cena', avatar: 'JC', rating: 4.5, reviews: 8,
        bio: 'Handcrafted resin keychains and small decor pieces, custom colours available.',
        payment: 'Bank transfer (Baiduri), Cash on pickup' },
      { id: 'nurul', name: 'Nurul', avatar: 'NU', rating: 4.7, reviews: 11,
        bio: 'Selling gently used baby and toddler items as my kids outgrow them.',
        payment: 'Bank transfer (BIBD), Cash on pickup' },
      { id: 'nasikatokkaka', name: 'Nasi Katok Kaka', avatar: 'NK', rating: 4.8, reviews: 73,
        bio: 'Everyday nasi katok packs, cooked fresh daily \u2014 sambal made in-house.',
        payment: 'Bank transfer (BIBD), Cash on pickup' },
      { id: 'yanacrochet', name: 'Yana Crochet', avatar: 'YC', rating: 5.0, reviews: 6,
        bio: 'Crochets tote bags, pouches, and small accessories using cotton yarn.',
        payment: 'Bank transfer (BIBD), Cash on pickup' },
      { id: 'tomjerry', name: 'Tom & Jerry', avatar: 'TJ', rating: 4.8, reviews: 27,
        bio: 'Small-batch homemade sambal, made fresh weekly with no added preservatives.',
        payment: 'Bank transfer (Baiduri), Cash on delivery' }
    ],
    listings: [
      { id: 'kuih-mor', title: 'Kuih mor, box of 12', price: 8.00, category: 'food', sellerId: 'khalita',
        description: 'Soft, melt-in-the-mouth kuih mor made fresh to order. Coated in fine sugar, no preservatives added. Best enjoyed the same day.',
        image: 'images/kuih-mor.jpg' },
      { id: 'kuih-cara-manis', title: 'Kuih cara manis, box of 10', price: 7.00, category: 'food', sellerId: 'khalita',
        description: 'Soft coconut-milk pancakes with a caramelised sugar top, made fresh each morning.',
        image: 'images/kuih-cara-manis.jpg' },
      { id: 'ambuyat-set', title: 'Ambuyat set for 2', price: 15.00, category: 'food', sellerId: 'upindanipin',
        description: 'A full ambuyat set for two, served with a choice of traditional side dishes.',
        image: 'images/ambuyat-set.jpg' },
      { id: 'tudung-cotton', title: 'Handmade tudung, cotton', price: 12.00, category: 'crafts', sellerId: 'siticrafts',
        description: 'Breathable cotton tudung, hand-sewn to order in a range of colours.',
        image: 'images/tudung-cotton.jpg' },
      { id: 'resin-keychain', title: 'Resin keychain set', price: 10.00, category: 'crafts', sellerId: 'johncena',
        description: 'A set of handcrafted resin keychains, custom colours available on request.',
        image: 'images/resin-keychain.jpg' },
      { id: 'stroller', title: 'Secondhand baby stroller', price: 45.00, category: 'secondhand', sellerId: 'nurul',
        description: 'Gently used baby stroller, good condition, from a smoke-free home.',
        image: 'images/stroller.jpg' },
      { id: 'nasi-katok', title: 'Nasi katok, 5 pax', price: 5.00, category: 'food', sellerId: 'nasikatokkaka',
        description: 'Classic nasi katok packs, cooked fresh daily with house-made sambal.',
        image: 'images/nasi-katok.jpg' },
      { id: 'crochet-tote', title: 'Crochet tote bag', price: 18.00, category: 'crafts', sellerId: 'yanacrochet',
        description: 'A sturdy cotton crochet tote bag, handmade to order.',
        image: 'images/crochet-tote.jpg' },
      { id: 'sambal', title: 'Homemade sambal, 250g', price: 6.00, category: 'food', sellerId: 'tomjerry',
        description: 'Small-batch homemade sambal, made fresh weekly with no added preservatives.',
        image: 'images/sambal.jpg' }
    ],
    runners: [
      { id: 'hafiz', name: 'Hafiz', avatar: 'HF', rating: 4.9, trips: 58, active: true,
        coverage: 'Covers Gadong, Kiulap. $3 base + $1/km.',
        payment: 'Bank transfer (BIBD), Cash on delivery' },
      { id: 'aimanr', name: 'Aiman R.', avatar: 'AR', rating: 4.7, trips: 21, active: true,
        coverage: 'Covers Beribi, Rimba. Flat $5 per trip.',
        payment: 'Bank transfer (Baiduri), Cash on delivery' },
      { id: 'dayangn', name: 'Dayang N.', avatar: 'DN', rating: 5.0, trips: 12, active: false,
        coverage: 'Covers Kiulap, Anggerek Desa. $4 base + $1/km.',
        payment: 'Bank transfer (BIBD), Cash on delivery' },
      { id: 'mizi', name: 'Mizi', avatar: 'MZ', rating: 4.6, trips: 40, active: true,
        coverage: 'Covers Tutong. $6 flat, motorbike only.',
        payment: 'Cash on delivery only' },
      { id: 'farahk', name: 'Farah K.', avatar: 'FK', rating: 4.9, trips: 67, active: false,
        coverage: 'Covers Gadong, Kiarong. $3 base + $1/km.',
        payment: 'Bank transfer (BIBD), Cash on delivery' },
            { id: 'alib', name: 'Ali B.', avatar: 'AB', rating: 4.8, trips: 15, active: true,
        coverage: 'Covers Muara, Serasa. $5 base + $1/km.',
        payment: 'Bank transfer (Baiduri), Cash on delivery' }
    ],

    applications: [],
    savedListingIds: [],
    reviews: []
  };

  function readData() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED));
        return SEED;
      }
      return JSON.parse(raw);
    } catch (e) {
      // localStorage unavailable (e.g. file:// restrictions in some browsers) —
      // fall back to the in-memory seed so the prototype still works.
      return SEED;
    }
  }


  function writeData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }


  window.Store = {
    getSellers: function () {
      return readData().sellers;
    },
    getSellerById: function (id) {
      var match = readData().sellers.filter(function (s) { return s.id === id; });
      return match[0] || null;
    },
    getListings: function () {
      return readData().listings;
    },
    getListingById: function (id) {
      var match = readData().listings.filter(function (l) { return l.id === id; });
      return match[0] || null;
    },
    getListingsBySeller: function (sellerId) {
      return readData().listings.filter(function (l) { return l.sellerId === sellerId; });
    },
    getRunners: function () {
      return readData().runners;
    },
    getRunnerById: function (id) {
      var match = readData().runners.filter(function (r) { return r.id === id; });
      return match[0] || null;
    },

    setRunnerActive: function (id, active) {
      var data = readData();
      var match = data.runners.filter(function (r) { return r.id === id; })[0];
      if (match) {
        match.active = active;
        writeData(data);
      }
      return match || null;
    },

    getApplications: function () {
      return readData().applications || [];
    },

    addApplication: function (app) {
      var data = readData();
      if (!data.applications) data.applications = [];
      data.applications.push(app);
      writeData(data);
      return app;
    },

    updateApplicationStatus: function (id, status) {
      var data = readData();
      var match = (data.applications || []).filter(function (a) { return a.id === id; });
      if (match[0]) {
        match[0].status = status;
        writeData(data);
      }
      return match[0] || null;
    },
    addSeller: function (seller) {
      var data = readData();
      data.sellers.push(seller);
      writeData(data);
      return seller;
    },
    addRunner: function (runner) {
      var data = readData();
      data.runners.push(runner);
      writeData(data);
      return runner;
    },

    getReviewsForTarget: function (targetType, targetId) {
      return (readData().reviews || []).filter(function (r) {
        return r.targetType === targetType && r.targetId === targetId;
      });
    },

    addReview: function (review) {
      var data = readData();
      if (!data.reviews) data.reviews = [];
      data.reviews.push(review);

      var list = review.targetType === 'seller' ? data.sellers : data.runners;
      var countField = review.targetType === 'seller' ? 'reviews' : 'trips';
      var target = list.filter(function (t) { return t.id === review.targetId; })[0];
      if (target) {
        var oldCount = target[countField] || 0;
        var oldRating = target.rating || 0;
        var newCount = oldCount + 1;
        target.rating = ((oldRating * oldCount) + review.rating) / newCount;
        target[countField] = newCount;
      }

      writeData(data);
      return review;
    },

    getSavedListingIds: function () {
      return readData().savedListingIds || [];
    },
    isListingSaved: function (id) {
      var ids = readData().savedListingIds || [];
      return ids.indexOf(id) !== -1;
    },
    toggleSavedListing: function (id) {
      var data = readData();
      if (!data.savedListingIds) data.savedListingIds = [];
      var idx = data.savedListingIds.indexOf(id);
      if (idx === -1) {
        data.savedListingIds.push(id);
      } else {
        data.savedListingIds.splice(idx, 1);
      }
      writeData(data);
      return data.savedListingIds.indexOf(id) !== -1;
    },

        // Wipes any local edits and restores the original seed data.
    reset: function () {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED));
    },
    // Session is deliberately kept separate from the seed data above, so
    // resetting the prototype's data doesn't also sign you out.
    getSession: function () {
      try {
        var raw = localStorage.getItem(SESSION_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch (e) {
        return null;
      }
    },
    setSession: function (session) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    },
    clearSession: function () {
      localStorage.removeItem(SESSION_KEY);
    }
  };

})();