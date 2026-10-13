# 🏛️ 1Line OS — Data Model & Architecture Specification (Schema 5.1)

> **Document Type:** System Architecture & Data Model Reference  
> **Target Audience:** Engineering, Product, Operations, and Management  
> **Status:** Production-Ready (Verified on Firebase Emulators & Node.js Test Runner)  
> **Compliance:** Egyptian Personal Data Protection Law No. 151/2020  

---

## 1. Overview & Architecture Philosophy

1Line OS transforms the repository from a reactive single-broker tool into an institutional, multi-tenant enterprise operating system designed to replace Odoo. It is specifically tailored to 1Line's dual revenue engines:
1. **Sohag Verified Resales:** The property owner is Client #1. Mandatory document verification gates (Gates 1, 2, and 3), comparative market valuation (CMA $\pm 5\%$), and stale inventory alerts.
2. **Cairo Developer Hub (3–5 developers):** Zero-tolerance exclusion criteria, 5-criterion scorecards, mandatory advance client registration with the developer, and the Founder's monthly "Cairo Week".

---

## 2. Core Entities (Collections & Data Structures)

### 1. `persons` (Unified Contact Entity)
Consolidates all human actors: Buyers, Sellers, Investors, Cairo Developers, External Brokers, and Partners.
- **Path:** `/persons/{personId}`
- **Security:** Scoped by team desk (`assignedTo`) + pool (`Unassigned`). PII (phone/email) is strictly isolated in `/person_contacts/{personId}`.
- **Key Fields:**
  - `name`: string (Min 2 chars)
  - `types`: array `['buyer', 'seller', 'investor', 'developer', 'broker', 'partner']`
  - `source`: string (Mandatory: `'website'`, `'whatsapp'`, `'manual'`, `'facebook_ads'`, `'referral'`, `'founder_content'`)
  - `howDidYouHearAboutUs`: string (Tracks founder content attribution)
  - `consent`: boolean (**Mandatory: true** per Egyptian Law 151/2020)
  - `consentDate`: ISO 8601 string / serverTimestamp
  - `segment`: `'VIP' | 'A' | 'B' | 'C'`
  - `city`: string (Default: `'سوهاج'`)
  - `sector`: string (e.g., `'شرق'`, `'سوهاج الجديدة'`, `'القاهرة'`)
  - `assignedTo`: Desk name (e.g. `'Sales Team A'`, `'Sales Team B'`, `'Unassigned'`)
  - `status`: `'new' | 'qualified' | 'contacted' | 'active' | 'archived'`

### 2. `BuyerProfile` (Qualification Engine)
Embedded or linked sub-profile created upon completing the 5 mandatory qualification questions:
- **Budget Range:** `budgetMin` and `budgetMax` (EGP)
- **Payment Method:** `'cash' | 'installments' | 'mortgage'`
- **Target Geography:** `targetCities`, `targetSectors`, `targetNeighborhoods`
- **Property Specifications:** `propertyTypes`, `areaMin`, `areaMax`, `roomsMin`
- **Purpose:** `'residence' | 'investment' | 'clinic' | 'office' | 'commercial'`
- **Decision Timeline:** `'immediate' | '1_month' | '3_months' | 'exploring'`
- **Decision Makers:** string (e.g., self, family, partners)
- **Cairo Interest:** boolean
- **Rejected Options:** array of `{ propertyId, reason, date }` (feeds reverse matching to prevent showing disliked listings)

### 3. `properties` (Sohag Resale & Inventory)
- **Path:** `/properties/{propertyId}`
- **Code Syntax:** `SOH-<SECTOR>-<SEQUENCE>` (e.g., `SOH-E-001`, `SOH-NS-014`)
- **Classification Grades:**
  - `Grade A`: All Gate 1 checks passed ($\ge 5$ photos, verified deed, clear license).
  - `Grade B`: Minor non-fatal pending item with target resolution date.
  - `Grade C`: Substantive missing item (reviewed monthly; asking price $> 15\%$ above CMA).
  - `Grade D`: Active red flag (stop immediately and refer to company lawyer).
