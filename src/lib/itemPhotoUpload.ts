const CLOUDINARY_CLOUD_NAME = 'ddhqvv77g'
const CLOUDINARY_UPLOAD_PRESET = 'ml_default'

export async function uploadItemPhoto(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)

  const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) throw new Error('Upload failed')
  const data = await response.json()
  if (!data?.secure_url) throw new Error('Upload did not return an image URL')
  return data.secure_url
}
