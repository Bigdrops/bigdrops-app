export interface CsrReadingItem {
  readonly label: string
  readonly value: string | null
  readonly unit?: string
}

export interface CsrOperationalReadings {
  readonly voltage: CsrReadingItem
  readonly frequency: CsrReadingItem
  readonly battery: CsrReadingItem
  readonly temperature: CsrReadingItem
  readonly pressure: CsrReadingItem
  readonly hours: CsrReadingItem
}

export interface CsrMaterialItem {
  readonly no: string
  readonly description: string
  readonly qty: string
  readonly unit: string
  readonly partNo?: string
}

export interface CsrSignOffBlock {
  readonly roleId: '01' | '02'
  readonly roleTitle: string
  readonly roleSubtitle: string
  readonly signatureLabel: string
  readonly printedName: string | null
  readonly designation: string | null
  readonly signingDate: string | null
  readonly signatureUrl?: string | null
}

export interface CsrServiceProvider {
  readonly name: string
  readonly subtitle: string
  readonly address: string
  readonly contact: string
  readonly logoSvg?: string
  readonly logoUrl?: string | null
}

export interface CsrClientParty {
  readonly name: string
  readonly address: string
  readonly accountRef?: string
  readonly poNumber?: string
}

export interface CsrLocationInfo {
  readonly label: 'Site / Equipment Location'
  readonly site: string
  readonly subLocation?: string
}

export interface CsrEquipmentInfo {
  readonly type: string
  readonly make: string
  readonly model: string
  readonly serialNo: string
  readonly capacity: string
  readonly engineNo: string
}

export interface CsrServiceWindow {
  readonly startDate: string
  readonly startTime: string
  readonly endDate: string
  readonly endTime: string
  readonly operatingHours: string
}

export interface CsrNarrativeRecord {
  readonly problemReported: string
  readonly serviceRendered: string
  readonly defectsFound: string
  readonly defectsList: readonly string[]
  readonly engineerRemarks: string
  readonly customerFeedback: string
}

/**
 * Authoritative Canonical Prepared CSR Model.
 * Consumed identically by both Landscape Blueprint and Portrait Reference templates.
 */
export interface CanonicalPreparedCsr {
  readonly csrNumber: string
  readonly date: string
  readonly status: string
  readonly callType: string
  readonly callTypeDisplay: string
  readonly serviceBasis: string
  readonly systemDownDisplay: string

  readonly serviceProvider: CsrServiceProvider
  readonly client: CsrClientParty
  readonly location: CsrLocationInfo
  readonly equipment: CsrEquipmentInfo
  readonly serviceWindow: CsrServiceWindow

  readonly readings: CsrOperationalReadings
  readonly narratives: CsrNarrativeRecord

  readonly materials: readonly CsrMaterialItem[]
  readonly materialGroups: readonly (readonly CsrMaterialItem[])[]

  readonly signatories: {
    readonly serviceEngineer: CsrSignOffBlock
    readonly clientRepresentative: CsrSignOffBlock
  }
}
