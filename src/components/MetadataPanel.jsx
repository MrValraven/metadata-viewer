import { buildSections } from '../utils/metadata'

function SectionCard({ section }) {
  return (
    <section className="card">
      <h2 className="card-title">{section.title}</h2>
      <dl className="field-list">
        {section.fields.map((field) => (
          <div className="field" key={field.label}>
            <dt>{field.label}</dt>
            <dd>{field.value}</dd>
          </div>
        ))}
      </dl>
      {section.mapsUrl && (
        <a
          className="maps-link"
          href={section.mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          View on Google Maps →
        </a>
      )}
    </section>
  )
}

// Renders the grouped metadata. `metadata` may be null/empty for stripped images;
// fileInfo is always present once an image is loaded, so Basic info still shows.
export default function MetadataPanel({ fileInfo, metadata }) {
  const { curated, rawEntries } = buildSections(fileInfo, metadata || {})

  // True when nothing beyond the always-present Basic info card was found.
  const onlyBasic = curated.length <= 1 && rawEntries.length === 0

  return (
    <div className="metadata">
      <div className="card-grid">
        {curated.map((section) => (
          <SectionCard key={section.title} section={section} />
        ))}
      </div>

      {onlyBasic && (
        <div className="empty-state">
          <p className="empty-title">No embedded metadata found</p>
          <p className="empty-sub">
            This image has no EXIF/IPTC/XMP data — common for screenshots, edited
            exports, or photos with metadata stripped for privacy.
          </p>
        </div>
      )}

      {rawEntries.length > 0 && (
        <details className="raw-card">
          <summary>
            All metadata <span className="raw-count">({rawEntries.length} tags)</span>
          </summary>
          <dl className="field-list raw-list">
            {rawEntries.map((entry) => (
              <div className="field" key={entry.key}>
                <dt>{entry.key}</dt>
                <dd>{entry.value}</dd>
              </div>
            ))}
          </dl>
        </details>
      )}
    </div>
  )
}
