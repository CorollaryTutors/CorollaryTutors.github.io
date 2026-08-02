/* ============================================================
   COROLLARY TUTORS — script.js
   Minimal JS for form handling. Everything else is CSS.
============================================================ */

document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('submit-form');
  const status = document.getElementById('form-status');

  if (form && status) {
    form.addEventListener('submit', async function (e) {
      // Prevents the page from redirecting to Formspree's default thank-you page
      e.preventDefault();

      const problem = form.querySelector('#problem').value.trim();
      if (!problem) {
        status.textContent = 'Add a problem before submitting.';
        return;
      }

      status.textContent = 'Sending…';

      // Send the data to Formspree behind the scenes
      try {
        const response = await fetch(form.action, {
          method: 'POST',
          headers: { 'Accept': 'application/json' },
          body: new FormData(form),
        });

        if (response.ok) {
          status.textContent = 'Got it. I\'ll take a look and reach out if it becomes a video.';
          form.reset();
        } else {
          status.textContent = 'Oops! There was a problem submitting your form.';
        }
      } catch (error) {
        status.textContent = 'Oops! Check your internet connection and try again.';
      }
    });
  }
});
