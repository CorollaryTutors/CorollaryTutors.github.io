# Corollary Tutors

**∴ Build the intuition. The rest follows.**

Static single-page site for Corollary Tutors, hosted on GitHub Pages.

## Files

- `index.html` — full site markup, all six sections
- `styles.css` — design system, typography, responsive layout
- `script.js` — form handler + minor interactions
- `README.md` — this file

## Preview locally

Double-click `index.html` to open in your browser. That's it — no build step.

For live-reload while editing, install VS Code's Live Server extension, right-click `index.html`, "Open with Live Server."

## Deploy to GitHub Pages

1. Push all files to the `main` branch of the `CorollaryTutors.github.io` repo
2. Settings → Pages → Source: `main` branch, `/ (root)` folder
3. Wait ~30 seconds
4. Visit `https://corollarytutors.github.io`

When the custom domain is ready, add a `CNAME` file at the repo root containing:

```
corollarytutors.com
```

Then configure DNS at your registrar per GitHub's docs.

## To-dos (before going live)

- [ ] Replace social handles in `index.html` with real Instagram / YouTube / TikTok URLs (search for `data-platform=` to find them)
- [ ] Add a real photo — replace `.photo-placeholder` with `<img src="me.jpg" alt="Lucas Martins">` in the About section
- [ ] Wire the "Submit a problem" form to Formspree (instructions in `script.js`)
- [ ] Add a favicon — a 32×32 orange `∴` on bone. Place `favicon.ico` and `favicon.svg` at the repo root, and add to `<head>`:

    ```html
    <link rel="icon" type="image/svg+xml" href="favicon.svg">
    <link rel="alternate icon" href="favicon.ico">
    ```

- [ ] Consider adding a proper hero graphic (via Claude Design or Recraft) — the current hero relies on the `∴` mark alone

## Design tokens

Colors, typography, and spacing are defined as CSS custom properties at the top of `styles.css` under `:root`. Change once, propagates everywhere.
