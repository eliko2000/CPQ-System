import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
} from 'react';
import { QuotationProject, SupplierQuote, PricingRule } from '../types';
import { useQuotations } from '../hooks/useQuotations';
import { convertDbQuotationToQuotationProject } from '../lib/utils';
import { logger } from '../lib/logger';

// ============ State Shape ============
interface QuotationState {
  quotations: QuotationProject[];
  currentQuotation: QuotationProject | null;
  supplierQuotes: SupplierQuote[];
  pricingRules: PricingRule[];
  loading: {
    quotations: boolean;
    quotes: boolean;
  };
  error: string | null;
}

// ============ Actions ============
type QuotationAction =
  | { type: 'SET_QUOTATIONS'; payload: QuotationProject[] }
  | { type: 'ADD_QUOTATION'; payload: QuotationProject }
  | {
      type: 'UPDATE_QUOTATION';
      payload: { id: string; updates: Partial<QuotationProject> };
    }
  | { type: 'DELETE_QUOTATION'; payload: string }
  | { type: 'SET_CURRENT_QUOTATION'; payload: QuotationProject | null }
  | { type: 'SET_SUPPLIER_QUOTES'; payload: SupplierQuote[] }
  | { type: 'ADD_SUPPLIER_QUOTE'; payload: SupplierQuote }
  | { type: 'SET_PRICING_RULES'; payload: PricingRule[] }
  | {
      type: 'SET_LOADING';
      payload: { key: keyof QuotationState['loading']; value: boolean };
    }
  | { type: 'SET_ERROR'; payload: string | null };

// ============ Reducer ============
const initialState: QuotationState = {
  quotations: [],
  currentQuotation: null,
  supplierQuotes: [],
  pricingRules: [],
  loading: {
    quotations: false,
    quotes: false,
  },
  error: null,
};

function quotationReducer(
  state: QuotationState,
  action: QuotationAction
): QuotationState {
  switch (action.type) {
    case 'SET_QUOTATIONS':
      return { ...state, quotations: action.payload };
    case 'ADD_QUOTATION':
      return { ...state, quotations: [...state.quotations, action.payload] };
    case 'UPDATE_QUOTATION':
      return {
        ...state,
        quotations: state.quotations.map(q =>
          q.id === action.payload.id
            ? {
                ...q,
                ...action.payload.updates,
                updatedAt: new Date().toISOString(),
              }
            : q
        ),
      };
    case 'DELETE_QUOTATION':
      return {
        ...state,
        quotations: state.quotations.filter(q => q.id !== action.payload),
      };
    case 'SET_CURRENT_QUOTATION':
      return { ...state, currentQuotation: action.payload };
    case 'SET_SUPPLIER_QUOTES':
      return { ...state, supplierQuotes: action.payload };
    case 'ADD_SUPPLIER_QUOTE':
      return {
        ...state,
        supplierQuotes: [...state.supplierQuotes, action.payload],
      };
    case 'SET_PRICING_RULES':
      return { ...state, pricingRules: action.payload };
    case 'SET_LOADING':
      return {
        ...state,
        loading: {
          ...state.loading,
          [action.payload.key]: action.payload.value,
        },
      };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    default:
      return state;
  }
}

// ============ Context ============
interface QuotationContextType extends QuotationState {
  setCurrentQuotation: (quotation: QuotationProject | null) => void;
  addQuotation: (quotation: QuotationProject) => void;
  updateQuotation: (
    id: string,
    updates: Partial<QuotationProject>
  ) => Promise<void>;
  addSupplierQuote: (quote: Omit<SupplierQuote, 'id'>) => Promise<void>;
}

const QuotationContext = createContext<QuotationContextType | undefined>(
  undefined
);

