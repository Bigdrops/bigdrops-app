import { pdf } from '@react-pdf/renderer'
import type { WaybillType } from './waybillUtils'

function BlankExternalTemplate() {
  return (
    <div style={{ padding: 40, fontFamily: 'Helvetica', fontSize: 10, color: '#1a1a1a' }}>
      <div style={{ textAlign: 'center', marginBottom: 20, borderBottom: '2px solid #000', paddingBottom: 10 }}>
        <div style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 4 }}>BIGDROPS</div>
        <div style={{ fontSize: 12, fontWeight: 'bold' }}>EXTERNAL DELIVERY NOTE</div>
        <div style={{ fontSize: 9, color: '#666', marginTop: 4 }}>Waybill No: ____________________</div>
      </div>

      <div style={{ display: 'flex', gap: 20, marginBottom: 20 }}>
        <div style={{ flex: 1, border: '1px solid #000', padding: 10 }}>
          <div style={{ fontWeight: 'bold', marginBottom: 6, borderBottom: '1px solid #000', paddingBottom: 4 }}>Sender</div>
          <div style={{ marginBottom: 8 }}>Name: _________________________</div>
          <div style={{ marginBottom: 8 }}>Phone: ________________________</div>
          <div>Address: _____________________</div>
        </div>
        <div style={{ flex: 1, border: '1px solid #000', padding: 10 }}>
          <div style={{ fontWeight: 'bold', marginBottom: 6, borderBottom: '1px solid #000', paddingBottom: 4 }}>Receiver</div>
          <div style={{ marginBottom: 8 }}>Name: _________________________</div>
          <div style={{ marginBottom: 8 }}>Phone: ________________________</div>
          <div>Address: _____________________</div>
        </div>
      </div>

      <div style={{ border: '1px solid #000', marginBottom: 20 }}>
        <div style={{ fontWeight: 'bold', borderBottom: '1px solid #000', padding: 8, backgroundColor: '#f0f0f0' }}>Items</div>
        <table style={{ width: '100%', fontSize: 9 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #000' }}>
              <th style={{ padding: 6, textAlign: 'left', borderRight: '1px solid #000' }}>#</th>
              <th style={{ padding: 6, textAlign: 'left', borderRight: '1px solid #000' }}>Description</th>
              <th style={{ padding: 6, textAlign: 'left', borderRight: '1px solid #000' }}>Quantity</th>
              <th style={{ padding: 6, textAlign: 'left', borderRight: '1px solid #000' }}>Unit</th>
              <th style={{ padding: 6, textAlign: 'left' }}>Notes</th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5].map((i) => (
              <tr key={i} style={{ borderBottom: '1px solid #000' }}>
                <td style={{ padding: 6, borderRight: '1px solid #000' }}>{i}</td>
                <td style={{ padding: 6, borderRight: '1px solid #000' }}>_________________________</td>
                <td style={{ padding: 6, borderRight: '1px solid #000' }}>__________</td>
                <td style={{ padding: 6, borderRight: '1px solid #000' }}>__________</td>
                <td style={{ padding: 6 }}>_________________________</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', gap: 20, marginBottom: 20 }}>
        <div style={{ flex: 1, border: '1px solid #000', padding: 10 }}>
          <div style={{ fontWeight: 'bold', marginBottom: 6, borderBottom: '1px solid #000', paddingBottom: 4 }}>Invoice Reference</div>
          <div style={{ marginBottom: 8 }}>Invoice No: ___________________</div>
          <div>Invoice Date: _________________</div>
        </div>
        <div style={{ flex: 1, border: '1px solid #000', padding: 10 }}>
          <div style={{ fontWeight: 'bold', marginBottom: 6, borderBottom: '1px solid #000', paddingBottom: 4 }}>Vehicle Info</div>
          <div style={{ marginBottom: 8 }}>Plate: ________________________</div>
          <div>Driver: ______________________</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 20 }}>
        <div style={{ flex: 1, border: '1px solid #000', padding: 10 }}>
          <div style={{ fontWeight: 'bold', marginBottom: 6, borderBottom: '1px solid #000', paddingBottom: 4 }}>Sender Signature</div>
          <div style={{ height: 60 }} />
          <div style={{ borderTop: '1px solid #000', paddingTop: 4, fontSize: 8 }}>Date: _________________</div>
        </div>
        <div style={{ flex: 1, border: '1px solid #000', padding: 10 }}>
          <div style={{ fontWeight: 'bold', marginBottom: 6, borderBottom: '1px solid #000', paddingBottom: 4 }}>Receiver Signature</div>
          <div style={{ height: 60 }} />
          <div style={{ borderTop: '1px solid #000', paddingTop: 4, fontSize: 8 }}>Date: _________________</div>
        </div>
      </div>
    </div>
  )
}

