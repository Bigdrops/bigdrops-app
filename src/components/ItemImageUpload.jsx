import { useRef, useState } from 'react'

const CLOUD_NAME = 'ddhqvv77g'
const UPLOAD_PRESET = 'ml_default'

export default function ItemImageUpload({ value, onChange }) {
  const ref = useRef()
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  const handleFile = async (file) => {
    if (!file) return
    setUploading(true)
    setProgress(0)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('upload_preset', UPLOAD_PRESET)

      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) throw new Error('Upload failed')
      const data = await res.json()
      onChange(data.secure_url)
    } catch (e) {
      alert('Image upload failed: ' + e.message)
    }
    setUploading(false)
    setProgress(0)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) handleFile(file)
  }

  if (value) {
    return (
      <div style={{ marginTop: '6px' }}>
        <a href={value} target="_blank" rel="noreferrer">
          <img
            src={value}
            alt="Item"
            style={{ width: '56px', height: '56px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #eee', display: 'block', cursor: 'pointer' }}
          />
        </a>
        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
          <div onClick={() => ref.current.click()} style={{ fontSize: '11px', color: '#6366F1', cursor: 'pointer' }}>Change</div>
          <div onClick={() => onChange(null)} style={{ fontSize: '11px', color: '#CC0000', cursor: 'pointer' }}>Remove</div>
        </div>
        <input ref={ref} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
      </div>
    )
  }

  return (
    <div
      onClick={() => ref.current.click()}
      onDrop={handleDrop}
      onDragOver={e => e.preventDefault()}
      style={{
        marginTop: '6px', width: '56px', height: '56px',
        border: '2px dashed #ddd', borderRadius: '6px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', color: '#bbb', fontSize: uploading ? '10px' : '20px',
        flexDirection: 'column', gap: '2px', textAlign: 'center',
        backgroundColor: uploading ? '#f9f9f9' : 'white',
      }}
      title="Add image"
    >
      {uploading ? (
        <>
          <div style={{ fontSize: '14px' }}>⏳</div>
          <div style={{ fontSize: '9px', color: '#aaa' }}>Uploading</div>
        </>
      ) : '🖼'}
      <input ref={ref} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
    </div>
  )
}
