# CPQ System Setup Instructions

## 🎯 IMPORTANT: How to Ensure Claude Works Only on CPQ

### The Problem
Claude's default working directory is set to Kurate.io, so new terminals always start there.

### The Solution
**ALWAYS open the CPQ workspace file, not the folder:**

1. **Open VS Code with the workspace file:**
   ```
   code "c:\Users\Eli\Desktop\Claude Code\CPQ-System\CPQ-System.code-workspace"
   ```

2. **Or double-click this file in File Explorer:**
   ```
   CPQ-System.code-workspace
   ```

### What This Does
- Sets the terminal default directory to CPQ-System
- Configures VS Code settings specifically for CPQ
- Ensures all new terminals start in the right place
- Separates CPQ from Kurate completely

### For Claude/Cline
When giving instructions to Claude:
- **Start with:** "Open the CPQ workspace first"
- **Reference:** "Work in the CPQ-System directory"
- **Avoid:** Don't let Claude work in the parent directory

### Verification
To verify you're in the right place:
1. Open a new terminal in VS Code
2. Run `pwd` or `cd`
3. Should show: `C:\Users\Eli\Desktop\Claude Code\CPQ-System`

### Quick Start Commands
```bash
# Open CPQ workspace (RECOMMENDED)
code "c:\Users\Eli\Desktop\Claude Code\CPQ-System\CPQ-System.code-workspace"

# Start CPQ development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

### Workspace Settings Included
- Terminal default directory: CPQ-System
- Default language: TypeScript
- Format on save: Enabled
- ESLint auto-fix: Enabled
- Recommended extensions: Pre-configured

---

**Remember: The workspace file is the key - it keeps CPQ completely separate from Kurate!**
