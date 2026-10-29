# trentshuey.com

Website of Dr. Trent W. Shuey, percussionist and educator at Angelo State University.

## How the site is put together

- The finished pages (`index.html`, `about.html`, and so on) sit at the top level and are what GitHub Pages serves.
- The page text lives in `_src/pages/`. Shared pieces (the menu, footer, and keyboard graphic) live in `_src/build.py`.
- After changing anything in `_src/`, run `python3 _src/build.py` to regenerate the pages.
- Styles are in `assets/site.css`; the menu, video player, and keyboard animation are in `assets/site.js`.

## Things that change often

- **Events:** `_src/events.py`. Each event hides itself on the site once it has ended, and gets an "Add to calendar" file in `assets/ics/` when the site is rebuilt. The home page shows the next three.
- **Concert programs:** `_src/programs.py`, newest first. Printed programs (PDF) go in `assets/docs/programs/`.
- **Rudiments:** `_src/rudiments.json` holds the notation for all 40 PAS rudiments; `_src/rudiments_render.py` draws it and `assets/site.js` plays it.
- **Studio handbook:** the web version is `_src/pages/handbook.html`; the PDF is `assets/docs/asu-percussion-studio-handbook.pdf`.
- **Visitor count:** set `GOATCOUNTER_CODE` in `_src/build.py` once the GoatCounter account exists.

## Small text fixes

A quick typo fix can be made directly in the finished `.html` file on GitHub. Make the same change in `_src/pages/` too, or the next rebuild will undo it.

## Addresses

Pages are served without the `.html` ending, so `about.html` is reachable at `/about`. The memorial page stays at `/paul`, the same address as on the old site.
