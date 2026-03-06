import { supabase } from '../supabase'

export default function PendingApproval({ email }) {
  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const containerStyle = {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7F7F5',
    padding: '20px',
  }

  const cardStyle = {
    width: '100%',
    maxWidth: '420px',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
    padding: '28px',
    textAlign: 'center',
  }

  const titleStyle = {
    fontSize: '20px',
    fontWeight: 700,
    marginTop: '8px',
    marginBottom: '8px',
    color: '#111827',
  }

  const messageStyle = {
    fontSize: '13px',
    color: '#4B5563',
    marginBottom: '10px',
    lineHeight: 1.6,
  }

  // emailStyle removed per design

  const buttonStyle = {
    padding: '9px 16px',
    borderRadius: '999px',
    border: 'none',
    backgroundColor: '#CC0000',
    color: 'white',
    fontWeight: 600,
    fontSize: '14px',
    cursor: 'pointer',
    marginTop: '4px',
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#F7F7F5', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center' 
    }}>
      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: '12px', 
        padding: '40px', 
        width: '100%', 
        maxWidth: '420px', 
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '36px' }}>⛔</div>
        <div style={titleStyle}>Access Restricted</div>
        <div style={messageStyle}>
          Your account is pending activation. Please contact the Admin to activate your account and assign your device ID.
        </div>
        <button
          type="button"
          style={buttonStyle}
          onClick={handleSignOut}
        >
          Sign Out
        </button>
      </div>
    </div>
  )
}

