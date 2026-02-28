export default function Layout({ title, children }) {
    return (
      <div style={{ marginLeft: '240px', backgroundColor: '#f4f4f4', minHeight: '100vh' }}>
        <div style={{
          height: '60px', backgroundColor: 'white', borderBottom: '1px solid #eee',
          display: 'flex', alignItems: 'center', padding: '0 30px',
          justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10
        }}>
          <h2 style={{ margin: 0, color: '#1a1a1a', fontSize: '18px' }}>{title}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ backgroundColor: '#CC0000', color: 'white', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>
              + New Document
            </div>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#0056B3', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '14px', fontWeight: 'bold' }}>
              A
            </div>
          </div>
        </div>
        <div style={{ padding: '30px' }}>{children}</div>
      </div>
    )
  }