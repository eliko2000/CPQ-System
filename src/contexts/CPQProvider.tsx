import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
} from 'react';
import { Component, Assembly } from '../types';
import { useComponents } from '../hooks/useComponents';
import { useAssemblies } from '../hooks/useAssemblies';
import { logger } from '../lib/logger';
import { UIProvider } from './UIStateContext';
import { ProjectProvider } from './ProjectContext';
import { QuotationProvider } from './QuotationContext';

// ============ State Shape ============
interface ProductState {
  components: Component[];
  assemblies: Assembly[];
  loading: {
    components: boolean;
    assemblies: boolean;
  };
  error: string | null;
}

// ============ Actions ============
type ProductAction =
  | { type: 'SET_COMPONENTS'; payload: Component[] }
  | { type: 'ADD_COMPONENT'; payload: Component }
  | {
      type: 'UPDATE_COMPONENT';
      payload: { id: string; updates: Partial<Component> };
    }
  | { type: 'DELETE_COMPONENT'; payload: string }
  | { type: 'SET_ASSEMBLIES'; payload: Assembly[] }
  | { type: 'ADD_ASSEMBLY'; payload: Assembly }
  | {
      type: 'UPDATE_ASSEMBLY';
      payload: { id: string; updates: Partial<Assembly> };
    }
  | { type: 'DELETE_ASSEMBLY'; payload: string }
  | {
      type: 'SET_LOADING';
      payload: { key: keyof ProductState['loading']; value: boolean };
    }
  | { type: 'SET_ERROR'; payload: string | null };

// ============ Reducer ============
const initialState: ProductState = {
  components: [],
  assemblies: [],
  loading: {
    components: false,
    assemblies: false,
  },
  error: null,
};

