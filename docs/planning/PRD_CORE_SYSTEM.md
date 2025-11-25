# PRD: Core CPQ System Implementation

**Document Version:** 1.0
**Date:** October 31, 2025
**Author:** Claude Code + Eli
**Status:** Planning

## Executive Summary

This PRD outlines the implementation of the core CPQ (Configure, Price, Quote) system for robotics integration, focusing on internal project costing and component management. The system will enable accurate project cost calculations for internal use without customer-facing features initially.

## Problem Statement

Robotics integrators need to quickly and accurately calculate project costs based on components and assemblies. Currently, quote processing and BOM (Bill of Materials) management is handled manually through spreadsheets and folders, leading to inefficiencies and potential errors in cost calculations.

## Solution Overview

A web-based CPQ system that provides:

1. **Component Library Management** - Centralized database of components with pricing
2. **Assembly Builder** - Create hierarchical assemblies from components
3. **BOM Editor** - Excel-like project cost calculation using AG Grid
4. **Internal Project Analysis** - Cost breakdown and reporting for internal use

## User Stories

### Epic 1: Component Library Management

- As a robotics integrator, I want to manually add components to a library so I can build accurate project estimates
- As a user, I want to categorize components by type and manufacturer so I can easily find what I need
- As a user, I want to track price history for components so I can see cost trends over time

### Epic 2: Assembly Building

- As a robotics integrator, I want to create assemblies from multiple components so I can reuse common configurations
- As a user, I want to see automatic cost roll-up for assemblies so I understand their total cost
- As a user, I want to build hierarchical assemblies so I can create complex sub-systems

### Epic 3: BOM Editing & Project Costing

- As a project manager, I want to build BOMs using components and assemblies so I can calculate project costs
- As a user, I want to use an Excel-like interface so I can work efficiently
- As a user, I want to see real-time cost calculations so I can make informed decisions

## Functional Requirements

### 1. Component Management

- **CRUD Operations**: Create, Read, Update, Delete components
- **Component Fields**:
  - Name
  - Manufacturer Part Number (MFR P/N)
  - Manufacturer
  - Category
  - Current Cost
  - Description (optional)
- **Category Management**: Default categories for robotics components (PLCs, Sensors, Actuators, etc.)
- **Search & Filter**: Find components by name, manufacturer, category, or MFR P/N
- **Price History**: Track cost changes over time with manual entry

### 2. Assembly Builder

- **Assembly Creation**: Build assemblies from components and other assemblies
- **Hierarchical Structure**: Support nested assemblies (assemblies within assemblies)
- **Cost Roll-up**: Automatic calculation of total assembly cost based on components
- **Component Quantities**: Specify quantities of each component in assembly
- **Validation**: Prevent circular references in assembly definitions
- **Assembly Fields**:
  - Name
  - Description
  - Components list (with quantities)
  - Total Cost (calculated)

### 3. BOM Editor

- **Project Creation**: Create new projects with basic information
  - Project Name
  - Customer Name (internal reference)
  - Description
- **BOM Building**: Add components and assemblies to project BOM
- **Excel-like Interface**: AG Grid with drag-drop functionality
- **Real-time Calculations**:
  - Line item totals (quantity × unit cost)
  - Project total cost
  - Margin calculations (when applicable)
- **BOM Operations**:
  - Add/remove items
  - Edit quantities
  - Reorder items (drag-drop)
  - Duplicate items
- **Project Management**: Save, load, and delete projects

### 4. Internal Cost Analysis

- **Cost Breakdown**: View project costs by component, assembly, and category
- **Component Usage**: See which projects use specific components
- **Price Tracking**: Monitor component cost trends over time
- **Export Functionality**: Export project data to CSV/Excel for external analysis

## Non-Functional Requirements

### Performance

- Support BOMs with up to 500 items without performance degradation
- Real-time calculations update within 100ms for typical BOM sizes
- Page load times under 2 seconds

### Security

- All data access controlled via Supabase RLS policies
- User-based data isolation (each user sees only their data)
- Input validation and sanitization
- No external data exposure

### Usability

- Intuitive Excel-like interface for BOM editing
- Responsive design for desktop and tablet use
- Keyboard navigation support
- Clear error messages and validation feedback

### Data Integrity

- All pricing calculations must be accurate to 2 decimal places
- Assembly cost roll-up must be mathematically correct
- Historical price data must never be deleted
- All cost calculations must be traceable to source data

## Technical Architecture

### Frontend

- **Framework**: React 18.2.0 with TypeScript
- **UI Components**: Shadcn/ui with Tailwind CSS
- **Data Grid**: AG Grid Community for BOM editing
- **State Management**: React Context API
- **Build Tool**: Vite

### Backend & Database

- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **File Storage**: Supabase Storage (for future OCR use)
- **API**: RESTful API via PostgREST

### Key Dependencies

- AG Grid Community (Excel-like functionality)
- Radix UI (Accessible components)
- React Hook Form + Zod (Form validation)
- Date-fns (Date handling)
- Lucide React (Icons)

## Implementation Phases

### Phase 1: Component Library Foundation (Week 1-2)

