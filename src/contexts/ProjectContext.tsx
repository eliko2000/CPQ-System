import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
} from 'react';
import { Project, BOMLine } from '../types';
// We will need a hook for projects later, but for now we'll define the shape
// import { useProjects } from '../hooks/useProjects'

// ============ State Shape ============
interface ProjectState {
  projects: Project[];
  currentProject: Project | null;
  currentProjectBOM: BOMLine[];
  viewingProjectId: string | null;
  loading: boolean;
  error: string | null;
}

// ============ Actions ============
type ProjectAction =
  | { type: 'SET_PROJECTS'; payload: Project[] }
  | { type: 'ADD_PROJECT'; payload: Project }
  | {
      type: 'UPDATE_PROJECT';
      payload: { id: string; updates: Partial<Project> };
    }
  | { type: 'DELETE_PROJECT'; payload: string }
  | { type: 'SET_CURRENT_PROJECT'; payload: Project | null }
  | { type: 'SET_VIEWING_PROJECT_ID'; payload: string | null }
  | { type: 'SET_CURRENT_BOM'; payload: BOMLine[] }
  | { type: 'ADD_BOM_ITEM'; payload: { item: BOMLine } }
  | {
      type: 'UPDATE_BOM_ITEM';
      payload: { id: string; updates: Partial<BOMLine> };
    }
  | { type: 'DELETE_BOM_ITEM'; payload: string }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null };

// ============ Reducer ============
const initialState: ProjectState = {
  projects: [],
  currentProject: null,
  currentProjectBOM: [],
  viewingProjectId: null,
  loading: false,
  error: null,
};

function projectReducer(
  state: ProjectState,
  action: ProjectAction
): ProjectState {
  switch (action.type) {
    case 'SET_PROJECTS':
      return { ...state, projects: action.payload };
    case 'ADD_PROJECT':
      return { ...state, projects: [...state.projects, action.payload] };
    case 'UPDATE_PROJECT':
      return {
        ...state,
        projects: state.projects.map(p =>
          p.id === action.payload.id
            ? {
                ...p,
                ...action.payload.updates,
                updatedAt: new Date().toISOString(),
              }
            : p
        ),
      };
    case 'DELETE_PROJECT':
      return {
        ...state,
        projects: state.projects.filter(p => p.id !== action.payload),
      };
    case 'SET_CURRENT_PROJECT':
      return {
        ...state,
        currentProject: action.payload,
        currentProjectBOM: action.payload ? [] : [],
      };
    case 'SET_VIEWING_PROJECT_ID':
      return { ...state, viewingProjectId: action.payload };
    case 'SET_CURRENT_BOM':
      return { ...state, currentProjectBOM: action.payload };
    case 'ADD_BOM_ITEM':
      return {
        ...state,
        currentProjectBOM: [...state.currentProjectBOM, action.payload.item],
      };
    case 'UPDATE_BOM_ITEM':
      return {
        ...state,
        currentProjectBOM: state.currentProjectBOM.map(item =>
          item.id === action.payload.id
            ? { ...item, ...action.payload.updates }
            : item
        ),
      };
    case 'DELETE_BOM_ITEM':
      return {
        ...state,
        currentProjectBOM: state.currentProjectBOM.filter(
          item => item.id !== action.payload
        ),
      };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    default:
      return state;
  }
}

// ============ Context ============
interface ProjectContextType extends ProjectState {
  createProject: (
    project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>
  ) => Promise<void>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  setCurrentProject: (project: Project | null) => void;
  setViewingProjectId: (projectId: string | null) => void;
  addBOMItem: (item: Omit<BOMLine, 'id'>) => void;
  updateBOMItem: (id: string, updates: Partial<BOMLine>) => void;
  deleteBOMItem: (id: string) => void;
  calculateBOMTotals: (bom: BOMLine[]) => {
    totalCost: number;
    totalPrice: number;
    margin: number;
  };
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

// ============ Provider ============
export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(projectReducer, initialState);

  // In a real implementation, we would use a useProjects hook here to sync with DB
  // For now, we'll keep the local state logic from CPQContext

  const createProject = useCallback(
    async (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        const now = new Date().toISOString();
        const newProject: Project = {
          ...project,
          id: `project_${Date.now()}`,
          createdAt: now,
          updatedAt: now,
        };
        dispatch({ type: 'ADD_PROJECT', payload: newProject });
      } catch (error) {
        dispatch({
          type: 'SET_ERROR',
          payload: `Failed to create project: ${error}`,
        });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },
    []
  );

  const updateProject = useCallback(
    async (id: string, updates: Partial<Project>) => {
      // Placeholder for DB update
      dispatch({ type: 'UPDATE_PROJECT', payload: { id, updates } });
    },
    []
  );

  const deleteProject = useCallback(async (id: string) => {
    // Placeholder for DB delete
    dispatch({ type: 'DELETE_PROJECT', payload: id });
  }, []);

  const setCurrentProject = useCallback((project: Project | null) => {
    dispatch({ type: 'SET_CURRENT_PROJECT', payload: project });
  }, []);

  const setViewingProjectId = useCallback((projectId: string | null) => {
    dispatch({ type: 'SET_VIEWING_PROJECT_ID', payload: projectId });
  }, []);

  const addBOMItem = useCallback((item: Omit<BOMLine, 'id'>) => {
    const bomItem: BOMLine = {
      ...item,
      id: `bom_${Date.now()}`,
    };
    dispatch({ type: 'ADD_BOM_ITEM', payload: { item: bomItem } });
  }, []);

  const updateBOMItem = useCallback((id: string, updates: Partial<BOMLine>) => {
    dispatch({ type: 'UPDATE_BOM_ITEM', payload: { id, updates } });
  }, []);

  const deleteBOMItem = useCallback((id: string) => {
    dispatch({ type: 'DELETE_BOM_ITEM', payload: id });
  }, []);

  const calculateBOMTotals = useCallback((bom: BOMLine[]) => {
    const totalCost = bom.reduce(
      (sum, item) => sum + item.unitCost * item.quantity,
      0
    );
    const totalPrice = bom.reduce((sum, item) => sum + item.totalPrice, 0);
    const margin = totalPrice - totalCost;
    return { totalCost, totalPrice, margin };
  }, []);

  const value = {
    ...state,
    createProject,
    updateProject,
    deleteProject,
    setCurrentProject,
    setViewingProjectId,
    addBOMItem,
    updateBOMItem,
    deleteBOMItem,
    calculateBOMTotals,
  };

  return (
    <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
  );
}

// ============ Hook ============
export function useProject() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}
