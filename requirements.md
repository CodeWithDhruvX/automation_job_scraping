Perfect 👍 Below is a **clean, structured Feature Requirements Document (FRD)** for your personal Invite Logger (React + Go).

No implementation details — only features.

---

# 📌 Product Name (Working Title)

**Invite Logger – Personal Email Invite Scanner**

---

# 🎯 1. Product Goal

To scan Gmail emails within a selected time range, detect meeting invite links, log them with email references, and allow optional manual addition to Google Calendar.

---

# 👤 2. Target User

* Single personal user
* Gmail account holder
* Uses Google Calendar
* Wants control over invite tracking (no auto-add)

---

# 🧩 3. Core Features

---

## 🔹 3.1 Time-Based Email Scanning

User can manually scan emails based on:

* Last 24 Hours
* Last 2 Days
* Last 3 Days
* Last 5 Days
* Custom Date Range (optional future feature)

### Requirements:

* Scan all emails (not just unread)
* Use Gmail search filters
* No background auto polling
* User-triggered scan only

---

## 🔹 3.2 Meeting Link Detection

System must detect meeting links from email body.

Supported platforms:

* Google Meet
* Zoom
* Microsoft Teams
* Calendly
* Generic HTTPS meeting links (future enhancement)

### Requirements:

* Extract first valid meeting link
* Avoid duplicate link logging
* Work with HTML and plain text emails

---

## 🔹 3.3 Invite Logging

When invite link is detected, system must create a log entry.

Each log must contain:

* Unique ID
* Email ID
* Subject
* Sender
* Email URL (Gmail web link)
* Meeting link
* Detection timestamp
* Status (pending / added / ignored)

---

## 🔹 3.4 Log Dashboard View

User must see all logged invites in a structured table.

### Table Columns:

* Subject
* Sender
* Meeting Link (clickable)
* Email (Open Gmail link)
* Status
* Actions

---

## 🔹 3.5 Manual Calendar Addition

User can manually add a logged invite to Google Calendar.

### When clicked:

* Create calendar event
* Use default duration (configurable)
* Insert meeting link into description
* Update log status → “added”

No automatic addition without user action.

---

## 🔹 3.6 Status Management

Each log entry must support:

* Pending (default)
* Added (calendar created)
* Ignored (user marked)

User must be able to:

* Mark as Ignored
* Mark as Done

---

## 🔹 3.7 Duplicate Prevention

System must prevent:

* Logging same email twice
* Logging same meeting link multiple times

Duplicate detection must be configurable in settings.

---

## 🔹 3.8 Settings Panel

User must be able to configure:

* Default time range (1d, 2d, 3d, 5d)
* Default meeting duration (30/45/60 mins)
* Timezone
* Enable/Disable duplicate detection
* Auto-mark email as read (optional future)

Settings must persist locally.

---

## 🔹 3.9 Manual Scan Trigger

System must:

* Not auto-scan in background
* Only scan when user clicks “Scan Emails”

---

## 🔹 3.10 Email URL Generation

Each log entry must include:

* Direct Gmail web URL to open the email

Must open in new tab.

---

# 🛡 4. Security & Privacy Requirements

* No third-party SaaS usage
* All data stored locally
* OAuth-based secure authentication
* No email data stored externally
* Credentials not exposed in frontend

---

# ⚡ 5. Performance Requirements

* Scan must complete within reasonable time (<10 seconds typical inbox)
* Must handle up to 500 emails per scan
* UI should update instantly after scan

---

# 📂 6. Data Storage Requirements

System must store:

* Invite logs
* User settings

Stored locally in structured format (e.g., JSON or database).

---

# 🎨 7. UI Requirements

* Clean dashboard layout
* Responsive table
* Clear status indicators (color-coded)
* Simple navigation:

  * Dashboard
  * Settings
* No complex UI animations required

---

# 🚫 8. Out of Scope (For Now)

* Outlook support
* Background auto polling
* AI-based time extraction
* Auto-accepting calendar invites
* Multi-user support
* Cloud deployment

---

# 📈 9. Future Enhancements (Optional)

* Conflict detection
* Desktop notifications
* Export logs (CSV)
* Filter by sender
* Search invites
* Tagging system
* Chrome extension companion

---

# 🏁 Final Feature Summary

Your product will:

✅ Manually scan emails by time range
✅ Detect invite links
✅ Log invite details
✅ Show dashboard
✅ Allow manual calendar add
✅ Prevent duplicates
✅ Provide configuration settings
✅ Run locally
✅ Keep data private

---

If you'd like next, I can convert this into:

* A formal SRS document
* A Jira-ready backlog
* User stories format
* Or MVP vs Phase-2 breakdown

Tell me what you prefer 👇
