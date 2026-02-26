function App() {
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '40px', backgroundColor: '#f4f4f4', minHeight: '100vh' }}>
      
      <div style={{ backgroundColor: '#CC0000', padding: '20px 30px', borderRadius: '8px', marginBottom: '30px' }}>
        <h1 style={{ color: 'white', margin: 0, fontSize: '28px' }}>BIGDROPS</h1>
        <p style={{ color: '#ffcccc', margin: '5px 0 0 0', fontSize: '14px' }}>Business Management Platform</p>
      </div>

      <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <h2 style={{ color: '#0056B3', marginTop: 0 }}>Welcome to BIGDROPS</h2>
        <p style={{ color: '#555' }}>Your app is running. Let's build something great.</p>
        
        <div style={{ display: 'flex', gap: '15px', marginTop: '20px' }}>
          <div style={{ backgroundColor: '#CC0000', color: 'white', padding: '15px 20px', borderRadius: '6px', cursor: 'pointer' }}>
            📄 Invoices
          </div>
          <div style={{ backgroundColor: '#0056B3', color: 'white', padding: '15px 20px', borderRadius: '6px', cursor: 'pointer' }}>
            📋 Quotations
          </div>
          <div style={{ backgroundColor: '#333', color: 'white', padding: '15px 20px', borderRadius: '6px', cursor: 'pointer' }}>
            🔧 CSR
          </div>
        </div>
      </div>

    </div>
  )
}

export default App