# Contributing to Splicetable

Thank you for your interest in contributing to Splicetable! This project is open source and welcomes contributions from the community.

## How to Contribute

### Reporting Bugs
If you find a bug, please open an issue with:
- A clear description of the problem
- Steps to reproduce
- Expected vs. actual behavior
- Screenshots if relevant

### Suggesting Features
Feature requests are welcome! Please open an issue describing:
- The problem you're trying to solve
- Your proposed solution
- Any alternative approaches you've considered

### Submitting Changes
1. Fork the repository
2. Create a new branch for your changes (`git checkout -b feature/your-feature-name`)
3. Make your changes
4. Test your changes locally
5. Commit with a clear message describing what you changed and why
6. Push to your fork
7. Open a pull request

## Building the UI layer

The sidebar/navbar UI is written in JSX in `src/app-ui.jsx` and **precompiled** to `app-ui.js` (loaded by `index.html`). This avoids shipping an in-browser JSX transformer to production.

If you edit `src/app-ui.jsx`, rebuild before committing:

```bash
pnpm install        # one-time: installs esbuild
pnpm run build      # src/app-ui.jsx -> app-ui.js (minified, classic React runtime)
pnpm run watch      # rebuild on save during development
```

Then bump the cache-buster on the script tag in `index.html` (e.g. `app-ui.js?v=2`) and commit both `src/app-ui.jsx` and the regenerated `app-ui.js`.

> The compiled output uses the **classic** JSX runtime (`React.createElement`) and relies on the global `React`/`ReactDOM` loaded via CDN in `index.html`. Do not switch to the automatic runtime — it emits `import` statements that break in a classic `<script>`.

## Code Style
- Follow existing code conventions in the project
- Keep changes focused — one feature or fix per PR
- Add comments for complex logic

## Testing
- Test your changes in multiple browsers (Chrome, Safari, Firefox)
- Verify both light and dark themes work
- Check responsive behavior on different screen sizes

## Questions?
Open an issue or reach out to the maintainers. We're happy to help!