**Goal**: Core data structure and component management

#### Deliverables:

1. **Database Schema**
   - components table
   - assemblies table
   - price_history table
   - categories table

2. **Component Management UI**
   - Component list with search/filter
   - Add/Edit component form
   - Category management
   - Price history tracking

3. **Service Layer**
   - Component CRUD operations
   - Assembly management
   - Price history handling

#### Acceptance Criteria:

- [ ] Users can add components with all required fields
- [ ] Components can be categorized and searched
- [ ] Price history can be tracked manually
- [ ] Data persists in Supabase database
- [ ] Basic CRUD operations work correctly

### Phase 2: Assembly Builder (Week 2-3)

**Goal**: Create hierarchical assemblies with cost roll-up

#### Deliverables:

1. **Assembly Management UI**
   - Assembly creation/editing form
   - Component selection interface
   - Assembly tree view
   - Cost roll-up display

2. **Calculation Engine**
   - Assembly cost calculation logic
   - Circular reference detection
   - Hierarchical cost roll-up

#### Acceptance Criteria:

- [ ] Users can create assemblies from components
- [ ] Assembly costs calculate correctly
- [ ] Nested assemblies are supported
- [ ] Circular references are prevented
- [ ] Assembly totals update when component prices change

### Phase 3: BOM Editor & Project Management (Week 3-4)

**Goal**: Project creation and BOM editing with AG Grid

#### Deliverables:

1. **Project Management**
   - Project creation/editing
   - Project list and search
   - Project deletion

2. **BOM Editor**
   - AG Grid integration for BOM editing
   - Component/assembly addition to BOM
   - Real-time cost calculations
   - Drag-drop reordering

3. **Cost Calculation**
   - Line item totals
   - Project totals
   - Margin calculations
   - Cost breakdown analysis

#### Acceptance Criteria:

- [ ] Users can create projects and build BOMs
- [ ] AG Grid provides Excel-like editing experience
- [ ] Real-time calculations work correctly
- [ ] Projects can be saved and loaded
- [ ] Cost calculations are accurate and traceable

### Phase 4: Internal Reporting (Week 4-5)

**Goal**: Cost analysis and reporting for internal use

#### Deliverables:

1. **Cost Analysis Dashboard**
   - Project cost breakdown
   - Component usage analysis
   - Price trend visualization

2. **Export Functionality**
   - CSV export for project data
   - Excel-compatible format
   - Component library export

#### Acceptance Criteria:

- [ ] Users can view cost breakdowns by category
- [ ] Component usage reports are available
- [ ] Data can be exported to external tools
- [ ] Price history is visualized effectively

## Future Enhancements (Out of Scope for MVP)

### Quote Upload & OCR Processing

- PDF and image upload functionality
- Hebrew/English OCR processing
- Automatic data extraction and validation
- Multi-currency support
- Shipping cost management

### Advanced Features

- Customer-facing quote generation
- PDF quote output
- Advanced analytics and reporting
- Integration with external suppliers
- Mobile application

## Success Metrics

### User Adoption

- Users can create and manage 50+ components within first week
- Average BOM creation time reduced from manual spreadsheets
- 100% data accuracy in cost calculations

### Performance

- Page load times under 2 seconds
- Real-time calculations under 100ms
- Support for 500+ item BOMs

### Business Impact

- Reduced time spent on project cost estimation
- Improved accuracy in project pricing
- Better visibility into component costs and usage

## Risks & Mitigations

### Technical Risks

- **AG Grid Complexity**: Mitigation through thorough testing and documentation
- **Data Integrity**: Mitigation through comprehensive validation and error handling
- **Performance**: Mitigation through optimization and load testing

### Business Risks

- **User Adoption**: Mitigation through intuitive UI design and training materials
- **Data Migration**: Mitigation through clear import/export functionality
- **Feature Scope**: Mitigation through phased implementation approach

## Dependencies

### External Dependencies

- Supabase (Backend & Authentication)
- AG Grid (Data Grid functionality)
- Google Cloud Vision (Future OCR integration)

### Internal Dependencies

- Component Library must be completed before Assembly Builder
- Assembly Builder must be completed before BOM Editor
- All core modules must be completed before reporting

## Timeline

| Phase                       | Duration | Start Date | End Date | Status   |
| --------------------------- | -------- | ---------- | -------- | -------- |
| Phase 1: Component Library  | 2 weeks  | TBD        | TBD      | Planning |
| Phase 2: Assembly Builder   | 1 week   | TBD        | TBD      | Planning |
| Phase 3: BOM Editor         | 1 week   | TBD        | TBD      | Planning |
| Phase 4: Internal Reporting | 1 week   | TBD        | TBD      | Planning |

**Total Estimated Timeline**: 4-5 weeks

## Conclusion

This PRD outlines a focused approach to building the core CPQ system functionality. By prioritizing manual data entry and internal project costing, we can create a solid foundation that delivers immediate value while setting the stage for future automation through OCR and advanced features.

The phased approach ensures that each module is completed thoroughly before moving to the next, minimizing risk and ensuring a high-quality, reliable system for internal project cost calculation.
