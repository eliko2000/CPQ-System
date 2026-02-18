import '@testing-library/jest-dom';
import { vi } from 'vitest';
import React from 'react';

// Mock Supabase
vi.mock('@/src/supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          data: [],
          error: null,
        })),
      })),
      insert: vi.fn(() => ({
        data: null,
        error: null,
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          data: null,
          error: null,
        })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => ({
          data: null,
          error: null,
        })),
      })),
    })),
    auth: {
      getSession: vi.fn(() =>
        Promise.resolve({
          data: { session: null },
          error: null,
        })
      ),
    },
  },
}));

// Mock CPQ Context
vi.mock('@/src/contexts/CPQContext', () => ({
  CPQProvider: ({ children }: { children: React.ReactNode }) => children,
  useCPQ: () => ({
    components: [],
    assemblies: [],
    projects: [],
    quotes: [],
    loading: false,
    error: null,
    // Mock functions
    addComponent: vi.fn(),
    updateComponent: vi.fn(),
    deleteComponent: vi.fn(),
    createProject: vi.fn(),
    updateProject: vi.fn(),
    deleteProject: vi.fn(),
    processQuote: vi.fn(),
  }),
}));

// Mock React Hook Form
vi.mock('react-hook-form', () => ({
  useForm: () => ({
    register: vi.fn(),
    handleSubmit: vi.fn(),
    formState: { errors: {} },
    reset: vi.fn(),
    setValue: vi.fn(),
    getValues: vi.fn(),
  }),
}));

// Mock React Router
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/test' }),
  useParams: () => ({ id: 'test-id' }),
  Link: ({ children, to, ...props }: any) =>
    React.createElement('a', { href: to, ...props }, children),
  BrowserRouter: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
}));

// Mock File API for quote uploads
Object.defineProperty(window, 'File', {
  value: class File {
    name: string;
    size: number;
    type: string;

    constructor(
      parts: BlobPart[],
      filename: string,
      options?: FilePropertyBag
    ) {
      this.name = filename;
      this.size = parts.reduce((acc, part) => acc + new Blob([part]).size, 0);
      this.type = options?.type || '';
    }
  },
});

// Mock Lucide icons - comprehensive list of all icons used in the codebase
vi.mock('lucide-react', () => {
  // Create a simple mock component for each icon
  const createIconMock = (name: string) => () => name;

  return {
    // All icons used in the codebase (sorted alphabetically)
    AlertCircle: createIconMock('AlertCircle'),
    AlertTriangle: createIconMock('AlertTriangle'),
    ArrowLeft: createIconMock('ArrowLeft'),
    BarChart3: createIconMock('BarChart3'),
    Bell: createIconMock('Bell'),
    Bot: createIconMock('Bot'),
    Briefcase: createIconMock('Briefcase'),
    Building: createIconMock('Building'),
    Building2: createIconMock('Building2'),
    Calculator: createIconMock('Calculator'),
    Calendar: createIconMock('Calendar'),
    Check: createIconMock('Check'),
    CheckCircle: createIconMock('CheckCircle'),
    CheckCircle2: createIconMock('CheckCircle2'),
    ChevronDown: createIconMock('ChevronDown'),
    ChevronRight: createIconMock('ChevronRight'),
    ChevronUp: createIconMock('ChevronUp'),
    ChevronsUpDown: createIconMock('ChevronsUpDown'),
    Circle: createIconMock('Circle'),
    Clock: createIconMock('Clock'),
    Copy: createIconMock('Copy'),
    Database: createIconMock('Database'),
    DollarSign: createIconMock('DollarSign'),
    Download: createIconMock('Download'),
    Edit: createIconMock('Edit'),
    Edit2: createIconMock('Edit2'),
    Eye: createIconMock('Eye'),
    EyeOff: createIconMock('EyeOff'),
    FileJson: createIconMock('FileJson'),
    FileQuestion: createIconMock('FileQuestion'),
    FileSpreadsheet: createIconMock('FileSpreadsheet'),
    FileText: createIconMock('FileText'),
    Filter: createIconMock('Filter'),
    FolderOpen: createIconMock('FolderOpen'),
    GitMerge: createIconMock('GitMerge'),
    Globe: createIconMock('Globe'),
    Hash: createIconMock('Hash'),
    Image: createIconMock('Image'),
    Info: createIconMock('Info'),
    Layers: createIconMock('Layers'),
    LayoutDashboard: createIconMock('LayoutDashboard'),
    LayoutGrid: createIconMock('LayoutGrid'),
    List: createIconMock('List'),
    Loader2: createIconMock('Loader2'),
    LogOut: createIconMock('LogOut'),
    Maximize2: createIconMock('Maximize2'),
    Menu: createIconMock('Menu'),
    Minimize2: createIconMock('Minimize2'),
    Monitor: createIconMock('Monitor'),
    Moon: createIconMock('Moon'),
    MoreVertical: createIconMock('MoreVertical'),
    Package: createIconMock('Package'),
    PanelLeft: createIconMock('PanelLeft'),
    PanelLeftClose: createIconMock('PanelLeftClose'),
    Play: createIconMock('Play'),
    Plus: createIconMock('Plus'),
    PlusCircle: createIconMock('PlusCircle'),
    RefreshCw: createIconMock('RefreshCw'),
    RotateCcw: createIconMock('RotateCcw'),
    RotateCw: createIconMock('RotateCw'),
    Save: createIconMock('Save'),
    Search: createIconMock('Search'),
    Send: createIconMock('Send'),
    Settings: createIconMock('Settings'),
    Shield: createIconMock('Shield'),
    ShieldAlert: createIconMock('ShieldAlert'),
    Sparkles: createIconMock('Sparkles'),
    Sun: createIconMock('Sun'),
    Table: createIconMock('Table'),
    Trash: createIconMock('Trash'),
    Trash2: createIconMock('Trash2'),
    TrendingUp: createIconMock('TrendingUp'),
    Upload: createIconMock('Upload'),
    User: createIconMock('User'),
    Users: createIconMock('Users'),
    X: createIconMock('X'),
    XCircle: createIconMock('XCircle'),
    ZoomIn: createIconMock('ZoomIn'),
    ZoomOut: createIconMock('ZoomOut'),
  };
});

// Mock AG Grid
vi.mock('ag-grid-react', () => ({
  AgGridReact: vi.fn(),
  ColDef: vi.fn(),
  GridApi: vi.fn(),
  GridReadyEvent: vi.fn(),
  CellValueChangedEvent: vi.fn(),
  RowDragEvent: vi.fn(),
}));

vi.mock('ag-grid-community/styles/ag-grid.css', () => ({}));
vi.mock('ag-grid-community/styles/ag-theme-alpine.css', () => ({}));

// Global test utilities
global.console = {
  ...console,
  // Silence console.log during tests unless needed
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: console.warn,
  error: console.error,
};
