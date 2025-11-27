import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
} from 'react';
import { UIState, ModalState } from '../types';

// ============ State Shape ============
interface UIContextState {
  activeView: UIState['activeView'];
  sidebarCollapsed: boolean;
  theme: UIState['theme'];
  modalState: ModalState;
  errors: string[];
}

// ============ Actions ============
type UIAction =
  | { type: 'SET_ACTIVE_VIEW'; payload: UIState['activeView'] }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'SET_THEME'; payload: UIState['theme'] }
  | { type: 'SET_MODAL'; payload: ModalState }
  | { type: 'CLOSE_MODAL' }
  | { type: 'ADD_ERROR'; payload: string }
  | { type: 'CLEAR_ERRORS' };

// ============ Reducer ============
const initialState: UIContextState = {
  activeView: 'dashboard',
  sidebarCollapsed: false,
  theme: 'system',
  modalState: {
    type: null,
    data: null,
  },
  errors: [],
};

function uiReducer(state: UIContextState, action: UIAction): UIContextState {
  switch (action.type) {
    case 'SET_ACTIVE_VIEW':
      return { ...state, activeView: action.payload };
    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarCollapsed: !state.sidebarCollapsed };
    case 'SET_THEME':
      return { ...state, theme: action.payload };
    case 'SET_MODAL':
      return { ...state, modalState: action.payload };
    case 'CLOSE_MODAL':
      return { ...state, modalState: { type: null, data: null } };
    case 'ADD_ERROR':
      return { ...state, errors: [...state.errors, action.payload] };
    case 'CLEAR_ERRORS':
      return { ...state, errors: [] };
    default:
      return state;
  }
}

// ============ Context ============
interface UIContextType extends UIContextState {
  setActiveView: (view: UIState['activeView']) => void;
  toggleSidebar: () => void;
  setTheme: (theme: UIState['theme']) => void;
  setModal: (modal: ModalState) => void;
  closeModal: () => void;
  addError: (error: string) => void;
  clearErrors: () => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

// ============ Provider ============
export function UIProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(uiReducer, initialState);

  const setActiveView = useCallback((view: UIState['activeView']) => {
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: view });
  }, []);

  const toggleSidebar = useCallback(() => {
    dispatch({ type: 'TOGGLE_SIDEBAR' });
  }, []);

  const setTheme = useCallback((theme: UIState['theme']) => {
    dispatch({ type: 'SET_THEME', payload: theme });
  }, []);

  const setModal = useCallback((modal: ModalState) => {
    dispatch({ type: 'SET_MODAL', payload: modal });
  }, []);

  const closeModal = useCallback(() => {
    dispatch({ type: 'CLOSE_MODAL' });
  }, []);

  const addError = useCallback((error: string) => {
    dispatch({ type: 'ADD_ERROR', payload: error });
  }, []);

  const clearErrors = useCallback(() => {
    dispatch({ type: 'CLEAR_ERRORS' });
  }, []);

  const value = {
    ...state,
    setActiveView,
    toggleSidebar,
    setTheme,
    setModal,
    closeModal,
    addError,
    clearErrors,
  };

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

// ============ Hook ============
export function useUI() {
  const context = useContext(UIContext);
  if (context === undefined) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
}
