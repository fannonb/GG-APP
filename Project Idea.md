1.1  What is GG’APP?
GG’APP is a mobile-first Progressive Web Application (PWA) that acts as a trusted bridge between patients, verified healthcare service providers, and credit finance partners. The platform enables patients in underserved markets to access quality medical care today — funded by approved credit — while giving healthcare providers a reliable, frictionless payment mechanism backed by institutional finance.

1.2  Core Value Propositions
•	Patients access subsidized healthcare through a vetted network of service providers without out-of-pocket payments at the point of service.
•	Credit finance partners disburse funds only for services rendered by approved providers to qualified patients, reducing fraud and credit risk.
•	Service providers receive guaranteed, timely payment directly to their registered payment account after patient-authorized invoice approval.
•	The platform admin acts as the quality and compliance gatekeeper — verifying providers, reviewing invoices, and managing disputes.

1.3  Key User Groups
Field / Item	Details
Patients / Clients	Individuals who register, apply for credit, find healthcare providers, book appointments, and authorize invoice payments via their secured PIN.
Service Providers (SPs)	Hospitals, pharmacies, clinics, laboratories, and radiology centres. They onboard, receive appointment requests, deliver care, and upload invoices.
Credit Finance Partner	The institutional lender whose core banking system is integrated via API. It holds and disburses credit to SPs upon patient PIN authorization.
Platform Administrator	The GG’APP operations team who approve SP registrations, verify medical licenses, review invoices, and manage platform health.

1.4  High-Level Transaction Flow
The diagram below summarises the end-to-end lifecycle of a single credit-funded healthcare transaction:

Patient
Registers & applies for credit	→	Finance Partner
Approves credit & loads wallet	→	Patient
Books & attends appointment	→	SP uploads Invoice
Admin reviews, patient gets notified	→	Patient enters PIN ×3
API triggers instant fund release	→	SP paid
 
02  Patient Journey
End-to-end flow from registration through to payment authorization

2.1  Registration & Onboarding

01	Account Sign-Up
The patient navigates to the GG’APP registration screen and completes the following fields:
Field / Item	Details
Username	Unique display handle. Must be alphanumeric, 4–20 characters.
Email Address	Primary contact for notifications and account recovery.
Phone Number	Used for contact purposes and two-factor authentication.
National ID Number	Used for KYC identity verification and credit eligibility checks.
Password	Minimum 8 characters. Strength indicator shown. Confirm password field required.
Country	Dropdown — determines available services, currency, and applicable regulations.
Terms & Conditions	Mandatory checkbox. Must be accepted before form submission is enabled.

📱 Google Auth note:  Users on Android may sign up via Google Auth. Upon first login, a mandatory pop-up captures Phone Number, National ID, and Country before granting dashboard access.


02	Email Verification
After form submission, the system dispatches a verification email to the registered address containing a unique confirmation link valid for 24 hours. The patient clicks the link, which:
•	Activates the account and marks it as verified in the system.
•	Redirects the patient to the login page with a success confirmation banner.
•	If the link expires, a ‘Resend Verification Email’ option is available on the login screen.

⚠️  Why email verification matters:  Without verification, malicious actors can register using another person’s email address, permanently blocking the real owner from creating an account. It also prevents bot-driven mass registrations that could overwhelm the platform.


03	Login & Session Management
The patient logs in using their registered email/username and password, or via Google Auth. On successful authentication:
•	The patient is directed to the main home dashboard.
•	A ‘Remember Me’ option extends the active session for up to 30 days before requiring re-authentication.
•	A ‘Forgot Password’ flow is available via email-based reset link.
•	Failed login attempts are rate-limited; accounts lock after 5 consecutive failures and require an email-based unlock.

2.2  Home Dashboard
Upon login, the patient lands on a personalised home dashboard presenting the following features:

Field / Item	Details
Credit Wallet Balance	Displays the patient’s available credit balance loaded by the finance partner. Reflects real-time data pulled from the finance partner’s core banking API. Tapping the balance shows a credit summary (approved limit, utilised, available).
Apply for Credit	Opens the credit application form. Submitted applications are forwarded to both the platform admin and the credit finance partner via API and email.
Find Service	Routes the patient to a service category selector: Pharmacy, Laboratory, Doctor, Radiology, Hospital.
Payment	Access to transaction history, raised invoices, loan repayment tracking, and dependant account management.
Recent Transactions	A widget showing the 3–5 most recent account transactions for at-a-glance financial awareness.
News Feed	Live health news curated from WHO, MoH, CDC, and other trusted global health bodies.
Profile	Patient personal details: name, email, National ID, location, and profile photo management.

2.3  Credit Application Flow

01	Initiate Application
The patient taps ‘Apply for Credit’. A disclaimer screen is shown, clearly stating that credit is processed and held by a third-party financial partner, and that the patient consents to a credit check.

