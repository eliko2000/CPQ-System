# CLAUDE.md - Smart CPQ System for Robotics Integration

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Smart CPQ System** - A "living" financial and engineering brain for a robotics integration company. The system transforms chaotic supplier quotes into structured data, enabling fast and accurate quoting of complex robotics projects.

**Target User**: Robotics Integrator - designs complex systems, purchases components from multiple suppliers, and needs accurate customer quotes.

## Core Architecture

The system consists of 4 main modules that work together:

### 1. Data Ingestion Module - "The Smart Inbox"
**Purpose**: Stop managing quotes in folders and Excel files.

**Key Features**:
- **Multi-format Upload**: PDFs, Word docs, email forwarding
- **AI/OCR Processing**: Auto-identify supplier, dates, and parse line items
- **Intelligent Parsing**: Extract Item Name, Manufacturer P/N, Manufacturer, Quantity, Price
- **Validation Interface**: User-friendly correction interface for AI mistakes
- **Source Linking**: Every data point linked to original source document

### 2. Component & Assembly Library - "The Building Blocks"
**Purpose**: Central master database of all purchasable items and assemblies.

**Core Entities**:
- **Item Card (Component)**: Basic items (sensors, PLCs, vacuum cups, bolts)
  - Fields: Name, Manufacturer P/N, Manufacturer, Category
  - Price History: All historical prices with expiration dates
  - Auto-flagging: Active/lowest valid price identification

- **Assembly Card (Module)**: Hierarchical parent items
  - Contains: Multiple Items or other Assemblies
  - Examples: "Gripper-Type-X", "Main Control Cabinet"
  - Flexible editing: Easy add/remove components
  - Cost Roll-up: Automatic total cost calculation

### 3. Project Quoting Module (Project CPQ) - "The Lego Palace"
**Purpose**: Build accurate customer quotes in minutes, not days.

**Workflow**:
1. **Project Creation**: New project for customer (e.g., "Welding Cell for Customer Y")
2. **Hierarchical BOM Building**: Drag-and-drop assemblies/items from library
3. **Flexible Pricing**: Cost visibility + customizable markup (% or fixed)
4. **Quote Generation**: Branded PDF with selectable detail levels
5. **Project Memory**: Historical BOM preservation with time-specific costs

**Example Project Structure**:
```
Robot System (Assembly)
├── Kuka KR10 Robot (Item)
├── Robot Controller (Item)
├── Gripper (Assembly)
│   ├── Inductive Sensor (Item) x2
│   ├── Vacuum Cup (Item) x4
│   └── Gripper Pneumatics Kit (Assembly) x1
├── Safety System (Assembly)
└── Robot Pedestal (Assembly)
```

### 4. Search & Analytics Module
**Purpose**: Instant information retrieval and business insights.

**Capabilities**:
- **Global Search**: Natural language queries across all data
  - "All quotes from Supplier X"
  - "Projects using Siemens S7-1500 PLC"
  - "Price history for Fanuc Robot Y"
  - "Average gripper cost in 2024"
- **Smart Tagging**: AI-powered categorization suggestions
- **Analytics**: Cost trends, supplier performance, project profitability

## Key End-to-End User Flow

**Input → Processing → Filing → Building → Quoting → Output**

1. **Input**: Upload supplier quote PDF (robot, controller, sensors)
2. **Processing**: AI parses 5 line items, presents for validation
3. **Filing**: System adds new prices to existing items, categorizes new items
4. **Building**: Create "Standard Robot Cell" assembly using parsed items
5. **Quoting**: New project → drag assemblies → apply markups → calculate total
6. **Output**: Generate branded PDF quote for customer
7. **Future**: Historical project access with exact BOM and costs

## Technical Requirements

### Core Data Models

```typescript
// Core Entities
interface Item {
  id: string;
  name: string;
  manufacturerPN: string;
  manufacturer: string;
  category: string;
  priceHistory: PriceEntry[];
  isActive: boolean;
}

interface Assembly {
  id: string;
  name: string;
  components: ComponentReference[];
  totalCost: number; // Auto-calculated
  lastUpdated: Date;
}

interface Project {
  id: string;
  name: string;
  customer: string;
  bom: BOMLine[];
  totalCost: number;
  totalPrice: number;
  status: 'draft' | 'sent' | 'won' | 'lost';
  created: Date;
}

interface QuoteDocument {
  id: string;
  supplier: string;
  date: Date;
  expirationDate: Date;
  items: QuoteLineItem[];
  sourceFile: FileReference;
}
```

