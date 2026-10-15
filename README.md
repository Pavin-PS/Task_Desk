# Task Desk — simplified GitHub Pages + Google Sheets

A lightweight task portal. The website is hosted on GitHub Pages; tasks live in a Google Sheet; Google Apps Script sends reminders using your Google account. No Supabase, paid email API, SMS provider, or Node.js required.

## What it includes

- Add, edit, delete, complete and filter tasks
- Task name, due date, priority and notes
- Task storage in Google Sheets
- Email of pending tasks around **9:00 AM and 6:00 PM India time**
- Monthly report on the last calendar day, with **CSV and PDF attachments**
- Responsive layout for desktop and mobile

> **Important privacy note:** This is the simplest personal-use version. The Apps Script web app endpoint is used by the public GitHub Pages site, so do not store confidential or sensitive task details here. Anyone who obtains the endpoint may be able to view or change tasks. Do not use this version for a team, confidential business data, or regulated information without adding proper authentication.

## Part 1 — Create the Google Sheet and backend

1. Open [Google Sheets](https://sheets.google.com) and create a blank spreadsheet called `Task Desk`.
2. In the spreadsheet, choose **Extensions → Apps Script**.
3. Delete the sample code in `Code.gs`, then copy all the contents of `google-apps-script/Code.gs` from this download into it.
4. Click **Project Settings** (gear icon) and set **Time zone** to **(GMT+05:30) India Standard Time — Asia/Kolkata**. Also check the spreadsheet's own time zone in **File → Settings**.
5. Click **Save**.
6. In the Apps Script function dropdown, choose `setup`, then click **Run**. Approve the requested Google permissions. This creates the Tasks and Settings tabs and installs the reminder triggers.
7. Open the spreadsheet's **Settings** tab. In the `ADMIN_EMAIL` row, enter the email address where you want to receive reminders and reports.
8. In Apps Script, click **Deploy → New deployment**. Click the gear next to “Select type” and choose **Web app**.
9. Set **Execute as** to **Me**. Set **Who has access** to **Anyone** (or the equivalent “Anyone” option shown in your account). Click **Deploy** and approve permissions.
10. Copy the Web app URL ending in `/exec`. Keep it for the next part.

If your Google Workspace account does not allow “Anyone” web apps, use a personal Google account or ask your administrator. Do not use “Anyone with Google account” unless you have confirmed the website's cross-origin requests work for your account.

## Part 2 — Connect the website

1. Open `app.js` from this project in a text editor.
2. Find this line:
   ```js
   const SCRIPT_URL = "PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE";
   ```
3. Replace the placeholder with the Web app URL you copied. Keep the URL inside the quotation marks. It should look like:
   ```js
   const SCRIPT_URL = "https://script.google.com/macros/s/DEPLOYMENT_ID/exec";
   ```
4. Save the file.

## Part 3 — Publish on GitHub Pages

1. Sign in to [GitHub](https://github.com) and create a repository named `task-desk` (public is easiest for free GitHub Pages).
2. Upload these website files to the repository root: `index.html`, `styles.css`, and `app.js`. You can also upload this README and the `google-apps-script` folder for reference.
3. Open the repository's **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**, branch `main`, folder `/(root)`, and click **Save**.
5. Wait a minute or two. GitHub will show a website URL similar to `https://YOUR-USERNAME.github.io/task-desk/`.
6. Open that URL. It should show **Google Sheets connected**. Add a test task and confirm it appears in the `Tasks` tab in your spreadsheet.

## Part 4 — Test email and monthly report

- In Apps Script, select `sendMorningReminder` and click **Run** to send a test reminder now. Authorize if prompted.
- Select `sendMonthlyReportIfLastDay` and click **Run** to test the monthly function. It only sends when today is the last day of the month, so for a test on another day, use the optional test function below.
- Trigger timing is approximate: Google runs time-driven triggers near the selected time, not guaranteed to the exact minute. The morning and evening emails are intended for 9 AM and 6 PM IST.

### Optional test report (sends a report immediately)

If you want to test the monthly report on any date, temporarily add this function to the bottom of `Code.gs`, save, select it in the function dropdown and Run:
```javascript
function testMonthlyReportNow() {
  const old = getSetting_('MONTHLY_REPORT_SENT');
  setSetting_('MONTHLY_REPORT_SENT', '');
  const now = new Date();
  const month = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM');
  const tasks = getTasks_();
  const monthTasks = tasks.filter(t => t.dueDate && t.dueDate.slice(0,7) === month);
  const completed = monthTasks.filter(t => t.status === 'Completed').length;
  const pending = monthTasks.filter(t => t.status !== 'Completed').length;
  const csv = [['Task','Due Date','Priority','Status','Notes'], ...monthTasks.map(t => [t.title,t.dueDate,t.priority,t.status,t.notes])]
    .map(row => row.map(csv_).join(',')).join('\r\n');
  const pdf = buildMonthlyPdf_(month, monthTasks, completed, pending);
  MailApp.sendEmail({
    to: recipient_(), subject: `Task Desk — TEST monthly report — ${month}`,
    body: `Test monthly report. Tasks: ${monthTasks.length}; completed: ${completed}; pending: ${pending}.`,
    attachments: [Utilities.newBlob(csv, 'text/csv', `task-report-${month}.csv`), pdf]
  });
  setSetting_('MONTHLY_REPORT_SENT', old);
}
```
Remove the test function afterward if you prefer.

## Monthly report details

The report includes tasks whose due date falls within the current month. It attaches a CSV file (opens in Excel/Sheets) and a PDF summary. Tasks with no due date are not included in the monthly due-date report.

## Troubleshooting

- **“Add your Google Apps Script URL…”** — the URL placeholder in `app.js` has not been replaced.
- **Not connected / timed out** — redeploy the Apps Script as a Web app, make sure access is set to Anyone, copy the latest `/exec` URL, and paste it in `app.js`.
- **Changes do not appear** — wait a second and press Refresh; then check the `Tasks` sheet.
- **No email arrives** — check the `ADMIN_EMAIL` value in the Settings tab, Gmail Sent, Spam, and Apps Script **Executions**. Run `sendMorningReminder` manually once to authorize MailApp.
- **Trigger not running** — run `setup` again and inspect Apps Script **Triggers**. Time-driven triggers are approximate.
- **Website shows old code** — hard refresh with Ctrl+F5.

## Keep it simple

Once this is set up, daily use is just opening the GitHub Pages URL and managing tasks. Google Sheets stores the data and Apps Script sends scheduled emails.
