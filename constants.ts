import { OriginZone, RouteContract } from './types';

export const COMPLIANCE_THRESHOLD = 0.90; // Meta Bonificação (90%)
export const COMPLIANCE_THRESHOLD_GIF = 0.95; // Meta GIF (95%)
export const ROUTE_MIN_THRESHOLD = 0.40; // Mínimo aceitável por rota individual (40%)
export const MAX_ALLOWED_FAILURES = 2;
// Converted from edit link to export CSV link for GID 671961262 (Cockpit Novembro)
export const DEFAULT_SHEET_URL = "https://docs.google.com/spreadsheets/d/1h3onr9mXLIaj6sTqEzWeQ3bi2Ct62BeENGyUMIJrn-A/export?format=csv&gid=671961262";

// --- DYNAMIC DATE LOGIC ---
export const getDateFactor = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  
  // Get total days in current month (day 0 of next month gets last day of current)
  const totalDays = new Date(year, month + 1, 0).getDate();
  const currentDay = now.getDate();
  
  // Calculate factor (e.g., 15th of 30 days = 0.5)
  // We constrain it to max 1.0 just in case logic runs over
  const factor = Math.min(currentDay / totalDays, 1.0);

  return {
    currentDay,
    totalDays,
    factor,
    formattedDate: now.toLocaleDateString('pt-BR')
  };
};

// --- BRAZILIAN STATE MAPPING LOGIC ---
export const BRAZILIAN_STATES: Record<string, string> = {
  'AC': 'Acre', 'AL': 'Alagoas', 'AP': 'Amapá', 'AM': 'Amazonas',
  'BA': 'Bahia', 'CE': 'Ceará', 'DF': 'Distrito Federal', 'ES': 'Espírito Santo',
  'GO': 'Goiás', 'MA': 'Maranhão', 'MT': 'Mato Grosso', 'MS': 'Mato Grosso do Sul',
  'MG': 'Minas Gerais', 'PA': 'Pará', 'PB': 'Paraíba', 'PR': 'Paraná',
  'PE': 'Pernambuco', 'PI': 'Piauí', 'RJ': 'Rio de Janeiro', 'RN': 'Rio Grande do Norte',
  'RS': 'Rio Grande do Sul', 'RO': 'Rondônia', 'RR': 'Roraima', 'SC': 'Santa Catarina',
  'SP': 'São Paulo', 'SE': 'Sergipe', 'TO': 'Tocantins'
};

// Helper function to get Flag URL based on Zone Name
// Returns an ARRAY of strings to support multiple flags (e.g. Nordeste)
export const getZoneFlag = (zoneName: string): string[] => {
  const normalized = zoneName.toUpperCase().trim();
  const baseUrl = "https://upload.wikimedia.org/wikipedia/commons";
  
  // Specific Logic for Nordeste (PE, PB, AL)
  if (normalized.includes('NORDESTE')) {
      return [
          `${baseUrl}/5/59/Bandeira_de_Pernambuco.svg`, // Pernambuco
          `${baseUrl}/b/bb/Bandeira_da_Para%C3%ADba.svg`, // Paraíba
          `${baseUrl}/8/88/Bandeira_de_Alagoas.svg` // Alagoas
      ];
  }

  // Mapping logic for Single Flags
  if (normalized.includes('GOIÁS') || normalized.includes('GOIAS') || normalized === 'GO') return [`${baseUrl}/b/be/Flag_of_Goi%C3%A1s.svg`];
  if (normalized.includes('MATO GROSSO DO SUL')) return [`${baseUrl}/6/64/Bandeira_de_Mato_Grosso_do_Sul.svg`];
  if (normalized.includes('MATO GROSSO')) return [`${baseUrl}/0/0b/Bandeira_de_Mato_Grosso.svg`];
  if (normalized.includes('PARANÁ') || normalized.includes('PARANA')) return [`${baseUrl}/9/93/Bandeira_do_Paran%C3%A1.svg`];
  if (normalized.includes('SANTA CATARINA')) return [`${baseUrl}/1/1a/Bandeira_de_Santa_Catarina.svg`];
  if (normalized.includes('RIO GRANDE DO SUL')) return [`${baseUrl}/6/63/Bandeira_do_Rio_Grande_do_Sul.svg`];
  if (normalized.includes('SÃO PAULO') || normalized.includes('SAO PAULO')) return [`${baseUrl}/2/2b/Bandeira_do_estado_de_S%C3%A3o_Paulo.svg`];
  if (normalized.includes('MINAS') || normalized.includes('TRIANGULO') || normalized.includes('TRIÂNGULO') || normalized === 'TM') return [`${baseUrl}/f/f4/Bandeira_de_Minas_Gerais.svg`];
  if (normalized.includes('PERNAMBUCO')) return [`${baseUrl}/5/59/Bandeira_de_Pernambuco.svg`];
  if (normalized.includes('BAHIA')) return [`${baseUrl}/2/28/Bandeira_da_Bahia.svg`];

  // Fallback to Brazil flag
  return [`${baseUrl}/0/05/Flag_of_Brazil.svg`];
};

