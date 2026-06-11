// Gemeinsame Typen für Worker (API) und Web-Frontend

export type CalcType = "laufrad" | "drueckteile" | "baugruppe" | "schallkabine" | "ventilator";

export type CalcStatus = "entwurf" | "angebot" | "auftrag" | "abgeschlossen" | "abgelehnt";

export const CALC_TYPE_LABELS: Record<CalcType, string> = {
  laufrad: "Laufrad",
  drueckteile: "Drückteile",
  baugruppe: "Baugruppe",
  schallkabine: "Schallkabine",
  ventilator: "Ventilator",
};

// Typen mit Zuschlagskalkulation (m²/Kg-Material + stundenbasierte Fertigung)
export const ZUSCHLAG_TYPES: CalcType[] = ["schallkabine", "ventilator"];

export const STATUS_LABELS: Record<CalcStatus, string> = {
  entwurf: "Entwurf",
  angebot: "Angebot",
  auftrag: "Auftrag",
  abgeschlossen: "Abgeschlossen",
  abgelehnt: "Abgelehnt",
};

// --- Positionen Standard-Kalkulation (Laufrad / Drückteile / Baugruppe) ---

export interface MaterialItem {
  label: string; // "Was"
  material: string; // Name aus Materialliste (für Dichte-Lookup)
  width: number; // Breite mm
  height: number; // Höhe mm
  thickness: number; // Dicke mm
  qtyPerPiece: number; // Stück pro Stück
  pricePerKg: number;
}

export interface WorkItem {
  name: string; // Arbeitsgang
  rate: number; // Stundensatz €/h
  qtyPerPiece: number; // Benötigte Stückzahl / Stück
  setupMin: number; // Rüstzeit (min)
  prodMin: number; // Fertigungszeit (min)
}

export interface ExternalItem {
  name: string; // Arbeitsgang / Zukaufsteil
  supplier: string;
  offerNo: string;
  price: number; // Angebotspreis
  perPiece: boolean; // Preis gilt pro Stück (× Kalkulationsstückzahl)
}

export interface ShippingItem {
  kind: "fahrzeug" | "verpackung";
  name: string;
  unitPrice: number; // Preis/Stunde bzw. Einzelpreis
  qty: number; // Fahrzeit (h) bzw. Anzahl
}

// --- Positionen Schallkabine (Zuschlagskalkulation) ---

export interface SkMaterialItem {
  comment: string;
  name: string;
  supplier: string;
  qty: number; // Stückzahl
  amount: number; // Kg bzw. m² je Einheit (0 → 1, z. B. Tafel-/Pauschalpreise)
  unitPrice: number; // Preis je Kg / m² / Stück
}

export interface SkWorkItem {
  name: string; // Arbeitsgang
  qty: number; // Stückzahl
  hours: number; // Arbeitszeit (h)
  rate: number; // Stundensatz
}

export interface AreaItem {
  label: string;
  value: number; // m²
}

// --- Gesamte Kalkulationsdaten (als JSON in DB) ---

export interface CalcData {
  type: CalcType;
  batchQty: number; // Kalkulationsstückzahl
  smallMaterial: number; // Sonstiges Kleinmaterial €
  materialSurcharge: number; // Materialzuschlagssatz (0.2 / 0.3)
  materialSpecialSurcharge: number; // Schallkabine: Sonstiger Materialsonderzuschlag
  prodOneTime: number; // Sonstige Einmalkosten Fertigung
  prodSurcharge: number; // Schallkabine: Sonstiger Fertigungszuschlag
  extOneTime: number; // Sonstige Einmalkosten externe Bearbeitung
  shipOneTime: number; // Sonstige Einmalkosten Versand
  profitRate: number; // Gewinnzuschlag (0.2 / 0.3)
  materials: MaterialItem[];
  works: WorkItem[];
  externals: ExternalItem[];
  shipping: ShippingItem[];
  skMaterials: SkMaterialItem[];
  skWorks: SkWorkItem[];
  areas: AreaItem[];
}

export interface CalcResult {
  // Material
  materialWeights: number[];
  materialPrices: number[];
  materialTotal: number; // Zwischensumme Materialpreis
  materialSum: number; // Summe Materialkosten (inkl. Zuschlag + Kleinmaterial)
  totalWeight: number;
  // Fertigung
  workPrices: number[];
  workSubtotal: number;
  prodSum: number;
  totalHours: number;
  // Extern
  extPrices: number[];
  extSubtotal: number;
  extSum: number;
  // Versand
  shipPrices: number[];
  shipSubtotal: number;
  shipSum: number;
  // Schallkabine
  skMatBase: number[];
  skMatPrices: number[]; // inkl. Verschnitt/Zuschlag
  skMatSubtotal: number;
  skSpecialSurcharge: number;
  skWorkPrices: number[];
  skWorkSubtotal: number;
  skProdSurcharge: number;
  areaTotal: number;
  // Endpreis
  manufacturingCost: number; // Summe Herstellkosten
  profit: number; // Gewinn €
  salesTotal: number; // Verkaufspreis Gesamt
  salesPerUnit: number; // Verkaufspreis pro Stück
}

export interface CalcRow {
  id: number;
  calc_type: CalcType;
  title: string;
  version: number;
  parent_id: number | null;
  status: CalcStatus;
  customer_id: number | null;
  customer_name: string;
  inquiry_no: string;
  drawing_no: string;
  calc_date: string;
  data: CalcData;
  offer_text: string;
  material_sum: number;
  prod_sum: number;
  ext_sum: number;
  ship_sum: number;
  manufacturing_cost: number;
  profit: number;
  sales_total: number;
  sales_unit: number;
  created_by: number | null;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: number;
  email: string;
  name: string;
  role: "admin" | "user";
  active: number;
  created_at: string;
}

export interface Material {
  id: number;
  name: string;
  price_per_kg: number;
  density: number;
  color_group: string;
  note: string;
  sort: number;
  active: number;
}

export interface StepTemplate {
  id: number;
  calc_type: CalcType;
  pos: number;
  name: string;
  rate: number;
  setup_min: number;
}

export interface MaterialPreset {
  id: number;
  pos: number;
  name: string;
  comment: string;
  supplier: string;
  unit_price: number;
}

export interface ShippingMaster {
  id: number;
  category: "verpackung" | "fahrzeug";
  name: string;
  dimensions: string;
  shipping_price: number;
  packaging_price: number;
  note: string;
  sort: number;
}

export interface Customer {
  id: number;
  name: string;
  contact: string;
  email: string;
  phone: string;
  special_terms: string;
  notes: string;
}

export interface Supplier {
  id: number;
  name: string;
  contact: string;
  email: string;
  phone: string;
  notes: string;
}
