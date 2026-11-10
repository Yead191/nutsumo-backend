# Nutsumo Backend – Conversation & Architecture Export

> **Project:** Nutsumo (nutsumo-backend)  
> **Conversation ID:** `a4fdbabd-8a51-451f-b952-5f66f9c90c39`  
> **Export Date:** 2026-11-10  
> **System Transcript Logs:**  
> - `C:\Users\yead1\.gemini\antigravity\brain\a4fdbabd-8a51-451f-b952-5f66f9c90c39\.system_generated\logs\transcript.jsonl`  
> - `C:\Users\yead1\.gemini\antigravity\brain\a4fdbabd-8a51-451f-b952-5f66f9c90c39\.system_generated\logs\transcript_full.jsonl`

---

## Table of Contents
1. [Session Overview](#1-session-overview)
2. [Nutsumo Core Requirements & Escrow Goal](#2-nutsumo-core-requirements--escrow-goal)
3. [Large-Scale Marketplace Comparison (Upwork / Fiverr vs Nutsumo)](#3-large-scale-marketplace-comparison-upwork--fiverr-vs-nutsumo)
4. [New Implementations & Architectural Enhancements](#4-new-implementations--architectural-enhancements)
   - [A. Multipart/FormData Delivery Proof Upload](#a-multipartformdata-delivery-proof-upload)
   - [B. Dedicated Review & Rating Engine (`src/app/modules/review`)](#b-dedicated-review--rating-engine-srcappmodulesreview)
   - [C. Revision Request Workflow (`REVISION_REQUESTED`)](#c-revision-request-workflow-revision_requested)
   - [D. Dispute Handling Mechanism (`DISPUTED`)](#d-dispute-handling-mechanism-disputed)
   - [E. Cancellation & Escrow Refund Architecture](#e-cancellation--escrow-refund-architecture)
5. [Complete API Endpoints Reference](#5-complete-api-endpoints-reference)
6. [Summary of Modified and Created Files](#6-summary-of-modified-and-created-files)

---

## 1. Session Overview

In this session, the user requested:
1. **Verification of Project Goals:** Confirmation of whether the assistant remembers the project requirements and goals of **Nutsumo**.
2. **Large-Scale Architecture Review:** An evaluation of how enterprise/large-scale service marketplaces (such as Upwork, Fiverr, TaskRabbit) handle booking lifecycles compared to Nutsumo.
3. **Multipart/FormData Delivery Proof:** Upgrading the delivery endpoint to allow artisans to upload real image proofs using `fileUploadHandler`.
4. **Decoupled Review & Rating Module:** Removing flat rating fields from the booking model and creating a dedicated, scalable `Review` module with aggregation, rating distribution, job linkage, and artisan reply capabilities.
5. **Export Chat History:** Exporting this entire session's context, discussions, and decisions into a permanent Markdown document.

---

## 2. Nutsumo Core Requirements & Escrow Goal

Nutsumo is an **On-Demand Service Marketplace** connecting **Customers (Service Seekers)** with **Verified Artisans / Pros (Service Providers)** using an **Escrow Protection Model** (similar to Upwork / Fiverr):

### 8-Step Escrow Lifecycle:
1. **Job Creation:** Customer creates a service request (`OPEN`).
2. **Quotation / Bidding:** Artisans submit estimated price and timeline (`PENDING`).
3. **Acceptance & Booking:** Customer accepts a quotation -> Booking is created in status `AWAITING_PAYMENT` with Platform Fee (10%) and Artisan Net Payout calculated.
4. **Escrow Funding (Stripe):** Customer pays upfront -> Funds held safely in platform escrow (`ESCROW_HELD`), booking marked `CONFIRMED`.
5. **Execution & Delivery:** Artisan starts work (`IN_PROGRESS`) and delivers work with notes & photo proofs (`DELIVERED`).
6. **Customer Inspection:** Customer verifies work -> Confirms completion (`COMPLETED`) and leaves a review.
7. **Admin Approval:** Admin reviews completed booking and approves payout (`APPROVED`).
8. **Payout Release:** Platform deducts fee and releases net funds to the Artisan (`RELEASED`).

---

## 3. Large-Scale Marketplace Comparison (Upwork / Fiverr vs Nutsumo)

| Pillar / Feature | Enterprise Standard (Upwork / Fiverr / Airbnb) | Nutsumo Initial State | Upgraded State (Current) |
|---|---|---|---|
| **Escrow Security** | Funds locked in escrow before work begins; released upon customer satisfaction. | Implemented via Stripe Checkout & Webhook (`ESCROW_HELD`). | Maintained & strengthened. |
| **Delivery Proof** | Multipart/form-data upload of real photos/documents directly from camera or device. | Only accepted raw JSON strings of URLs. | **Implemented with `fileUploadHandler` + FormData support.** |
| **Review / Revision Gateway** | Client has 3 choices upon delivery: Accept, Request Revision, or Open Dispute. | Only accept endpoint was available. | **Added `request-revision` and `dispute` workflows.** |
| **Reputation / Review Engine** | Separate entity with rating distribution (5★ to 1★), job traceability, and provider reply. | Flat fields (`customerRating`, `customerFeedback`) on `Booking`. | **Full decoupled `Review` module with aggregation and replies.** |
| **Cancellation & Refund** | Formal escrow refund to customer if cancelled before work starts. | No dedicated booking cancellation/refund handler. | **Structured escrow refund and job re-opening policy.** |

---

## 4. New Implementations & Architectural Enhancements

### A. Multipart/FormData Delivery Proof Upload
- **Route:** `PATCH /api/v1/booking/:id/deliver`
- **Middleware:** `fileUploadHandler([{ name: 'deliveryProof', maxCount: 10 }, { name: 'images', maxCount: 10 }])` + `parseFormData`.
- **Controller:** Uses `getMultipleFilesPath` to extract uploaded file paths and inject them into `booking.deliveryProof`.
- **Validation:** Accepts both form-data uploads and JSON string arrays for complete backward and forward compatibility.

### B. Dedicated Review & Rating Engine (`src/app/modules/review`)
A dedicated module was introduced with the following schema:
- `booking`: Unique reference to the Booking (prevents duplicate reviews).
- `job`: Reference to the specific Job for full transparency and traceability.
- `customer` & `artisan`: User references.
- `rating`: Numeric value (1 to 5).
- `comment`: Detailed textual feedback.
- `qualityRating`, `communicationRating`, `timelinessRating`: Optional multi-criteria ratings.
- `reply`: Artisan response `{ comment: string, repliedAt: Date }`.
- **Mathematical Accuracy:** Implemented `recalculateArtisanRating` using MongoDB Aggregation Pipeline to guarantee consistent average rating and review counts on `ArtisanProfile`.

### C. Revision Request Workflow (`REVISION_REQUESTED`)
- **Route:** `PATCH /api/v1/booking/:id/request-revision`
- Allows the customer to specify changes/fixes needed if the delivery is unsatisfactory.
- Updates status to `REVISION_REQUESTED`, logs revision count and notes, and notifies the artisan via in-app notification, Kafka, and email.

### D. Dispute Handling Mechanism (`DISPUTED`)
- **Route:** `PATCH /api/v1/booking/:id/dispute`
- Enables either the customer or artisan to formally escalate a conflict for administrative mediation before any funds are moved.
- Sets status to `DISPUTED` and alerts the platform administrative staff.

---

## 5. Complete API Endpoints Reference

### Booking Endpoints (`/api/v1/booking`)
| Method | URL | Auth Role | Description |
|---|---|---|---|
| `GET` | `/my-bookings` | Customer, Artisan | Get paginated list of my bookings |
| `GET` | `/admin/all` | Admin, Super Admin | Admin view of all bookings with filters |
| `GET` | `/:id` | Customer, Artisan, Admin | Get single booking details (with Job, Review, Payout info) |
| `POST` | `/:id/checkout-session` | Customer | Create Stripe checkout session for escrow |
| `GET` | `/verify-payment` | Authenticated | Verify Stripe payment success |
| `PATCH` | `/:id/start-work` | Artisan | Mark booking as `IN_PROGRESS` |
| `PATCH` | `/:id/deliver` | Artisan | Deliver work with FormData images & notes (`DELIVERED`) |
| `PATCH` | `/:id/request-revision` | Customer | Request changes on delivered work (`REVISION_REQUESTED`) |
| `PATCH` | `/:id/dispute` | Customer, Artisan | Open dispute for admin review (`DISPUTED`) |
| `PATCH` | `/:id/confirm-completion` | Customer | Confirm completion, release to payout, optional review (`COMPLETED`) |
| `PATCH` | `/:id/approve-payout` | Admin | Admin approves payout (`APPROVED`) |
| `PATCH` | `/:id/release-payout` | Admin | Admin disburses funds to artisan (`RELEASED`) |

### Review Endpoints (`/api/v1/review`)
| Method | URL | Auth Role | Description |
|---|---|---|---|
| `POST` | `/` | Customer | Submit review for a completed booking |
| `GET` | `/artisan/:artisanId` | Public | Get artisan reviews, rating distribution, and average rating |
| `GET` | `/booking/:bookingId` | Customer, Artisan, Admin | Get review for a specific booking |
| `GET` | `/my-reviews` | Customer, Artisan | Get reviews given (customer) or received (artisan) |
| `PATCH` | `/:id/reply` | Artisan | Artisan replies to a customer's review |
| `PATCH` | `/:id` | Customer | Edit an existing review |

---

## 6. Summary of Modified and Created Files

### Modified Existing Files:
1. `src/app/modules/booking/booking.constants.ts` – Added `REVISION_REQUESTED`, `DISPUTED` to `BOOKING_STATUSES` and searchable fields.
2. `src/app/modules/booking/booking.interface.ts` – Updated `BookingStatus`, added revision, dispute, review ref, and cancellation fields.
3. `src/app/modules/booking/booking.model.ts` – Added fields `review`, `revisionNotes`, `revisionCount`, `disputeReason`, `disputedBy`, `disputedAt`.
4. `src/app/modules/booking/booking.validation.ts` – Flexible delivery proof schema, added revision & dispute validation.
5. `src/app/modules/booking/booking.route.ts` – Integrated `fileUploadHandler` on deliver, added revision and dispute routes.
6. `src/app/modules/booking/booking.controller.ts` – Extracted files using `getMultipleFilesPath`, added controller handlers.
7. `src/app/modules/booking/booking.service.ts` – Updated `deliverBooking`, added `requestRevision`, `disputeBooking`, synced `confirmBookingCompletion` with `Review`.
8. `src/routes/index.ts` – Registered `/review` and `/reviews` routes.
9. `job_to_booking_workflow_guide.txt` – Full developer guide updated with new actions and endpoints.

### Created Files (Review Module):
1. `src/app/modules/review/review.interface.ts`
2. `src/app/modules/review/review.constants.ts`
3. `src/app/modules/review/review.model.ts`
4. `src/app/modules/review/review.validation.ts`
5. `src/app/modules/review/review.service.ts`
6. `src/app/modules/review/review.controller.ts`
7. `src/app/modules/review/review.route.ts`

---
*Generated by Antigravity AI Assistant.*

