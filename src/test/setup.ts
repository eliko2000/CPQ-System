import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Supabase
vi.mock('@/src/supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          data: [],
          error: null
        }))
      })),
      insert: vi.fn(() => ({
        data: null,
        error: null
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          data: null,
          error: null
        }))
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => ({
          data: null,
          error: null
        }))
      }))
    })),
    auth: {
      getSession: vi.fn(() => Promise.resolve({
        data: { session: null },
        error: null
      }))
    }
  }
}))

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
    processQuote: vi.fn()
  })
}));

// Mock React Hook Form
vi.mock('react-hook-form', () => ({
  useForm: () => ({
    register: vi.fn(),
    handleSubmit: vi.fn(),
    formState: { errors: {} },
    reset: vi.fn(),
    setValue: vi.fn(),
    getValues: vi.fn()
  })
}));

// Mock React Router
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/test' }),
  useParams: () => ({ id: 'test-id' }),
  Link: ({ children, to, ...props }: any) => <a href={to} {...props}>{children}</a>,
  BrowserRouter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

// Mock File API for quote uploads
Object.defineProperty(window, 'File', {
  value: class File {
    name: string;
    size: number;
    type: string;

    constructor(parts: BlobPart[], filename: string, options?: FilePropertyBag) {
      this.name = filename;
      this.size = parts.reduce((acc, part) => acc + new Blob([part]).size, 0);
      this.type = options?.type || '';
    }
  }
});

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  LayoutDashboard: () => 'LayoutDashboard',
  FileText: () => 'FileText',
  Package: () => 'Package',
  FolderOpen: () => 'FolderOpen',
  BarChart3: () => 'BarChart3',
  Settings: () => 'Settings',
  Menu: () => 'Menu',
  X: () => 'X',
  Sun: () => 'Sun',
  Moon: () => 'Moon',
  Monitor: () => 'Monitor',
  Bell: () => 'Bell',
  Search: () => 'Search',
  Plus: () => 'Plus',
  Save: () => 'Save',
  Calculator: () => 'Calculator',
  Upload: () => 'Upload',
  Download: () => 'Download',
  Edit: () => 'Edit',
  Trash: () => 'Trash',
  PlusCircle: () => 'PlusCircle',
  DollarSign: () => 'DollarSign'
}));

// Mock AG Grid
vi.mock('ag-grid-react', () => ({
  AgGridReact: vi.fn(),
  ColDef: vi.fn(),
  GridApi: vi.fn(),
  GridReadyEvent: vi.fn(),
  CellValueChangedEvent: vi.fn(),
  RowDragEvent: vi.fn()
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