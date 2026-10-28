# trentshuey.com

Website of Dr. Trent W. Shuey, percussionist and educator at Angelo State University.

## How the site is put together

- The finished pages (`index.html`, `about.html`, and so on) sit at the top level and are what GitHub Pages serves.
- The page text lives in `_src/pages/`. Shared pieces (the menu, footer, and keyboard graphic) live in `_src/build.py`.
- After changing anything in `_src/`, run `python3 _src/build.py` to regenerate the pages.
- Styles are in `assets/site.css`; the menu, video player, and keyboard animation are in `assets/site.js`.

## Small text fixes

A quick typo fix can be made directly in the finished `.html` file on GitHub. Make the same change in `_src/pages/` too, or the next rebuild will undo it.

## Addresses

Pages are served without the `.html` ending, so `about.html` is reachable at `/about`. The memorial page stays at `/paul`, the same address as on the old site.
