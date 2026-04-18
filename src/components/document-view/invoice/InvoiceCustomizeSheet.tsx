import { useState } from 'react'
import styles from './InvoicePresentation.module.css'

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

  if (!open) return null

  const templates = ['Proforma', 'Bold', 'Compact', 'Classic']
  const colors = ['blue', 'black', 'green', 'amber']

  return (
    <>
      <div className={`${styles.overlay} ${styles.open}`} onClick={onClose} />
      <div className={`${styles.sheet} ${styles.open}`}>
        <div className={styles['sheet-handle']} />
        <div className={styles['sheet-title']}>Customise Output</div>
        <div className={styles['sheet-sub']}>Controls how the PDF is generated and displayed</div>
        <div className={styles['sheet-body']}>
          <div className={styles['form-group']}>
            <label className={styles['form-label']}>Template</label>
            <div className={styles['template-scroll-wrap']}>
              <div className={styles['template-scroll']}>
                {templates.map((t) => (
                  <div
                    key={t}
                    className={`${styles['tmpl-card']} ${template === t.toLowerCase() ? styles.active : ''}`}
                    onClick={() => setTemplate(t.toLowerCase())}
                  >
                    <div className={styles['tmpl-preview']}>
                      <div className={styles['t-bar']} />
                      <div className={styles['t-body']}>
                        <div className={`${styles['t-line']} ${styles.w80}`} />
                        <div className={`${styles['t-line']} ${styles.w60}`} />
                        <div className={`${styles['t-line']} ${styles.w40}`} />
                        <div className={`${styles['t-line']} ${styles.w80}`} />
                        <div className={`${styles['t-line']} ${styles.w60}`} />
                      </div>
                    </div>
                    <div className={styles['tmpl-name']}>{t}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className={`${styles['form-group']} ${styles.mt8}`}>
            <label className={styles['form-label']}>Signatory</label>
            <select className={styles['form-select']}>
              <option>Engr. Babajide Olusanya — Managing Director</option>
              <option>Mrs. Folake Adeyemi — Finance Director</option>
              <option>None</option>
            </select>
          </div>

          <div className={`${styles['form-group']} ${styles.mt8}`}>
            <label className={styles['form-label']}>Accent Colour</label>
            <div className={styles['colour-swatch']}>
              {colors.map((c) => (
                <div
                  key={c}
                  className={`${styles['colour-option']} ${styles[c]} ${color === c ? styles.active : ''}`}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 8 }}>
              Changes the primary accent throughout the document.
            </div>
          </div>

          <div className={`${styles['form-group']} ${styles.mt8}`}>
            <label className={styles['form-label']}>Font Family</label>
            <select className={styles['form-select']}>
              <option>Plus Jakarta Sans (Default)</option>
              <option>Inter</option>
              <option>DM Sans</option>
              <option>Space Grotesk</option>
            </select>
          </div>

          <div className={`${styles['form-group']} ${styles.mt8}`}>
            <label className={styles['form-label']}>PDF Options</label>
            <div className={styles['toggle-rows']}>
              <div className={styles['toggle-row-item']}>
                <div className={styles['toggle-info']}>
                  <div className={styles['toggle-item-label']}>Show Bank Details</div>
                  <div className={styles['toggle-item-sub']}>Display payment account on PDF</div>
                </div>
                <label className={styles.toggle}>
                  <input type="checkbox" />
                  <div className={styles['toggle-track']}>
                    <div className={styles['toggle-thumb']} />
                  </div>
                </label>
              </div>
              <div className={styles['toggle-row-item']}>
                <div className={styles['toggle-info']}>
                  <div className={styles['toggle-item-label']}>Show Balance Due</div>
                  <div className={styles['toggle-item-sub']}>Display remaining balance on document</div>
                </div>
                <label className={styles.toggle}>
                  <input type="checkbox" defaultChecked />
                  <div className={styles['toggle-track']}>
                    <div className={styles['toggle-thumb']} />
                  </div>
                </label>
              </div>
              <div className={styles['toggle-row-item']}>
                <div className={styles['toggle-info']}>
                  <div className={styles['toggle-item-label']}>Show Footer</div>
                  <div className={styles['toggle-item-sub']}>Company footer on each page</div>
                </div>
                <label className={styles.toggle}>
                  <input type="checkbox" defaultChecked />
                  <div className={styles['toggle-track']}>
                    <div className={styles['toggle-thumb']} />
                  </div>
                </label>
              </div>
              <div className={styles['toggle-row-item']}>
                <div className={styles['toggle-info']}>
                  <div className={styles['toggle-item-label']}>Show Tagline</div>
                  <div className={styles['toggle-item-sub']}>Company tagline below name</div>
                </div>
                <label className={styles.toggle}>
                  <input type="checkbox" defaultChecked />
                  <div className={styles['toggle-track']}>
                    <div className={styles['toggle-thumb']} />
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div style={{ paddingTop: 16, paddingBottom: 16 }}>
            <button
              type="button"
              className={`${styles.btn} ${styles['btn-amber']}`}
              style={{ width: '100%', height: 42, justifyContent: 'center', fontSize: 14 }}
              onClick={() => {
                onSave()
                onClose()
              }}
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
