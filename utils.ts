import * as XLSX from 'xlsx';
import { OriginZone } from './types';
import { expandLocationName } from './constants';

export const parseWorkbook = (workbook: XLSX.WorkBook): OriginZone[] => {
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  
  // Converte para matriz de dados
  const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });

  if (!rows || rows.length === 0) {
      throw new Error("A planilha/arquivo está vazia.");
  }

  const zonesMap = new Map<string, OriginZone>();
  const processedCircuitIds = new Set<string>();
  
  let validRowsCount = 0;

  // --- DETECÇÃO DE COLUNAS ---
  let idxCircuito = 0;
  let idxOrigem = 1;
  let idxDestino = 2;
  let idxProgramador = 3;
  let idxMeta = 5; 
  let idxRealizado = 7; 
  
  // Novos índices para Financeiro
  let idxFaturamento = -1;
  let idxBonificacao = -1;
  
  let startRow = 1; // Pula cabeçalho padrão

  // Tenta confirmar o cabeçalho
  for (let i = 0; i < Math.min(rows.length, 20); i++) {
      const row = rows[i];
      if (!row) continue;
      
      const rowStr = row.map((cell: any) => String(cell || '').toUpperCase().trim());
      
      const foundOrigem = rowStr.findIndex(c => c === 'ORIGEM');
      const foundDestino = rowStr.findIndex(c => c === 'DESTINO');
      const foundCircuito = rowStr.findIndex(c => c.includes('CIRCUITO') || c === '#' || c.includes('Nº'));

      if (foundOrigem !== -1 && foundDestino !== -1) {
          idxOrigem = foundOrigem;
          idxDestino = foundDestino;
          if (foundCircuito !== -1) idxCircuito = foundCircuito;
          
          const foundMeta = rowStr.findIndex(c => c === 'CONTRATO' || c === 'META');
          const foundProg = rowStr.findIndex(c => c === 'PROGRAMADOR');
          const foundRealizado = rowStr.findIndex(c => c === 'REALIZADO' || c === 'REAL' || c.includes('EXECUTADO'));
          
          // Detecção de colunas financeiras
          const foundFat = rowStr.findIndex(c => c.includes('FATURAMENTO') || c === 'VLR FRETE' || c === 'RECEITA');
          const foundBon = rowStr.findIndex(c => c.includes('BONIFIC') || c === 'BONUS' || c.includes('BONIFICAÇÃO'));
          
          if (foundMeta !== -1) idxMeta = foundMeta; 
          if (foundProg !== -1) idxProgramador = foundProg;
          if (foundRealizado !== -1) idxRealizado = foundRealizado;
          
          if (foundFat !== -1) idxFaturamento = foundFat;
          if (foundBon !== -1) idxBonificacao = foundBon;

          startRow = i + 1;
          break;
      }
  }
  
  // Função auxiliar para limpar e converter valores numéricos/monetários
  const parseNumber = (val: any): number => {
      if (typeof val === 'number') return val;
      if (typeof val === 'string') {
          // Remove R$, espaços e converte formato PT-BR (1.000,00) para JS (1000.00)
          const cleanStr = val.replace(/[R$\s]/g, '').replace(/\./g, '').replace(/,/g, '.').replace(/[^\d.-]/g, '');
          return parseFloat(cleanStr) || 0;
      }
      return 0;
  };
  
  // --- PROCESSAMENTO ---
  for (let i = startRow; i < rows.length; i++) {
      const row = rows[i];
      if (!row) continue;

      const rawCircuitId = row[idxCircuito] ? String(row[idxCircuito]).trim() : '';
      
      if (!rawCircuitId) continue;
      
      // Se já processou este ID neste arquivo, pula (evita duplicação no mesmo arquivo)
      if (processedCircuitIds.has(rawCircuitId)) {
          continue;
      }
      processedCircuitIds.add(rawCircuitId);

      const rawOrigin = row[idxOrigem] ? String(row[idxOrigem]).trim().toUpperCase() : '';
      const rawDest = row[idxDestino] ? String(row[idxDestino]).trim().toUpperCase() : '';
      
      if (!rawOrigin || !rawDest || rawOrigin.includes('TOTAL')) continue;

      const programmer = (idxProgramador !== -1 && row[idxProgramador]) 
          ? String(row[idxProgramador]).trim() 
          : 'A Definir';

      // Leitura de Valores
      const rawVol = (idxMeta !== -1) ? parseNumber(row[idxMeta]) : 0;
      const rawRealized = (idxRealizado !== -1) ? parseNumber(row[idxRealizado]) : 0;
      
      // Leitura Financeira (se as colunas existirem)
      const rawRevenue = (idxFaturamento !== -1) ? parseNumber(row[idxFaturamento]) : 0;
      const rawBonus = (idxBonificacao !== -1) ? parseNumber(row[idxBonificacao]) : 0;

      // --- LOGICA DE AGRUPAMENTO DE ZONAS ---
      let zoneId = rawOrigin;
      
      // Remove sufixos como " - FORA DO CIRCUITO"
      if (zoneId.includes('FORA DO CIRCUITO')) {
            const cleanName = zoneId.replace('FORA DO CIRCUITO', '').trim();
            const cleanNameNoDash = cleanName.replace(/-$/, '').trim();
            if (cleanNameNoDash) zoneId = cleanNameNoDash;
      }

      // REGRAS DE UNIFICAÇÃO
      if (zoneId === 'PERNAMBUCO' || zoneId === 'PERNAMBUCO / PARAIBA / ALAGOAS') {
          zoneId = 'NORDESTE';
      }
      if (zoneId === 'SANTA CATARINA' || zoneId === 'EXTREMO OESTE SC') {
          zoneId = 'EXTREMO SANTA CATARINA';
      }
      if (zoneId === 'SÃO PAULO') {
          zoneId = 'SAO PAULO';
      }
      
      const shortId = zoneId.substring(0, 3).toUpperCase();
      const expandedName = expandLocationName(rawOrigin);
      const expandedDest = expandLocationName(rawDest);
      const mapKey = zoneId; 

      if (!zonesMap.has(mapKey)) {
          zonesMap.set(mapKey, {
              id: shortId + '-' + Math.random().toString(36).substr(2, 4),
              name: zoneId,
              programmer: programmer !== 'A Definir' ? programmer : 'A Definir',
              financialRevenue: 0,
              financialBonus: 0,
              routes: []
          });
      }

      const zone = zonesMap.get(mapKey)!;
      
      if (zone.programmer === 'A Definir' && programmer !== 'A Definir') {
          zone.programmer = programmer;
      }

      // SOMA OS VALORES REAIS AO TOTAL DA ZONA
      zone.financialRevenue += rawRevenue;
      zone.financialBonus += rawBonus;

      zone.routes.push({
          id: rawCircuitId,
          origin: expandedName,
          destination: expandedDest,
          contractedVolume: rawVol,
          realizedVolume: rawRealized,
          revenue: rawRevenue,
          bonus: rawBonus
      });

      validRowsCount++;
  }

  if (validRowsCount === 0) {
      throw new Error("Nenhum dado válido encontrado. Verifique as colunas.");
  }

  const newZones = Array.from(zonesMap.values());
  newZones.sort((a, b) => a.name.localeCompare(b.name));
  
  return newZones;
};