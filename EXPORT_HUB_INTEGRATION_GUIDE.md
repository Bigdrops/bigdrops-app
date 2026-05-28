# Export & Lifetime Data Hub — Integration Guide

## 🔗 How to Integrate into Your Application

### Step 1: Import the Components

```typescript
import { LifetimeDataHub } from './pages/LifetimeDataHub';
import { ExportDropdownRow } from './components/export/ExportDropdownRow';
import { 
  InheritedExportContext, 
  ExportFormat, 
  ExportModuleDomain 
} from './types/exportHub';
```

---

### Step 2: Prepare the Inherited Context

The `InheritedExportContext` should be populated from your active module view's filter state:

```typescript
// Example: From Invoices module view
const buildExportContext = (filterState: InvoiceFilterState): InheritedExportContext => {
  return {
    clientId: filterState.selectedClientId || null,
    statuses: filterState.selectedStatuses,
    dateRange: filterState.dateRange ? {
      start: filterState.dateRange.from?.toISOString() || null,
      end: filterState.dateRange.to?.toISOString() || null,
    } : null,
    amountRange: filterState.amountRange ? {
      min: filterState.amountRange.min,
      max: filterState.amountRange.max,
    } : null,
    searchTokens: filterState.searchQuery.split(' ').filter(Boolean),
    sortBy: filterState.sortBy,
    sortDirection: filterState.sortDirection,
  };
};
```

---

### Step 3: Add Route Navigation

```typescript
// In your router configuration (React Router example)
import { LifetimeDataHub } from './pages/LifetimeDataHub';

const router = createBrowserRouter([
  {
    path: '/invoices',
    element: <Invoices />,
  },
  {
    path: '/invoices/export',
    element: <LifetimeDataHub 
      inheritedContext={/* from parent state */}
      onNavigateBack={() => navigate(-1)}
      matchingRecordsCount={/* from query result */}
    />,
  },
  // ... other routes
]);
```

---

### Step 4: Add Export Button to Module Toolbar

```typescript
// In your module view (e.g., Invoices.tsx)
import { Download } from 'lucide-react';

export const Invoices: React.FC = () => {
  const [filterState, setFilterState] = useState<InvoiceFilterState>({...});
  const [matchingCount, setMatchingCount] = useState(0);
  const navigate = useNavigate();

  const handleOpenExportHub = () => {
    const context = buildExportContext(filterState);
    // Store context in state or URL params
    navigate('/invoices/export', { 
      state: { context, matchingCount } 
    });
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleOpenExportHub}
          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <Download className="w-4 h-4" />
          <span className="text-sm font-medium">Export Data</span>
        </button>
      </div>

      {/* Module content */}
      {/* ... */}
    </div>
  );
};
```

---

### Step 5: Implement Backend Export Service (Stage 2)

Create a service to handle export operations:

```typescript
// src/services/exportService.ts
import { 
  ExportOperationRequest, 
  ExportOperationResponse 
} from '../types/exportHub';

export const exportService = {
  async executeExport(
    request: ExportOperationRequest
  ): Promise<ExportOperationResponse> {
    const response = await fetch('/api/exports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Export failed: ${response.statusText}`);
    }

    return response.json();
  },

  async getExportHistory(): Promise<ExportOperationResponse[]> {
    const response = await fetch('/api/exports/history');
    return response.json();
  },

  async cancelExport(operationId: string): Promise<void> {
    await fetch(`/api/exports/${operationId}`, { method: 'DELETE' });
  },
};
```

---

### Step 6: Update LifetimeDataHub to Use Service

Replace the placeholder in `src/pages/LifetimeDataHub.tsx`:

```typescript
import { exportService } from '../services/exportService';
import { useToast } from '../hooks/use-toast'; // Your toast hook

export const LifetimeDataHub: React.FC<LifetimeDataHubProps> = ({
  inheritedContext,
  onNavigateBack,
  matchingRecordsCount,
}) => {
  const [processingStates, setProcessingStates] = useState<
    Partial<Record<ExportModuleDomain, boolean>>
  >({});
  const { toast } = useToast();

  const handleExecuteExport = async (
    domain: ExportModuleDomain,
    format: ExportFormat
  ) => {
    setProcessingStates((prev) => ({ ...prev, [domain]: true }));
    try {
      const response = await exportService.executeExport({
        domain,
        format,
        context: inheritedContext,
      });

      // Trigger download
      const link = document.createElement('a');
      link.href = response.downloadUrl;
      link.download = response.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: 'Export Successful',
        description: `${response.recordCount} records exported`,
        variant: 'default',
      });
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: 'Export Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setProcessingStates((prev) => ({ ...prev, [domain]: false }));
    }
  };

  // ... rest of component
};
```

---

## 📊 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ Module View (e.g., Invoices)                                │
│ - Filter State (client, status, date, amount, search)       │
│ - Matching Records Count                                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ buildExportContext()
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ LifetimeDataHub                                             │
│ - Receives InheritedExportContext                           │
│ - Displays 9 export domains                                 │
│ - Shows matching records count                              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ handleExecuteExport(domain, format)
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ ExportService                                               │
│ - POST /api/exports                                         │
│ - Sends ExportOperationRequest                              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ ExportOperationRequest
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ Backend Export Pipeline                                     │
│ - Validate permissions                                      │
│ - Query data with inherited filters                         │
│ - Generate export file (PDF/CSV/JSON)                       │
│ - Create signed download URL                                │
│ - Return ExportOperationResponse                            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ ExportOperationResponse
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ Browser Download                                            │
│ - Trigger file download via signed URL                      │
│ - Show success toast notification                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔐 Permission Validation

Implement permission checks in your backend:

```typescript
// Backend example (Node.js/Express)
app.post('/api/exports', async (req, res) => {
  const { domain, format, context } = req.body;
  const user = req.user; // From auth middleware

  // Permission mapping
  const permissionMap: Record<ExportModuleDomain, string> = {
    INVOICES: 'read:sales',
    QUOTATIONS: 'read:sales',
    WAYBILLS: 'read:logistics',
    PROJECTS: 'read:projects',
    RFQS: 'read:procurement',
    BOQS: 'read:engineering',
    PRICE_HISTORY: 'read:analytics',
    CLIENTS: 'read:clients',
    CSR: 'read:support',
  };

  const requiredPermission = permissionMap[domain];
  if (!user.permissions.includes(requiredPermission)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }

  // Process export...
});
```

---

## 🧪 Testing Examples

### Unit Test: Type Contracts

```typescript
import { ExportFormat, ExportModuleDomain } from '../types/exportHub';

