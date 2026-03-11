/**
 * ViewMobileItemCard.jsx
 * 
 * Read-only vertical card for viewing invoice line items on mobile.
 * Used in ViewInvoice page to replace horizontal scrolling table.
 */

export default function ViewMobileItemCard({ item, number }) {
  const cardStyle = {
    backgroundColor: 'white',
    border: '1px solid #e8e8e8',
    borderRadius: '10px',
    padding: '14px',
    marginBottom: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  }

  const labelStyle = {
    fontSize: '11px',
    fontWeight: '700',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '4px',
  }

  const valueStyle = {
    fontSize: '14px',
    color: '#1a1a1a',
    lineHeight: '1.4',
  }

  const rowStyle = {
    marginBottom: '10px',
  }

  // Group header card
  if (item.row_type === 'group_header') {
    return (
      <div style={{
        backgroundColor: '#333',
        borderRadius: '8px',
        padding: '12px 14px',
        marginBottom: '10px',
      }}>
        <div style={{ color: 'white', fontWeight: 'bold', fontSize: '14px' }}>
          {item.group_name}
        </div>
      </div>
    )
  }

  // Calculate amount
  const amount = item.amount || (item.quantity * item.unit_price) || 0

  return (
    <div style={cardStyle}>
      {/* Item number badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
        <span style={{
          width: '26px',
          height: '26px',
          borderRadius: '50%',
          backgroundColor: '#1a1a1a',
          color: 'white',
          fontSize: '12px',
          fontWeight: '700',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          {number}
        </span>
        <div style={{ flex: 1, borderBottom: '1px solid #eee' }}></div>
      </div>

      {/* Description */}
      <div style={rowStyle}>
        <div style={labelStyle}>Description</div>
        <div style={valueStyle}>
          <div style={{ fontWeight: '600' }}>{item.description}</div>
          {item.sub_description && (
            <div style={{ fontSize: '12px', color: '#888', fontStyle: 'italic', marginTop: '2px' }}>
              {item.sub_description}
            </div>
          )}
        </div>
      </div>

      {/* Make/Brand */}
      {item.make && (
        <div style={rowStyle}>
          <div style={labelStyle}>Make / Brand</div>
          <div style={valueStyle}>{item.make}</div>
        </div>
      )}

      {/* Quantity & Unit - side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
        <div>
          <div style={labelStyle}>Quantity</div>
          <div style={valueStyle}>{item.quantity}</div>
        </div>
        {item.unit && (
          <div>
            <div style={labelStyle}>Unit</div>
            <div style={valueStyle}>{item.unit}</div>
          </div>
        )}
      </div>

      {/* Unit Price & Amount - side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
        <div>
          <div style={labelStyle}>Unit Price</div>
          <div style={valueStyle}>₦{Number(item.unit_price || 0).toLocaleString()}</div>
        </div>
        <div>
          <div style={labelStyle}>Amount</div>
          <div style={{ 
            fontSize: '15px', 
            fontWeight: '700', 
            color: '#CC0000',
            padding: '6px 10px',
            backgroundColor: '#fff5f5',
            borderRadius: '6px',
          }}>
            ₦{Number(amount).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Item image if present */}
      {item.image_url && (
        <div style={rowStyle}>
          <div style={labelStyle}>Image</div>
          <img 
            src={item.image_url} 
            alt={item.description}
            style={{
              maxWidth: '100%',
              height: 'auto',
              borderRadius: '6px',
              border: '1px solid #e8e8e8',
              marginTop: '6px',
            }}
          />
        </div>
      )}
    </div>
  )
}
