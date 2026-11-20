# havihub.github.io

Source of the website of [Havi Hub](https://github.com/havihub/HaviHub), published at <https://havihub.github.io>.

It is a static site with no build step:

- `index.html`: the home page.
- `privacy/index.html`: the privacy policy of the website and the app.
- `code-signing-policy/index.html`: how the Windows files are built and signed.
- `assets/site.css` and `assets/site.js`: the styles and the script shared by every page.
- `assets/`: also the screenshots (`shots/<style>/<language>/`, for the CurseForge and Modrinth styles in Spanish and English), icons and fonts.

Every page is written in Spanish and English. Each text appears twice, marked with `data-l="es"` or `data-l="en"`, and only the one in the page's language is shown. The language is the first of the browser's languages that the site has, or the one chosen with the button during the visit. The home page reads the latest release from the GitHub API to link the download buttons to its files, and puts first the files for the visitor's system. It is shown in the style of the app's CurseForge layout; the switch in the header changes it, screenshots included, to the Modrinth layout for the rest of the visit. The language is chosen in the footer. The home page of the app is shown in both layouts at once, split by a line that can be dragged.

The fonts are [Hubot Sans](https://github.com/github/hubot-sans), [Inter](https://github.com/rsms/inter) and [JetBrains Mono](https://github.com/JetBrains/JetBrainsMono), all under the SIL Open Font License 1.1 (see `assets/fonts/`).

NOT AN OFFICIAL MINECRAFT PRODUCT. NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT.