describe('Export Hub Types', () => {
  it('should have all 9 domains', () => {
    const domains: ExportModuleDomain[] = [
      'INVOICES', 'QUOTATIONS', 'WAYBILLS', 'PROJECTS', 'RFQS',
      'BOQS', 'PRICE_HISTORY', 'CLIENTS', 'CSR'
    ];
    expect(domains).toHaveLength(9);
  });

  it('should have all 4 export formats', () => {
    const formats: ExportFormat[] = [
      'PDF_LEDGER', 'CSV_SUMMARY', 'CSV_FLATTENED_LINE_ITEMS', 'JSON_RAW'
    ];
    expect(formats).toHaveLength(4);
  });
});
```

### Component Test: ExportDropdownRow

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { ExportDropdownRow } from '../components/export/ExportDropdownRow';

describe('ExportDropdownRow', () => {
  it('should toggle accordion on header click', () => {
    const mockItem = {
      id: 'INVOICES',
      title: 'Invoices',
      subtitle: 'Test',
      supportedFormats: ['PDF_LEDGER'],
      requiredPermission: 'read:sales',
    };

    render(
      <ExportDropdownRow
        item={mockItem}
        onExecuteExport={jest.fn()}
        isProcessing={false}
      />
    );

    const header = screen.getByText('Invoices');
    fireEvent.click(header);

    expect(screen.getByText('Download as PDF')).toBeVisible();
  });

  it('should disable buttons during processing', () => {
    const mockItem = {
      id: 'INVOICES',
      title: 'Invoices',
      subtitle: 'Test',
      supportedFormats: ['PDF_LEDGER'],
      requiredPermission: 'read:sales',
    };

    const { rerender } = render(
      <ExportDropdownRow
        item={mockItem}
        onExecuteExport={jest.fn()}
        isProcessing={false}
      />
    );

    // Open accordion
    fireEvent.click(screen.getByText('Invoices'));

    // Rerender with processing state
    rerender(
      <ExportDropdownRow
        item={mockItem}
        onExecuteExport={jest.fn()}
        isProcessing={true}
      />
    );

    const downloadButton = screen.getByText('Download as PDF').closest('button');
    expect(downloadButton).toBeDisabled();
  });
});
```

---

## 🎯 Success Criteria Checklist

- [ ] Types compile with zero errors
- [ ] Components render without warnings
- [ ] Touch targets are 44x44px minimum
- [ ] Dark mode works correctly
- [ ] All 9 domains display
- [ ] Accordion toggle works smoothly
- [ ] Processing state prevents double-clicks
- [ ] Export context is inherited correctly
- [ ] Backend integration is complete
- [ ] Download URLs are signed and time-limited
- [ ] Permission checks are enforced
- [ ] Error handling shows user-friendly messages
- [ ] Export history is tracked
- [ ] Analytics capture export events

---

## 📚 Related Documentation

- [Export Hub Implementation](./EXPORT_HUB_IMPLEMENTATION.md)
- [Skills Reference](./EXPORT_HUB_SKILLS_REFERENCE.md)
- [Type Definitions](./src/types/exportHub.ts)
- [Component Source](./src/components/export/ExportDropdownRow.tsx)
- [Page Source](./src/pages/LifetimeDataHub.tsx)

---

## 🚀 Deployment Checklist

- [ ] Environment variables configured (API endpoints, signing keys)
- [ ] Backend export pipeline deployed
- [ ] Signed URL generation implemented
- [ ] Permission system integrated
- [ ] Error logging configured
- [ ] Analytics tracking added
- [ ] Rate limiting configured
- [ ] File storage (S3/GCS) configured
- [ ] Cleanup job for expired exports scheduled
- [ ] User documentation updated

---

**Ready for Stage 2 Backend Integration!** 🎉
