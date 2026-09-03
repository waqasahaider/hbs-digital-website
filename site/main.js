/* ============================================================
   H b&s Digital — shared behaviour
   - Mobile navigation toggle
   - Contact form submit via Formspree (progressive enhancement)
   ============================================================ */

(function () {
  'use strict';

  /* ---------- Mobile nav ---------- */
  var toggle = document.querySelector('.nav-toggle');
  var links = document.getElementById('navlinks');

  if (toggle && links) {
    toggle.addEventListener('click', function () {
      var open = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    // Close the menu when a link is chosen
    links.addEventListener('click', function (e) {
      if (e.target.closest('a')) {
        links.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ---------- Contact form ---------- */
  var form = document.getElementById('contactForm');
  if (!form) return;

  var note = document.getElementById('formNote');
  var button = form.querySelector('.submit-btn');

  function showNote(message, isError) {
    if (!note) return;
    note.textContent = message;
    note.classList.add('show');
    note.classList.toggle('error', !!isError);
  }

  form.addEventListener('submit', function (e) {
    var endpoint = form.getAttribute('action') || '';

    // If the Formspree endpoint hasn't been set yet, don't post to a
    // placeholder — just confirm locally so the page never looks broken.
    if (endpoint.indexOf('YOUR_FORM_ID') !== -1 || endpoint === '') {
      e.preventDefault();
      showNote('Thanks — your message is ready. (Connect the form endpoint to start receiving these by email.)', false);
      form.reset();
      return;
    }

    // Real endpoint present: submit in the background so the visitor
    // stays on the page. Falls back to a normal POST if fetch fails.
    if (window.fetch) {
      e.preventDefault();
      var data = new FormData(form);

      if (button) { button.disabled = true; button.textContent = 'Sending…'; }

      fetch(endpoint, {
        method: 'POST',
        body: data,
        headers: { 'Accept': 'application/json' }
      })
        .then(function (res) {
          if (res.ok) {
            form.reset();
            showNote('Thanks — your message is on its way. We’ll be in touch shortly.', false);
          } else {
            return res.json().then(function (d) {
              var msg = (d && d.errors && d.errors.length)
                ? d.errors.map(function (x) { return x.message; }).join(', ')
                : 'Something went wrong. Please email us directly at hello@hbsdigital.ae.';
              showNote(msg, true);
            });
          }
        })
        .catch(function () {
          showNote('Network error. Please email us directly at hello@hbsdigital.ae.', true);
        })
        .finally(function () {
          if (button) { button.disabled = false; button.textContent = 'Send message'; }
        });
    }
  });
})();
