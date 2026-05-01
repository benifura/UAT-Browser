# Application Register Modernisation UAT

A browser-based UAT results capture app for testers. It loads scenarios from a local JSON file, saves progress in the browser, and exports a PDF when all scenarios are complete.

## Run Locally

Install Node.js from <https://nodejs.org/> if it is not already installed.

```bash
npm install
npm run dev
```

Open the local URL shown in the terminal.

## Build For Sharing

```bash
npm run build
```

The production files are created in `dist/`. They are suitable for static hosting such as GitHub Pages, Azure Static Web Apps, Netlify, or Vercel.

## Share As A Web Link

This project includes a GitHub Pages deployment workflow. See `DEPLOYMENT.md` for the one-time setup steps.

## Edit Scenarios

Edit the scenario pack in:

```text
src/data/scenarios.json
```

Keep the same structure:

```json
{
  "projectName": "Application Register Modernisation",
  "scenarios": []
}
```

Use straight quotes in JSON and escape quotes inside text, for example:

```json
"The default status is \"Open\""
```