// Helper function to expand abbreviations in any string
export const expandLocationName = (text: string): string => {
  if (!text) return text;
  let expanded = text;
  Object.keys(BRAZILIAN_STATES).forEach(code => {
    const regex = new RegExp(`\\b${code}\\b`, 'g');
    if (regex.test(expanded)) {
        expanded = expanded.replace(regex, BRAZILIAN_STATES[code].toUpperCase());
    }
  });
  return expanded.toUpperCase();
};

// --- LOGICA DE MAPEAMENTO DE ZONA POR CIDADE/ESTADO (REGRAS ESPECÍFICAS) ---
export const mapCityToZone = (city: string, state: string): string | null => {
  const c = city.toUpperCase().trim();
  const s = state.toUpperCase().trim();

  // PRIORIDADE 1: Cidades Específicas (Triângulo Mineiro e Regiões do Sul)

  // 5. TRIANGULO MINEIRO (Uberlandia e Araguari)
  if ((s === 'MG' || s === 'MINAS GERAIS') && (c === 'UBERLANDIA' || c === 'UBERLÂNDIA' || c === 'ARAGUARI')) {
      return 'TM';
  }

  // 6. LESTE PARANA (Paranagua ou Ponta Grossa)
  if ((s === 'PR' || s === 'PARANÁ') && (c === 'PARANAGUA' || c === 'PARANAGUÁ' || c === 'PONTA GROSSA')) {
      return 'LPR';
  }

  // 7. OESTE PARANA (Londrina ou Toledo)
  if ((s === 'PR' || s === 'PARANÁ') && (c === 'LONDRINA' || c === 'TOLEDO')) {
      return 'OPR';
  }

  // 8. SUDOESTE DO PARANA (Dois Vizinhos ou Francisco Beltrão)
  if ((s === 'PR' || s === 'PARANÁ') && (c === 'DOIS VIZINHOS' || c === 'FRANCISCO BELTRAO' || c === 'FRANCISCO BELTRÃO')) {
      return 'SPR';
  }

  // 9. EXTREMO OESTE SC (Concordia, Chapeco ou Irani)
  if ((s === 'SC' || s === 'SANTA CATARINA') && (c === 'CONCORDIA' || c === 'CONCÓRDIA' || c === 'CHAPECO' || c === 'CHAPECÓ' || c === 'IRANI')) {
      return 'ESC';
  }

  // 10. CENTRAL SC (Videira, Capinzal, Herval do Oeste, Campos Novos)
  if ((s === 'SC' || s === 'SANTA CATARINA') && (c === 'VIDEIRA' || c === 'CAPINZAL' || c === 'HERVAL DO OESTE' || c === 'CAMPOS NOVOS')) {
      return 'CSC';
  }

  // PRIORIDADE 2: Regras Gerais por Estado (se não caiu nas regras de cidade acima)

  // 1. GOIÁS (Tudo que for GO)
  if (s === 'GO' || s === 'GOIÁS') return 'GO';

  // 2. MATO GROSSO (Tudo que for MT)
  if (s === 'MT' || s === 'MATO GROSSO') return 'MT';

  // 3. MATO GROSSO DO SUL (Tudo que for MS)
  if (s === 'MS' || s === 'MATO GROSSO DO SUL') return 'MS';

  // 4. SÃO PAULO (Tudo que for SP)
  if (s === 'SP' || s === 'SÃO PAULO') return 'SP';

  // 11. NORDESTE (Estados Genéricos)
  if (s === 'BA' || s === 'PE' || s === 'CE' || s === 'AL' || s === 'PB' || s === 'RN' || s === 'SE' || s === 'MA' || s === 'PI') return 'NE';

  return null; // Não mapeado
};

// INITIAL DATA EMPTY - SYSTEM STARTS BLANK
export const INITIAL_DATA: OriginZone[] = [];