02	Fill Application Form
The patient completes the credit application with the following required fields:
•	Employment status (employed, self-employed, unemployed, student)
•	Monthly income (numeric field, in local currency)
•	Loan amount requested
•	Consent checkbox for credit bureau / credit check

03	Submission & Forwarding
On submission, the application is simultaneously:
•	Forwarded to the platform admin email for oversight and record-keeping.
•	Transmitted to the credit finance partner’s system via API integration for processing.
•	Assigned a unique application reference number shown to the patient.

04	Status Tracking
The patient tracks their application status in real time within the Payment section of the dashboard. The status lifecycle is:
Field / Item	Details
Pending	Application submitted and queued for review by the finance partner.
Under Review	Finance partner is actively assessing the application.
Approved	Credit granted. Wallet balance is updated via API from the finance partner’s core banking system. A repayment schedule is generated and displayed.
Declined	Application rejected. A reason is provided where possible. Patient may re-apply after 30 days.


05	Credit Wallet Loading
Upon approval, the finance partner’s core banking system transmits the approved credit amount to the GG’APP platform via API. This triggers:
•	The patient’s credit wallet balance updates to reflect the approved amount on their dashboard.
•	An in-app notification and email confirmation are sent to the patient.
•	The full repayment schedule (amounts, due dates, interest breakdown) is displayed in the Loan Repayment sub-section.

💳  Important:  The credit balance is not transferable to a personal bank account. It can only be used to pay GG’APP-approved service providers through the invoice payment flow.


2.4  Finding a Service Provider

01	Select Service Category
The patient taps ‘Find Service’. Six category tiles are displayed with distinct icons: Pharmacy, Laboratory, Doctor, Radiology, Hospital, and Clinic.

02	Browse Approved Providers
On selecting a category, a list of platform-verified service providers is displayed. Each provider card shows:
•	Provider name and logo
•	Star rating (from patient reviews)
•	Distance from the patient’s current location
•	Open / Closed status based on registered operating hours

03	View Provider Profile
Tapping a provider opens their full profile, which includes:
•	Services offered and specialties
•	Operating hours (per day)
•	Contact information
•	Verified patient reviews

04	Tap ‘Engage’
The patient taps the ‘Engage’ button to initiate a booking or service request with the selected provider.

05	Fill Engagement Form
The engagement form captures:
•	Request description (free text)
•	File or image attachments (e.g. prescription, lab results, referral letter)
•	Preferred appointment date (date picker)
•	Preferred appointment time (time picker)

06	Confirmation & Notification
On submission:
•	The patient receives an in-app confirmation message and an email notification.
•	The service provider simultaneously receives an in-app alert and email notification containing all request details and attachments.
•	The booking status is set to ‘Pending Confirmation’ in the patient’s appointment history.

2.5  Invoice Review & Payment Authorization
This is the most security-critical flow in the entire platform. The triple-PIN mechanism constitutes the patient’s legally binding authorization of payment and triggers an immediate real-time API call to the finance partner to disburse funds.

01	Invoice Notification
After the service provider submits an invoice and the admin approves it, the patient receives:
•	An in-app push notification summarising the invoice amount and service provider name.
•	An email containing the invoice details and a link to review it within the app.

02	Invoice Review Screen
Within the app, the patient opens the invoice and sees a full breakdown:
Field / Item	Details
Service Provider	Name and registered details of the SP who rendered the service.
Service(s) Rendered	Itemised list of treatments, medications, or procedures billed.
Invoice Date	Date the invoice was raised by the SP.
Invoice Amount	Total amount to be debited from the patient’s credit wallet.
Invoice Document	Downloadable PDF copy of the original invoice uploaded by the SP.
Available Credit Balance	Patient’s current wallet balance shown for transparency before authorization.

⚠️  Dispute option:  Before proceeding to payment, the patient has the option to ‘Flag a Dispute’. This escalates the invoice to the admin for review and pauses the payment clock. The patient must provide a written reason for the dispute.


03	Triple-PIN Payment Authorization
If the invoice is correct, the patient proceeds to authorize payment. This is a deliberate three-step confirmation designed to eliminate accidental authorization and establish irrefutable patient consent:
Field / Item	Details
PIN Entry 1	Patient enters their 4–6 digit secret payment PIN. The system validates the PIN against the stored hash. If incorrect, the patient is warned (2 attempts remaining).
PIN Entry 2	Patient re-enters the PIN. A prompt states: ‘Second confirmation — please re-enter your payment PIN.’ Same validation applies.
PIN Entry 3	Final confirmation prompt: ‘You are about to authorize a payment of [amount] to [SP name]. This action is irreversible. Enter your PIN to confirm.’ On correct entry, the authorization is triggered.
Failed PIN (3x)	If the PIN is entered incorrectly three consecutive times across all attempts, the payment session is locked for 30 minutes and the patient receives an alert. Admin is notified of the failed authorization attempt.


