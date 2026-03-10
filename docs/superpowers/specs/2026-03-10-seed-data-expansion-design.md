# Seed Data Expansion Design

**Date:** 2026-03-10
**Status:** Approved

## Goal

Expand the existing `scripts/seed-users.js` to include more users, sample job postings, applications, and conversations — providing a realistic dataset for development and testing.

## Scope

### Expanded Users

**2 more diagnostic jobseekers (8 total):**
- Overqualified worker — post-grad, 10+ years experience, applying for entry-level (tests career guidance)
- Career changer mid-registration — stopped at step 4, has personal info/preferences but no education/skills

**1 more employer (5 total):**
- SME bakery/food business, pending verification

**2 more individuals (5 total):**
- Student exploring career options pre-graduation
- OFW returnee seeking reintegration programs

### Job Postings (10 total)

| Employer | Postings |
|----------|----------|
| San Carlos Cooperative | Loan Officer (full-time), Bookkeeper (full-time) |
| PESO San Carlos | Administrative Aide (full-time), Community Facilitator (contract) |
| Greenfields BPO | CSR (full-time), Data Entry Specialist (full-time), Team Leader (full-time) |
| Crystal Sugar Milling | Heavy Equipment Operator (full-time), Electrician (full-time), Seasonal Farm Worker (temporary) |

Mix of open/filled statuses, varied salary ranges and education requirements.

### Applications (~10)

| Applicant | Job | Status |
|-----------|-----|--------|
| Maria Santos | BPO CSR | pending |
| Anna Reyes | Coop Bookkeeper | shortlisted |
| Pedro Mendoza | Sugar Mill Heavy Equipment Operator | pending |
| Mark Aquino | Sugar Mill Electrician | hired |
| Grace Villanueva | BPO Team Leader | rejected |
| Rosa Lim | Coop Loan Officer | shortlisted |
| Angelica Torres | BPO CSR | pending |
| Patricia Soriano | BPO CSR | pending |
| Dennis Roque | Sugar Mill Farm Worker | pending |
| Juan Dela Cruz | Sugar Mill Electrician | shortlisted |

### Conversations (4)

- Mark Aquino <-> Crystal Sugar HR — hired congratulations
- Anna Reyes <-> San Carlos Coop HR — shortlisting follow-up
- Rosa Lim <-> San Carlos Coop HR — interview scheduling
- Greenfields BPO <-> Maria Santos — application questions

Each with 2-4 messages.

## Implementation Approach

Update `scripts/seed-users.js` in place:
1. Add new user data to existing arrays
2. Add `jobPostings` array with 10 entries
3. Add `applications` array referencing users and jobs by email/title
4. Add `conversations` and `messages` arrays
5. Extend `seed()` function to create jobs, applications, conversations, and messages in order (respecting FK dependencies)
6. Track created user IDs by email to wire up FKs at runtime

## Constraints

- All users share password `Test1234!`
- Script is idempotent — skips existing users
- Job/application/conversation seeding checks for existing data to avoid duplicates
- Conversation IDs follow sorted `uid1_uid2` format
- Script runs manually: `node scripts/seed-users.js`
