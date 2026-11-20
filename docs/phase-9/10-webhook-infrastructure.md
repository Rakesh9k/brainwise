# BrainWise Commercial Infrastructure — Webhook Infrastructure

**Document ID:** BW-DOC-P9-010  
**Status:** Approved & Implemented  
**Date:** 2026-11-20  
**Phase:** 9 (Commercial Infrastructure)  

---

## 1. Webhook Endpoint Specification

- **Path:** `POST /api/v1/billing/webhook`
- **Security:** HMAC-SHA256 signature verification over raw request payload.
- **Required Headers:** `x-webhook-signature` (or `x-cashfree-signature`), `x-webhook-timestamp`.

---

## 2. Event Types & Processing Workflows

| Gateway Event | Handled Action |
|---|---|
| `PAYMENT_SUCCESS` / `ORDER_PAID` | If order starts with `order_pack_`, fulfills credit pack and credits `purchased` pool.<br>If order starts with `order_sub_`, activates subscription, grants monthly allowance, and generates GST invoice. |
| `PAYMENT_FAILED` | Updates payment record to `failed`, emits failure event to workspace audit log. |
| `SUBSCRIPTION_RENEWAL` | Advances period dates by 30 days / 365 days, re-grants monthly credit allowance. |
| `SUBSCRIPTION_CANCELLED` | Marks subscription cancelled, sets workspace status to revert at period end. |
| `REFUND_PROCESSED` | Updates payment record to refunded, records compensating credit deduction. |

---

## 3. Idempotency & Replay Attack Defense

Every webhook event is recorded in `system/billing_webhooks/{eventId}`. If an event has already been marked `processed: true`, the handler short-circuits with `200 OK: Event already processed`, completely preventing duplicate fulfillment or multiple credit grants from repeated gateway deliveries.