function productReducer(
  state: ProductState,
  action: ProductAction
): ProductState {
  switch (action.type) {
    case 'SET_COMPONENTS':
      return { ...state, components: action.payload };
    case 'ADD_COMPONENT':
      return { ...state, components: [...state.components, action.payload] };
    case 'UPDATE_COMPONENT':
      return {
        ...state,
        components: state.components.map(c =>
          c.id === action.payload.id
            ? {
                ...c,
                ...action.payload.updates,
                updatedAt: new Date().toISOString(),
              }
            : c
        ),
      };
    case 'DELETE_COMPONENT':
      return {
        ...state,
        components: state.components.filter(c => c.id !== action.payload),
      };
    case 'SET_ASSEMBLIES':
      return { ...state, assemblies: action.payload };
    case 'ADD_ASSEMBLY':
      return { ...state, assemblies: [...state.assemblies, action.payload] };
    case 'UPDATE_ASSEMBLY':
      return {
        ...state,
        assemblies: state.assemblies.map(a =>
          a.id === action.payload.id
            ? {
                ...a,
                ...action.payload.updates,
                updatedAt: new Date().toISOString(),
              }
            : a
        ),
      };
    case 'DELETE_ASSEMBLY':
      return {
        ...state,
        assemblies: state.assemblies.filter(a => a.id !== action.payload),
      };
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
interface ProductContextType extends ProductState {
  addComponent: (
    component: Omit<Component, 'id' | 'createdAt' | 'updatedAt'>
  ) => Promise<void>;
  updateComponent: (id: string, updates: Partial<Component>) => Promise<void>;
  deleteComponent: (id: string) => Promise<void>;
  addAssembly: (
    name: string,
    components: Array<{ componentId: string; quantity: number }>,
    description?: string,
    notes?: string
  ) => Promise<void>;
  updateAssembly: (
    id: string,
    updates: {
      name?: string;
      description?: string;
      notes?: string;
      components?: Array<{ componentId: string; quantity: number }>;
    }
  ) => Promise<void>;
  deleteAssembly: (id: string) => Promise<void>;
  checkComponentUsage: (componentId: string) => Promise<{
    isUsed: boolean;
    assemblies: Array<{ id: string; name: string }>;
  }>;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

// ============ Internal Provider ============
function ProductProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(productReducer, initialState);
  const componentsHook = useComponents();
  const assembliesHook = useAssemblies();

  // Sync components
  useEffect(() => {
    const mappedComponents = componentsHook.components.map(comp => {
      const mapped = {
        id: comp.id,
        name: comp.name,
        description: comp.description || '',
        category: comp.category || 'Other',
        componentType: comp.component_type || 'hardware',
        laborSubtype: comp.labor_subtype,
        productType: comp.category || 'Other',
        manufacturer: comp.manufacturer || '',
        manufacturerPN: comp.manufacturer_part_number || '',
        supplier: comp.supplier || '',
        unitCostNIS: comp.unit_cost_ils || 0,
        unitCostUSD: comp.unit_cost_usd || 0,
        unitCostEUR: comp.unit_cost_eur || 0,
        currency: comp.currency || 'NIS',
        // Always derive originalCost from the currency-specific field.
        // original_cost in the DB is unreliable — it is stored as unit_cost_usd
        // for all currencies due to a bug in componentMatcher.ts.
        originalCost:
          (comp.currency === 'EUR'
            ? comp.unit_cost_eur
            : comp.currency === 'USD'
              ? comp.unit_cost_usd
              : comp.unit_cost_ils) || 0,
        // MSRP fields (for distributed components)
        msrpPrice: comp.msrp_price,
        msrpCurrency: comp.msrp_currency,
        partnerDiscountPercent: comp.partner_discount_percent,
        quoteDate: comp.created_at?.split('T')[0] || '',
        quoteFileUrl: '',
        notes: comp.notes,
        createdAt: comp.created_at,
        updatedAt: comp.updated_at,
      };

      if (comp.msrp_price) {
        logger.debug('[CPQProvider] Mapping MSRP from DB', {
          componentName: comp.name,
          dbMsrpPrice: comp.msrp_price,
          dbMsrpCurrency: comp.msrp_currency,
          dbPartnerDiscountPercent: comp.partner_discount_percent,
          mappedMsrpPrice: mapped.msrpPrice,
          mappedMsrpCurrency: mapped.msrpCurrency,
        });
      }

      return mapped;
    });
    dispatch({ type: 'SET_COMPONENTS', payload: mappedComponents });
  }, [componentsHook.components]);

  useEffect(() => {
    dispatch({
      type: 'SET_LOADING',
      payload: { key: 'components', value: componentsHook.loading },
    });
  }, [componentsHook.loading]);

  useEffect(() => {
    if (componentsHook.error) {
      dispatch({ type: 'SET_ERROR', payload: componentsHook.error });
    }
  }, [componentsHook.error]);

  // Sync assemblies
  useEffect(() => {
    dispatch({ type: 'SET_ASSEMBLIES', payload: assembliesHook.assemblies });
  }, [assembliesHook.assemblies]);

  useEffect(() => {
    dispatch({
      type: 'SET_LOADING',
      payload: { key: 'assemblies', value: assembliesHook.loading },
    });
  }, [assembliesHook.loading]);

  useEffect(() => {
    if (assembliesHook.error) {
      dispatch({ type: 'SET_ERROR', payload: assembliesHook.error });
    }
  }, [assembliesHook.error]);

  const addComponent = useCallback(
    async (component: Omit<Component, 'id' | 'createdAt' | 'updatedAt'>) => {
      try {
        await componentsHook.addComponent(component);
      } catch (error) {
        dispatch({
          type: 'SET_ERROR',
          payload: `Failed to add component: ${error}`,
        });
      }
    },
    [componentsHook]
  );

  const updateComponent = useCallback(
    async (id: string, updates: Partial<Component>) => {
      try {
        logger.debug('🌐 ProductContext.updateComponent called:', {
          id,
          updates,
        });
        await componentsHook.updateComponent(id, updates);
      } catch (error) {
        logger.error('❌ ProductContext.updateComponent failed:', error);
        dispatch({
          type: 'SET_ERROR',
          payload: `Failed to update component: ${error}`,
        });
      }
    },
    [componentsHook]
  );

  const deleteComponent = useCallback(
    async (id: string) => {
      try {
        const usage = await assembliesHook.checkComponentUsage(id);
        if (usage.isUsed) {
          const assemblyNames = usage.assemblies.map(a => a.name).join(', ');
          const message = `רכיב זה נמצא בשימוש ב-${usage.assemblies.length} הרכבות: ${assemblyNames}. האם להמשיך? ההרכבות יסומנו כלא שלמות.`;
          throw new Error(`ASSEMBLY_USAGE:${message}`);
        }
        await componentsHook.deleteComponent(id);
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.startsWith('ASSEMBLY_USAGE:')
        ) {
          throw error;
        }
        dispatch({
          type: 'SET_ERROR',
          payload: `Failed to delete component: ${error}`,
        });
        throw error;
      }
    },
    [componentsHook, assembliesHook]
  );

  const addAssembly = useCallback(
    async (
      name: string,
      components: Array<{ componentId: string; quantity: number }>,
      description?: string,
      notes?: string
    ) => {
      try {
        await assembliesHook.addAssembly(name, components, description, notes);
      } catch (error) {
        dispatch({
          type: 'SET_ERROR',
          payload: `Failed to add assembly: ${error}`,
        });
        throw error;
      }
    },
    [assembliesHook]
  );

  const updateAssembly = useCallback(
    async (id: string, updates: any) => {
      try {
        await assembliesHook.updateAssembly(id, updates);
      } catch (error) {
        dispatch({
          type: 'SET_ERROR',
          payload: `Failed to update assembly: ${error}`,
        });
        throw error;
      }
    },
    [assembliesHook]
  );

  const deleteAssembly = useCallback(
    async (id: string) => {
      try {
        await assembliesHook.deleteAssembly(id);
      } catch (error) {
        dispatch({
          type: 'SET_ERROR',
          payload: `Failed to delete assembly: ${error}`,
        });
        throw error;
      }
    },
    [assembliesHook]
  );

  const checkComponentUsage = useCallback(
    async (componentId: string) => {
      return await assembliesHook.checkComponentUsage(componentId);
    },
    [assembliesHook]
  );

  const value = {
    ...state,
    addComponent,
    updateComponent,
    deleteComponent,
    addAssembly,
    updateAssembly,
    deleteAssembly,
    checkComponentUsage,
  };

  return (
    <ProductContext.Provider value={value}>{children}</ProductContext.Provider>
  );
}

// ============ Main CPQ Provider ============
export function CPQProvider({ children }: { children: React.ReactNode }) {
  return (
    <UIProvider>
      <ProjectProvider>
        <QuotationProvider>
          <ProductProvider>{children}</ProductProvider>
        </QuotationProvider>
      </ProjectProvider>
    </UIProvider>
  );
}

// ============ Hook ============
export function useProducts() {
  const context = useContext(ProductContext);
  if (context === undefined) {
    throw new Error(
      'useProducts must be used within a ProductProvider (inside CPQProvider)'
    );
  }
  return context;
}
