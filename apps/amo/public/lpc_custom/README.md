# lpc_custom — authored LPC sheets

Sheets drawn in LPC Forge v2's motion workshop to fill motions the library lacks
(e.g. a weapon's run). Same relative paths as `public/lpc/` (the merged library);
a file here wins over the library for that exact path.

Every file is listed in `src/data/lpc_custom.json` with its author, the library
files it was derived from and their licences (derivatives of CC-BY-SA / GPL art
keep those licences). `npm run test:catalogue` fails on an unlisted or
mis-sized file. Write through the Forge, not by hand.
