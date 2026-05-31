import { useRef, useState } from 'react'

// Handles file selection via drag/drop or click. Owns only its own drag-hover
// state; the chosen File is handed up to the parent through onFile.
export default function DropZone({ onFile, hasImage }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState(null)

  function handleFiles(fileList) {
    const file = fileList?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('That file is not an image. Please choose an image file.')
      return
    }
    setError(null)
    onFile(file)
  }

  function onDrop(e) {
    e.preventDefault()
    setDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      inputRef.current?.click()
    }
  }

  return (
    <div className="dropzone-wrap">
      <div
        className={`dropzone${dragging ? ' dragging' : ''}${hasImage ? ' compact' : ''}`}
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={onKeyDown}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <svg className="dropzone-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="currentColor"
            d="M19 13v6H5v-6H3v6c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-6h-2zM11 7.83V16h2V7.83l2.59 2.58L17 9l-5-5-5 5 1.41 1.41L11 7.83z"
          />
        </svg>
        <p className="dropzone-title">
          {hasImage ? 'Drop another image to replace it' : 'Drop an image here'}
        </p>
        <p className="dropzone-sub">or click to browse your files</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
      {error && <p className="dropzone-error">{error}</p>}
    </div>
  )
}
