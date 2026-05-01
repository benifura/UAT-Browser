# Share The UAT App With Testers

The easiest way to share this app is to publish it with GitHub Pages. Testers will only need the web link. They will not need to install anything, use bash, or run commands.

## One-Time GitHub Setup

1. Create a GitHub repository for this project.
2. Upload or push this project to the repository.
3. In GitHub, open the repository settings.
4. Select **Pages**.
5. Under **Build and deployment**, set **Source** to **GitHub Actions**.
6. Save the setting.

## Publishing The App

After the project is on GitHub, every update to the `main` branch will build and publish the app automatically.

To find the public app link:

1. Open the GitHub repository.
2. Select the **Actions** tab.
3. Open the latest **Deploy to GitHub Pages** run.
4. Use the deployment link shown by GitHub.

## What Testers Need To Do

Send testers the published GitHub Pages link. They can open it in Microsoft Edge or Google Chrome.

Each tester's progress is saved in their own browser. Progress is not shared between testers and there is no central database.

## Updating Scenarios

Edit:

```text
src/data/scenarios.json
```

Then publish the updated project to GitHub again. GitHub Pages will rebuild the app automatically.
