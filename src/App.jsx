import { useEffect, useRef, useState } from 'react'
import exifr from 'exifr'
import DropZone from './components/DropZone'
import MetadataPanel from './components/MetadataPanel'
import './App.css'

// Read natural pixel dimensions from an object URL.
function readDimensions(url) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = () => resolve({ width: null, height: null })
    img.src = url
  })
}

export default function App() {
  const [imageUrl, setImageUrl] = useState(null)
  const [fileInfo, setFileInfo] = useState(null)
  const [metadata, setMetadata] = useState(null)
  const [status, setStatus] = useState('idle') // idle | parsing | done
  const [error, setError] = useState(null)

  // Keep a ref to the current object URL so we can revoke it when replaced/unmounted.
  const urlRef = useRef(null)

  useEffect(() => {
    return () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    }
  }, [])

  async function handleFile(file) {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    const url = URL.createObjectURL(file)
    urlRef.current = url

    setImageUrl(url)
    setMetadata(null)
    setError(null)
    setStatus('parsing')

    const dims = await readDimensions(url)
    setFileInfo({
      name: file.name,
      size: file.size,
      type: file.type || 'unknown',
      width: dims.width,
      height: dims.height,
    })

    try {
      const meta = await exifr.parse(file, {
        tiff: true,
        exif: true,
        gps: true,
        iptc: true,
        xmp: true,
        icc: true,
        jfif: true,
        ihdr: true,
        makerNote: true,
        userComment: true,
      })
      setMetadata(meta || {})
    } catch (err) {
      console.error('Metadata parse failed:', err)
      setError('Could not read metadata from this file, but the preview is shown below.')
      setMetadata({})
    } finally {
      setStatus('done')
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Image Metadata Viewer</h1>
        <p className="tagline">
          Drop an image to inspect its EXIF, GPS, IPTC &amp; XMP data — all in your
          browser. Nothing is uploaded.
        </p>
      </header>

      <DropZone onFile={handleFile} hasImage={!!imageUrl} />

      {error && <p className="banner-error">{error}</p>}

      {imageUrl && (
        <main className="content">
          <div className="preview">
            <img src={imageUrl} alt={fileInfo?.name || 'Uploaded preview'} />
            {fileInfo?.name && <p className="preview-name">{fileInfo.name}</p>}
          </div>

          {status === 'parsing' ? (
            <p className="parsing">Reading metadata…</p>
          ) : (
            <MetadataPanel fileInfo={fileInfo} metadata={metadata} />
          )}
        </main>
      )}
    </div>
  )
}
