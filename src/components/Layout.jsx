export default function Layout({ title, children }) {
  return (
    <div style={{ marginLeft: '240px', backgroundColor: '#F7F7F5', minHeight: '100vh' }}>
      <div style={{
        height: '60px', backgroundColor: 'white', borderBottom: '1px solid #EBEBEB',
        display: 'flex', alignItems: 'center', padding: '0 30px',
        justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10
      }}>
        <h2 style={{ margin: 0, color: '#1A1A1A', fontSize: '16px', fontWeight: '600', letterSpacing: '-0.3px' }}>{title}</h2>
        <div style={{ width: '34px', height: '34px', borderRadius: '50%', backgroundColor: '#1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '13px', fontWeight: '600' }}>
          A
        </div>
      </div>
      <div style={{ padding: '28px 30px' }}>{children}</div>
    </div>
  )
}