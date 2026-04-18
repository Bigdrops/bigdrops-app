import { useState } from 'react'

import DocumentSheet from '../shared/DocumentSheet'
import styles from './InvoiceRecordPaymentSheet.module.css'
import custStyles from './InvoiceCustomizeSheet.module.css'

interface InvoiceCustomizeSheetProps {
  open: boolean
  onClose: () => void
  onSave: () => void
}

export default function InvoiceCustomizeSheet({
  open,
  onClose,
  onSave,
}: InvoiceCustomizeSheetProps) {
  const [template, setTemplate] = useState('proforma')
  const [color, setColor] = useState('blue')

  const templates = [
    { id: 'proforma', name: 'Proforma' },
    { id: 'bold', name: 'Bold' },
    { id: 'compact', name: 'Compact' },
    { id: 'classic', name: 'Classic' },
  ]

  const colors = [
    { id: 'blue', className: custStyles.blue },
    { id: 'black', className: custStyles.black },
    { id: 'green', className: custStyles.green },
    { id: 'amber', className: custStyles.amber },
  ]

  return (
    <DocumentSheet
      open={open}
      onClose={onClose}
      title="Customise Output"
      subtitle="Controls how the PDF is generated and displayed"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label className={styles.formLabel}>Template</label>
          <div className={custStyles.templateScrollWrap}>
            <div className={custStyles.templateScroll}>
              {templates.map((tmpl) => (
                <button
                  type="button"
                  key={tmpl.id}
                  className={`${custStyles.tmplCard} ${template === tmpl.id ? custStyles.active : ''}`}
                  onClick={() => setTemplate(tmpl.id)}
                >
                  <div className={custStyles.tmplPreview}>
                    <div className={`${custStyles.tBar} ${custStyles[tmpl.id]} `} />
                    <div className={custStyles.tBody}>
                      <div className={`${custStyles.tLine} ${custStyles.w80}`} />
                      <div className={`${custStyles.tLine} ${custStyles.w60}`} />
                      <div className={`${custStyles.tLine} ${custStyles.w40}`} />
                      <div className={`${custStyles.tLine} ${custStyles.w80}`} />
                      <div className={`${custStyles.tLine} ${custStyles.w60}`} />
                    </div>
                  </div>
                  <div className={custStyles.tmplName}>{tmpl.name}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label className={styles.formLabel}>Signatory</label>
          <select className={styles.formSelect}>
            <option>Engr. Babajide Olusanya — Managing Director</option>
            <option>Mrs. Folake Adeyemi — Finance Director</option>
            <option>None</option>
          </select>
        </div>

        <div>
          <label className={styles.formLabel}>Accent Colour</label>
          <div className={custStyles.colourSwatch}>
            {colors.map((c) => (
              <button
                type="button"
                key={c.id}
                className={`${custStyles.colourOption} ${c.className} ${color === c.id ? custStyles.active : ''}`}
                onClick={() => setColor(c.id)}
                aria-label={c.id}
              />
            ))}
          </div>
          <div style={{ fontSize: 11, color: '#9c9589', marginTop: 6 }}>
            Changes the primary accent throughout the document.
          </div>
        </div>

        <div>
          <label className={styles.formLabel}>Font Family</label>
          <select className={styles.formSelect}>
            <option>Plus Jakarta Sans (Default)</option>
            <option>Inter</option>
            <option>DM Sans</option>
            <option>Space Grotesk</option>
          </select>
        </div>

        <div>
          <label className={styles.formLabel}>PDF Options</label>
          <div className={custStyles.toggleRows}>
            <ToggleOption
              label="Show Bank Details"
              sub="Display payment account on PDF"
              defaultChecked={false}
            />
            <ToggleOption
              label="Show Balance Due"
              sub="Display remaining balance on document"
              defaultChecked={true}
            />
            <ToggleOption
              label="Show Footer"
              sub="Company footer on each page"
              defaultChecked={true}
            />
            <ToggleOption
              label="Show Tagline"
              sub="Company tagline below name"
              defaultChecked={true}
            />
          </div>
        </div>

        <div style={{ paddingBottom: 12 }}>
          <button
            type="button"
            className={styles.btnAmber}
            style={{ width: '100%' }}
            onClick={() => {
              onSave()
              onClose()
            }}
          >
            Save Settings
          </button>
        </div>
      </div>
    </DocumentSheet>
  )
}

function ToggleOption({ label, sub, defaultChecked }: { label: string; sub: string; defaultChecked: boolean }) {
  const [checked, setChecked] = useState(defaultChecked)

  return (
    <div className={custStyles.toggleRowItem}>
      <div>
        <div className={custStyles.toggleItemLabel}>{label}</div>
        <div className={custStyles.toggleItemSub}>{sub}</div>
      </div>
      <label className={custStyles.toggle}>
        <input
          type="checkbox"
          style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
        />
        <div className={custStyles.toggleTrack}>
          <div className={`${custStyles.toggleThumb} ${checked ? custStyles.toggleThumbActive : ''}`} />
        </div>
      </label>
    </div>
  )
}
