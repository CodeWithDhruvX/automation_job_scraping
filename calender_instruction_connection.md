# Reminder Feature Walkthrough

I have implemented the ability to connect multiple Gmail and Outlook accounts and set reminders for jobs.

## Features Added
1.  **Integrations Settings**: A new "Settings" button in the top navigation bar allows you to:
    *   Connect multiple Google accounts.
    *   Connect multiple Outlook accounts.
    *   Disconnect accounts.
2.  **Job Reminders**: A "Bell" icon added to the Job Table (Actions column) and Job Details Modal.
    *   Clicking it opens a modal to set a reminder.
    *   **Calendar Event**: Creates an event in your connected calendar.
    *   **Email Reminder**: Sends an email to yourself with the job details.

## Setup Instructions

### 1. Credentials
You need to configure OAuth credentials for the providers you want to use.

**For Outlook:**
1.  Create an App in [Azure Portal](https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade).
2.  Get `Client ID` and `Client Secret`.
3.  Create a `.env` file in the root folder (copy from [.env.example](file:///c:/Users/dhruv/Downloads/personal_projects/jobs_scraping/automation_job_scraping/.env.example)) and add:
    ```
    OUTLOOK_CLIENT_ID=...
    OUTLOOK_CLIENT_SECRET=...
    ```

**For Google:**
1.  Create a project in [Google Cloud Console](https://console.cloud.google.com/).
2.  enable **Calendar API** and **Gmail API**.
3.  Create OAuth 2.0 Credentials (Desktop App).
4.  Download the JSON file, rename it to `google_client_secrets.json`, and place it in the root folder.

### 2. Restart Application
Since I added new dependencies and environment variables, verify that you have restarted the backend.

```bash
run_dev.bat
```

## Verification Scenarios

### Scenario 1: Connect Account
1.  Click "Settings" in the dashboard.
2.  Click "Connect Outlook Account" (or Google).
3.  Complete the login flow.
4.  Verify the account appears in the list.

### Scenario 2: Set Reminder
1.  Find a job you like.
2.  Click the "Bell" icon.
3.  Select your connected account.
4.  Choose "Calendar Event" or "Email".
5.  Set a time (for Calendar).
6.  Click "Add to Calendar".
7.  Verify the event appears in your actual Calendar app.
