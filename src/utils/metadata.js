// Pure helpers for formatting and grouping image metadata produced by exifr.
// Kept free of React so the logic can be reasoned about (and tested) on its own.

export function formatBytes(bytes) {
  if (bytes == null || Number.isNaN(bytes)) return null
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let i = 0
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024
    i++
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[i]}`
}

export function formatShutter(exposureTime) {
  if (exposureTime == null || Number.isNaN(exposureTime)) return null
  if (exposureTime >= 1) return `${+exposureTime.toFixed(1)} s`
  return `1/${Math.round(1 / exposureTime)} s`
}

export function formatAperture(fNumber) {
  if (fNumber == null || Number.isNaN(fNumber)) return null
  return `f/${+Number(fNumber).toFixed(1)}`
}

export function formatFocalLength(focalLength) {
  if (focalLength == null || Number.isNaN(focalLength)) return null
  return `${+Number(focalLength).toFixed(0)} mm`
}

export function formatDate(value) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return typeof value === 'string' ? value : null
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

// exifr may return some fields (e.g. Flash) as objects when value translation is off.
// Render them in a readable way rather than "[object Object]".
function stringify(value) {
  if (value == null) return null
  if (value instanceof Date) return formatDate(value)
  if (Array.isArray(value)) {
    const parts = value.map(stringify).filter(Boolean)
    return parts.length ? parts.join(', ') : null
  }
  if (typeof value === 'object') {
    const parts = Object.entries(value)
      .filter(([, v]) => v != null && v !== false)
      .map(([k, v]) => (v === true ? k : `${k}: ${stringify(v)}`))
    return parts.length ? parts.join(', ') : null
  }
  if (typeof value === 'string' && value.trim() === '') return null
  return String(value)
}

// Builds the curated section cards. Each field is included only when present,
// and a section with no present fields is dropped entirely.
export function buildSections(fileInfo, meta = {}) {
  // Returns the first present value among candidate tag names.
  const get = (keys) => {
    for (const key of keys) {
      if (meta[key] != null && meta[key] !== '') return meta[key]
    }
    return null
  }

  const sectionDefs = [
    {
      title: 'Basic info',
      fields: [
        { label: 'Filename', value: fileInfo?.name },
        { label: 'File size', value: formatBytes(fileInfo?.size) },
        {
          label: 'Dimensions',
          value:
            fileInfo?.width && fileInfo?.height
              ? `${fileInfo.width} × ${fileInfo.height} px`
              : null,
        },
        { label: 'File type', value: fileInfo?.type },
      ],
    },
    {
      title: 'Camera',
      fields: [
        { label: 'Make', value: stringify(get(['Make'])) },
        { label: 'Model', value: stringify(get(['Model'])) },
        { label: 'Lens', value: stringify(get(['LensModel', 'Lens', 'LensInfo'])) },
        { label: 'Software', value: stringify(get(['Software'])) },
      ],
    },
    {
      title: 'Capture settings',
      fields: [
        { label: 'Aperture', value: formatAperture(get(['FNumber', 'ApertureValue'])) },
        { label: 'Shutter speed', value: formatShutter(get(['ExposureTime'])) },
        { label: 'ISO', value: stringify(get(['ISO', 'ISOSpeedRatings', 'PhotographicSensitivity'])) },
        { label: 'Focal length', value: formatFocalLength(get(['FocalLength'])) },
        { label: 'Exposure mode', value: stringify(get(['ExposureMode', 'ExposureProgram'])) },
        { label: 'White balance', value: stringify(get(['WhiteBalance'])) },
        { label: 'Flash', value: stringify(get(['Flash'])) },
      ],
    },
    {
      title: 'Date & time',
      fields: [
        { label: 'Date taken', value: formatDate(get(['DateTimeOriginal', 'CreateDate', 'DateTime'])) },
        { label: 'Date modified', value: formatDate(get(['ModifyDate'])) },
      ],
    },
    {
      title: 'Color',
      fields: [
        { label: 'Color space', value: stringify(get(['ColorSpace'])) },
        { label: 'Bit depth', value: stringify(get(['BitsPerSample', 'BitDepth'])) },
      ],
    },
    {
      title: 'IPTC / XMP',
      fields: [
        { label: 'Title', value: stringify(get(['title', 'Headline', 'ObjectName'])) },
        { label: 'Description', value: stringify(get(['description', 'ImageDescription', 'Caption', 'Caption-Abstract'])) },
        { label: 'Copyright', value: stringify(get(['Copyright', 'rights', 'CopyrightNotice'])) },
        { label: 'Author / creator', value: stringify(get(['Artist', 'creator', 'By-line', 'Creator'])) },
      ],
    },
  ]

  // GPS gets its own builder because it carries an extra Maps link payload.
  const lat = get(['latitude', 'GPSLatitude'])
  const lng = get(['longitude', 'GPSLongitude'])
  const altRaw = get(['GPSAltitude', 'altitude'])
  const gpsFields = [
    { label: 'Latitude', value: lat != null ? Number(lat).toFixed(6) : null },
    { label: 'Longitude', value: lng != null ? Number(lng).toFixed(6) : null },
    {
      label: 'Altitude',
      value: altRaw != null ? `${+Number(altRaw).toFixed(1)} m` : null,
    },
  ]
  const gpsSection = {
    title: 'GPS location',
    fields: gpsFields,
    mapsUrl:
      lat != null && lng != null
        ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
        : null,
  }

  const sections = [...sectionDefs]
  // Slot GPS in before Color for a natural reading order.
  sections.splice(4, 0, gpsSection)

  // Drop fields/sections with no value.
  const curated = sections
    .map((s) => ({ ...s, fields: s.fields.filter((f) => f.value != null && f.value !== '') }))
    .filter((s) => s.fields.length > 0)

  // Complete dump: every tag exifr returned, including those shown in the
  // curated cards above, so users can inspect the full raw set.
  const rawEntries = Object.entries(meta)
    .filter(([, value]) => value != null && value !== '')
    .map(([key, value]) => ({ key, value: stringify(value) }))
    .filter((e) => e.value != null)
    .sort((a, b) => a.key.localeCompare(b.key))

  return { curated, rawEntries }
}
