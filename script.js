/* ============================================================
   COROLLARY TUTORS — script.js
   Minimal JS for form handling. Everything else is CSS.
============================================================ */

document.addEventListener('DOMContentLoaded', function () {

  /* Problem-submission form — placeholder handler.
     TODO: wire to Formspree by replacing the setTimeout block below with:

     const response = await fetch('https://formspree.io/f/YOUR_FORM_ID', {
       method: 'POST',
       headers: { 'Accept': 'application/json' },
       body: new FormData(form),
     });

     Sign up at https://formspree.io — free tier allows 50 submissions/month.
  */
  const form = document.getElementById('submit-form');
  const status = document.getElementById('form-status');

  if (form && status) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();

      const problem = form.querySelector('#problem').value.trim();
      if (!problem) {
        status.textContent = 'Add a problem before submitting.';
        return;
      }

      status.textContent = 'Sending…';

      // Placeholder — replace with real Formspree call.
      setTimeout(function () {
        status.textContent = 'Got it. I\'ll take a look and reach out if it becomes a video.';
        form.reset();
      }, 700);
    });
  }

});