### Key Business Logic

**Cost Roll-up Calculation**:
- Recursive calculation through assembly hierarchy
- Always use active/lowest valid price
- Include time-specific cost snapshots

**Markup Flexibility**:
- Per-line markup: % or fixed amount
- Per-assembly markup: cascades to components
- Per-category markup: applies automatically
- Margin tracking and analysis

**Price History Management**:
- Never delete historical prices
- Auto-expire outdated prices
- Price trend analysis
- Supplier comparison

## Technology Stack Considerations

**Frontend Requirements**:
- Drag-and-drop interface for BOM building
- Rich text editing for assembly descriptions
- PDF generation and preview
- File upload with progress indicators
- Advanced search with filters

**Backend Requirements**:
- OCR/AI processing for document parsing
- File storage and management
- Complex database relationships
- PDF generation engine
- Search indexing

**Database Design**:
- Item master with price history
- Assembly definitions with component relationships
- Project templates and history
- Document storage and metadata

## Development Priorities

### Phase 1: Core Foundation
1. **Database Schema**: Items, assemblies, price history
2. **Basic CRUD**: Item and assembly management
3. **Simple Upload**: Manual quote entry
4. **Basic Projects**: Create projects with manual BOM

### Phase 2: Intelligence Layer
1. **OCR Integration**: PDF parsing and extraction
2. **Price History**: Automatic price tracking
3. **Cost Roll-up**: Assembly cost calculation
4. **Search**: Basic item and project search

### Phase 3: Advanced Features
1. **Smart Categorization**: AI-powered tagging
2. **Quote Generation**: Branded PDF output
3. **Analytics**: Cost trends and insights
4. **Advanced Search**: Natural language queries

### Phase 4: Polish & Optimization
1. **User Experience**: Drag-and-drop, bulk operations
2. **Integration**: Supplier APIs, accounting systems
3. **Reporting**: Advanced analytics and dashboards
4. **Mobile**: Responsive design and mobile access

## Business Rules & Constraints

**Data Integrity**:
- Every price must be traceable to source document
- Historical prices never deleted
- Assembly cost always reflects current active prices
- Projects maintain time-specific cost snapshots

**Pricing Logic**:
- Markup can be applied at multiple levels
- Category-based markups override default
- Fixed markups take precedence over percentage
- Customer-specific pricing rules supported

**Security & Access**:
- All supplier cost data is confidential
- Customer quotes show limited detail
- Audit trail for all changes
- Role-based access control

## File Structure

```
CPQ-System/
├── src/
│   ├── components/          # React components
│   │   ├── ingestion/       # Quote upload and processing
│   │   ├── library/         # Item and assembly management
│   │   ├── projects/        # Project creation and BOM building
│   │   └── analytics/       # Search and reporting
│   ├── services/           # Business logic
│   │   ├── quoteService.ts  # OCR and document processing
│   │   ├── costService.ts   # Price history and calculations
│   │   └── projectService.ts # Project management
│   ├── types.ts            # TypeScript definitions
│   └── utils/              # Helper functions
├── docs/                   # API documentation
├── tests/                  # Test suites
└── config/                 # Configuration files
```

## Success Metrics

**Efficiency Metrics**:
- Quote generation time: Target < 10 minutes for standard projects
- Data entry reduction: > 80% automation through OCR
- Price lookup time: < 5 seconds for any item

**Business Impact**:
- Quote accuracy improvement: > 95% accurate first quotes
- Cost savings: Better supplier pricing through historical data
- Project margin improvement: Better cost visibility

**User Experience**:
- Zero training required for basic operations
- Mobile access for quick price lookups
- Integration with existing workflows

---

*This CPQ system runs in parallel with Kurate.io bookmark management system. The workspace is organized to allow seamless switching between projects.*