function BlankInternalTemplate() {
  return (
    <div style={{ padding: 40, fontFamily: 'Helvetica', fontSize: 10, color: '#1a1a1a' }}>
      <div style={{ textAlign: 'center', marginBottom: 20, borderBottom: '2px solid #000', paddingBottom: 10 }}>
        <div style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 4 }}>BIGDROPS</div>
        <div style={{ fontSize: 12, fontWeight: 'bold' }}>INTERNAL TRANSFER NOTE</div>
        <div style={{ fontSize: 9, color: '#666', marginTop: 4 }}>Waybill No: ____________________</div>
      </div>

      <div style={{ display: 'flex', gap: 20, marginBottom: 20 }}>
        <div style={{ flex: 1, border: '1px solid #000', padding: 10 }}>
          <div style={{ fontWeight: 'bold', marginBottom: 6, borderBottom: '1px solid #000', paddingBottom: 4 }}>Origin</div>
          <div style={{ marginBottom: 8 }}>Depot: ________________________</div>
          <div style={{ marginBottom: 8 }}>Contact: ______________________</div>
          <div>Date: _______________________</div>
        </div>
        <div style={{ flex: 1, border: '1px solid #000', padding: 10 }}>
          <div style={{ fontWeight: 'bold', marginBottom: 6, borderBottom: '1px solid #000', paddingBottom: 4 }}>Destination</div>
          <div style={{ marginBottom: 8 }}>Depot: ________________________</div>
          <div style={{ marginBottom: 8 }}>Contact: ______________________</div>
          <div>Date: _______________________</div>
        </div>
      </div>

      <div style={{ border: '1px solid #000', marginBottom: 20 }}>
        <div style={{ fontWeight: 'bold', borderBottom: '1px solid #000', padding: 8, backgroundColor: '#f0f0f0' }}>Items</div>
        <table style={{ width: '100%', fontSize: 9 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #000' }}>
              <th style={{ padding: 6, textAlign: 'left', borderRight: '1px solid #000' }}>#</th>
              <th style={{ padding: 6, textAlign: 'left', borderRight: '1px solid #000' }}>Description</th>
              <th style={{ padding: 6, textAlign: 'left', borderRight: '1px solid #000' }}>Quantity</th>
              <th style={{ padding: 6, textAlign: 'left', borderRight: '1px solid #000' }}>Unit</th>
              <th style={{ padding: 6, textAlign: 'left' }}>Notes</th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5].map((i) => (
              <tr key={i} style={{ borderBottom: '1px solid #000' }}>
                <td style={{ padding: 6, borderRight: '1px solid #000' }}>{i}</td>
                <td style={{ padding: 6, borderRight: '1px solid #000' }}>_________________________</td>
                <td style={{ padding: 6, borderRight: '1px solid #000' }}>__________</td>
                <td style={{ padding: 6, borderRight: '1px solid #000' }}>__________</td>
                <td style={{ padding: 6 }}>_________________________</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', gap: 20, marginBottom: 20 }}>
        <div style={{ flex: 1, border: '1px solid #000', padding: 10 }}>
          <div style={{ fontWeight: 'bold', marginBottom: 6, borderBottom: '1px solid #000', paddingBottom: 4 }}>Purpose</div>
          <div style={{ marginBottom: 8 }}>☐ Transfer  ☐ Maintenance  ☐ Other</div>
          <div>Notes: ______________________</div>
        </div>
        <div style={{ flex: 1, border: '1px solid #000', padding: 10 }}>
          <div style={{ fontWeight: 'bold', marginBottom: 6, borderBottom: '1px solid #000', paddingBottom: 4 }}>Vehicle Info</div>
          <div style={{ marginBottom: 8 }}>Plate: ________________________</div>
          <div>Driver: ______________________</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 20 }}>
        <div style={{ flex: 1, border: '1px solid #000', padding: 10 }}>
          <div style={{ fontWeight: 'bold', marginBottom: 6, borderBottom: '1px solid #000', paddingBottom: 4 }}>Sender Signature</div>
          <div style={{ height: 60 }} />
          <div style={{ borderTop: '1px solid #000', paddingTop: 4, fontSize: 8 }}>Date: _________________</div>
        </div>
        <div style={{ flex: 1, border: '1px solid #000', padding: 10 }}>
          <div style={{ fontWeight: 'bold', marginBottom: 6, borderBottom: '1px solid #000', paddingBottom: 4 }}>Receiver Signature</div>
          <div style={{ height: 60 }} />
          <div style={{ borderTop: '1px solid #000', paddingTop: 4, fontSize: 8 }}>Date: _________________</div>
        </div>
      </div>
    </div>
  )
}

export async function downloadBlankWaybillTemplate(type: WaybillType): Promise<void> {
  const element = type === 'internal' ? <BlankInternalTemplate /> : <BlankExternalTemplate />

  const blob = await pdf(element).toBlob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `blank-${type}-waybill.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