- **The Three Gates:**
  - **Gate 1 (Inventory Intake):** Seller identity matches deed, valid power of attorney, inheritance chain and heirs consent, recognized deed type, continuous contract chain, area survey match, building license and reconciliation.
  - **Gate 2 (Before Written Offer):** Reconfirmed price and availability, negative encumbrance certificate, written property memo, buyer informed in writing of deed type.
  - **Gate 3 (Before Signing):** Original documents inspected by lawyer, contract drafted by company lawyer, documented payment method, signed commission agreement, executed price recorded.
- **Comparative Valuation (CMA):** 3–5 comparable properties in the same sector/neighborhood; generates price/sqm range ($\pm 5\%$).

### 4. `developers` & `projects` (Cairo Developer Hub)
- **Exclusion Criteria (Zero Tolerance):**
  - Licensed project and clear land allocation.
  - At least one prior project delivered on time.
  - Written commission contract with 1Line advance client registration.
  - No material price fluctuation clauses (فروق أسعار).
  - No cashback gimmicks.
- **Scorecard (Weighted):**
  - Delivery Track Record: 30%
  - Construction vs Schedule: 20%
  - Product Fit for Sohag Clients: 20%
  - Commission & Payment Regularity: 15%
  - Market Reputation: 15%
  - **Thresholds:** $\ge 3.5$ Trial partnership (6 months); $2.5 - 3.5$ Review (3 months); $< 2.5$ Rejected.

### 5. `nominations` (3-Tier Written Nomination Pack)
Each qualified buyer receives 3 options with written rationale within 48 hours:
1. **Closest (الأقرب):** Exact match for area, budget, size, and purpose.
2. **Value (القيمة):** Larger or better priced with an explicit calculated trade-off.
3. **Challenge (التحدي):** $\le 10\%$ above budget or a vetted Cairo unit solving a fundamental need.

### 6. `search_requests` (طلب بحث موجّه)
Opened when no 3 Grade-A matches exist in current inventory.
- Assignee: Inventory Desk (Engy)
- SLA: Strict 7-day countdown
- Output: Sourced properties inspected, verified through Gate 1, and presented to sales.

### 7. `tasks` (Inter-Departmental Handoffs 1–10)
Translates the Playbook handoffs table into automated tasks with countdown timers and automated multi-tier escalation (Manager at $1\times$ SLA, Founder at $2\times$ SLA).

### 8. `deals` & Financials
- **Executed Price:** Recorded on every deal.
- **Commission Components:** Buyer share, seller share, external broker, company gross, partner share, expenses.
- **Incentive Calculation:** Sales agents receive **5,000 EGP per 1,000,000 EGP** of deal value **strictly upon collection** (`Deal.collectedAmount`), not upon contract signing.

---

## 3. Security Rules Matrix Summary

| Collection | Read Scope | Create Scope | Update Scope | Delete Scope |
|---|---|---|---|---|
| `persons` | Desk agent (own desk + pool) / Managers (all) | Staff | Desk agent (own desk) / Managers | Super Admin only |
| `person_contacts` | `ld.phone` holders for scoped desk | Desk agent / Managers | Desk agent / Managers | Super Admin only |
| `properties` | Public / Staff | `isInventoryEditor()` | `isInventoryEditor()` | `inv.delete` or Admin |
| `developers` | Staff | Admin / Manager / Inventory | Admin / Manager / Inventory | Super Admin only |
| `search_requests` | Staff | `ld.edit` (Sales) | `ld.edit` or `inv.edit` | Super Admin only |
| `nominations` | Staff | `ld.edit` or `inv.edit` | `ld.edit` or `inv.edit` | Super Admin only |
| `tasks` | Staff | Staff | Staff | Super Admin only |
| `deals` | Desk agent (own desk) / `deal.all` | `deal.edit` for own desk / Managers | `deal.edit` for own desk / Managers | Super Admin only |
| `commission_invoices` | Finance / Managers / Admin | Finance (`fin`) / Admin | Finance (`fin`) / Admin | Finance / Admin |
| `audit_logs` | Super Admin only | Staff (`validAuditEntry`) | ❌ Blocked | ❌ Blocked |

---
**Verified on Branch `feat/1line-os-5.1-schema-and-rules`**
