// Dashboard configuration constants for "Needs Attention" thresholds

export const DASHBOARD_CONFIG = {
  // Drafts older than this many days are considered "stale"
  STALE_DRAFT_DAYS: 7,

  // Sent quotes with no update for this many days need follow-up
  AWAITING_RESPONSE_DAYS: 14,

  // Quotes expiring within this many days show as "expiring soon"
  EXPIRING_SOON_DAYS: 7,
};

// Status display configuration
export const STATUS_CONFIG = {
  draft: {
    label: 'טיוטה',
    color: 'bg-gray-100 text-gray-700',
    borderColor: 'border-gray-300',
  },
  sent: {
    label: 'נשלח',
    color: 'bg-blue-100 text-blue-700',
    borderColor: 'border-blue-300',
  },
  won: {
    label: 'נסגר',
    color: 'bg-green-100 text-green-700',
    borderColor: 'border-green-300',
  },
  lost: {
    label: 'הפסד',
    color: 'bg-red-100 text-red-700',
    borderColor: 'border-red-300',
  },
  accepted: {
    label: 'התקבל',
    color: 'bg-green-100 text-green-700',
    borderColor: 'border-green-300',
  },
  rejected: {
    label: 'נדחה',
    color: 'bg-red-100 text-red-700',
    borderColor: 'border-red-300',
  },
  expired: {
    label: 'פג תוקף',
    color: 'bg-orange-100 text-orange-700',
    borderColor: 'border-orange-300',
  },
} as const;

// Priority display configuration
export const PRIORITY_CONFIG = {
  low: {
    label: 'נמוך',
    color: 'bg-gray-100 text-gray-600',
    dotColor: 'bg-gray-400',
  },
  medium: {
    label: 'בינוני',
    color: 'bg-blue-100 text-blue-600',
    dotColor: 'bg-blue-400',
  },
  high: {
    label: 'גבוה',
    color: 'bg-orange-100 text-orange-600',
    dotColor: 'bg-orange-400',
  },
  urgent: {
    label: 'דחוף',
    color: 'bg-red-100 text-red-600',
    dotColor: 'bg-red-500',
  },
} as const;