04	Real-Time Fund Disbursement
On successful triple-PIN entry, the following sequence executes in real time:
•	GG’APP transmits a signed payment authorization payload to the finance partner’s API, including: patient ID, invoice reference, SP payment details (M-Pesa Paybill / bank account), and authorized amount.
•	The finance partner’s core banking system processes the disbursement and sends a confirmation callback to GG’APP.
•	The patient’s credit wallet balance is reduced by the invoice amount.
•	The SP’s payment is credited to their registered account (M-Pesa Paybill or bank account number).
•	A payment receipt notification is sent to both the patient and the service provider.
•	The transaction is recorded in the patient’s Transaction History and the SP’s Payments Summary.

✅  Security note:  The authorization payload is signed with HMAC-SHA256 using a shared secret between GG’APP and the finance partner. All payment API calls are made over TLS 1.3. The PIN is never transmitted — only a server-side hash comparison is performed.


03  Service Provider Journey
From onboarding and admin verification to appointment management and invoice upload

3.1  Registration

01	Service Provider Sign-Up
The SP navigates to the dedicated SP registration page and fills in the following fields:
Field / Item	Details
Practice Name	Official registered name of the healthcare facility.
Primary Email	Main login and notification email. Must be a valid domain-based address.
Secondary Email (optional)	CC’d on appointment and invoice-related emails.
Service Phone Number	Contact number displayed on the public provider profile.
Medical License Number	Verified against the relevant regulatory body during admin review.
Password	Minimum 8 characters with a real-time strength indicator.
Country of Operation	Determines applicable medical regulations and payment currency.
Service Type(s)	Multi-select: Hospital, Pharmacy, Laboratory, Clinic, General Practitioner, Specialist.
Payment Method	The account to receive patient payments: M-Pesa Paybill number or bank account details.
Opening Times	Per-day schedule with open/close times and a ‘Closed’ day toggle.
Practice Logo	Image upload: JPEG or PNG, maximum 2 MB.
Medical Licenses	Upload supporting license documents in PDF or image format.


02	Admin Review & Approval (2–3 Business Days)
After submission, the SP application enters a ‘Pending’ state. The admin team:
•	Reviews all submitted documents and verifies the medical license number against the relevant national regulatory body.
•	Can Approve, Request Additional Information, or Reject the application.
•	Each status change triggers an automated email notification to the SP with a clear explanation.

📋  SLA commitment:  The SP receives an automated acknowledgement email upon submission, including their application reference number and an expected review window of 2–3 business days.


03	Activation & First Login
Upon approval, the SP receives a confirmation email with an account activation link. Clicking the link:
•	Activates the SP account and makes their profile visible on the platform.
•	Redirects to the login page with a welcome confirmation.
•	On login, the SP is prompted to complete their profile (upload photos, confirm operating hours) if not already done.

3.2  SP Dashboard Features

3.2.1  Appointment Requests
All incoming engagement requests from patients are displayed here. Each request card shows:
•	Patient name and contact details
•	Service requested and written description
•	Any attachments submitted by the patient (prescriptions, results, referral letters)
•	Preferred date and time
•	Current status: New, Confirmed, Completed, or Cancelled

The SP can accept the request, propose a reschedule, or decline. Each action triggers an automatic email and in-app notification to the patient. An optional calendar view is available for the SP to see their full daily and weekly schedule at a glance.

3.2.2  Patient History
A dedicated tab displays returning patient records — allowing the SP to review past engagements, previous diagnoses, and historical invoices for continuity of care.

3.2.3  Payments Summary
The payments page provides a complete financial overview for the SP:
•	All earnings listed in chronological order with status (Pending, Paid).
•	Paid invoices with payment dates and transaction reference numbers.
•	Running totals for monthly and all-time earnings.

3.3  Post-Appointment Workflow

01	Treatment / Medication Summary
The SP completes a structured consultation notes form documenting:
•	Diagnosis and clinical findings
•	Prescribed medications or treatments
•	Follow-up instructions for the patient
This summary is visible to the patient in their appointment history.

02	Internal Quality Feedback
The SP submits internal notes or quality observations about the appointment. This information is not visible to the patient and is used solely for platform quality review and compliance monitoring by the admin team.

03	Invoice Upload
The SP raises an invoice for the completed appointment:
•	Enters the invoice amount in the local currency.
•	Selects the service(s) rendered from a predefined list.
•	Uploads the invoice document as a PDF.
•	Submits the invoice to the platform admin for review.

📌  Note:  The invoice is not sent to the patient until the admin reviews and approves it. This step protects patients from being billed for incorrect or fraudulent amounts.


04	Payment Receipt
Once the patient completes the triple-PIN authorization:
•	The finance partner disburses the invoice amount directly to the SP’s registered payment account (M-Pesa Paybill or bank account) in real time.
•	The SP receives an in-app notification and email confirming the payment with a transaction reference number.
•	The paid invoice is logged in the SP’s Payments Summary.
 

