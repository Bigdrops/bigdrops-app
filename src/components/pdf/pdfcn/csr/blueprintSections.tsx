import React from 'react'
import type { CanonicalPreparedCsr } from '@/domain/pdf/resolver/csr/csrPreparedContract'
import {
  View,
  Text,
  Table,
  Row,
  Cell,
} from '../primitives'
import { BrandLogo, getAdaptiveMaterialColumns } from './csrPdfcnUtils'

export const BLUEPRINT_PALETTE = {
  navy: '#07192b',
  cobalt: '#0f3156',
  blue: '#1d568a',
  cyanDim: '#4678a3',
  slate: '#4f667a',
  lineHeavy: '#07192b',
  lineMed: '#29527a',
  lineFine: '#9cb4c9',
  lineGrid: '#dce6ef',
  paper: '#f9fbfd',
  white: '#ffffff',
  tint: '#edf3f8',
  tintStrong: '#dde8f2',
  amber: '#b84a14',
  ok: '#135c47',
}

const C = BLUEPRINT_PALETTE

export const BlueprintHeader: React.FC<{ csr: CanonicalPreparedCsr }> = ({ csr }) => (
  <View
    style={{
      display: 'flex',
      flexDirection: 'row',
      borderBottomWidth: 1.5,
      borderBottomColor: C.lineHeavy,
      backgroundColor: C.white,
    }}
  >
    {/* Col 1: Service Provider Information */}
    <View
      style={{
        width: 250,
        padding: 5,
        borderRightWidth: 1,
        borderRightColor: C.lineHeavy,
        backgroundColor: C.tint,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <View
          style={{
            width: 28,
            height: 28,
            backgroundColor: C.white,
            borderWidth: 0.8,
            borderColor: C.lineMed,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <BrandLogo
            logoUrl={csr.serviceProvider.logoUrl}
            width={22}
            height={22}
            fillColor={C.navy}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 5, fontWeight: 700, color: C.blue, textTransform: 'uppercase' }}>
            SERVICE PROVIDER
          </Text>
          <Text style={{ fontSize: 8.5, fontWeight: 700, color: C.navy, lineHeight: 1.1 }}>
            {csr.serviceProvider.name}
          </Text>
          <Text style={{ fontSize: 5.5, color: C.cobalt, fontWeight: 700 }}>
            {csr.serviceProvider.subtitle}
          </Text>
        </View>
      </View>
      <View style={{ borderTopWidth: 0.5, borderTopColor: C.lineFine, paddingTop: 3, marginTop: 3 }}>
        <Text style={{ fontSize: 5.2, color: C.slate }}>{csr.serviceProvider.address}</Text>
        <Text style={{ fontSize: 5.2, color: C.slate }}>{csr.serviceProvider.contact}</Text>
      </View>
    </View>

    {/* Col 2: Dedicated CSR Document Title Block */}
    <View
      style={{
        width: 185,
        padding: 5,
        borderRightWidth: 1,
        borderRightColor: C.lineHeavy,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <View>
        <Text style={{ fontSize: 5, fontWeight: 700, color: C.blue, textTransform: 'uppercase' }}>
          OFFICIAL SERVICE DOCUMENT
        </Text>
        <Text style={{ fontSize: 10, fontWeight: 700, color: C.navy, letterSpacing: 0.5 }}>
          CUSTOMER SERVICE REPORT
        </Text>
      </View>
      <View
        style={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          borderTopWidth: 0.5,
          borderTopColor: C.lineFine,
          paddingTop: 3,
        }}
      >
        <View>
          <Text style={{ fontSize: 4.8, color: C.slate }}>REPORT NO:</Text>
          <Text style={{ fontSize: 6.2, fontWeight: 700, color: C.navy }}>{csr.csrNumber}</Text>
        </View>
        <View>
          <Text style={{ fontSize: 4.8, color: C.slate }}>DATE:</Text>
          <Text style={{ fontSize: 6.2, fontWeight: 700, color: C.navy }}>{csr.date}</Text>
        </View>
        <View>
          <Text style={{ fontSize: 4.8, color: C.slate }}>STATUS:</Text>
          <Text style={{ fontSize: 6.2, fontWeight: 700, color: C.ok }}>{csr.status.toUpperCase()}</Text>
        </View>
      </View>
    </View>

    {/* Col 3: Client & Corporate Address */}
    <View
      style={{
        width: 195,
        padding: 5,
        borderRightWidth: 1,
        borderRightColor: C.lineHeavy,
        backgroundColor: C.tint,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <View>
        <Text style={{ fontSize: 5, fontWeight: 700, color: C.blue, textTransform: 'uppercase' }}>
          CLIENT & CORPORATE ADDRESS
        </Text>
        <Text style={{ fontSize: 7.5, fontWeight: 700, color: C.navy }}>{csr.client.name}</Text>
        <Text style={{ fontSize: 6, color: C.slate }}>{csr.client.address || '-'}</Text>
      </View>
      <View style={{ borderTopWidth: 0.5, borderTopColor: C.lineFine, paddingTop: 3 }}>
        <Text style={{ fontSize: 5.2, color: C.blue }}>
          {csr.client.accountRef ? `ACCOUNT: ${csr.client.accountRef}` : 'ACCOUNT: SAS-11PLC-084'}
          {csr.client.poNumber ? ` · PO: ${csr.client.poNumber}` : ''}
        </Text>
      </View>
    </View>

    {/* Col 4: Site / Equipment Location & Service Window */}
    <View
      style={{
        flex: 1,
        padding: 5,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <View>
        <Text style={{ fontSize: 5, fontWeight: 700, color: C.blue, textTransform: 'uppercase' }}>
          SITE / EQUIPMENT LOCATION
        </Text>
        <Text style={{ fontSize: 7.5, fontWeight: 700, color: C.navy }}>
          {csr.location.site || 'Site Location Not Specified'}
        </Text>
        {csr.location.subLocation ? (
          <Text style={{ fontSize: 6, color: C.slate }}>{csr.location.subLocation}</Text>
        ) : null}
      </View>
      <View
        style={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          borderTopWidth: 0.5,
          borderTopColor: C.lineFine,
          paddingTop: 3,
        }}
      >
        <View>
          <Text style={{ fontSize: 4.8, color: C.slate }}>START:</Text>
          <Text style={{ fontSize: 5.8, fontWeight: 700, color: C.navy }}>{csr.serviceWindow.startDate}</Text>
        </View>
        <View>
          <Text style={{ fontSize: 4.8, color: C.slate }}>END:</Text>
          <Text style={{ fontSize: 5.8, fontWeight: 700, color: C.navy }}>{csr.serviceWindow.endDate}</Text>
        </View>
        <View>
          <Text style={{ fontSize: 4.8, color: C.slate }}>HOURS:</Text>
          <Text style={{ fontSize: 5.8, fontWeight: 700, color: C.navy }}>
            {csr.serviceWindow.operatingHours}
          </Text>
        </View>
      </View>
    </View>
  </View>
)

export const BlueprintWorkspace: React.FC<{ csr: CanonicalPreparedCsr }> = ({ csr }) => (
  <View
    style={{
      display: 'flex',
      flexDirection: 'row',
      borderBottomWidth: 1.5,
      borderBottomColor: C.lineHeavy,
      flex: 1,
    }}
  >
    {/* Left Column: Equipment Data Plate & 6 Operational Telemetry Cells */}
    <View
      style={{
        width: 230,
        borderRightWidth: 1.2,
        borderRightColor: C.lineHeavy,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <View style={{ padding: 4, backgroundColor: C.tintStrong, borderBottomWidth: 0.8, borderBottomColor: C.lineMed }}>
        <Text style={{ fontSize: 5.5, fontWeight: 700, color: C.navy }}>
          SEC 01 · EQUIPMENT SPECIFICATION PLATE
        </Text>
      </View>
      <View style={{ padding: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 5.4, color: C.slate }}>MAKE / MODEL:</Text>
          <Text style={{ fontSize: 6.2, fontWeight: 700, color: C.navy }}>{csr.equipment.make} {csr.equipment.model}</Text>
        </View>
        <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 5.4, color: C.slate }}>TYPE:</Text>
          <Text style={{ fontSize: 6.2, fontWeight: 700, color: C.navy }}>{csr.equipment.type}</Text>
        </View>
        <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 5.4, color: C.slate }}>SERIAL NO:</Text>
          <Text style={{ fontSize: 6.2, fontWeight: 700, color: C.navy }}>{csr.equipment.serialNo || '-'}</Text>
        </View>
        <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 5.4, color: C.slate }}>ENGINE NO:</Text>
          <Text style={{ fontSize: 6.2, fontWeight: 700, color: C.navy }}>{csr.equipment.engineNo || '-'}</Text>
        </View>
        <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 5.4, color: C.slate }}>RATED CAPACITY:</Text>
          <Text style={{ fontSize: 6.2, fontWeight: 700, color: C.navy }}>{csr.equipment.capacity || '-'}</Text>
        </View>
      </View>

      {/* 6-Cell Operational Telemetry Callouts */}
      <View
        style={{
          padding: 4,
          backgroundColor: C.tintStrong,
          borderTopWidth: 0.8,
          borderTopColor: C.lineMed,
          borderBottomWidth: 0.8,
          borderBottomColor: C.lineMed,
          marginTop: 'auto',
        }}
      >
        <Text style={{ fontSize: 5.5, fontWeight: 700, color: C.navy }}>
          SEC 02 · OPERATIONAL READINGS (6-CELL STRIP)
        </Text>
      </View>
      <View style={{ display: 'flex', flexDirection: 'column' }}>
        <View style={{ display: 'flex', flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: C.lineFine }}>
          <View style={{ flex: 1, padding: 3, borderRightWidth: 0.5, borderRightColor: C.lineFine }}>
            <Text style={{ fontSize: 4.6, color: C.slate }}>GEN VOLTAGE (V)</Text>
            <Text style={{ fontSize: 6.4, fontWeight: 700, color: C.navy }}>{csr.readings.voltage.value ?? '-'}</Text>
          </View>
          <View style={{ flex: 1, padding: 3 }}>
            <Text style={{ fontSize: 4.6, color: C.slate }}>FREQUENCY (HZ)</Text>
            <Text style={{ fontSize: 6.4, fontWeight: 700, color: C.navy }}>{csr.readings.frequency.value ?? '-'}</Text>
          </View>
        </View>
        <View style={{ display: 'flex', flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: C.lineFine }}>
          <View style={{ flex: 1, padding: 3, borderRightWidth: 0.5, borderRightColor: C.lineFine }}>
            <Text style={{ fontSize: 4.6, color: C.slate }}>BATTERY / ALT</Text>
            <Text style={{ fontSize: 6.4, fontWeight: 700, color: C.navy }}>{csr.readings.battery.value ?? '-'}</Text>
          </View>
          <View style={{ flex: 1, padding: 3 }}>
            <Text style={{ fontSize: 4.6, color: C.slate }}>TEMPERATURE</Text>
            <Text style={{ fontSize: 6.4, fontWeight: 700, color: C.navy }}>{csr.readings.temperature.value ?? '-'}</Text>
          </View>
        </View>
        <View style={{ display: 'flex', flexDirection: 'row' }}>
          <View style={{ flex: 1, padding: 3, borderRightWidth: 0.5, borderRightColor: C.lineFine }}>
            <Text style={{ fontSize: 4.6, color: C.slate }}>PRESSURE</Text>
            <Text style={{ fontSize: 6.4, fontWeight: 700, color: C.navy }}>{csr.readings.pressure.value ?? '-'}</Text>
          </View>
          <View style={{ flex: 1, padding: 3 }}>
            <Text style={{ fontSize: 4.6, color: C.slate }}>ENGINE HOURS</Text>
            <Text style={{ fontSize: 6.4, fontWeight: 700, color: C.navy }}>{csr.readings.hours.value ?? '-'}</Text>
          </View>
        </View>
      </View>
    </View>

    {/* Right Column: Service Overview, Findings, and Narrative Clauses */}
    <View style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <View
        style={{
          display: 'flex',
          flexDirection: 'row',
          borderBottomWidth: 0.8,
          borderBottomColor: C.lineMed,
          backgroundColor: C.tint,
        }}
      >
        <View style={{ flex: 1, padding: 4, borderRightWidth: 0.5, borderRightColor: C.lineFine }}>
          <Text style={{ fontSize: 4.8, color: C.slate }}>CALL TYPE</Text>
          <Text style={{ fontSize: 6.5, fontWeight: 700, color: C.navy }}>{csr.callTypeDisplay}</Text>
        </View>
        <View style={{ flex: 1, padding: 4, borderRightWidth: 0.5, borderRightColor: C.lineFine }}>
          <Text style={{ fontSize: 4.8, color: C.slate }}>SERVICE BASIS</Text>
          <Text style={{ fontSize: 6.5, fontWeight: 700, color: C.navy }}>{csr.serviceBasis || 'Contractual Maint.'}</Text>
        </View>
        <View style={{ flex: 1, padding: 4 }}>
          <Text style={{ fontSize: 4.8, color: C.slate }}>SYSTEM STATE</Text>
          <Text style={{ fontSize: 6.5, fontWeight: 700, color: C.navy }}>{csr.systemDownDisplay}</Text>
        </View>
      </View>

      <View style={{ display: 'flex', flexDirection: 'row', borderBottomWidth: 0.8, borderBottomColor: C.lineMed, flex: 1 }}>
        <View style={{ flex: 1, padding: 5, borderRightWidth: 0.8, borderRightColor: C.lineMed }}>
          <Text style={{ fontSize: 5.5, fontWeight: 700, color: C.blue, marginBottom: 2 }}>
            SEC 03 · PROBLEM REPORTED
          </Text>
          <Text style={{ fontSize: 6.4, color: C.navy, lineHeight: 1.3 }}>
            {csr.narratives.problemReported || 'Scheduled routine overhaul and full service inspection.'}
          </Text>
        </View>
        <View style={{ flex: 1, padding: 5 }}>
          <Text style={{ fontSize: 5.5, fontWeight: 700, color: C.amber, marginBottom: 2 }}>
            SEC 04 · OBSERVATIONS & DEFECTS FOUND
          </Text>
          <Text style={{ fontSize: 6.4, color: C.navy, lineHeight: 1.3 }}>
            {csr.narratives.defectsFound}
          </Text>
        </View>
      </View>

      <View style={{ display: 'flex', flexDirection: 'row', flex: 1 }}>
        <View style={{ flex: 1.2, padding: 5, borderRightWidth: 0.8, borderRightColor: C.lineMed }}>
          <Text style={{ fontSize: 5.5, fontWeight: 700, color: C.navy, marginBottom: 2 }}>
            SERVICE RENDERED
          </Text>
          <Text style={{ fontSize: 6.2, color: C.navy, lineHeight: 1.25 }}>
            {csr.narratives.serviceRendered || 'Engine overhauled in accordance with manufacturer technical specifications.'}
          </Text>
        </View>
        <View style={{ flex: 1, padding: 5 }}>
          <Text style={{ fontSize: 5.5, fontWeight: 700, color: C.navy, marginBottom: 2 }}>
            ENGINEER'S REMARKS
          </Text>
          <Text style={{ fontSize: 6.2, color: C.navy, lineHeight: 1.25 }}>
            {csr.narratives.engineerRemarks || 'System certified operational and safe for commercial service load.'}
          </Text>
        </View>
      </View>
    </View>
  </View>
)

