// Product photos: upload a file (saved in backend/media) or paste an image URL
import { useState } from 'react'
import { uploadImage } from '../../api/manage'
import { getErrorMessage } from '../../utils/format'
import { adminInput } from './adminStyles'

const ImagesEditor = ({ images, onChange }) => {
  const [url, setUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const add = image => onChange([...images, { key: crypto.randomUUID(), ...image }])

  const handleFile = async e => {
    const file = e.target.files[0]
    e.target.value = '' // allow choosing the same file again
    if (!file) return
    setUploading(true)
    setError('')
    try {
      add(await uploadImage(file)) // { path: '/media/products/…', url: 'http://…' }
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {images.map((image, index) => (
          <div key={image.key} className="relative">
            <img src={image.url || image.path} alt="" className="h-24 w-24 rounded-2xl bg-brand-50 object-contain p-2 ring-1 ring-brand-100" />
            {index === 0 && <span className="absolute bottom-1 left-1 rounded-full bg-brand-600 px-2 text-[10px] font-bold text-white">Main</span>}
            <button type="button" onClick={() => onChange(images.filter(i => i.key !== image.key))} className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-white text-xs font-bold text-rose-600 shadow">✕</button>
          </div>
        ))}
        <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-brand-200 text-xs font-bold text-brand-700 hover:bg-brand-50">
          <span className="text-2xl">{uploading ? '⏳' : '📷'}</span>
          {uploading ? 'Uploading' : 'Upload'}
          <input type="file" accept=".jpg,.jpeg,.png,.webp" onChange={handleFile} className="hidden" />
        </label>
      </div>
      <div className="flex gap-2">
        <input value={url} onChange={e => setUrl(e.target.value)} placeholder="…or paste an image URL" className={`${adminInput} flex-1`} />
        <button
          type="button"
          onClick={() => {
            if (url.trim()) add({ path: url.trim() })
            setUrl('')
          }}
          className="rounded-full px-4 text-sm font-bold text-brand-700 ring-1 ring-brand-200"
        >
          Add
        </button>
      </div>
      {error && <p className="text-sm text-rose-600">{error}</p>}
    </div>
  )
}

export default ImagesEditor
