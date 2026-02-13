Perfect 👍
Here is your **cleaned & structured requirement document** with **ALL AI-based features removed**.

Now this is a pure **Rule-Based Gmail Intelligent Organizer** (No drafting, No AI scoring, No ML).

---

# ✅ Gmail Intelligent Organizer – Final Requirements (No AI)

---

# 🎯 Objective

Automatically organize recruiter emails inside Gmail using:

* Rule-based detection
* Smart labeling
* Portal identification
* Company grouping
* Priority tagging
* Date range filtering

No email drafting. No AI scoring. No machine learning.

---

# 1️⃣ Gmail API Integration (Mandatory)

Use **Gmail API** to:

* Read emails
* Fetch metadata (from, subject, body, attachments, headers)
* Apply/remove labels
* Mark as read/unread
* Archive emails
* Filter emails by date range

### Required Gmail API Capabilities

* `users.messages.list`
* `users.messages.get`
* `users.messages.modify`
* `users.labels.create`
* `users.labels.list`

---

# 2️⃣ Recruiter Email Detection Engine (Rule-Based Only)

Pure keyword-based detection.

## A. Sender-Based Detection

Match sender email:

```
hr@
talent@
recruitment@
careers@
jobs@
hiring@
```

## B. Subject-Based Keywords

```
Job Opportunity
We are hiring
Immediate requirement
Position for
Hiring for
Opening for
```

## C. Body-Based Keywords

```
JD attached
CTC
Notice period
Experience required
Immediate joiner
Job description
```

If any combination matches → Apply:

```
Recruiter/Detected
```

---

# 3️⃣ Smart Label System

Pre-create structured labels:

```
Recruiter/
    LinkedIn
    Naukri
    Indeed
    Company Direct
    Consultancy
    Other

Status/
    New
    Shortlisted
    Not Relevant
    Follow Up Later
    Interview Scheduled
    Pending Action

Priority/
    High
    Medium
    Low

Company/
```

System must support:

* Multiple labels per email
* Nested label structure

Example:

```
Recruiter/Naukri + Status/New + Priority/High
```

---

# 4️⃣ Auto Source Detection (Job Portal Identification)

Detect job portal using sender domain or headers.

## Domain-Based Detection

| Domain       | Label              |
| ------------ | ------------------ |
| linkedin.com | Recruiter/LinkedIn |
| naukri.com   | Recruiter/Naukri   |
| indeed.com   | Recruiter/Indeed   |

If unknown recruiter domain:

```
Recruiter/Consultancy
```

If company domain:

```
Recruiter/Company Direct
```

---

# 5️⃣ Company Name Extraction (Rule-Based)

Extract company name using:

* Subject patterns:
  `Hiring for <Company>`
  `Opening at <Company>`

* Body pattern:
  `Company: <Name>`

After extraction:

Create dynamic label:

```
Company/<ExtractedCompanyName>
```

If label does not exist → create via Gmail API.

---

# 6️⃣ Priority Classification (Rule-Based Only)

No AI scoring. Only rule-based logic.

## High Priority Conditions

* Location matches your preferred location
* Salary mentioned
* Role matches your primary tech stack
* "Immediate joiner" keyword

Apply:

```
Priority/High
```

## Medium Priority

* Relevant tech but no salary
  Apply:

```
Priority/Medium
```

## Low Priority

* Different tech stack
* Internship for experienced profile
* Completely unrelated domain

Apply:

```
Priority/Low
```

---

# 7️⃣ Attachment Detection

If email contains attachment:

Apply:

```
Has Attachment
```

If subject contains:

```
Interview
Schedule
Round
Zoom link
Teams link
```

Apply:

```
Status/Interview Scheduled
```

---

# 8️⃣ Duplicate Job Detection (Rule-Based)

Detect duplicates using:

* Same Subject
* Same Company
* Same Role
* Same JD filename

If duplicate found:

Apply:

```
Duplicate
```

---

# 9️⃣ Aging / Follow-Up Tracking

System should:

* Check unread recruiter emails
* If older than 3 days → apply:

```
Status/Pending Action
```

---

# 🔟 Date Range Filter (Required Feature)

System must support processing emails:

* Last 24 hours
* Last 7 days
* Last 30 days
* Custom date range (startDate – endDate)

Use Gmail query format:

```
after:YYYY/MM/DD
before:YYYY/MM/DD
```

Example:

```
after:2026/02/01 before:2026/02/10
```

---

# 🏗️ Final MVP Scope

Minimum implementation:

1. Gmail API integration
2. Recruiter detection (rule-based)
3. Portal detection
4. Smart label system
5. Company extraction
6. Priority tagging (rule-based)
7. Date range filtering

That’s enough for a powerful recruiter email organizer.

---

# 🏆 Final Result

Your inbox becomes:

* Automatically categorized
* Portal-wise separated
* Company-wise grouped
* Priority sorted
* Duplicate-free
* Action trackable

---

If you want next, I can provide:

* ✅ Spring Boot architecture
* ✅ Database schema
* ✅ Exact Gmail query builder logic
* ✅ Label creation strategy
* ✅ Complete system flow diagram
