# EmailJS Setup Cheatsheet

Use this cheatsheet to quickly copy-paste template settings into your EmailJS dashboard.

## 1. Jobseeker Registration
**Template ID:** `template_jobseeker_registration`  
**Subject:** `Welcome to PESO Connect - Registration Received`  
**Content:**
```html
To: {{to_email}}
Subject: {{subject}}

{{{message}}}
```

## 2. Jobseeker Verified
**Template ID:** `template_jobseeker_verified`  
**Subject:** `Your PESO Connect Account Has Been Verified!`  
**Content:**
```html
To: {{to_email}}
Subject: {{subject}}

{{{message}}}
```

## 3. Jobseeker Rejected
**Template ID:** `template_jobseeker_rejected`  
**Subject:** `PESO Connect Registration Update`  
**Content:**
```html
To: {{to_email}}
Subject: {{subject}}

{{{message}}}
```

## 4. Employer Registration
**Template ID:** `template_employer_registration`  
**Subject:** `PESO Connect - Employer Registration Received`  
**Content:**
```html
To: {{to_email}}
Subject: {{subject}}

{{{message}}}
```

## 5. Employer Approved
**Template ID:** `template_employer_approved`  
**Subject:** `Your PESO Connect Employer Account is Approved!`  
**Content:**
```html
To: {{to_email}}
Subject: {{subject}}

{{{message}}}
```

## 6. Employer Rejected
**Template ID:** `template_employer_rejected`  
**Subject:** `PESO Connect Employer Registration Update`  
**Content:**
```html
To: {{to_email}}
Subject: {{subject}}

{{{message}}}
```

---

## Important Notes
- **Triple Braces:** Notice the `{{{message}}}` has **3 braces**. This is critical for rendering HTML correctness (prevents escaping).
- **Service ID:** Copy your Service ID from the "Email Services" tab.
- **Public Key:** Copy your Public Key from the "Account" > "General" tab.
- **.env Setup:**
  ```env
  VITE_EMAILJS_SERVICE_ID=your_service_id_here
  VITE_EMAILJS_PUBLIC_KEY=your_public_key_here
  VITE_EMAIL_NOTIFICATIONS_ENABLED=true
  ```
