// Kalkulations-Engine – bildet die Excel-Formeln 1:1 ab.
// Wird identisch im Worker (Speichern) und im Frontend (Live-Vorschau) verwendet.

import type { CalcData, CalcResult, CalcType } from "./types";
import { ZUSCHLAG_TYPES } from "./types";

const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

// Standard-Zuschläge je Typ aus den Excel-Originalen
const MATERIAL_SURCHARGE: Partial<Record<CalcType, number>> = { schallkabine: 0.3, ventilator: 0.2 };
const PROFIT_RATE: Partial<Record<CalcType, number>> = { baugruppe: 0.2, ventilator: 0.25 };

export function emptyCalcData(type: CalcType): CalcData {
  return {
    type,
    batchQty: 1,
    smallMaterial: 0,
    materialSurcharge: MATERIAL_SURCHARGE[type] ?? 0.2,
    materialSpecialSurcharge: 0,
    prodOneTime: 0,
    prodSurcharge: 0,
    extOneTime: 0,
    shipOneTime: 0,
    profitRate: PROFIT_RATE[type] ?? 0.3,
    materials: [],
    works: [],
    externals: [],
    shipping: [],
    skMaterials: [],
    skWorks: [],
    areas: [],
  };
}

export function calculate(d: CalcData, densities: Record<string, number>): CalcResult {
  return ZUSCHLAG_TYPES.includes(d.type) ? calcZuschlag(d) : calcStandard(d, densities);
}

// Laufrad / Drückteile / Baugruppe:
//   Kg     = Dichte × (Breite × Höhe × Dicke × Gesamtstück) / 1.000.000
//   Preis  = Kg × Preis/Kg
//   Summe Materialkosten = (Materialpreis + Kleinmaterial) × (1 + Materialzuschlagssatz)
//   Arbeitsgang = Rüstzeit×Satz/60 + Fertigungszeit×Gesamtstück×Satz/60  (nur wenn Stückzahl > 0)
//   Herstellkosten = Material + Fertigung + Extern + Versand
//   Verkaufspreis = Herstellkosten × (1 + Gewinnzuschlag)
function calcStandard(d: CalcData, densities: Record<string, number>): CalcResult {
  const qty = d.batchQty || 0;

  const materialWeights: number[] = [];
  const materialPrices: number[] = [];
  for (const m of d.materials) {
    const density = densities[m.material] ?? 0;
    const totalQty = (m.qtyPerPiece || 0) * qty;
    const kg = (density * ((m.width || 0) * (m.height || 0) * (m.thickness || 0) * totalQty)) / 1_000_000;
    materialWeights.push(kg);
    materialPrices.push(kg * (m.pricePerKg || 0));
  }
  const materialTotal = sum(materialPrices);
  const totalWeight = sum(materialWeights);
  const materialSum = (materialTotal + (d.smallMaterial || 0)) * (1 + (d.materialSurcharge || 0));

  const workPrices: number[] = [];
  let totalMinutes = 0;
  for (const w of d.works) {
    const totalQty = (w.qtyPerPiece || 0) * qty;
    let price = 0;
    if (totalQty > 0) {
      price = ((w.setupMin || 0) * (w.rate || 0)) / 60 + ((w.prodMin || 0) * totalQty * (w.rate || 0)) / 60;
      totalMinutes += (w.setupMin || 0) + (w.prodMin || 0) * totalQty;
    }
    workPrices.push(price);
  }
  const workSubtotal = sum(workPrices);
  const prodSum = workSubtotal + (d.prodOneTime || 0);

  const extPrices = d.externals.map((e) => (e.price || 0) * (e.perPiece ? qty : 1));
  const extSubtotal = sum(extPrices);
  const extSum = extSubtotal + (d.extOneTime || 0);

  const shipPrices = d.shipping.map((s) => (s.unitPrice || 0) * (s.qty || 0));
  const shipSubtotal = sum(shipPrices);
  const shipSum = shipSubtotal + (d.shipOneTime || 0);

  const manufacturingCost = materialSum + prodSum + extSum + shipSum;
  const salesTotal = manufacturingCost * (1 + (d.profitRate || 0));

  return {
    materialWeights,
    materialPrices,
    materialTotal,
    materialSum,
    totalWeight,
    workPrices,
    workSubtotal,
    prodSum,
    totalHours: totalMinutes / 60,
    extPrices,
    extSubtotal,
    extSum,
    shipPrices,
    shipSubtotal,
    shipSum,
    skMatBase: [],
    skMatPrices: [],
    skMatSubtotal: 0,
    skSpecialSurcharge: 0,
    skWorkPrices: [],
    skWorkSubtotal: 0,
    skProdSurcharge: 0,
    areaTotal: 0,
    manufacturingCost,
    profit: salesTotal - manufacturingCost,
    salesTotal,
    salesPerUnit: qty > 0 ? salesTotal / qty : salesTotal,
  };
}

// Schallkabine / Ventilator (Zuschlagskalkulation):
//   Position = Stückzahl × Menge (Kg/m², leer → 1) × Einzelpreis, je Position + Verschnitt/Zuschlag
//   Materialkosten = Summe + Sonstiger Materialsonderzuschlag
//   Arbeitsgang = Stückzahl × Arbeitszeit (h) × Stundensatz
//   Fertigungskosten = Summe + Sonstiger Fertigungszuschlag
//   Verkaufspreis = Herstellkosten × (1 + Gewinnzuschlag)
function calcZuschlag(d: CalcData): CalcResult {
  const areaTotal = sum(d.areas.map((a) => a.value || 0));

  const skMatBase = d.skMaterials.map((m) => (m.qty || 0) * (m.amount || 1) * (m.unitPrice || 0));
  const surcharge = d.materialSurcharge || 0;
  // Unterkalkulationen u. ä. (noSurcharge) erhalten keinen Verschnitt-Zuschlag
  const skMatPrices = skMatBase.map((b, i) => b * (1 + (d.skMaterials[i].noSurcharge ? 0 : surcharge)));
  const skMatSubtotal = sum(skMatPrices);
  const skSpecialSurcharge = skMatSubtotal * (d.materialSpecialSurcharge || 0);
  const materialSum = skMatSubtotal + skSpecialSurcharge;

  const skWorkPrices = d.skWorks.map((w) => (w.qty || 0) * (w.hours || 0) * (w.rate || 0));
  const skWorkSubtotal = sum(skWorkPrices);
  const totalHours = sum(d.skWorks.map((w) => (w.qty || 0) * (w.hours || 0)));
  const skProdSurcharge = skWorkSubtotal * (d.prodSurcharge || 0);
  const prodSum = skWorkSubtotal + skProdSurcharge;

  const manufacturingCost = materialSum + prodSum;
  const salesTotal = manufacturingCost * (1 + (d.profitRate || 0));
  const qty = d.batchQty || 1;

  return {
    materialWeights: [],
    materialPrices: [],
    materialTotal: skMatSubtotal,
    materialSum,
    totalWeight: 0,
    workPrices: [],
    workSubtotal: skWorkSubtotal,
    prodSum,
    totalHours,
    extPrices: [],
    extSubtotal: 0,
    extSum: 0,
    shipPrices: [],
    shipSubtotal: 0,
    shipSum: 0,
    skMatBase,
    skMatPrices,
    skMatSubtotal,
    skSpecialSurcharge,
    skWorkPrices,
    skWorkSubtotal,
    skProdSurcharge,
    areaTotal,
    manufacturingCost,
    profit: salesTotal - manufacturingCost,
    salesTotal,
    salesPerUnit: salesTotal / qty,
  };
}
