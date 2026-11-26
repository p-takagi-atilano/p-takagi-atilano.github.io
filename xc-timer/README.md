# XC Timer

Offline interval-start timing for a team ski time trial.
Live at https://p-takagi-atilano.github.io/xc-timer/

## Tonight (with service)
1. **Google Form** with these questions (all short answer):
   `First name`, `Last name`, `Year of birth`, `Gender` (optional).
   Responses → *Link to Sheets*. Send the form link to the team.
2. **Apps Script** in that Sheet: Extensions → Apps Script → paste `apps-script.gs` → Save →
   Deploy → New deployment → Web app · Execute as **Me** · Access **Anyone** → copy the `/exec` URL.
3. **Timing phone**: open the site → Setup:
   - paste the `/exec` URL into **both** "Registration CSV URL" and "Apps Script web app URL"
   - set laps (2), interval (30 s), date, first start time, age groups
   - **Fetch racers**, then go to **Start list** → Generate → adjust with ▲▼ → Share to the team chat
4. Add to Home Screen (iPhone: Share → Add to Home Screen. Android: ⋮ → Install app).
5. **Airplane-mode test**: turn on airplane mode, fully close the app, reopen it from the home screen.
   The racers should still be there and the header should say "offline-ready ✓". Then tap "Download backup".

## Race (offline)
- Race tab keeps the screen awake, counts down each start and beeps at 10 s and 3-2-1-GO.
- Quiet line: tap the skier's card (sorted by who's due next).
- Busy line: hit **TAP** for each skier crossing, then pick them from the suggestions.
- Mistakes: Undo, or the Log tab (reassign / edit time / delete / add manual time).
- Mark DNF/DNS by tapping a racer under "Waiting" or "Finished/out".
- Late entry: Setup → + Add racer (gets the next free start slot).

## After (with service)
Results → **Send to Sheet** (writes "Results" + "Crossings" tabs) → **Share link** for the public results page.
Also available: Share/copy text, CSV download.
