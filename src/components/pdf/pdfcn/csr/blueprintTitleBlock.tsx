import React from 'react'
import type { CanonicalPreparedCsr } from '@/domain/pdf/resolver/csr/csrPreparedContract'
import { View, Text } from '../primitives'
import { BLUEPRINT_PALETTE as C } from './blueprintSections'
import { SignatureStage } from './csrPdfcnUtils'

export const BlueprintTitleBlock: React.FC<{ csr: CanonicalPreparedCsr }> = ({ csr }) => (
  <View style={{ display: 'flex', flexDirection: 'row', backgroundColor: C.white, paddingTop: 2 }}>
    {/* 1. Service Engineer Sign-Off */}
    <View
      style={{
        flex: 1.15,
        padding: 4,
        borderRightWidth: 1,
        borderRightColor: C.lineHeavy,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <View style={{ borderBottomWidth: 0.8, borderBottomColor: C.lineHeavy, paddingBottom: 2, marginBottom: 3 }}>
        <Text style={{ fontSize: 5.8, fontWeight: 700, color: C.navy }}>
          01 · SERVICE ENGINEER SIGN-OFF
        </Text>
        <Text style={{ fontSize: 4.8, color: C.slate }}>
          Field Verification & Release
        </Text>
      </View>

      <View style={{ marginBottom: 3 }}>
        <Text style={{ fontSize: 5, color: C.cobalt, fontWeight: 700 }}>SIGNATURE:</Text>
        <SignatureStage
          signatureUrl={csr.signatories.serviceEngineer.signatureUrl}
          height={24}
          lineColor={C.lineHeavy}
        />
      </View>

      <View style={{ display: 'flex', flexDirection: 'row', gap: 6, marginBottom: 2 }}>
        <View style={{ flex: 1.4, display: 'flex', flexDirection: 'row', alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 5, fontWeight: 700, color: C.cobalt, width: 45 }}>FULL NAME:</Text>
          <View style={{ flex: 1, borderBottomWidth: 0.5, borderBottomColor: C.lineMed, height: 11 }}>
            <Text style={{ fontSize: 5.6, color: C.navy }}>{csr.signatories.serviceEngineer.printedName || ''}</Text>
          </View>
        </View>
        <View style={{ flex: 1, display: 'flex', flexDirection: 'row', alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 5, fontWeight: 700, color: C.cobalt, width: 35 }}>DATE:</Text>
          <View style={{ flex: 1, borderBottomWidth: 0.5, borderBottomColor: C.lineMed, height: 11 }}>
            <Text style={{ fontSize: 5.6, color: C.navy }}>{csr.signatories.serviceEngineer.signingDate || ''}</Text>
          </View>
        </View>
      </View>

      <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-end' }}>
        <Text style={{ fontSize: 5, fontWeight: 700, color: C.cobalt, width: 45 }}>DESIGNATION:</Text>
        <View style={{ flex: 1, borderBottomWidth: 0.5, borderBottomColor: C.lineMed, height: 11 }}>
          <Text style={{ fontSize: 5.6, color: C.navy }}>{csr.signatories.serviceEngineer.designation || ''}</Text>
        </View>
      </View>
    </View>

    {/* 2. Client Representative Sign-Off */}
    <View
      style={{
        flex: 1.15,
        padding: 4,
        borderRightWidth: 1,
        borderRightColor: C.lineHeavy,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <View style={{ borderBottomWidth: 0.8, borderBottomColor: C.lineHeavy, paddingBottom: 2, marginBottom: 3 }}>
        <Text style={{ fontSize: 5.8, fontWeight: 700, color: C.navy }}>
          02 · CLIENT REPRESENTATIVE SIGN-OFF
        </Text>
        <Text style={{ fontSize: 4.8, color: C.slate }}>
          Customer Acknowledgement & Acceptance
        </Text>
      </View>

      <View style={{ marginBottom: 3 }}>
        <Text style={{ fontSize: 5, color: C.cobalt, fontWeight: 700 }}>SIGNATURE:</Text>
        <SignatureStage
          signatureUrl={csr.signatories.clientRepresentative.signatureUrl}
          height={24}
          lineColor={C.lineHeavy}
        />
      </View>

      <View style={{ display: 'flex', flexDirection: 'row', gap: 6, marginBottom: 2 }}>
        <View style={{ flex: 1.4, display: 'flex', flexDirection: 'row', alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 5, fontWeight: 700, color: C.cobalt, width: 45 }}>FULL NAME:</Text>
          <View style={{ flex: 1, borderBottomWidth: 0.5, borderBottomColor: C.lineMed, height: 11 }}>
            <Text style={{ fontSize: 5.6, color: C.navy }}>{csr.signatories.clientRepresentative.printedName || ''}</Text>
          </View>
        </View>
        <View style={{ flex: 1, display: 'flex', flexDirection: 'row', alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 5, fontWeight: 700, color: C.cobalt, width: 35 }}>DATE:</Text>
          <View style={{ flex: 1, borderBottomWidth: 0.5, borderBottomColor: C.lineMed, height: 11 }}>
            <Text style={{ fontSize: 5.6, color: C.navy }}>{csr.signatories.clientRepresentative.signingDate || ''}</Text>
          </View>
        </View>
      </View>

      <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-end' }}>
        <Text style={{ fontSize: 5, fontWeight: 700, color: C.cobalt, width: 45 }}>DESIGNATION:</Text>
        <View style={{ flex: 1, borderBottomWidth: 0.5, borderBottomColor: C.lineMed, height: 11 }}>
          <Text style={{ fontSize: 5.6, color: C.navy }}>{csr.signatories.clientRepresentative.designation || ''}</Text>
        </View>
      </View>
    </View>

    {/* 3. Document Reference Block (Clean & Professional) */}
    <View
      style={{
        width: 170,
        padding: 4,
        backgroundColor: C.navy,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 4.8, color: C.lineFine, fontWeight: 700 }}>SERVICE RECORD</Text>
        <Text style={{ fontSize: 4.8, color: C.lineFine }}>A4 LANDSCAPE</Text>
      </View>
      <View style={{ marginVertical: 3 }}>
        <Text style={{ fontSize: 4.6, color: C.lineFine }}>DOCUMENT REFERENCE</Text>
        <Text style={{ fontSize: 7.2, fontWeight: 700, color: C.white }}>{csr.csrNumber}</Text>
      </View>
      <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
        <View>
          <Text style={{ fontSize: 4.5, color: C.lineFine }}>DATE</Text>
          <Text style={{ fontSize: 5.8, fontWeight: 700, color: C.white }}>{csr.date}</Text>
        </View>
        <View>
          <Text style={{ fontSize: 4.5, color: C.lineFine }}>STATE</Text>
          <Text style={{ fontSize: 5.8, fontWeight: 700, color: C.white }}>{csr.systemDownDisplay}</Text>
        </View>
        <View>
          <Text style={{ fontSize: 4.5, color: C.lineFine }}>STATUS</Text>
          <Text style={{ fontSize: 5.8, fontWeight: 700, color: '#64e3a1' }}>{csr.status.toUpperCase()}</Text>
        </View>
      </View>
      <View style={{ borderTopWidth: 0.5, borderTopColor: C.cyanDim, paddingTop: 2 }}>
        <Text style={{ fontSize: 4.4, color: C.lineFine }}>
          Authorised Service Verification Record
        </Text>
      </View>
    </View>
  </View>
)
