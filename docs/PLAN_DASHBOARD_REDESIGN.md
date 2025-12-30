# Action-Oriented Dashboard Redesign Plan

## Overview

Transform the current vanity-metrics dashboard into an action-oriented command center that helps users know exactly what needs attention and provides quick access to their work.

## Scope Decision

- **Stale Draft Threshold**: 7 days
- **Backend Changes**: YES - Include follow_up_date and priority fields
- **Goals Module**: NO - Skip for now, focus on dashboard + action tracking

---

## Implementation Progress

| Step                      | Status    | Notes                                                      |
| ------------------------- | --------- | ---------------------------------------------------------- |
| 1. Database Migration     | COMPLETED | `migrations/add-action-tracking-fields.sql` created        |
| 2. Type Updates           | COMPLETED | Added QuotationPriority type and new fields to DbQuotation |
| 3. Dashboard Redesign     | COMPLETED | New layout with pipeline, alerts, continue working         |
| 4. Priority/Follow-up UI  | COMPLETED | Added columns to quotation grid with renderers             |
| 5. Enhanced Alerts        | COMPLETED | Follow-up due and high priority cards in NeedsAttention    |
| 6. Bug Fixes (2024-12-28) | COMPLETED | See below                                                  |

### Bug Fixes Applied (2024-12-28)

| Bug                          | Fix                                                                                                |
| ---------------------------- | -------------------------------------------------------------------------------------------------- |
| Quote Pipeline wrong context | Changed title to "צינור הצעות מחיר" and labels to indicate customer quotations                     |
| "Continue Working" broken    | Fixed by converting DbQuotation to QuotationProject using `convertDbQuotationToQuotationProject()` |
| Quick Actions just navigate  | Added ProjectPicker dialog - "הצעת מחיר חדשה" now opens project picker and creates quotation       |
| Missing Recent Activity      | Added RecentActivity component showing latest quotation updates with user avatars                  |
| User tracking for activity   | Added `updated_by` field migration to quotations/components/projects tables                        |

---

## Files Created/Modified

### New Files

| File                                              | Purpose                                     |
| ------------------------------------------------- | ------------------------------------------- |
| `migrations/add-action-tracking-fields.sql`       | Database migration for new fields           |
| `src/components/dashboard/dashboardConfig.ts`     | Configuration constants                     |
| `src/components/dashboard/QuotePipeline.tsx`      | Pipeline status cards (Draft/Sent/Won/Lost) |
| `src/components/dashboard/NeedsAttention.tsx`     | Alert cards with action items               |
| `src/components/dashboard/ContinueWorking.tsx`    | Most recent draft card                      |
| `src/components/dashboard/PerformanceMetrics.tsx` | KPI metrics (Won, Win Rate, Margin)         |
| `src/components/dashboard/QuickActions.tsx`       | Action buttons                              |

### Modified Files

| File                                                   | Changes                                                       |
| ------------------------------------------------------ | ------------------------------------------------------------- |
| `src/types/quotation.types.ts`                         | Added QuotationPriority type and new fields                   |
| `src/components/dashboard/Dashboard.tsx`               | Complete redesign with new layout + ProjectPicker integration |
| `src/components/dashboard/QuotePipeline.tsx`           | Fixed labels for customer quotations                          |
| `src/components/quotations/quotationGridColumns.ts`    | Added priority and follow_up_date columns                     |
| `src/components/quotations/quotationGridRenderers.tsx` | Added PriorityRenderer and FollowUpDateRenderer               |

### New Files (Bug Fix Phase)

| File                                                          | Purpose                                      |
| ------------------------------------------------------------- | -------------------------------------------- |
| `src/components/dashboard/RecentActivity.tsx`                 | Shows recent team activity with user avatars |
| `supabase/migrations/20251228150000_add_updated_by_field.sql` | Adds updated_by tracking to tables           |

---

## New Dashboard Layout

```
┌────────────────────────────────────────────────────────────────┐
│  📋 QUOTE PIPELINE (Status + Value)                            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │ Draft    │ │ Sent     │ │ Won      │ │ Lost     │          │
│  │ ₪45,000  │ │ ₪120,000 │ │ ₪80,000  │ │ ₪15,000  │          │
│  │ 3 quotes │ │ 2 quotes │ │ 5 quotes │ │ 1 quote  │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
├────────────────────────────────────────────────────────────────┤
│  ⚠️ NEEDS ATTENTION                                            │
│  - Stale Drafts (>7 days old)                                  │
│  - Expiring Soon (within 7 days)                               │
│  - Awaiting Response (>14 days since sent)                     │
│  - Follow-up Due (today or overdue)                            │
│  - High Priority (marked high/urgent)                          │
├────────────────────────────────────────────────────────────────┤
│  ⚡ CONTINUE WORKING  │  ➕ QUICK ACTIONS                       │
│  [Most recent draft]  │  [New Quote] [Add Component] [Upload]  │
├────────────────────────────────────────────────────────────────┤
│  📊 PERFORMANCE (This Month)                                   │
│  Won: ₪80,000  │  Win Rate: 83%  │  Avg Margin: 28%           │
└────────────────────────────────────────────────────────────────┘
```

---

## Configuration Constants

```typescript
// src/components/dashboard/dashboardConfig.ts
export const DASHBOARD_CONFIG = {
  STALE_DRAFT_DAYS: 7, // Drafts older than this are "stale"
  AWAITING_RESPONSE_DAYS: 14, // Sent quotes with no update
  EXPIRING_SOON_DAYS: 7, // Quotes expiring within this window
};
```

---

## Database Migration Required

Run the following migration to add the new fields:

```bash
/migrate add-action-tracking-fields.sql
```

This adds:

- `follow_up_date` (DATE) - For follow-up reminders
- `priority` (TEXT) - low/medium/high/urgent
- `status_changed_at` (TIMESTAMPTZ) - Auto-updated on status change
- Index for dashboard queries

---

## Future Enhancements (Not in Scope)

### Goals Module

- Team goals table
- Target vs actual tracking
- Progress indicators on dashboard

### Notifications

- Email reminders for follow-up dates
- Push notifications for expiring quotes
