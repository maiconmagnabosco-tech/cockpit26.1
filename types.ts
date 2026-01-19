export interface RouteContract {
  id: string;
  origin: string;
  destination: string;
  contractedVolume: number; // Volume Contratado (Meta)
  realizedVolume: number;   // Volume Realizado
  revenue: number;          // Faturamento Real (R$)
  bonus: number;            // Bonificação Real (R$)
}

export interface OriginZone {
  id: string;
  name: string; // e.g., "Goiás", "Paraná"
  programmer: string; // Programador responsável
  financialRevenue: number; // Faturamento total (soma das rotas)
  financialBonus: number;   // Bonificação total (soma das rotas)
  routes: RouteContract[];
}

export interface DashboardData {
  zones: OriginZone[];
}

export enum AppView {
  OVERVIEW = 'OVERVIEW',
  ANALYTICS = 'ANALYTICS',
  ZONE_DETAIL = 'ZONE_DETAIL',
  IMPORT = 'IMPORT'
}

export interface AppNotification {
  id: string;
  message: string;
  timestamp: Date;
  read: boolean;
  type: 'INFO' | 'SUCCESS' | 'WARNING';
}

export interface PdfDocument {
  id: string;
  fileName: string;
  extractionId: string;
  extractedOriginCity: string;
  extractedOriginState: string;
  extractedDestination: string;
  mappedZoneId?: string;
  isDuplicate: boolean;
  selected?: boolean;
}

export interface User {
  username: string;
  name: string; // Nome de exibição (ex: LUCAS)
  role: 'GLOBAL' | 'PROGRAMMER';
}