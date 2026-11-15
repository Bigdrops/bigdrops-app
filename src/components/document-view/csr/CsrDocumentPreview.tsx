import React from 'react'
import type { CsrRenderModel } from '@/domain/csr/csrRenderModel'
import DocumentPreviewShell from '../shared/DocumentPreviewShell'
import styles from './CsrDocumentPreview.module.css'

interface CsrDocumentPreviewProps {
  csr: CsrRenderModel | null
  settings?: any
  logoUrl?: string | null
}

function safeText(val: unknown, fallback = ''): string {
  if (val == null) return fallback
  if (typeof val === 'string') return val
  if (typeof val === 'number') return String(val)
  if (typeof val === 'boolean') return val ? 'Yes' : 'No'
  if (typeof val === 'object') {
    if (Array.isArray(val)) return val.map((v) => safeText(v, '')).filter(Boolean).join(', ') || fallback
    const obj = val as Record<string, unknown>
    const parts = [obj.address, obj.street, obj.city, obj.state, obj.name, obj.label, obj.value].filter(Boolean)
    if (parts.length > 0) return parts.map((p) => safeText(p, '')).join(', ')
    try {
      return JSON.stringify(val)
    } catch {
      return fallback
    }
  }
  return String(val)
}

export default function CsrDocumentPreview({ csr, settings, logoUrl }: CsrDocumentPreviewProps) {
  if (!csr) return null

  const resolvedLogo = logoUrl || settings?.company_logo_url || null
  const companyName = safeText(settings?.company_name, 'BOURXE')
  const companyLines = [
    settings?.company_address,
    settings?.company_city,
    settings?.company_phone,
    settings?.company_email,
  ]
    .map((line) => safeText(line).trim())
    .filter(Boolean)

  const clientLines = [
    csr.client_name,
    csr.address,
  ]
    .map((line) => safeText(line).trim())
    .filter(Boolean)

  const equipmentLines = [
    csr.equipment_type,
    csr.make,
    csr.model ? `Model: ${csr.model}` : '',
    csr.serial_no ? `S/N: ${csr.serial_no}` : '',
    csr.engine_no ? `Engine: ${csr.engine_no}` : '',
    csr.capacity ? `Capacity: ${csr.capacity}` : '',
    csr.equipment_location ? `Location: ${csr.equipment_location}` : '',
  ]
    .map((line) => safeText(line).trim())
    .filter(Boolean)

  const rawMaterials = Array.isArray(csr.materialsRows) ? csr.materialsRows : []
  const parsedMaterials = rawMaterials.filter((r) => r && (r.item || r.quantity || r.unit))

  const callType = csr.callTypeDisplay && csr.callTypeDisplay !== 'NOT SPECIFIED' ? csr.callTypeDisplay : safeText(csr.call_type)
  const serviceBasis = csr.serviceBasisDisplay && csr.serviceBasisDisplay !== 'NOT SPECIFIED' ? csr.serviceBasisDisplay : safeText(csr.service_basis)
  const systemStatus = csr.systemDownDisplay && csr.systemDownDisplay !== 'NOT SPECIFIED' ? csr.systemDownDisplay : safeText(csr.system_down)

  const readings = [
    { label: 'Voltage', value: csr.voltage },
    { label: 'Frequency', value: csr.frequency },
    { label: 'Battery', value: csr.battery },
    { label: 'Temperature', value: csr.temperature },
    { label: 'Pressure', value: csr.pressure },
    { label: 'Operating Hours', value: csr.hours },
  ].filter((r) => r.value && String(r.value).trim().length > 0)

  const status = safeText(csr.status, 'in_progress').toLowerCase()
  const statusLabel = status === 'completed' ? 'COMPLETED' : 'IN PROGRESS'

  const clientSignature =
    typeof csr.acknowledgement_signature_url === 'string' && csr.acknowledgement_signature_url.trim()
      ? csr.acknowledgement_signature_url
      : null

  return (
    <DocumentPreviewShell>
      <div className={styles.head}>
        <div>
          {resolvedLogo ? (
            <img src={resolvedLogo} alt="Logo" className={styles.logo} />
          ) : null}
          <div className={styles.companyName}>{companyName}</div>
          <div className={styles.companyContact}>
            {companyLines.length > 0 ? (
              companyLines.map((line, i) => <div key={i}>{line}</div>)
            ) : (
              <div>No company contact recorded</div>
            )}
          </div>
        </div>

        <div className={styles.idBlock}>
          <div className={styles.typeLabel}>Customer Service Report</div>
          <div className={styles.number}>{safeText(csr.csr_number, 'Draft')}</div>
          <div className={styles.statusBadge} data-status={status}>
            {statusLabel}
          </div>
        </div>
      </div>

      <div className={styles.metaGrid}>
        <div className={styles.metaCell}>
          <div className={styles.metaLabel}>Service Date</div>
          <div className={styles.metaValue}>{safeText(csr.date, '—')}</div>
          {(csr.start_time || csr.end_time) && (
            <div className={styles.metaSub}>
              {[csr.start_time, csr.end_time].filter(Boolean).join(' – ')}
            </div>
          )}
        </div>

        <div className={styles.metaCell}>
          <div className={styles.metaLabel}>Client</div>
          <div className={styles.metaValue}>{safeText(csr.client_name, 'Unassigned')}</div>
          {clientLines.length > 1 && (
            <div className={styles.metaSub}>{clientLines.slice(1).join(', ')}</div>
          )}
        </div>

        {(callType || systemStatus || serviceBasis) && (
          <div className={styles.metaCell} style={{ gridColumn: '1 / -1' }}>
            <div className={styles.metaLabel}>Call Classification</div>
            <div className={styles.metaValue}>
              {[callType, systemStatus, serviceBasis].filter(Boolean).join(' · ')}
            </div>
          </div>
        )}

        {equipmentLines.length > 0 && (
          <div className={styles.metaCell} style={{ gridColumn: '1 / -1' }}>
            <div className={styles.metaLabel}>Equipment & Asset</div>
            <div className={styles.metaSub}>{equipmentLines.join(' · ')}</div>
          </div>
        )}
      </div>

      {readings.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Operational Readings</div>
          <div className={styles.readingsGrid}>
            {readings.map((r, i) => (
              <div key={i} className={styles.readingCard}>
                <div className={styles.readingLabel}>{r.label}</div>
                <div className={styles.readingValue}>{safeText(r.value)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {csr.problem_reported && (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Problem Reported</div>
          <div className={styles.narrativeText}>{safeText(csr.problem_reported)}</div>
        </div>
      )}

      {csr.service_rendered && (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Service Rendered</div>
          <div className={styles.narrativeText}>{safeText(csr.service_rendered)}</div>
        </div>
      )}

      {csr.defects_found && (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Defects Found</div>
          <div className={styles.narrativeText}>{safeText(csr.defects_found)}</div>
        </div>
      )}

      {parsedMaterials.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Materials Used</div>
          <div className={styles.materialList}>
            {parsedMaterials.map((row, i) => (
              <div key={i} className={styles.materialItem}>
                <div className={styles.materialName}>{safeText(row.item, '—')}</div>
                <div className={styles.materialQuantity}>
                  {[safeText(row.quantity), safeText(row.unit)].filter(Boolean).join(' ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {csr.engineer_remarks && (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Engineer Remarks</div>
          <div className={styles.narrativeText}>{safeText(csr.engineer_remarks)}</div>
        </div>
      )}

      {csr.customer_feedback && (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Customer Feedback</div>
          <div className={styles.narrativeText}>{safeText(csr.customer_feedback)}</div>
        </div>
      )}

      <div className={styles.section}>
        <div className={styles.signatureGrid}>
          <div className={styles.signatureBox}>
            <div className={styles.signatureTitle}>Technician</div>
            {csr.technicianSignatory?.signatureUrl ? (
              <img
                src={csr.technicianSignatory.signatureUrl}
                alt="Technician signature"
                className={styles.signatureImg}
              />
            ) : (
              <div className={styles.signatureLine} />
            )}
            <div className={styles.signatureName}>
              {safeText(csr.technicianSignatory?.name || csr.technician_name, 'Service Technician')}
            </div>
            {csr.technicianSignatory?.role ? (
              <div className={styles.metaSub}>{safeText(csr.technicianSignatory.role)}</div>
            ) : null}
          </div>

          <div className={styles.signatureBox}>
            <div className={styles.signatureTitle}>Client Acknowledgement</div>
            {clientSignature ? (
              <img
                src={clientSignature}
                alt="Client acknowledgement signature"
                className={styles.signatureImg}
              />
            ) : (
              <div className={styles.signatureLine} />
            )}
            <div className={styles.signatureName}>
              {safeText(csr.acknowledgement_name, 'Client Representative')}
            </div>
          </div>
        </div>
      </div>
    </DocumentPreviewShell>
  )
}
