# CLINE.md - Smart CPQ System for Cline Environment

This file provides guidance to Cline when working with code in this repository. It has been migrated from Claude Code infrastructure to work with Cline's workflow system.

## Project Overview

**Smart CPQ System** - A "living" financial and engineering brain for a robotics integration company. The system transforms chaotic supplier quotes into structured data, enabling fast and accurate quoting of complex robotics projects.

**Target User**: Robotics Integrator - designs complex systems, purchases components from multiple suppliers, and needs accurate customer quotes.

## Cline Environment Setup

### MCP Servers Configuration
Cline uses the existing `.mcp.json` file for MCP server configuration:

- **context7**: Context management
- **supabase**: Database operations with PostgREST  
- **playwright**: End-to-end testing
- **shadcn**: UI component management

The MCP servers are already configured and should be available in Cline's interface.

### How Cline Works with This Project

Cline doesn't use custom workflow files or command structures like Claude Code. Instead, Cline works through:

1. **Natural Language Instructions**: You give Cline instructions directly
2. **MCP Server Integration**: Cline can use the configured MCP servers
3. **Standard Development Tools**: Cline uses npm, VS Code, and standard tooling
4. **Context Awareness**: Cline reads project files to understand the codebase

### Migration from Claude Code

The original Claude Code setup used:
- `.claude/agents/` - Specialized agent workflows
- `.claude/commands/` - Custom command templates
- Custom orchestration logic

**Cline uses a different approach:**
- No custom workflow files needed
- Direct natural language interaction
- Standard development tooling
- MCP server integration for extended capabilities

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

### 4. Search & Analytics Module
**Purpose**: Instant information retrieval and business insights.

**Capabilities**:
- **Global Search**: Natural language queries across all data
- **Smart Tagging**: AI-powered categorization suggestions
- **Analytics**: Cost trends, supplier performance, project profitability

## Working with Cline on CPQ System

### Getting Started
1. **Open the project in VS Code** with Cline extension installed
2. **Cline will automatically detect** the `.mcp.json` configuration
3. **Start giving instructions** in natural language

### Example Cline Instructions

**For Feature Development:**
```
"Add a new component to the library with price history tracking. Make sure to follow the data integrity rules in CLAUDE.md and include proper TypeScript types."
```

**For Bug Fixes:**
```
"There's an issue with the pricing calculation in the BOM. The assembly cost roll-up isn't working correctly. Please investigate and fix it while ensuring pricing accuracy."
```

**For Testing:**
```
"Write comprehensive tests for the pricing utilities. Make sure to cover edge cases like expired prices, negative quantities, and circular assembly references."
```

**For Documentation:**
```
"Update the documentation for the component library to include the new price history features and add JSDoc comments to the pricing functions."
```

### Cline's Capabilities with CPQ

**Using MCP Servers:**
- **Supabase**: Direct database operations and queries
- **Playwright**: End-to-end testing of critical flows
- **Context7**: Enhanced context management for large codebases
- **Shadcn**: UI component management and updates

**Development Workflow:**
1. **Analysis**: Cline reads relevant files and understands the codebase
2. **Implementation**: Writes code following CPQ patterns and business rules
3. **Testing**: Creates and runs tests using Vitest and React Testing Library
4. **Validation**: Ensures pricing accuracy and data integrity
5. **Documentation**: Updates JSDoc and documentation as needed

## Critical Business Rules

### Data Integrity Rules
1. Every price must be traceable to source document
2. Historical prices are never deleted
3. Assembly costs always reflect current active component prices
4. Customer prices = cost + markup (never store directly)
5. Price expiration dates must be respected

### Pricing Logic
- Markup can be applied at multiple levels
- Category-based markups override default
- Fixed markups take precedence over percentage
- Customer-specific pricing rules supported

### Security & Access
- All supplier cost data is confidential
- Customer quotes show limited detail
- Audit trail for all changes
- Role-based access control

## Technology Stack

### Core Stack
- **React 19.1.1** with React DOM - Latest React features
- **TypeScript 5.8.2** - Type safety and productivity
- **Vite 6.2.0** - Fast development and builds
- **Tailwind CSS** - Utility-first styling

### UI Components
- **AG Grid Community** - Excel-like data tables with editing, drag-drop, calculations
- **Shadcn/ui** - Reusable components
- **Radix UI** - Accessible primitives

### Backend & Database
- **Supabase 2.44.4** - Backend, auth, and real-time DB
- **PostgREST** - Auto-generated REST API
- **Real-time subscriptions** - Multi-client synchronization

### Development Tools
- **Vitest** - Fast unit testing
- **React Testing Library** - Component testing
- **Happy DOM** - Test environment
- **ESLint + Prettier** - Code quality and formatting

## Project Structure

```
CPQ-System/
├── .mcp.json                 # MCP server configuration for Cline
├── CLINE.md                  # This file - Cline guidance
├── CLAUDE.md                  # Original project documentation
├── src/
│   ├── components/            # React components
│   │   ├── ingestion/         # Quote upload and OCR processing
│   │   ├── library/           # Item and assembly management
│   │   ├── projects/          # Project quoting and BOM
│   │   └── analytics/        # Search and reporting
│   ├── services/             # Business logic & API
│   ├── utils/                # Helper functions
│   ├── types.ts              # TypeScript definitions
│   └── contexts/             # React Context providers
├── public/                   # Static assets
├── tests/                    # Test suites
└── docs/                     # Documentation
```

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

## Best Practices for Cline

### When Giving Instructions

**Be Specific About Requirements:**
```
"Create a new component for managing supplier quotes. Include OCR processing capabilities using Tesseract.js, and make sure to validate extracted data against our business rules."
```

**Reference Business Rules:**
```
"Update the pricing calculation to handle expired prices correctly. According to CLAUDE.md, we must always use active prices and never store customer prices directly."
```

**Specify Testing Requirements:**
```
"Add comprehensive tests for the new assembly cost roll-up feature. Include edge cases for circular references and ensure 90%+ code coverage."
```

### Quality Assurance

**Cline will automatically:**
- Read relevant files to understand context
- Follow TypeScript best practices
- Maintain code consistency with existing patterns
- Include proper error handling
- Add appropriate tests

**You should verify:**
- Pricing calculations are mathematically correct
- Data integrity rules are followed
- Security requirements are met
- User experience is maintained

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

## Migration Notes

This project has been successfully migrated from Claude Code to Cline environment:

- ✅ **MCP Configuration**: Uses existing `.mcp.json` file
- ✅ **Documentation**: Updated for Cline's natural language approach
- ✅ **Business Logic**: All CPQ rules and patterns preserved
- ✅ **Development Workflow**: Adapted for Cline's capabilities

### Key Differences from Claude Code

**Claude Code:**
- Structured agent workflows
- Custom command templates
- Formal orchestration

**Cline:**
- Natural language instructions
- Direct tool interaction
- Flexible, conversational approach

### What Works Better with Cline

1. **Rapid Prototyping**: Quick iteration through conversation
2. **Context Awareness**: Better understanding of large codebases
3. **Tool Integration**: Direct access to MCP servers and development tools
4. **Flexibility**: No rigid workflow constraints

---

*This CPQ system is now optimized for Cline's natural language approach while maintaining all the sophisticated business logic and quality standards from the original Claude Code setup.*
