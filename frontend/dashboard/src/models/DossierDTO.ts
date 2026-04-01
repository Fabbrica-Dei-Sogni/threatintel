// Dossier Section Data Models

export interface IBaseSectionData {}

export interface IIpSectionData extends IBaseSectionData {
  ip: string;
}

export interface IIpGeoSectionData extends IIpSectionData {
  country: string;
  city: string;
  region: string;
  timezone: string;
  gps: string;
}

export interface IIpNetSectionData extends IIpSectionData {
  org: string;
  hostname: string;
}

export interface IIpAbuseSectionData extends IIpSectionData {
  score: number | string;
  listed: boolean | string;
  total: number | string;
  lastReport: string;
}

export interface IIpWhoisSectionData extends IIpSectionData {
  rawData: string;
}

export interface IIpAbuseLogSectionData extends IBaseSectionData {
  date: string;
  categories: string;
  reporter: string;
  comment: string;
}

export interface IAttackSummarySectionData extends IIpSectionData {
  defcon: number | string;
  score: number | string;
  totalLogs: number | string;
  duration: string;
  rps: number | string;
  techniques: string;
  firstSeen: string;
  lastSeen: string;
  intensity: string;
  avgScore: number | string;
}

export interface IAttackLogSectionData extends IIpSectionData {
  timestamp: string;
  method: string;
  url: string;
  score: number | string;
  indicators: string;
  userAgent: string;
  payload: string;
}

export interface IRateBreachSectionData extends IBaseSectionData {
  timestamp: string;
  ip: string;
  limitType: string;
  path: string;
  method: string;
  userAgent: string;
  honeypotId: string;
  message: string;
}

export interface ITelnetSummarySectionData extends IIpSectionData {
  sessionId: string;
  timeWindow: string;
  origin: string;
  totalEvents: number | string;
}

export interface ITelnetTimelineRowData extends IBaseSectionData {
  timestamp: string;
  eventName: string;
  message: string;
  details: string;
}

export interface IGenericSectionData extends IBaseSectionData {
  text: string;
}

export interface IAttackTechniqueData extends IBaseSectionData {
  tech: string;
}

/**
 * Frontend Dossier Section DTO
 * Uses generic T to allow strict typing of the data payload
 */
export interface IDossierSection<T = any> {
  type: string;
  templateKey: string;
  data: T;
  renderedText?: string;
  order: number;
  timestamp: string | Date;
}

export interface IDossier {
  _id: string;
  title: string;
  description?: string;
  sections: IDossierSection[];
  status: string;
  tags?: string[];
  createdAt?: string | Date;
  updatedAt?: string | Date;
}