export const BlueprintBomSchedule: React.FC<{ csr: CanonicalPreparedCsr }> = ({ csr }) => {
  const adaptive = getAdaptiveMaterialColumns(csr.materials, 'landscape')

  return (
    <View style={{ borderBottomWidth: 1.5, borderBottomColor: C.lineHeavy, backgroundColor: C.white }}>
      <View
        style={{
          padding: 3,
          backgroundColor: C.navy,
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
        }}
      >
        <Text style={{ fontSize: 5.8, fontWeight: 700, color: C.white }}>
          SEC 05 · PARTS & MATERIALS SCHEDULE{csr.materials.length > 0 ? ` (${csr.materials.length} ITEMS)` : ''}
        </Text>
        <Text style={{ fontSize: 5.2, color: C.lineFine }}>
          {adaptive.colCount === 4
            ? 'READ VERTICALLY DOWN COLUMNS 1 → 4'
            : 'RECORDED REPLACEMENT PARTS & CONSUMABLES'}
        </Text>
      </View>

      {adaptive.layoutMode === 'empty' ? (
        <View style={{ padding: 6, backgroundColor: C.tint, alignItems: 'center' }}>
          <Text style={{ fontSize: 5.5, color: C.slate, fontStyle: 'italic' }}>
            No replacement parts or materials recorded for this service.
          </Text>
        </View>
      ) : adaptive.layoutMode === 'single' ? (
        <Table>
          <Row header style={{ backgroundColor: C.tintStrong, borderBottomWidth: 0.5, borderBottomColor: C.lineMed }}>
            <Cell style={{ width: 28, padding: 2.5 }}><Text style={{ fontSize: 5, fontWeight: 700, color: C.cobalt }}>ITEM NO</Text></Cell>
            <Cell style={{ flex: 1, padding: 2.5 }}><Text style={{ fontSize: 5, fontWeight: 700, color: C.cobalt }}>DESCRIPTION</Text></Cell>
            <Cell style={{ width: 90, padding: 2.5 }}><Text style={{ fontSize: 5, fontWeight: 700, color: C.cobalt }}>PART NUMBER</Text></Cell>
            <Cell style={{ width: 60, padding: 2.5, alignItems: 'flex-end' }}><Text style={{ fontSize: 5, fontWeight: 700, color: C.cobalt }}>QUANTITY</Text></Cell>
          </Row>
          {adaptive.columns[0].map((item, rowIdx) => (
            <Row
              key={item.no}
              style={{
                backgroundColor: rowIdx % 2 === 1 ? C.tint : C.white,
                borderBottomWidth: rowIdx < adaptive.columns[0].length - 1 ? 0.4 : 0,
                borderBottomColor: C.lineGrid,
              }}
            >
              <Cell style={{ width: 28, padding: 2.5 }}>
                <Text style={{ fontSize: 5.6, fontWeight: 700, color: C.blue }}>{item.no}</Text>
              </Cell>
              <Cell style={{ flex: 1, padding: 2.5 }}>
                <Text style={{ fontSize: 5.6, color: C.navy }}>{item.description}</Text>
              </Cell>
              <Cell style={{ width: 90, padding: 2.5 }}>
                <Text style={{ fontSize: 5.6, color: C.slate }}>{item.partNo || '-'}</Text>
              </Cell>
              <Cell style={{ width: 60, padding: 2.5, alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 5.6, fontWeight: 700, color: C.navy }}>{item.qty} {item.unit}</Text>
              </Cell>
            </Row>
          ))}
        </Table>
      ) : (
        <View style={{ display: 'flex', flexDirection: 'row' }}>
          {adaptive.columns.map((group, colIdx) => (
            <View
              key={colIdx}
              style={{
                flex: 1,
                borderRightWidth: colIdx < adaptive.colCount - 1 ? 0.8 : 0,
                borderRightColor: C.lineMed,
              }}
            >
              <Table>
                <Row header style={{ backgroundColor: C.tintStrong, borderBottomWidth: 0.5, borderBottomColor: C.lineMed }}>
                  <Cell style={{ width: 18, padding: 2 }}><Text style={{ fontSize: 4.8, fontWeight: 700, color: C.cobalt }}>NO</Text></Cell>
                  <Cell style={{ flex: 1, padding: 2 }}><Text style={{ fontSize: 4.8, fontWeight: 700, color: C.cobalt }}>DESCRIPTION</Text></Cell>
                  <Cell style={{ width: 34, padding: 2, alignItems: 'flex-end' }}><Text style={{ fontSize: 4.8, fontWeight: 700, color: C.cobalt }}>QTY</Text></Cell>
                </Row>
                {group.map((item, rowIdx) => (
                  <Row
                    key={item.no}
                    style={{
                      backgroundColor: rowIdx % 2 === 1 ? C.tint : C.white,
                      borderBottomWidth: rowIdx < group.length - 1 ? 0.4 : 0,
                      borderBottomColor: C.lineGrid,
                    }}
                  >
                    <Cell style={{ width: 18, padding: 2 }}>
                      <Text style={{ fontSize: 5.4, fontWeight: 700, color: C.blue }}>{item.no}</Text>
                    </Cell>
                    <Cell style={{ flex: 1, padding: 2 }}>
                      <Text style={{ fontSize: 5.4, color: C.navy }}>{item.description}</Text>
                    </Cell>
                    <Cell style={{ width: 34, padding: 2, alignItems: 'flex-end' }}>
                      <Text style={{ fontSize: 5.4, fontWeight: 700, color: C.navy }}>{item.qty} {item.unit}</Text>
                    </Cell>
                  </Row>
                ))}
              </Table>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

export { BlueprintTitleBlock } from './blueprintTitleBlock'
