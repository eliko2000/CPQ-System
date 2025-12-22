// Labor Types - Separate catalog for labor (internal team vs external contractors)

import type { LaborSubtype } from './common.types';

// ============ Labor Type (In Catalog) ============
export interface LaborType {
  id: string;
  name: string;
  laborSubtype: LaborSubtype;

  // ⭐ Internal vs External Labor
  isInternalLabor: boolean; // If true, uses quotation's dayWorkCost
  externalRate?: number; // Only for external labor (fixed rate per day)

  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============ Database Schema ============
export interface DbLaborType {
  id: string;
  team_id: string;
  name: string;
  labor_subtype:
    | 'engineering'
    | 'integration'
    | 'development'
    | 'testing'
    | 'commissioning'
    | 'support_and_training';

  // ⭐ Internal vs External Labor
  is_internal_labor: boolean;
  external_rate?: number;

  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============ Form Data ============
export interface LaborTypeFormData {
  name: string;
  laborSubtype: LaborSubtype;
  isInternalLabor: boolean;
  externalRate?: number;
  description?: string;
}