// ============ Provider ============
export function QuotationProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(quotationReducer, initialState);
  const quotationsHook = useQuotations();

  // Sync hooks data with reducer state
  useEffect(() => {
    const mappedQuotations = quotationsHook.quotations.map(
      convertDbQuotationToQuotationProject
    );
    dispatch({ type: 'SET_QUOTATIONS', payload: mappedQuotations });
  }, [quotationsHook.quotations]);

  useEffect(() => {
    dispatch({
      type: 'SET_LOADING',
      payload: { key: 'quotations', value: quotationsHook.loading },
    });
  }, [quotationsHook.loading]);

  useEffect(() => {
    if (quotationsHook.error) {
      dispatch({ type: 'SET_ERROR', payload: quotationsHook.error });
    }
  }, [quotationsHook.error]);

  const setCurrentQuotation = useCallback(
    (quotation: QuotationProject | null) => {
      dispatch({ type: 'SET_CURRENT_QUOTATION', payload: quotation });
    },
    []
  );

  const addQuotation = useCallback((quotation: QuotationProject) => {
    dispatch({ type: 'ADD_QUOTATION', payload: quotation });
  }, []);

  const updateQuotation = useCallback(
    async (id: string, updates: Partial<QuotationProject>) => {
      // Update local state immediately for responsive UI
      dispatch({ type: 'UPDATE_QUOTATION', payload: { id, updates } });

      // Convert QuotationProject fields to DbQuotation fields for Supabase
      const dbUpdates: any = {};
      if (updates.projectId !== undefined)
        dbUpdates.project_id = updates.projectId;
      if (updates.projectName !== undefined)
        dbUpdates.project_name = updates.projectName;
      if (updates.customerName !== undefined)
        dbUpdates.customer_name = updates.customerName;
      if (updates.name !== undefined) dbUpdates.quotation_number = updates.name;
      if (updates.parameters !== undefined) {
        if (updates.parameters.usdToIlsRate !== undefined)
          dbUpdates.exchange_rate = updates.parameters.usdToIlsRate;
        if (updates.parameters.eurToIlsRate !== undefined)
          dbUpdates.eur_to_ils_rate = updates.parameters.eurToIlsRate;
        if (updates.parameters.markupPercent !== undefined)
          dbUpdates.margin_percentage = updates.parameters.markupPercent;
        if (updates.parameters.riskPercent !== undefined)
          dbUpdates.risk_percentage = updates.parameters.riskPercent;
      }

      // Save to Supabase if there are database fields to update
      if (Object.keys(dbUpdates).length > 0) {
        try {
          await quotationsHook.updateQuotation(id, dbUpdates);
        } catch (error) {
          logger.error('Failed to save quotation updates to database:', error);
          dispatch({
            type: 'SET_ERROR',
            payload: 'Failed to save quotation updates to database',
          });
        }
      }
    },
    [quotationsHook]
  );

  const addSupplierQuote = useCallback(
    async (quote: Omit<SupplierQuote, 'id'>) => {
      try {
        dispatch({
          type: 'SET_LOADING',
          payload: { key: 'quotes', value: true },
        });
        // Note: For database persistence, use useSupplierQuotes.createQuote() hook
        const newQuote: SupplierQuote = {
          ...quote,
          id: `quote_${Date.now()}`,
        };
        dispatch({ type: 'ADD_SUPPLIER_QUOTE', payload: newQuote });
      } catch (error) {
        dispatch({
          type: 'SET_ERROR',
          payload: `Failed to add supplier quote: ${error}`,
        });
      } finally {
        dispatch({
          type: 'SET_LOADING',
          payload: { key: 'quotes', value: false },
        });
      }
    },
    []
  );

  const value = {
    ...state,
    setCurrentQuotation,
    addQuotation,
    updateQuotation,
    addSupplierQuote,
  };

  return (
    <QuotationContext.Provider value={value}>
      {children}
    </QuotationContext.Provider>
  );
}

// ============ Hook ============
export function useQuotation() {
  const context = useContext(QuotationContext);
  if (context === undefined) {
    throw new Error('useQuotation must be used within a QuotationProvider');
  }
  return context;
}
