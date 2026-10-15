# Quick deployment checklist

- [ ] Create Google Sheet `Task Desk`
- [ ] Paste `google-apps-script/Code.gs` into Extensions → Apps Script
- [ ] Set Apps Script timezone to Asia/Kolkata
- [ ] Run `setup` and approve permissions
- [ ] Enter recipient in Settings → `ADMIN_EMAIL`
- [ ] Deploy as Web app, Execute as Me, access Anyone
- [ ] Copy `/exec` URL into `app.js`
- [ ] Upload `index.html`, `styles.css`, `app.js` to GitHub repository root
- [ ] Enable GitHub Pages from `main` / root
- [ ] Open the published site and confirm Google Sheets connected
- [ ] Add a test task and verify it appears in the Tasks tab
- [ ] Run `sendMorningReminder` manually to test email
