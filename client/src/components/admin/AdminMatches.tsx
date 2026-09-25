import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  Phone, MapPin, Search, Download, Building2, Calendar, 
  Sparkles, CheckCircle2, AlertTriangle, XCircle, SlidersHorizontal, 
  DollarSign, Ruler, Bed, Bath, Car, Shield, ExternalLink, Receipt, Box, Globe,
  Edit3, Save, Loader2, RotateCcw, Sun, Zap, Utensils, Home, Flame, ThumbsUp, ThumbsDown,
  Trees, ShieldCheck, BookOpen, Copy, Check, ClipboardList, Archive, Layers,
  Tv, Wine, Wind, Lock, Dumbbell, Waves, Landmark, School, Fuel, Percent, Compass, Smile, Maximize, Coffee, Mountain, Trophy, ShieldAlert, VolumeX, Plus, Tag,
  ArrowUp, X, Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { trpc } from '@/lib/trpc';
import { motion, AnimatePresence } from 'framer-motion';
import { formatColombiaDate } from '@/lib/dateUtils';
import { supabase } from '@/lib/supabase';
import { VECY_VERSION_LABEL } from '@/const';
import {
  parseColombianCurrency,
  parseArea,
  parseAdminFee,
  parseMaxAge,
  parseKitchenType,
  formatRequirementField,
  parseSecurityType,
  demands24hSecurity,
  checkFinancialSegmentCoherence,
  parseOutdoorAreas
} from '@shared/colombianRealEstateParser';

type MatchStatus = "exact" | "warn" | "missing" | "ok" | "neutral" | "plus";

interface ScoreRow {
  label: string;
  reqVal: string;
  propVal: string;
  status: MatchStatus;
  weight: number;
  icon: React.ReactNode;
}

// Lógica de comparación de campos (Scoring) heredada del MatchesReport
function getPropTypeLabel(type: string | null | undefined): string {
  if (!type) return "N/E";
  const clean = type.toLowerCase().trim();
  const m: Record<string, string> = {
    apartment: "Apartamento",
    apartamento: "Apartamento",
    apartamento_estandar: "Apartamento",
    apartamento_duplex: "Apartamento Dúplex",
    penthouse: "Pent House",
    penthouse_duplex: "Pent House Dúplex",
    apartaestudio: "Apartaestudio",
    loft: "Loft",
    house: "Casa",
    casa: "Casa",
    casa_campestre: "Casa Campestre",
    casa_quinta: "Casa Quinta",
    villa: "Villa",
    farm: "Finca",
    finca: "Finca",
    cabin: "Cabaña",
    cabaña: "Cabaña",
    building: "Edificio",
    edificio: "Edificio",
    warehouse: "Bodega",
    bodega: "Bodega",
    office: "Oficina",
    oficina: "Oficina",
    consultorio: "Consultorio Médico / Dotacional",
    commercial: "Local Comercial",
    local: "Local Comercial",
    land: "Lote / Terreno",
    lote: "Lote / Terreno",
    hotel: "Hotel",
    hostal: "Hostal",
    aparta_hotel: "Aparta Hotel",
    aparta_suit: "Aparta Suit",
    motel: "Motel"
  };
  return m[clean] || type;
}

function getTransactionLabel(type: string | null | undefined): string {
  if (!type) return "N/E";
  const clean = type.toLowerCase().trim();
  const m: Record<string, string> = {
    venta: "Venta",
    arriendo: "Arriendo",
    venta_o_arriendo: "Venta o Arriendo",
    arriendo_con_opcion_de_compra: "Arriendo con Opción de Compra",
    arriendo_temporal: "Arriendo Temporal",
    permuta: "Permuta Pura (100%)",
    venta_permuta: "Venta / Permuta (Venpermuto)",
    venta_permuta_50_50: "Venta 50% / Permuta 50%",
    venta_permuta_60_40: "Venta 60% / Permuta 40%",
    venta_permuta_70_30: "Venta 70% / Permuta 30%",
    venta_permuta_80_20: "Venta 80% / Permuta 20%",
    venta_permuta_90_10: "Venta 90% / Permuta 10%",
    venta_permuta_10_90: "Venta 10% / Permuta 90%",
    venta_permuta_20_80: "Venta 20% / Permuta 80%",
    venta_permuta_30_70: "Venta 30% / Permuta 70%",
    venta_permuta_40_60: "Venta 40% / Permuta 60%",
    aporte: "Aporte a Proyecto"
  };
  return m[clean] || type;
}

function isPropertyDualOffer(prop: any): boolean {
  if (!prop) return false;
  const pType = (prop.transactionType || "").toLowerCase();
  if (pType === "venta_o_arriendo" || pType === "venta_arriendo") return true;

  if (prop.rentPrice && parseFloat(String(prop.rentPrice)) > 0 && parseFloat(String(prop.price || "0")) > 0) {
    return true;
  }

  let accepted = prop.acceptedTransactionTypes;
  if (typeof accepted === "string") {
    try { accepted = JSON.parse(accepted); } catch (e) { accepted = []; }
  }
  if (Array.isArray(accepted) && (accepted.includes("venta") || accepted.includes("sale")) && (accepted.includes("arriendo") || accepted.includes("rent"))) {
    return true;
  }

  const raw = (prop.rawText || prop.name || prop.description || "").toLowerCase();
  if ((raw.includes("venta") || raw.includes("vendo")) && (raw.includes("arriendo") || raw.includes("arrienda") || raw.includes("canon"))) {
    return true;
  }

  return false;
}

function isWhatsAppContactLink(url: string | null | undefined): boolean {
  if (!url) return false;
  return /wa\.me\/|api\.whatsapp\.com|whatsapp\.com/i.test(url);
}

function extractPublicLink(item: any): string | null {
  if (!item) return null;

  // 1. Prioridad Máxima: externalUrl (siempre que sea un portal web/documento y no un link de WhatsApp)
  if (item.externalUrl && typeof item.externalUrl === 'string' && item.externalUrl.trim()) {
    const trimmed = item.externalUrl.trim();
    if (!isWhatsAppContactLink(trimmed)) {
      return trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
    }
  }

  // 2. enlaceOrigen (siempre que no sea un link de WhatsApp)
  if (item.enlaceOrigen && typeof item.enlaceOrigen === 'string' && item.enlaceOrigen.trim()) {
    const trimmed = item.enlaceOrigen.trim();
    if (!isWhatsAppContactLink(trimmed)) {
      return trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
    }
  }

  // 3. Buscar enlaces de portales inmobiliarios dentro de rawText o description
  const text = `${item.rawText || ''} ${item.description || ''}`;
  const allUrls = text.match(/https?:\/\/[^\s<"']+/gi);
  if (allUrls && allUrls.length > 0) {
    const portalUrl = allUrls.find(u => !isWhatsAppContactLink(u));
    if (portalUrl) return portalUrl;
  }
  
  // 4. Expresión para enlaces inmobiliarios comunes de portales públicos (wasi.co, fincaraiz.com.co, etc.)
  const domainMatch = text.match(/(?:[a-zA-Z0-9-]+\.)+(?:com|co|net|org|app|io|tools|store)\/[^\s<"']+/i);
  if (domainMatch && !isWhatsAppContactLink(domainMatch[0])) return `https://${domainMatch[0]}`;

  return null;
}

const SUPABASE_STORAGE_URL = 'https://knzmpoprlmbonejshfys.supabase.co/storage/v1/object/public/property-flyers';

function normalizeImageUrl(url: string): string {
  if (!url) return '';
  const trimmed = url.trim();

  // Si la URL apunta al directorio local /uploads/ (ya sea con la IP http://13.140.149.144/uploads/... o relativa):
  // Convertirla a ruta relativa /uploads/... para que el navegador la cargue vía HTTPS a través del proxy de Vercel
  // y evitar el error y bloqueo de "Mixed Content" en Chrome/Brave.
  if (trimmed.includes('/uploads/')) {
    const uploadIndex = trimmed.indexOf('/uploads/');
    return trimmed.substring(uploadIndex);
  }

  // Si ya es HTTPS segura
  if (trimmed.startsWith('https://')) return trimmed;

  // Si es HTTP externo, mejorar a HTTPS para evitar bloqueo del navegador
  if (trimmed.startsWith('http://')) {
    return trimmed.replace(/^http:\/\//i, 'https://');
  }

  if (trimmed.startsWith('/')) {
    return `/uploads${trimmed}`;
  }
  return `/uploads/${trimmed}`;
}

function extractItemImages(item: any): string[] {
  if (!item) return [];
  const rawUrls: string[] = [];
  if (Array.isArray(item.images)) {
    for (const img of item.images) {
      if (typeof img === 'string' && (img.startsWith('http') || img.startsWith('/'))) {
        if (!rawUrls.includes(img)) rawUrls.push(img);
      }
    }
  }
  if (item.imageUrl && typeof item.imageUrl === 'string' && (item.imageUrl.startsWith('http') || item.imageUrl.startsWith('/'))) {
    if (!rawUrls.includes(item.imageUrl)) rawUrls.push(item.imageUrl);
  }
  if (item.enlaceOrigen && typeof item.enlaceOrigen === 'string') {
    const isImg = item.enlaceOrigen.includes('/flyers/') || 
                  item.enlaceOrigen.includes('property-flyers') ||
                  /\.(?:jpg|jpeg|png|webp|gif)(?:\?.*)?$/i.test(item.enlaceOrigen);
    if (isImg && !rawUrls.includes(item.enlaceOrigen)) {
      rawUrls.push(item.enlaceOrigen);
    }
  }
  if (item.externalUrl && typeof item.externalUrl === 'string') {
    const isImg = item.externalUrl.includes('/flyers/') || 
                  item.externalUrl.includes('property-flyers') ||
                  /\.(?:jpg|jpeg|png|webp|gif)(?:\?.*)?$/i.test(item.externalUrl);
    if (isImg && !rawUrls.includes(item.externalUrl)) {
      rawUrls.push(item.externalUrl);
    }
  }
  const text = `${item.rawText || ''} ${item.description || ''}`;
  const imgMatches = text.match(/https?:\/\/[^\s<"']+\.(?:jpg|jpeg|png|webp|gif)(?:\?[^\s<"']*)?/gi);
  if (imgMatches) {
    for (const m of imgMatches) {
      if (!rawUrls.includes(m)) rawUrls.push(m);
    }
  }

  const normalizedUrls: string[] = [];
  for (const u of rawUrls) {
    const norm = normalizeImageUrl(u);
    if (norm && !normalizedUrls.includes(norm)) {
      normalizedUrls.push(norm);
    }
  }
  return normalizedUrls;
}

// ── DEFINICIÓN ESTÁTICA EN MEMORIA DE LAS 64 CARACTERÍSTICAS & AMENIDADES ("POR ARTE DE MAGIA") ──
const DYNAMIC_AMENITIES: Array<{
  name: string;
  patterns: string[];
  icon: React.ReactNode;
  weight?: number;
}> = [
  // ✨ 23 CARACTERÍSTICAS INTERNAS
  { name: "Aire Acondicionado", patterns: ["aire acondicionado", "aire acond", "climatizado", "a/a"], icon: <Wind className="w-3.5 h-3.5" /> },
  { name: "Alarma de Seguridad", patterns: ["alarma", "sistema de alarma"], icon: <Lock className="w-3.5 h-3.5" /> },
  { name: "Amoblado", patterns: ["amoblado", "full amoblado", "con muebles"], icon: <Home className="w-3.5 h-3.5" /> },
  { name: "Acabados de Alta Gama", patterns: ["alta gama", "acabados de lujo", "marmol", "mármol", "acabados importados"], icon: <Maximize className="w-3.5 h-3.5" /> },
  { name: "Acabados Modernos", patterns: ["acabados modernos", "diseño moderno"], icon: <Sparkles className="w-3.5 h-3.5" /> },
  { name: "Bar / Zona Bar", patterns: ["barra de bar", "zona de bar", "mueble bar"], icon: <Coffee className="w-3.5 h-3.5" /> },
  { name: "Baño en Alcoba Principal", patterns: ["baño en alcoba principal", "baño privado principal", "en suite"], icon: <Bath className="w-3.5 h-3.5" /> },
  { name: "Baño en Todas las Alcobas", patterns: ["baño en cada alcoba", "baño en todas las", "todas con baño"], icon: <Bath className="w-3.5 h-3.5" /> },
  { name: "Citófono", patterns: ["citofono", "citófono", "intercomunicador"], icon: <Phone className="w-3.5 h-3.5" /> },
  { name: "Clósets Empotrados", patterns: ["closets", "clósets", "closet empotrado"], icon: <Archive className="w-3.5 h-3.5" /> },
  { name: "Comedor Auxiliar", patterns: ["comedor auxiliar", "comedor de diario"], icon: <Utensils className="w-3.5 h-3.5" /> },
  { name: "Despensa / Alacena", patterns: ["despensa", "alacena"], icon: <Archive className="w-3.5 h-3.5" /> },
  { name: "Doble Ventana / Antiruido", patterns: ["doble ventana", "termoacustica", "termoacústica", "antiruido"], icon: <VolumeX className="w-3.5 h-3.5" /> },
  { name: "Gas Domiciliario", patterns: ["gas domiciliario", "gas natural", "red de gas"], icon: <Fuel className="w-3.5 h-3.5" /> },
  { name: "Iluminación Natural", patterns: ["iluminacion natural", "iluminación natural", "luz natural", "muy iluminado"], icon: <Sun className="w-3.5 h-3.5" /> },
  { name: "Hall de Alcobas", patterns: ["hall de alcobas", "estar de habitaciones"], icon: <Home className="w-3.5 h-3.5" /> },
  { name: "Jacuzzi / Hidromasaje", patterns: ["jacuzzi", "hidromasaje", "tina jacuzzi"], icon: <Waves className="w-3.5 h-3.5" /> },
  { name: "Turco Privado", patterns: ["turco privado", "baño turco"], icon: <Waves className="w-3.5 h-3.5" /> },
  { name: "Vestier / Walk-in Closet", patterns: ["vestier", "walk-in closet", "walking closet", "vestidor"], icon: <Archive className="w-3.5 h-3.5" /> },
  { name: "Vista Panorámica", patterns: ["vista panoramica", "vista panorámica", "vista a la ciudad", "vista verde", "vista a los cerros"], icon: <Mountain className="w-3.5 h-3.5" /> },
  { name: "Zona de Lavandería", patterns: ["zona de lavanderia", "zona de lavandería", "cuarto de ropas"], icon: <Zap className="w-3.5 h-3.5" /> },

  // 🏢 41 CARACTERÍSTICAS EXTERNAS
  { name: "Acceso Pavimentado", patterns: ["acceso pavimentado", "via pavimentada", "vía pavimentada", "asfalto"], icon: <MapPin className="w-3.5 h-3.5" /> },
  { name: "Área Social / Comunal", patterns: ["area social", "área social", "salon social", "zonas sociales"], icon: <Home className="w-3.5 h-3.5" /> },
  { name: "Áreas Turísticas", patterns: ["area turistica", "área turística", "zona turistica"], icon: <Landmark className="w-3.5 h-3.5" /> },
  { name: "Bancos Cercanos", patterns: ["bancos cercanos", "zona bancaria"], icon: <Landmark className="w-3.5 h-3.5" /> },
  { name: "Barbacoa / Parrilla Comunal", patterns: ["barbacoa", "quincho", "parrilla comunal"], icon: <Flame className="w-3.5 h-3.5" /> },
  { name: "Bosques Nativos", patterns: ["bosque nativo", "bosques nativos", "reserva forestal"], icon: <Trees className="w-3.5 h-3.5" /> },
  { name: "Caldera Central", patterns: ["caldera", "agua caliente central"], icon: <Flame className="w-3.5 h-3.5" /> },
  { name: "Cancha de Baloncesto", patterns: ["cancha de baloncesto", "cancha baloncesto", "basket"], icon: <Trophy className="w-3.5 h-3.5" /> },
  { name: "Cancha de Fútbol", patterns: ["cancha de futbol", "cancha de fútbol", "cancha sintetica", "cancha sintética", "futbol 5"], icon: <Trophy className="w-3.5 h-3.5" /> },
  { name: "Cancha de Golf", patterns: ["cancha de golf", "campo de golf", "golf"], icon: <Trophy className="w-3.5 h-3.5" /> },
  { name: "Cancha de Squash", patterns: ["cancha de squash", "cancha squash", "squash"], icon: <Trophy className="w-3.5 h-3.5" /> },
  { name: "Cancha de Tenis", patterns: ["cancha de tenis", "cancha tenis", "tennis"], icon: <Trophy className="w-3.5 h-3.5" /> },
  { name: "Centros Comerciales", patterns: ["centro comercial", "centros comerciales", "c.c."], icon: <Building2 className="w-3.5 h-3.5" /> },
  { name: "Centros Médicos / Clínicas", patterns: ["centro medico", "centros medicos", "clinica", "clínica", "hospital"], icon: <ShieldAlert className="w-3.5 h-3.5" /> },
  { name: "Club House", patterns: ["club house", "clubhouse"], icon: <Home className="w-3.5 h-3.5" /> },
  { name: "Colegios / Universidades", patterns: ["colegio", "colegios", "universidad", "universidades"], icon: <School className="w-3.5 h-3.5" /> },
  { name: "Edificio Inteligente", patterns: ["edificio inteligente", "domotica", "domótica"], icon: <Zap className="w-3.5 h-3.5" /> },
  { name: "Gimnasio Dotado", patterns: ["gimnasio", "gym"], icon: <Dumbbell className="w-3.5 h-3.5" /> },
  { name: "Kiosco / Bohío", patterns: ["kiosco", "quiosco", "bohio", "bohío"], icon: <Home className="w-3.5 h-3.5" /> },
  { name: "Lago / Espejo de Agua", patterns: ["lago", "laguna", "espejo de agua"], icon: <Waves className="w-3.5 h-3.5" /> },
  { name: "Lavandería Comunal", patterns: ["lavanderia comunal", "lavandería comunal"], icon: <Zap className="w-3.5 h-3.5" /> },
  { name: "Parques Cercanos", patterns: ["parques cercanos", "frente a parque", "cerca a parque"], icon: <Trees className="w-3.5 h-3.5" /> },
  { name: "Parque Infantil", patterns: ["parque infantil", "juegos infantiles"], icon: <Smile className="w-3.5 h-3.5" /> },
  { name: "Piscina", patterns: ["piscina", "piscinas", "piscina climatizada", "piscina sin fin"], icon: <Waves className="w-3.5 h-3.5" /> },
  { name: "Pista de Pádel", patterns: ["padel", "pádel", "pista de padel", "cancha de padel"], icon: <Trophy className="w-3.5 h-3.5" /> },
  { name: "Planta Eléctrica", patterns: ["planta electrica", "planta eléctrica", "planta total", "suplencia total"], icon: <Zap className="w-3.5 h-3.5" /> },
  { name: "Portería / Recepción", patterns: ["porteria", "portería", "recepcion", "recepción", "lobby"], icon: <Shield className="w-3.5 h-3.5" /> },
  { name: "Salón Infantil / Playroom", patterns: ["salon infantil", "salón infantil", "playroom"], icon: <Smile className="w-3.5 h-3.5" /> },
  { name: "Salón Comunal", patterns: ["salon comunal", "salón comunal", "salon de eventos"], icon: <Home className="w-3.5 h-3.5" /> },
  { name: "Salón de Juegos", patterns: ["salon de juegos", "salón de juegos", "billar", "ping pong"], icon: <Smile className="w-3.5 h-3.5" /> },
  { name: "Sauna / Turco Comunal", patterns: ["sauna", "zona humeda", "zonas humedas", "zonas húmedas"], icon: <Waves className="w-3.5 h-3.5" /> },
  { name: "Seguridad Privada 24/7", patterns: ["seguridad 24", "cctv", "circuito cerrado"], icon: <Lock className="w-3.5 h-3.5" /> },
  { name: "Sobre Vía Principal", patterns: ["sobre via principal", "sobre vía principal", "frente a avenida"], icon: <MapPin className="w-3.5 h-3.5" /> },
  { name: "Shut de Basuras", patterns: ["shut", "shut de basuras"], icon: <Archive className="w-3.5 h-3.5" /> },
  { name: "Teatrino / Cine", patterns: ["teatrino", "sala de cine", "cinema"], icon: <Tv className="w-3.5 h-3.5" /> },
  { name: "Terraza Comunal / Rooftop", patterns: ["terraza comunal", "rooftop", "terraza comunitaria"], icon: <Layers className="w-3.5 h-3.5" /> },
  { name: "Transporte Público Cercano", patterns: ["transporte publico", "transporte público", "transmilenio", "sitp"], icon: <MapPin className="w-3.5 h-3.5" /> },
  { name: "Zonas Deportivas", patterns: ["zonas deportivas", "polideportivo"], icon: <Trophy className="w-3.5 h-3.5" /> },
];

export const ATTRIBUTE_CATALOG: Array<{
  key: string;
  label: string;
  defaultReq: string;
  defaultProp: string;
}> = [
  { key: "mascotas", label: "Acepta Mascotas (Pet Friendly)", defaultReq: "Exige que admita mascotas", defaultProp: "Sí (Edificio Pet Friendly)" },
  { key: "calentador", label: "Calentador (Gas / Eléctrico)", defaultReq: "Exige calentador a gas", defaultProp: "Sí (Calentador a gas instalado)" },
  { key: "puerta_seguridad", label: "Puerta de Seguridad / Blindada", defaultReq: "Desea puerta blindada", defaultProp: "Sí (Puerta de seguridad)" },
  { key: "cortinas_blackouts", label: "Cortinas / Persianas / Blackouts", defaultReq: "Desea cortinas/blackouts instalados", defaultProp: "Sí (Incluye cortinas/blackouts)" },
  { key: "parqueadero_cubierto", label: "Parqueadero Cubierto / Sótano", defaultReq: "Exige parqueadero cubierto", defaultProp: "Sí (En sótano cubierto)" },
  { key: "deposito", label: "Depósito / Cuarto Útil", defaultReq: "Exige depósito privado", defaultProp: "Sí (Depósito en sótano)" },
  { key: "gas_natural", label: "Gas Natural Domiciliario", defaultReq: "Exige gas natural", defaultProp: "Sí (Red de gas natural conectada)" },
  { key: "lavanderia_indep", label: "Zona de Lavandería Independiente", defaultReq: "Exige zona de ropas ventilada", defaultProp: "Sí (Zona de lavandería independiente)" },
  { key: "aire_acondicionado", label: "Aire Acondicionado", defaultReq: "Desea aire acondicionado", defaultProp: "Sí (Aire acondicionado instalado)" },
  { key: "balcon_terraza", label: "Balcón / Terraza Privada", defaultReq: "Exige balcón o terraza", defaultProp: "Sí (Balcón privado con vista)" },
  { key: "vista_panoramica", label: "Vista Panorámica / Exterior", defaultReq: "Exige vista exterior despejada", defaultProp: "Sí (Exterior vista panorámica)" },
  { key: "gimnasio", label: "Gimnasio Dotado", defaultReq: "Desea gimnasio en el edificio", defaultProp: "Sí (Gimnasio completamente dotado)" },
  { key: "piscina", label: "Piscina Climatizada", defaultReq: "Desea piscina", defaultProp: "Sí (Piscina climatizada)" },
  { key: "parque_infantil", label: "Zonas Verdes / Parque Infantil", defaultReq: "Desea zonas infantiles para niños", defaultProp: "Sí (Parque infantil y zonas verdes)" },
  { key: "salon_social", label: "Salón Comunal / Social", defaultReq: "Desea salón de eventos", defaultProp: "Sí (Salón social amplio)" },
  { key: "vigilancia_24_7", label: "Vigilancia / Portería 24/7", defaultReq: "Exige seguridad privada 24 horas", defaultProp: "Sí (Portería 24/7 con CCTV)" },
  { key: "ascensor", label: "Ascensor", defaultReq: "Exige ascensor directo o al piso", defaultProp: "Sí (Edificio con ascensor)" },
  { key: "planta_electrica", label: "Planta Eléctrica de Suplencia Total", defaultReq: "Desea planta eléctrica total", defaultProp: "Sí (Planta eléctrica suplencia total)" },
  { key: "otra", label: "✍️ Otra Característica (Personalizada)", defaultReq: "Exige / Indispensable", defaultProp: "Sí cuenta con ello" },
];

export const REJECT_CATEGORIES = [
  {
    category: "🎯 Criterio Innegociable del Cliente (Demanda descarta Oferta)",
    badgeColor: "text-amber-400 bg-amber-500/10 border-amber-500/30",
    options: [
      { id: "presupuesto_alto", label: "Presupuesto o administración excede capacidad máxima del cliente", icon: "💰" },
      { id: "zona_incompatible", label: "Zona o micro-sector incompatible (calle, costado o entorno no deseado)", icon: "📍" },
      { id: "distribucion_espacio", label: "Distribución o metraje no se ajusta (espacios reducidos, mala distribución)", icon: "📐" },
      { id: "piso_vista_luz", label: "Piso, vista o iluminación desfavorables (inmueble oscuro, interior, o piso bajo)", icon: "☀️" },
      { id: "estado_inmueble", label: "Estado físico incompatible (cliente pide moderno/estrenar y es para remodelar)", icon: "🔨" },
      { id: "garajes_incompatibles", label: "Garajes incompatibles (exige independiente y es lineal, o no tiene)", icon: "🚗" },
      { id: "politica_convivencia", label: "Restricción de convivencia / Faltante indispensable (no admite mascotas, sin ascensor)", icon: "🐾" },
    ]
  },
  {
    category: "🔒 Disponibilidad Comercial del Inmueble (Oferta no disponible)",
    badgeColor: "text-rose-400 bg-rose-500/10 border-rose-500/30",
    options: [
      { id: "ya_vendido", label: "Inmueble YA VENDIDO (marcar como Vendido y retirar del catálogo)", icon: "🏷️" },
      { id: "ya_arrendado", label: "Inmueble YA ARRENDADO (marcar como Arrendado y retirar del catálogo)", icon: "🔑" },
      { id: "retirado_mercado", label: "Inmueble suspendido o retirado temporalmente por el propietario", icon: "⛔" },
      { id: "asesor_no_responde", label: "Captador o propietario no responde / no permite agendar visitas", icon: "📵" },
    ]
  },
  {
    category: "🛡️ Regla Doctrinal de Tercería Inmobiliaria 50/50 (StandBy Directo Vecy)",
    badgeColor: "text-amber-400 bg-amber-500/10 border-amber-500/30",
    options: [
      { 
        id: "oferta_no_terceria", 
        label: "El colega de OFERTA no acepta Tercería, ni referidos", 
        icon: "🏢",
        hint: "JanIA enviará este inmueble a la sección de Inmuebles StandBy para gestión directa Vecy" 
      },
      { 
        id: "demanda_no_terceria", 
        label: "El colega Demanda No acepta tercería, ni referidos", 
        icon: "🔍",
        hint: "JanIA enviará esta demanda a StandBy Directo Vecy para asignación exclusiva" 
      },
    ]
  },
  {
    category: "💼 Condiciones Comerciales / Jurídicas de Cierre",
    badgeColor: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30",
    options: [
      { id: "comision_rechazada", label: "Comisión u honorarios no aceptados por la contraparte (no comparte 50/50)", icon: "🤝" },
      { id: "forma_pago", label: "Forma de pago incompatible (requiere crédito hipotecario y oferta solo contado)", icon: "💳" },
      { id: "traba_juridica", label: "Inconveniente jurídico (embargo, sucesión pendiente, afectación familiar)", icon: "⚖️" },
    ]
  },
  {
    category: "✍️ Otro Motivo / Enseñanza Específica para JanIA",
    badgeColor: "text-purple-400 bg-purple-500/10 border-purple-500/30",
    options: [
      { id: "otro_motivo", label: "Otro motivo puntual (especificar detalles a continuación)", icon: "✍️" },
    ]
  }
];

export const NO_TERCERIA_REGEX = /\b(?:no\s*tercer[ií]a|no\s*tercerias|sin\s*tercer[ií]a|no\s*se\s*acepta\s*tercer[ií]a|comisi[oó]n\s*50[-/]50|50[-/]50|solo\s*50[-/]50|no\s*intermediarios)\b/i;

export function checkIsStandbyDirectoVecy(prop: any, req: any): boolean {
  if (!prop || !req) return false;
  if (prop.standByDirectoVecy || req.standByDirectoVecy) return true;
  if (prop.aceptaTerceria === false || req.aceptaTerceria === false) return true;
  const pRaw = String(prop.rawText || prop.description || prop.name || '');
  const rRaw = String(req.rawText || req.name || '');
  return NO_TERCERIA_REGEX.test(pRaw) || NO_TERCERIA_REGEX.test(rRaw);
}

export function getPropertyEffectiveDaysAgo(property: any): number {
  if (!property) return 0;
  const repCount = Number(property.republicacionesCount || 0);
  const effectiveDate = (repCount > 0 && property.fechaUltimaPublicacion)
    ? property.fechaUltimaPublicacion
    : (property.fechaUltimaPublicacion || property.createdAt);
  if (!effectiveDate) return 0;
  const dateObj = new Date(effectiveDate);
  return Math.max(0, Math.floor((Date.now() - dateObj.getTime()) / (1000 * 60 * 60 * 24)));
}

export function getRequirementEffectiveDaysAgo(requirement: any): number {
  if (!requirement) return 0;
  // Regla Doctrinal v31.86: La fecha canónica de publicación original es createdAt
  const effectiveDate = requirement.createdAt;
  if (!effectiveDate) return 0;
  const dateObj = new Date(effectiveDate);
  return Math.max(0, Math.floor((Date.now() - dateObj.getTime()) / (1000 * 60 * 60 * 24)));
}

export function checkIsPermutaMatch(prop: any, req: any): boolean {
  const propTx = String(prop?.transactionType || '').toLowerCase();
  const reqTx = String(req?.tipoNegocioDeseado || '').toLowerCase();
  const propAcc = (prop?.acceptedTransactionTypes || []).map((x: string) => String(x).toLowerCase());
  const reqAcc = (req?.tiposNegocioAceptados || []).map((x: string) => String(x).toLowerCase());
  const propRaw = String(prop?.rawText || prop?.description || prop?.name || '').toLowerCase();
  const reqRaw = String(req?.rawText || req?.name || '').toLowerCase();

  return propTx.includes('permuta') || reqTx.includes('permuta') ||
    propAcc.includes('permuta') || propAcc.includes('venta_permuta') ||
    reqAcc.includes('permuta') || reqAcc.includes('venta_permuta') ||
    /\b(?:permuta|permutas|permuto|recibe\s+(?:menor|mayor)\s+valor|recibe\s+(?:carro|vehiculo|inmueble)|parte\s+de\s+pago)\b/i.test(propRaw) ||
    /\b(?:permuta|permutas|permuto|entrego\s+(?:menor|mayor)\s+valor|entrego\s+(?:carro|vehiculo|inmueble)|parte\s+de\s+pago)\b/i.test(reqRaw);
}

export function checkIsOpcionCompraMatch(prop: any, req: any): boolean {
  const propTx = String(prop?.transactionType || '').toLowerCase();
  const reqTx = String(req?.tipoNegocioDeseado || '').toLowerCase();
  const propRaw = String(prop?.rawText || prop?.description || prop?.name || '').toLowerCase();
  const reqRaw = String(req?.rawText || req?.name || '').toLowerCase();

  return propTx.includes('opcion') || reqTx.includes('opcion') ||
    propTx.includes('promesa') || reqTx.includes('promesa') ||
    /\b(?:opci[oó]n\s+de?\s*compra|arriendo\s+con\s+opci[oó]n|rent\s+to\s+own|leasing\s+habitacional|leasing)\b/i.test(propRaw) ||
    /\b(?:opci[oó]n\s+de?\s*compra|arriendo\s+con\s+opci[oó]n|rent\s+to\s+own|leasing\s+habitacional|leasing)\b/i.test(reqRaw);
}

export function isNonRealEstateText(text: string | null | undefined): boolean {
  if (!text) return false;
  const t = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const forbidden = [
    "cantera", "canteras", "caliza", "piedra y arena", "arena y piedra", "triturado",
    "cemento", "varilla", "volqueta", "retroexcavadora", "maquinaria amarilla",
    "transporte de carga", "material de construccion", "materiales de construccion"
  ];
  return forbidden.some(term => t.includes(term));
}

export function extractTrueCityFromText(rawText: string | null | undefined, fallbackCity: string | null | undefined): string {
  const t = (rawText || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  const bogotaKeywords = [
    "chico", "rosales", "cedritos", "santa barbara", "chapinero", "la cabrera", "el nogal", "el retiro", "virrey",
    "calle 94", "calle 93", "calle 100", "calle 85", "calle 116", "calle 127", "calle 134", "calle 140", "calle 147", "calle 153", "calle 170", "calle 72", "calle 80",
    "carrera 7", "carrera 9", "carrera 11", "carrera 15", "carrera 19", "carrera 30",
    "usaquen", "suba", "niza", "alhambra", "pasadena", "batan", "colina campestre", "polo club", "castellana", "teusaquillo", "salitre", "santa ana", "santa paula", "santa bibiana", "san patricio", "toberin", "mazuren"
  ];

  const caliKeywords = [
    "el penon", "granada cali", "san antonio cali", "ciudad jardin cali", "santa monica cali", "pance", "cristales cali", "chipichape", "san fernando cali", "valle del lili", "santa teresita cali", "menga", "dapa"
  ];

  const medellinKeywords = [
    "el poblado", "laureles", "envigado", "sabaneta", "belen", "conquistadores", "el tesoro", "las lomas", "patio bonito", "ciudad del rio"
  ];

  if (bogotaKeywords.some(k => t.includes(k))) return "Bogotá";
  if (caliKeywords.some(k => t.includes(k))) return "Cali";
  if (medellinKeywords.some(k => t.includes(k))) return "Medellín";

  return fallbackCity || "Bogotá";
}

export function isHollowListing(rawText: string | null | undefined, name?: string | null, externalUrl?: string | null): { isHollow: boolean; reason: string } {
  if (!rawText || rawText.trim() === '') {
    return { isHollow: true, reason: 'Texto original vacío o nulo' };
  }
  const clean = rawText.trim();

  if (/https?:\/\/[^\s]+/i.test(clean) || (externalUrl && /https?:\/\/[^\s]+/i.test(externalUrl))) {
    return { isHollow: false, reason: 'Ficha técnica en enlace web externo' };
  }

  const words = clean.split(/\s+/).filter(Boolean);
  const lower = clean.toLowerCase();
  const isGreetingOrTeaser = (
    lower === 'como están? 🤗' ||
    lower === 'buen día 🤗☀️' ||
    (lower.startsWith('hola ') && words.length < 8) ||
    (lower.startsWith('buenas ') && words.length < 8) ||
    lower === 'en santa barbara' ||
    lower === '*en santa barbara*' ||
    lower === 'en la cabrera' ||
    lower === '*en la cabrera*' ||
    lower === '*requerimiento*' ||
    lower === '*requerimientos*' ||
    lower === 'inversion' ||
    (lower.includes('comparto requerimiento:') && words.length < 10) ||
    (lower.includes('busco para cliente') && words.length < 8) ||
    (lower.includes('quién tiene') && words.length < 8) ||
    (lower.includes('quien tiene') && words.length < 8) ||
    (lower.includes('quién mandó') && words.length < 8) ||
    (lower.includes('quien mando') && words.length < 8) ||
    (lower.includes('cuál es el presupuesto') && words.length < 8) ||
    (lower.includes('sigue estando disponible') && words.length < 8)
  );
  if (isGreetingOrTeaser) {
    return { isHollow: true, reason: `Mensaje conversacional informal o teaser: "${clean.slice(0, 50)}"` };
  }

  if (words.length < 15) {
    const hasPrice = /(?:\$|\b(?:millones|mdp|cop|pesos|canon|precio|valor|renta|arriendo)\b|\d{3,}\.\d{3})/i.test(clean);
    const hasArea = /(?:\b(?:m2|mts|metros)\b)/i.test(clean);
    const hasRooms = /(?:\b(?:alcobas?|hab(?:itaciones)?|cuartos?|dormitorios?|baños?)\b)/i.test(clean);
    const hasLocation = /(?:\b(?:calle|carrera|cll|cra|diagonal|transversal|clle|cr|chico|rosales|cabrera|nogal|cedritos|santa barbara|usaquen|suba|chapinero|salitre)\b)/i.test(clean);

    let technicalSignals = 0;
    if (hasPrice) technicalSignals++;
    if (hasArea) technicalSignals++;
    if (hasRooms) technicalSignals++;
    if (hasLocation) technicalSignals++;

    if (technicalSignals < 2) {
      return {
        isHollow: true,
        reason: `Frase suelta sin ficha técnica mínima (${words.length} palabras, ${technicalSignals}/4 datos técnicos): "${clean.slice(0, 50)}"`
      };
    }
  }

  return { isHollow: false, reason: 'Publicación con contenido suficiente' };
}

const scoreRowsCache = new Map<string, { rows: ScoreRow[]; autoScore: number; pts: number; max: number }>();

export function scoreRows(req: any, prop: any, editFormData?: any) {
  if (!req || !prop) return { rows: [], autoScore: 0, pts: 0, max: 0 };

  const cacheKey = editFormData ? '' : `${req.id || 'r'}_${req.presupuestoMax || ''}_${req.areaMin || ''}_${req.habitacionesMin || ''}_${req.banosMin || ''}_${req.parqueaderosMin || ''}_${req.zonaDeseada || ''}_${req.addressNeighborhood || ''}_${req.ciudadDeseada || ''}_${req.tipoInmuebleDeseado || ''}_${req.tipoNegocioDeseado || ''}_${req.idUsuarioWhatsapp || ''}_${req.antiguedadMax || ''}_${JSON.stringify(req.caracteristicasDeseadas || {})}__${prop.id || 'p'}_${prop.price || ''}_${prop.rentPrice || ''}_${prop.adminFee || ''}_${prop.areaTotal || ''}_${prop.bedrooms || ''}_${prop.bathrooms || ''}_${prop.garages || ''}_${prop.stratum || ''}_${prop.zone || ''}_${prop.addressNeighborhood || ''}_${prop.city || ''}_${prop.propertyType || ''}_${prop.transactionType || ''}_${prop.idUsuarioWhatsapp || ''}_${prop.yearBuilt || ''}_${prop.antiguedadAnos || ''}_${JSON.stringify(prop.amenities || {})}`;

  if (cacheKey && scoreRowsCache.has(cacheKey)) {
    return scoreRowsCache.get(cacheKey)!;
  }

  const rows: ScoreRow[] = [];
  let pts = 0;
  let max = 0;

  const add = (label: string, reqVal: string, propVal: string, status: MatchStatus, weight: number, icon: React.ReactNode) => {
    rows.push({ label, reqVal, propVal, status, weight, icon });
    max += weight;
    if (status === "exact" || status === "ok") {
      pts += weight * 1.0; // 🟢 100% Ponderación completa: Coincidencia Exacta (Todo en verde = 100%)
    } else if (status === "plus") {
      pts += weight * 0.90; // 🔵 90% Ponderación: Plus Ofertado (Beneficio adicional no exigido)
    } else if (status === "warn") {
      pts += weight * 0.65; // 🟡 65% Ponderación: Aproximado viable comercialmente
    } else if (status === "neutral") {
      pts += weight * 0.35; // ⚪ 35% Ponderación: Dato Pendiente / Faltante
    } else if (status === "missing") {
      pts += 0; // 🔴 0% No Cumple (Activa guillotina total a 0%)
    }
  };

  const cleanText = (t: string) => (t || "").toLowerCase().trim().replace(/[\s\-_,.]+/g, " ");
  const reqTextLower = (req.rawText || req.name || "")
    .toLowerCase()
    .replace(/[\u2060\u200B\u200C\u200D\uFEFF\u00A0\u200E\u200F\u2028\u2029]/g, "")
    .replace(/['´`’‘\u00B4\u2019\u2018]/g, ".")
    .replace(/[\t ]+/g, " ");
  const propTextLower = (prop.rawText || prop.description || prop.name || "")
    .toLowerCase()
    .replace(/[\u2060\u200B\u200C\u200D\uFEFF\u00A0\u200E\u200F\u2028\u2029]/g, "")
    .replace(/['´`’‘\u00B4\u2019\u2018]/g, ".")
    .replace(/[\t ]+/g, " ");
  const reqRawText = cleanText(req.rawText || req.name || "");
  const propRawText = cleanText(prop.rawText || prop.description || prop.name || "");

  // ── REGLA DOCTRINAL v31.5: ANTI-PUBLICACIONES HUECAS / FRASES SUELTAS (0% Match Imposible) ──
  const propHollow = isHollowListing(prop.rawText, prop.name, prop.externalUrl || prop.enlace_origen);
  if (propHollow.isHollow) {
    add("Ficha Técnica", "Demanda Completa", `Oferta Incompleta / Hueca: ${propHollow.reason}`, "missing", 100, null);
    return { rows, autoScore: 0, pts: 0, max };
  }

  const reqHollow = isHollowListing(req.rawText, req.name, req.enlace_origen || req.externalUrl);
  if (reqHollow.isHollow) {
    add("Ficha Técnica", `Demanda Incompleta / Hueca: ${reqHollow.reason}`, "Oferta Completa", "missing", 100, null);
    return { rows, autoScore: 0, pts: 0, max };
  }

  // ── REGLA DOCTRINAL v29.0: ANTI-AUTO-MATCH / ANTI-CLON (0% Match Imposible) ──
  const rCleanChars = reqRawText.replace(/[^a-z0-9]/g, "");
  const pCleanChars = propRawText.replace(/[^a-z0-9]/g, "");
  const rPhotoLink = (req.enlace_origen || req.externalUrl || "").trim().toLowerCase();
  const pPhotoLink = (prop.enlace_origen || prop.externalUrl || "").trim().toLowerCase();
  const isSharedPhotoLink = rPhotoLink.length > 15 && pPhotoLink.length > 15 && rPhotoLink === pPhotoLink;
  const isExactClone = rCleanChars.length > 30 && pCleanChars.length > 30 && (rCleanChars === pCleanChars || rCleanChars.includes(pCleanChars) || pCleanChars.includes(rCleanChars));

  if (isExactClone || isSharedPhotoLink) {
    add("Validación Cruzada", "Demanda Independiente", "Oferta Duplicada (Auto-Match)", "missing", 100, null);
    return { rows, autoScore: 0, pts: 0, max };
  }

  // 0. Validación de Intención Comercial (Anti-Demanda infiltrada en Oferta v31.85)
  const pRawLower = `${prop.rawText || ''} ${prop.name || ''}`.toLowerCase();
  const isPropActuallyDemand = /\b(?:busco|buscamos|se\s*busca|estoy\s*buscando|estamos\s*buscando|cliente\s*busca|para\s*compra\s*ya|solicito\s*para\s*compra|compro\s*apto|compro\s*casa|necesito\s*apto|requiero\s*apto)\b/i.test(pRawLower) &&
    !/\b(?:vendo|se\s*vende|ofrezco\s*(?:en\s*venta|en\s*arriendo)|se\s*arrienda|arriendo)\b/i.test(pRawLower);
  if (isPropActuallyDemand) {
    add("Intención Comercial", "Demanda Legítima", "Demanda Infiltrada como Oferta (Falso Inmueble)", "missing", 100, null);
    return { rows, autoScore: 0, pts: 0, max };
  }

  // 1. Tipo de Inmueble (REGLA DOCTRINAL ESTRICTA - Exactitud Total de Subtipo)
  const reqTypeRaw = req.tipoInmuebleDeseado || req.propertyType;
  const propTypeRaw = prop.propertyType;

  const deduceFullPropertyType = (type: string | null | undefined, raw: string): string => {
    const t = (type || "").toLowerCase().trim();
    const clean = ((raw || "") + " " + (type || "")).toLowerCase().trim().replace(/[\s\-_,.]+/g, " ");
    
    // 1. Si el tipo estructurado ya viene de la BD o selección del usuario
    if (t === "penthouse_duplex") return "penthouse_duplex";
    if (t === "penthouse") return "penthouse";
    if (t === "apartamento_duplex") return "apartamento_duplex";
    if (t === "apartaestudio") return "apartaestudio";
    if (t === "aparta_suit") return "aparta_suit";
    if (t === "loft") return "loft";
    if (t === "aparta_hotel") return "aparta_hotel";
    if (t === "hostal") return "hostal";
    if (t === "motel") return "motel";
    if (t === "hotel") return "hotel";
    if (t === "casa_campestre") return "casa_campestre";
    if (t === "casa_quinta") return "casa_quinta";
    if (t === "villa") return "villa";
    if (t === "farm" || t === "finca") return "farm";
    if (t === "cabin" || t === "cabaña") return "cabin";
    if (t === "consultorio") return "consultorio";
    if (t === "warehouse" || t === "bodega") return "warehouse";
    if (t === "commercial" || t === "local") return "commercial";
    if (t === "office" || t === "oficina") return "office";
    if (t === "land" || t === "lote") return "land";
    if (t === "building" || t === "edificio") return "building";
    if (t === "house" || t === "casa") return "house";
    if (t === "apartment" || t === "apartamento" || t === "apartamento_estandar") return "apartamento_estandar";

    // 2. Detección en texto libre / descripción
    if (clean.includes("penthouse duplex") || clean.includes("pent house duplex") || clean.includes("ph duplex") || clean.includes("penthouse dúplex") || clean.includes("pent house dúplex")) {
      return "penthouse_duplex";
    }
    if (clean.includes("penthouse") || clean.includes("pent house") || /\bph\b/.test(clean)) {
      return "penthouse";
    }
    if (clean.includes("apartamento duplex") || clean.includes("apartamento dúplex") || clean.includes("apto duplex") || clean.includes("apto dúplex") || clean.includes("duplex") || clean.includes("dúplex") || clean.includes("triplex")) {
      return "apartamento_duplex";
    }
    if (clean.includes("apartaestudio") || clean.includes("aparta estudio") || /\bstudio\b/.test(clean)) {
      return "apartaestudio";
    }
    if (clean.includes("apartasuit") || clean.includes("aparta suit") || clean.includes("apartasuite") || clean.includes("aparta suite")) {
      return "aparta_suit";
    }
    if (clean.includes("aparta hotel") || clean.includes("apartahotel")) {
      return "aparta_hotel";
    }
    if (clean.includes("loft")) {
      return "loft";
    }
    if (clean.includes("casa campestre")) {
      return "casa_campestre";
    }
    if (clean.includes("casa quinta")) {
      return "casa_quinta";
    }
    if (clean.includes("finca") || clean.includes("casa de campo")) {
      return "farm";
    }
    if (clean.includes("cabaña") || clean.includes("cabana")) {
      return "cabin";
    }
    if (clean.includes("consultorio") || clean.includes("consultorios") || clean.includes("odontol") || clean.includes("médic") || clean.includes("medic")) {
      return "consultorio";
    }
    if (clean.includes("bodega industrial") || clean.includes("bodega comercial") || /\bbodega\b/.test(clean)) {
      if (!clean.includes("apartamento") && !clean.includes("apto")) return "warehouse";
    }
    if (clean.includes("local comercial") || clean.includes("locales comerciales")) {
      return "commercial";
    }
    if (clean.includes("oficina comercial") || clean.includes("oficina corporativa") || (clean.includes("oficina") && !clean.includes("home office") && !clean.includes("apartamento") && !clean.includes("apto"))) {
      return "office";
    }
    if (clean.includes("lote ") || clean.includes("terreno") || clean.includes("lote/terreno")) {
      if (!clean.includes("apartamento") && !clean.includes("apto") && !clean.includes("casa")) return "land";
    }
    if (clean.includes("edificio completo") || clean.includes("edificio de oficinas") || clean.includes("edificio en venta")) {
      return "building";
    }
    if (clean.includes("casa") || clean.includes("townhouse") || clean.includes("chalet")) {
      if (!clean.includes("apartamento") && !clean.includes("apto") && !clean.includes("casa club")) {
        return "house";
      }
    }
    if (clean.includes("apartamento") || clean.includes("apto") || clean.includes("apartment")) {
      return "apartamento_estandar";
    }
    
    return t || "apartamento_estandar";
  };

  const reqSubtype = deduceFullPropertyType(reqTypeRaw, reqRawText);
  const propSubtype = deduceFullPropertyType(propTypeRaw, propRawText);

  // 1. Tipo de Inmueble (DATO EN DURO ESTRICTO - 100% IDÉNTICO: SOLAMENTE "COINCIDE" 🟢 O "NO COINCIDE" 🔴)
  let typeMatchStatus: MatchStatus = "missing";
  if (reqSubtype === propSubtype) {
    typeMatchStatus = "exact";
  } else {
    typeMatchStatus = "missing"; // No coincide idéntico -> 0% Guillotina
  }

  const getSubtypeFriendlyLabel = (sub: string | null | undefined): string => {
    if (!sub) return "N/E";
    if (sub === "consultorio") return "Consultorio Médico / Dotacional";
    if (sub === "office" || sub === "oficina") return "Oficina";
    if (sub === "commercial" || sub === "local") return "Local Comercial";
    if (sub === "warehouse" || sub === "bodega") return "Bodega";
    if (sub === "house" || sub === "casa") return "Casa Urbana";
    if (sub === "casa_campestre") return "Casa Campestre";
    if (sub === "casa_quinta") return "Casa Quinta";
    if (sub === "villa") return "Villa";
    if (sub === "farm" || sub === "finca") return "Finca";
    if (sub === "land" || sub === "lote") return "Lote / Terreno";
    if (sub === "building" || sub === "edificio") return "Edificio";
    if (sub === "hotel") return "Hotel";
    if (sub === "hostal") return "Hostal";
    if (sub === "aparta_hotel") return "Aparta Hotel";
    if (sub === "aparta_suit") return "Aparta Suit";
    if (sub === "motel") return "Motel";
    if (sub === "cabin" || sub === "cabaña") return "Cabaña";
    if (sub === "apartaestudio") return "Apartaestudio";
    if (sub === "loft") return "Loft";
    if (sub === "penthouse_duplex") return "Pent House Dúplex";
    if (sub === "penthouse") return "Pent House";
    if (sub === "apartamento_duplex") return "Apartamento Dúplex";
    if (sub === "apartamento_estandar" || sub === "apartment" || sub === "apartamento") return "Apartamento";
    return getPropTypeLabel(sub);
  };

  add(
    "Tipo de Inmueble", 
    getSubtypeFriendlyLabel(reqSubtype), 
    getSubtypeFriendlyLabel(propSubtype), 
    typeMatchStatus, 
    18, 
    <Building2 className="w-3.5 h-3.5" />
  );

  // 2. Tipo de Negocio (Matriz Doctrinal Estricta de Intencionalidad)
  const reqNeg = req.tipoNegocioDeseado || req.transactionType || "";
  const propNeg = prop.transactionType || "";

  const normalizeNegocio = (val: string, raw: string): string => {
    const cleanRaw = (raw || "").toLowerCase();
    const cleanVal = (val || "").toLowerCase().trim();
    
    if (cleanRaw.includes("arriendo con opci") || cleanRaw.includes("rent to own") || cleanVal.includes("arriendo_con_opcion_de_compra")) return "arriendo_con_opcion_de_compra";
    
    // Detección de proporciones porcentuales de permuta
    if (cleanRaw.includes("50%") || cleanRaw.includes("50/50") || cleanRaw.includes("50 / 50") || cleanRaw.includes("mitad")) return "venta_permuta_50_50";
    if (cleanRaw.includes("60%") || cleanRaw.includes("60/40") || cleanRaw.includes("60 / 40")) return "venta_permuta_60_40";
    if (cleanRaw.includes("70%") || cleanRaw.includes("70/30") || cleanRaw.includes("70 / 30")) return "venta_permuta_70_30";
    if (cleanRaw.includes("80%") || cleanRaw.includes("80/20") || cleanRaw.includes("80 / 20")) return "venta_permuta_80_20";
    if (cleanRaw.includes("90%") || cleanRaw.includes("90/10") || cleanRaw.includes("90 / 10")) return "venta_permuta_90_10";
    if (cleanRaw.includes("10%") || cleanRaw.includes("10/90") || cleanRaw.includes("10 / 90")) return "venta_permuta_10_90";
    if (cleanRaw.includes("20%") || cleanRaw.includes("20/80") || cleanRaw.includes("20 / 80")) return "venta_permuta_20_80";
    if (cleanRaw.includes("30%") || cleanRaw.includes("30/70") || cleanRaw.includes("30 / 70")) return "venta_permuta_30_70";
    if (cleanRaw.includes("40%") || cleanRaw.includes("40/60") || cleanRaw.includes("40 / 60")) return "venta_permuta_40_60";

    if (cleanRaw.includes("venpermuto") || cleanRaw.includes("venta permuta") || cleanRaw.includes("venta-permuta") || cleanRaw.includes("recibe permuta") || cleanRaw.includes("recibo menor valor") || cleanRaw.includes("permuto") || cleanRaw.includes("permuta")) return "venta_permuta";
    if (cleanRaw.includes("venta o arriendo") || cleanRaw.includes("vendo o arriendo") || cleanRaw.includes("venta/arriendo")) return "venta_o_arriendo";
    
    // Señales explícitas de arriendo en el texto original (Ground Truth del texto)
    const isExplicitRentText = /\b(?:arriendo|arriendos|alquilo|alquilar|alquiler|en renta|para renta|renta|canon|para tomar ya|tomar ya|toma ya|para tomar de inmediato|toma inmediata|toma de inmediato|para tomar|para alquilar|para arrendar|en arriendo)\b/i.test(cleanRaw) && !cleanRaw.includes("para inversionista") && !cleanRaw.includes("para compra") && !cleanRaw.includes("compro");
    if (isExplicitRentText) return "arriendo";

    if (cleanVal.includes("arriendo") || cleanVal.includes("renta") || cleanVal.includes("alquiler")) return "arriendo";
    if (cleanVal.includes("venta") || cleanVal.includes("vendo") || cleanVal.includes("compra") || cleanVal.includes("compro")) return "venta";
    if (cleanRaw.includes("venta") || cleanRaw.includes("vendo") || cleanRaw.includes("compra") || cleanRaw.includes("compro")) return "venta";
    return cleanVal;
  };

  const cleanReqBiz = normalizeNegocio(reqNeg, reqRawText);
  const cleanPropBiz = normalizeNegocio(propNeg, propRawText);

  let negMatchStatus: MatchStatus = "missing";
  if (cleanReqBiz === cleanPropBiz && cleanReqBiz !== "") {
    negMatchStatus = "exact";
  } else if (cleanReqBiz === "venta" && cleanPropBiz === "venta_o_arriendo") {
    negMatchStatus = "exact";
  } else if (cleanReqBiz === "arriendo" && cleanPropBiz === "venta_o_arriendo") {
    negMatchStatus = "exact";
  } else if (cleanReqBiz.startsWith("venta_permuta") && cleanPropBiz.startsWith("venta_permuta")) {
    negMatchStatus = cleanReqBiz === cleanPropBiz ? "exact" : "warn";
  } else if ((cleanReqBiz === "permuta" || cleanReqBiz.startsWith("venta_permuta")) && (cleanPropBiz === "permuta" || cleanPropBiz.startsWith("venta_permuta"))) {
    negMatchStatus = "exact";
  } else {
    negMatchStatus = "missing"; // No coincide -> 0% Guillotina
  }

  const getBusinessDisplayLabel = (bType: string): string => {
    if (bType === "arriendo_con_opcion_de_compra") return "Arriendo con Opción de Compra";
    if (bType === "venta_permuta_50_50") return "Venta 50% / Permuta 50%";
    if (bType === "venta_permuta_60_40") return "Venta 60% / Permuta 40%";
    if (bType === "venta_permuta_70_30") return "Venta 70% / Permuta 30%";
    if (bType === "venta_permuta_80_20") return "Venta 80% / Permuta 20%";
    if (bType === "venta_permuta_90_10") return "Venta 90% / Permuta 10%";
    if (bType === "venta_permuta_10_90") return "Venta 10% / Permuta 90%";
    if (bType === "venta_permuta_20_80") return "Venta 20% / Permuta 80%";
    if (bType === "venta_permuta_30_70") return "Venta 30% / Permuta 70%";
    if (bType === "venta_permuta_40_60") return "Venta 40% / Permuta 60%";
    if (bType === "permuta") return "Permuta Pura (100%)";
    if (bType === "venta_permuta") return "Venta / Permuta (Venpermuto)";
    if (bType === "venta_o_arriendo") return "Venta / Arriendo";
    if (bType === "arriendo") return "Arriendo";
    if (bType === "venta") return "Venta";
    return getTransactionLabel(bType);
  };

  add(
    "Tipo de Negocio", 
    getBusinessDisplayLabel(cleanReqBiz), 
    getBusinessDisplayLabel(cleanPropBiz), 
    negMatchStatus, 
    15, 
    <SlidersHorizontal className="w-3.5 h-3.5" />
  );

  // 3. Ubicación / Barrio
  const reqZona = cleanText(req.zonaDeseada || req.addressNeighborhood || "");
  const propZona = cleanText(prop.zone || prop.addressNeighborhood || "");
  
  const reqFullText = `${req.zonaDeseada || ''} ${req.rawText || ''}`.toLowerCase();
  const propFullText = `${prop.zone || ''} ${prop.rawText || ''}`.toLowerCase();
  
  const reqStreetMatch = reqFullText.match(/(?:entre|de|cll|calle|calles)\s*:?\s*(\d{1,3})\s*(?:a|y|-|hasta)\s*(\d{1,3})/i);
  const propStreetMatch = propFullText.match(/(?:calle|cll|cll\.)\s*(\d{1,3})/i);

  let isOutStreetBounds = false;
  if (reqStreetMatch && propStreetMatch) {
    const minS = Math.min(parseInt(reqStreetMatch[1]), parseInt(reqStreetMatch[2]));
    const maxS = Math.max(parseInt(reqStreetMatch[1]), parseInt(reqStreetMatch[2]));
    const pS = parseInt(propStreetMatch[1]);
    if (pS < minS || pS > maxS) isOutStreetBounds = true;
  }

  const KNOWN_BARRIOS_CANONICAL = [
    "las santas", "todas las santas", "sector de las santas", "sector santas", "zona santas", "santas",
    "santa bárbara occidental", "santa barbara occidental", "santa bárbara oriental", "santa barbara oriental",
    "santa bárbara central", "santa barbara central", "santa bárbara alta", "santa barbara alta",
    "santa bárbara norte", "santa barbara norte", "santa bárbara", "santa barbara",
    "santa ana occidental", "santa ana oriental", "santa ana central", "santa ana alta", "santa ana",
    "chico reservado norte", "chico reservado", "chico norte iii", "chico norte ii", "chico norte", "rincón del chicó", "rincon del chico", "chico navarra", "el chicó", "chico",
    "cedritos", "los cedros", "santa paula", "santa bibiana", "santa teresa", "san patricio", "navarra", "molinos norte", "la calleja", "calleja baja", "calleja alta",
    "bella suiza", "el contador", "la carolina", "mazurén", "mazuren", "country club", "antiguo country", "nuevo country", "usaquén", "usaquen", "multicentro",
    "north point", "san cristóbal norte", "san cristobal norte",
    "alameda 170", "alameda norte", "la alameda", "barrio alameda", "alameda", "san antonio noroccidental", "san antonio norte", "alcalá", "alcala", "belmira", "portales del norte", "san cipriano", "toberín", "toberin", "villa magdala",
    "los rosales alto", "rosales alto", "los rosales bajo", "rosales bajo", "los rosales", "rosales",
    "el refugio", "refugio", "la cabrera", "cabrera", "el nogal", "nogal", "el virrey", "el retiro", "el lago", "quinta camacho", "chapinero alto", "chapinero central", "chapinero",
    "la castellana", "castellana", "polo club", "polo", "san felipe",
    "colina campestre", "colina", "san josé de bavaria", "san jose de bavaria", "carmel club", "alejandría", "alejandria", "cantalejo", "sotavento", "victoria norte", "britalia norte", "niza norte", "niza", "la alhambra", "alhambra", "pasadena", "batán", "batan", "el batán", "el batan", "prado veraniego", "pontevedra", "morato", "la floresta", "floresta", "suba",
    "ciudad salitre", "salitre", "hayuelos", "modelia", "fontibón", "fontibon", "teusaquillo", "la soledad", "palermo", "quinta paredes", "la esmeralda", "nicolás de federmann", "nicolas de federmann",
    "ciudad jardín norte", "ciudad jardin norte", "ciudad jardín sur", "ciudad jardin sur", "ciudad jardín", "ciudad jardin",
    "álamos norte", "alamos norte", "álamos sur", "alamos sur", "álamos", "alamos",
    "la candelaria centro", "candelaria centro", "candelaria la nueva", "candelaria sur", "la candelaria", "candelaria",
    "el poblado", "poblado", "laureles", "envigado", "sabaneta", "belén", "belen", "estadio", "conquistadores", "granada", "el peñón", "el peñon",
    "juanambú", "juanambu", "san fernando", "valle del lili", "el prado", "alto prado", "riomar", "villa santos", "buenavista", "cabecera", "cañaveral", "canaveral", "ruitoque", "sotomayor"
  ];
  KNOWN_BARRIOS_CANONICAL.sort((a, b) => b.length - a.length);

  const extractAllBarriosFromText = (text: string): string[] => {
    if (!text) return [];
    let norm = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const found: string[] = [];
    for (const b of KNOWN_BARRIOS_CANONICAL) {
      const bNorm = b.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const reg = new RegExp(`\\b${bNorm.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\b`, "i");
      if (reg.test(norm)) {
        found.push(b.charAt(0).toUpperCase() + b.slice(1));
        norm = norm.replace(reg, " ");
      }
    }
    return found;
  };

  const isGenericZone = (zn: string | null | undefined) => {
    if (!zn) return true;
    const z = zn.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return z === "" || z === "n/e" || z === "na" || z === "n/a" || z === "bogota" || z === "bogota d.c." || z === "bogota dc" || z === "colombia";
  };

  const propBarriosInText = extractAllBarriosFromText(prop.rawText || prop.description || prop.name || "");
  const reqBarriosInText = extractAllBarriosFromText(req.rawText || req.name || "");

  // Prioridad Ground Truth del Texto: Si el texto del inmueble dice explícitamente "ALAMEDA 170", esa es la verdad
  // absoluta y anula cualquier zone fallback heredada del grupo de WhatsApp (ej: "Cedritos").
  const propTrueBarrio = propBarriosInText[0] || (!isGenericZone(prop.zone) ? prop.zone : (!isGenericZone(prop.addressNeighborhood) ? prop.addressNeighborhood : "")) || "";

  const reqTrueBarriosList = reqBarriosInText.length > 0 
    ? reqBarriosInText 
    : (!isGenericZone(req.zonaDeseada) ? [req.zonaDeseada!] : (!isGenericZone(req.addressNeighborhood) ? [req.addressNeighborhood!] : []));

  // Inserción perimetral: si no se nombró un barrio específico pero hay delimitación de calles en Bogotá
  if (reqTrueBarriosList.length === 0) {
    const stMatch = reqTextLower.match(/(?:entre|de)?\s*(?:la|las)?\s*(?:calle|calles|clle|cll)\s*(\d{1,3})\s*(?:a|y|-|hasta)\s*(?:la|las)?\s*(?:calle|calles|clle|cll)?\s*(\d{1,3})/i);
    if (stMatch) {
      const s1 = parseInt(stMatch[1], 10);
      const s2 = parseInt(stMatch[2], 10);
      const minS = Math.min(s1, s2);
      const maxS = Math.max(s1, s2);
      if (minS >= 85 && maxS <= 96) {
        reqTrueBarriosList.push("El Chicó", "Chicó Reservado", "La Cabrera", "Antiguo Country");
      } else if (minS >= 96 && maxS <= 100) {
        reqTrueBarriosList.push("Chicó Norte", "Chicó Reservado", "El Chicó");
      } else if (minS >= 100 && maxS <= 127) {
        reqTrueBarriosList.push("Santa Bárbara", "Santa Paula", "Santa Ana", "San Patricio");
      } else if (minS >= 127 && maxS <= 150) {
        reqTrueBarriosList.push("Cedritos", "Los Cedros", "Bella Suiza", "El Contador");
      }
    }
  }

  const SUB_CALIFICADORES = ["alta", "alto", "baja", "bajo", "norte", "sur", "oriental", "occidental", "reservado", "i ", "ii ", "iii ", "navarra"];

  const normalizeBarrio = (s: string) =>
    (s || "").toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");

  const matchBarrioExacto = (rB: string, pB: string): boolean => {
    const rn = normalizeBarrio(rB);
    const pn = normalizeBarrio(pB);
    if (!rn || !pn) return false;
    if (rn === pn) return true;

    // Macro-Sector Doctrinal: "Las Santas" (Usaquén) — Coincidencia Plena y Bidireccional
    const isSantasReq = rn.includes("santas") || rn.includes("las santas") || rn.includes("sector santas") || rn.includes("zona santas");
    const isSantasProp = pn.includes("santas") || pn.includes("las santas") || pn.includes("sector santas") || pn.includes("zona santas");
    const santasBarrios = [
      "santa barbara", "santa barbara alta", "santa barbara oriental", "santa barbara central", "santa barbara occidental", "santa barbara norte",
      "santa ana", "santa ana oriental", "santa ana occidental", "santa ana alta", "santa ana central",
      "santa paula", "santa bibiana", "san patricio", "navarra", "chico navarra", "molinos norte", "usaquen", "multicentro"
    ];

    if (isSantasReq && !isSantasProp) {
      if (santasBarrios.some(sb => pn.includes(sb) || sb.includes(pn))) return true;
    }
    if (isSantasProp && !isSantasReq) {
      if (santasBarrios.some(sb => rn.includes(sb) || sb.includes(rn))) return true;
    }
    if (isSantasReq && isSantasProp) return true;

    // REGLA DOCTRINAL v28.9: Todos los Chicó (Norte, Reservado, Rincón) = CHAPINERO.
    // La única excepción: Navarra / Chicó Navarra = USAQUÉN.
    // Bloqueo: Navarra (Usaquén) vs cualquier Chicó (Chapinero) = incompatible.
    const isChicoNavReq = rn.includes("chico navarra") || rn.includes("navarra");
    const isChicoNavProp = pn.includes("chico navarra") || pn.includes("navarra");
    const isChicoTradReq = (rn.includes("chico") || rn.includes("chico norte") || rn.includes("chico reservado") || rn.includes("rincon del chico")) && !isChicoNavReq;
    const isChicoTradProp = (pn.includes("chico") || pn.includes("chico norte") || pn.includes("chico reservado") || pn.includes("rincon del chico")) && !isChicoNavProp;

    if ((isChicoNavReq && isChicoTradProp) || (isChicoTradReq && isChicoNavProp)) {
      return false;
    }

    // REGLA DOCTRINAL v29.4: Rosales Alto vs Rosales Bajo
    // Rosales Bajo = Sector plano / caminable (entre Cra 7 y Cra 5 / Circunvalar).
    // Rosales Alto = Sector de montaña / ladera oriental (arriba de la Circunvalar).
    const isRosalesAltoReq = rn.includes("rosales alto") || rn.includes("rosales parte alta") || rn.includes("rosales arriba");
    const isRosalesBajoReq = rn.includes("rosales bajo") || rn.includes("rosales parte baja") || rn.includes("rosales abajo") || rn.includes("rosales plano");
    const isRosalesAltoProp = pn.includes("rosales alto") || pn.includes("rosales parte alta") || pn.includes("rosales arriba");
    const isRosalesBajoProp = pn.includes("rosales bajo") || pn.includes("rosales parte baja") || pn.includes("rosales abajo") || pn.includes("rosales plano");

    if ((isRosalesBajoReq && isRosalesAltoProp) || (isRosalesAltoReq && isRosalesBajoProp)) {
      return false;
    }

    // REGLA DOCTRINAL v29.4: Homónimos de Extremos Opuestos
    const isCjNorteReq = rn.includes("ciudad jardin norte") || rn.includes("ciudad jardin (norte)");
    const isCjSurReq = rn.includes("ciudad jardin sur") || rn.includes("ciudad jardin (sur)");
    const isCjNorteProp = pn.includes("ciudad jardin norte") || pn.includes("ciudad jardin (norte)");
    const isCjSurProp = pn.includes("ciudad jardin sur") || pn.includes("ciudad jardin (sur)");
    if ((isCjNorteReq && isCjSurProp) || (isCjSurReq && isCjNorteProp)) return false;

    const isAlamosNorteReq = rn.includes("alamos norte") || rn.includes("álamos norte");
    const isAlamosSurReq = rn.includes("alamos sur") || rn.includes("álamos sur");
    const isAlamosNorteProp = pn.includes("alamos norte") || pn.includes("álamos norte");
    const isAlamosSurProp = pn.includes("alamos sur") || pn.includes("álamos sur");
    if ((isAlamosNorteReq && isAlamosSurProp) || (isAlamosSurReq && isAlamosNorteProp)) return false;

    const isCandelariaCentroReq = rn.includes("candelaria centro") || (rn.includes("candelaria") && !rn.includes("nueva") && !rn.includes("sur"));
    const isCandelariaSurReq = rn.includes("candelaria la nueva") || rn.includes("candelaria sur");
    const isCandelariaCentroProp = pn.includes("candelaria centro") || (pn.includes("candelaria") && !pn.includes("nueva") && !pn.includes("sur"));
    const isCandelariaSurProp = pn.includes("candelaria la nueva") || pn.includes("candelaria sur");
    if ((isCandelariaCentroReq && isCandelariaSurProp) || (isCandelariaSurReq && isCandelariaCentroProp)) return false;

    const isCallejaAltaReq = rn.includes("calleja alta") || rn.includes("la calleja alta");
    const isCallejaBajaReq = rn.includes("calleja baja") || rn.includes("la calleja baja");
    const isCallejaAltaProp = pn.includes("calleja alta") || pn.includes("la calleja alta");
    const isCallejaBajaProp = pn.includes("calleja baja") || pn.includes("la calleja baja");
    if ((isCallejaAltaReq && isCallejaBajaProp) || (isCallejaBajaReq && isCallejaAltaProp)) return false;

    const isAlamedaReq = rn.includes("alameda");
    const isAlamedaProp = pn.includes("alameda");
    if (isAlamedaReq !== isAlamedaProp) return false;

    const reqHasQual = SUB_CALIFICADORES.some(q => rn.includes(q));
    const propHasQual = SUB_CALIFICADORES.some(q => pn.includes(q));
    if (reqHasQual && propHasQual && rn !== pn) return false;
    return (rn.includes(pn) || pn.includes(rn)) && !SUB_CALIFICADORES.some(q => rn.includes(q) !== pn.includes(q));
  };

  const inferLocalityFromBarrio = (bName: string | null | undefined, fullText?: string): string => {
    if (!bName || isGenericZone(bName)) return "N/E";
    const norm = bName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    const textNorm = (fullText || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    // Rincón del Chicó: Distinción Doctrinal IDECA (Calle 100 como frontera catastral)
    // Al norte de la Calle 100 (Calles 100 a 106) => Sector catastral oficial IDECA "Rincón del Chicó (Usaquén)"
    // Al sur de la Calle 100 (Calles 88 a 100) => "Rincón del Chicó (Chapinero)"
    if (norm.includes("rincon del chico") || norm.includes("rincón del chicó")) {
      const streetMatch = textNorm.match(/(?:calle|cll|cl|c\/)\s*#?\s*(\d{1,3})\b/i);
      if (streetMatch) {
        const sNum = parseInt(streetMatch[1], 10);
        if (sNum >= 100) return "Usaquén";
        if (sNum > 0 && sNum < 100) return "Chapinero";
      }
      if (textNorm.includes("usaquen") || textNorm.includes("usaquén")) return "Usaquén";
      if (textNorm.includes("chapinero")) return "Chapinero";
    }

    // Única excepción clásica del grupo Chicó que es Usaquén siempre:
    if (norm.includes("chico navarra") || norm.includes("navarra")) return "Usaquén";
    // TODOS los demás Chicó tradicionales (Norte, Reservado, base) + clásicos Chapinero:
    if (norm.includes("rosales") || norm.includes("refugio") || norm.includes("chico") || norm.includes("nogal") || norm.includes("cabrera") || norm.includes("virrey") || norm.includes("quinta camacho") || norm.includes("chapinero")) return "Chapinero";
    // Barrios Usaquén (Calles 100-127 oriente Autopista Norte + norte de la ciudad):
    if (norm.includes("santas") || norm.includes("las santas") ||
        norm.includes("alameda") || norm.includes("san antonio") || norm.includes("cedritos") ||
        norm.includes("santa barbara") || norm.includes("santa paula") || norm.includes("bella suiza") ||
        norm.includes("contador") || norm.includes("san patricio") || norm.includes("toberin") ||
        norm.includes("usaquen") || norm.includes("belmira") || norm.includes("portales del norte") ||
        norm.includes("alcala") || norm.includes("santa bibiana") || norm.includes("molinos norte") ||
        norm.includes("santa ana") || norm.includes("multicentro") || norm.includes("la calleja") ||
        norm.includes("calleja") || norm.includes("la carolina") || norm.includes("mazuren") ||
        norm.includes("country club") || norm.includes("antiguo country") || norm.includes("nuevo country") ||
        norm.includes("santa teresa")) return "Usaquén";
    if (norm.includes("castellana") || norm.includes("polo") || norm.includes("san felipe")) return "Barrios Unidos";
    // SUBA: Prado Veraniego está al OESTE de la Autopista Norte, NO Usaquén:
    if (norm.includes("prado veraniego") || norm.includes("niza") || norm.includes("pasadena") ||
        norm.includes("colina") || norm.includes("suba") || norm.includes("pontevedra") ||
        norm.includes("morato") || norm.includes("floresta") || norm.includes("batan") ||
        norm.includes("alhambra")) return "Suba";
    if (norm.includes("modelia") || norm.includes("fontibon") || norm.includes("hayuelos")) return "Fontibón";
    if (norm.includes("teusaquillo") || norm.includes("palermo") || norm.includes("salitre") || norm.includes("federmann") || norm.includes("esmeralda") || norm.includes("quinta paredes")) return "Teusaquillo";
    return "N/E";
  };

  let barrioMatchStatus: MatchStatus = "missing";
  let matchedReqBarrio = "";

  const isNonRealEstateReq = isNonRealEstateText(req.rawText) || isNonRealEstateText(req.name);
  const isNonRealEstateProp = isNonRealEstateText(prop.rawText) || isNonRealEstateText(prop.name);

  if (isNonRealEstateReq || isNonRealEstateProp) {
    barrioMatchStatus = "missing";
  } else if (reqTrueBarriosList.length === 0 && !propTrueBarrio) {
    barrioMatchStatus = "neutral";
  } else if (!propTrueBarrio) {
    barrioMatchStatus = "missing";
  } else {
    for (const demandedBarrio of reqTrueBarriosList) {
      if (matchBarrioExacto(demandedBarrio, propTrueBarrio)) {
        barrioMatchStatus = "exact";
        matchedReqBarrio = demandedBarrio;
        break;
      }
    }
    if (barrioMatchStatus !== "exact") {
      barrioMatchStatus = "missing";
    }
  }

  const propBarrioDisplay = propTrueBarrio || "N/E (Consultar)";
  const reqBarrioDisplay = matchedReqBarrio 
    ? matchedReqBarrio 
    : (reqTrueBarriosList.length > 0 ? (reqTrueBarriosList.length > 2 ? `${reqTrueBarriosList.slice(0, 2).join(", ")} (+${reqTrueBarriosList.length - 2})` : reqTrueBarriosList.join(", ")) : "Flexible / Bogotá");

  let reqLocalityDisplay = (req.addressLocality && req.addressLocality !== "N/E") ? req.addressLocality : inferLocalityFromBarrio(matchedReqBarrio || reqBarriosInText[0] || req.zonaDeseada, req.rawText || req.name);
  let propLocalityDisplay = (prop.addressLocality && prop.addressLocality !== "N/E") ? prop.addressLocality : inferLocalityFromBarrio(propTrueBarrio, prop.rawText || prop.description || prop.name);

  const isSantasInvolved = (matchedReqBarrio || req.zonaDeseada || "").toLowerCase().includes("santas") ||
    (propTrueBarrio || prop.zone || "").toLowerCase().includes("santas");

  if (isSantasInvolved) {
    if (reqLocalityDisplay === "N/E" || !reqLocalityDisplay) reqLocalityDisplay = "Usaquén";
    if (propLocalityDisplay === "N/E" || !propLocalityDisplay) propLocalityDisplay = "Usaquén";
  }

  // REGLA DOCTRINAL v31.76: Si el barrio coincidió exactamente o por macro-sector (ej: Las Santas ↔ Santa Bárbara),
  // la localidad y ciudad son plenamente coincidentes sin datos pendientes.
  if (barrioMatchStatus === "exact") {
    if ((reqLocalityDisplay === "N/E" || !reqLocalityDisplay) && propLocalityDisplay && propLocalityDisplay !== "N/E") {
      reqLocalityDisplay = propLocalityDisplay;
    } else if ((propLocalityDisplay === "N/E" || !propLocalityDisplay) && reqLocalityDisplay && reqLocalityDisplay !== "N/E") {
      propLocalityDisplay = reqLocalityDisplay;
    }
  }

  const reqTrueCity = extractTrueCityFromText(req.rawText || req.name, req.addressCity || req.ciudadDeseada || "Bogotá");
  const propTrueCity = extractTrueCityFromText(prop.rawText || prop.name, prop.addressCity || prop.city || "Bogotá");

  const reqCityDisplay = reqTrueCity;
  const propCityDisplay = propTrueCity;

  const isCityMatch =
    normalizeBarrio(reqCityDisplay) === normalizeBarrio(propCityDisplay) ||
    normalizeBarrio(reqCityDisplay).includes(normalizeBarrio(propCityDisplay)) ||
    normalizeBarrio(propCityDisplay).includes(normalizeBarrio(reqCityDisplay));

  let localityMatchStatus: MatchStatus = "neutral";
  if (isNonRealEstateReq || isNonRealEstateProp) {
    localityMatchStatus = "missing";
  } else if (barrioMatchStatus === "exact") {
    // BUG 7 fix: Si el barrio coincidió exactamente, la localidad se homologa automáticamente como exacta.
    // El barrio es el identificador geográfico de mayor precisión; si coincide, la localidad es implícita.
    localityMatchStatus = "exact";
  } else if (reqLocalityDisplay === "N/E" || propLocalityDisplay === "N/E") {
    localityMatchStatus = "neutral";
  } else if (normalizeBarrio(reqLocalityDisplay) === normalizeBarrio(propLocalityDisplay)) {
    localityMatchStatus = "exact";
  } else {
    localityMatchStatus = "missing"; // Localidades distintas cuando el barrio tampoco coincidió → Guillotina
  }

  let cityMatchStatus: MatchStatus = (!isNonRealEstateReq && !isNonRealEstateProp && isCityMatch) ? "exact" : "missing";

  add("Barrio / Vereda / Caserío", reqBarrioDisplay, propBarrioDisplay, barrioMatchStatus, 10, <MapPin className="w-3.5 h-3.5" />);
  add("Localidad / Comuna", reqLocalityDisplay, propLocalityDisplay, localityMatchStatus, 5, <Compass className="w-3.5 h-3.5" />);
  add("Ciudad / Municipio", reqCityDisplay, propCityDisplay, cityMatchStatus, 5, <Building2 className="w-3.5 h-3.5" />);

  const isPhoneNumberNotPrice = (val: number | string | null | undefined, rawText?: string): boolean => {
    if (val === undefined || val === null || val === "" || val === 0 || val === "0") return false;
    const num = typeof val === "number" ? val : parseFloat(String(val).replace(/[^\d.]/g, ""));
    if (isNaN(num) || num <= 0) return false;

    // Si es un número terminado en miles/millones (múltiplo de 10.000 o 100.000 o termina en 4+ ceros), es un PRECIO o CANON, NUNCA un teléfono
    if (num >= 50_000_000 && num % 100_000 === 0) return false;
    if (num >= 300_000 && num <= 50_000_000 && num % 50_000 === 0) return false;

    const numStr = String(Math.round(num));
    if (numStr.length === 10 && /^3(0[0-5]|1[0-9]|2[0-4]|5[0-1])/.test(numStr) && num % 1_000_000 !== 0) {
      if (rawText && /(?:\$|precio|valor|ppto|presupuesto|canon|hasta|venta)\s*:?\s*\$?\s*3\d{9}/i.test(rawText)) return false;
      return true;
    }
    if (numStr.length === 12 && numStr.startsWith("573") && num % 1_000_000 !== 0) {
      if (rawText && /(?:\$|precio|valor|ppto|presupuesto|canon|hasta|venta)\s*:?\s*\$?\s*573\d{9}/i.test(rawText)) return false;
      return true;
    }
    return false;
  };

  const parseSafePrice = (val: any, rawText?: string): number => {
    if (val === undefined || val === null || val === "") return 0;
    const num = parseFloat(String(val));
    if (isNaN(num) || num <= 0) return 0;
    if (isPhoneNumberNotPrice(num, rawText)) return 0;
    return num;
  };

  const isReqRentMatch = cleanReqBiz.includes("arriendo");
  const isPropPureRent = cleanPropBiz === "arriendo";
  const isPropPureVenta = cleanPropBiz === "venta" || cleanPropBiz === "venta_permuta" || cleanPropBiz === "permuta" || cleanPropBiz === "aporte";
  const isReqOpenBudget = /(?:ppto|presupuesto|canon|precio|valor)\s*(?:es\s*)?:?\s*(?:abierto|sin\s*l[ií]mite|ilimitado|negociable\s*sin\s*tope)\b/i.test(reqTextLower);

  function parseColombianPriceOrBudget(numStr: string, unit: string, isSale: boolean): number {
    const cleanStr = (numStr || "").trim().replace(/[\*\s\u2060\u200B\u200C\u200D\uFEFF\u00A0\u200E\u200F\u2028\u2029]/g, "");
    const cleanUnit = (unit || "").toLowerCase();
    
    // Mil millones / Billones explícitos
    if (cleanUnit.includes("mil millon") || cleanUnit.includes("mil millones") || cleanUnit.includes("billones")) {
      const v = parseFloat(cleanStr.replace(",", "."));
      return Math.round(v * 1_000_000_000);
    }
    
    // Formato con puntos completos ej: 540.000.000 ó 15.000.000
    if (/^\d{1,3}(?:\.\d{3}){2,4}$/.test(cleanStr)) {
      const parsed = parseInt(cleanStr.replace(/\./g, ""), 10);
      if (isSale && parsed >= 300_000 && parsed <= 30_000_000) {
        return parsed * 1_000;
      }
      return parsed;
    }

    // Formato abreviado con un solo punto de miles ej: 3.500 (3.5M en arriendo o 3.500M en venta)
    if (/^\d{1,3}\.\d{3}$/.test(cleanStr)) {
      const n = parseInt(cleanStr.replace(".", ""), 10);
      if (!isSale) return n * 1_000;
      return n * 1_000_000;
    }
    
    let val = parseFloat(cleanStr.replace(",", "."));
    if (isNaN(val)) return 0;
    
    // Si viene acompañado de palabras de millones
    if (cleanUnit.includes("millon") || cleanUnit.includes("millón") || cleanUnit.includes("mll") || cleanUnit.includes("mill") || cleanUnit.includes("mm") || cleanUnit === "m") {
      if (!isSale) {
        if (val <= 100 && val > 0) return Math.round(val * 1_000_000);
        if (val > 100 && val < 100_000) return Math.round(val * 1_000);
        return Math.round(val);
      }
      // Venta: En Colombia si dicen "540 millones" o "980 mlls", se multiplica por 1_000_000.
      // 🛡️ NUNCA multiplicar un entero < 30 por 1.000.000.000 (previene transformar 15 años o 15M en 15 mil millones)
      if (val < 10 && val > 0 && cleanStr.includes(".")) {
        // Solo decimales tipo 1.5, 2.3 millones en venta equivalen a 1.500M / 2.300M
        return Math.round(val * 1_000_000_000);
      }
      if (val >= 10 && val < 100 && isSale) {
        // Taquigrafía tipo 49mm -> 490M
        return Math.round(val * 10_000_000);
      }
      return Math.round(val * 1_000_000);
    }
    
    if (val < 10000) {
      if (!isSale) return Math.round(val * 1_000);
      if (val >= 100) return Math.round(val * 1_000_000);
    }
    if (isSale && val >= 300_000 && val <= 30_000_000) {
      return Math.round(val * 1_000);
    }
    return Math.round(val);
  }

  // 1. Extracción de Precio de Venta en Oferta
  // 🛡️ DOCTRINA v31.62 / v31.74: Precio oficial de BD y extracción robusta de jerga
  let propSalePrice = !isPropPureRent ? parseSafePrice(prop.price, prop.rawText) : 0;
  
  if (propTextLower && !isPropPureRent) {
    const saleExplicitMatch = propTextLower.match(/(?:precio\s*(?:de\s*)?venta|valor\s*(?:de\s*)?venta|venta\s*:|vr\s*[\.\/]?\s*venta|valor\s*un\s*poco\s*negociable|valor\s*negociable|precio\s*negociable)\s*:?\s*\*?\$?\s*([^\n,•]+)/i);
    if (saleExplicitMatch) {
      const parsedText = parseColombianCurrency(saleExplicitMatch[0]);
      if (parsedText && parsedText >= 30_000_000 && !isPhoneNumberNotPrice(parsedText, prop.rawText)) {
        propSalePrice = parsedText;
      }
    }
    if (propSalePrice === 0) {
      const colombianSaleMatch = propTextLower.match(/(?:(?:precio|valor|venta)[^\d\n]*\$?\s*)?(\d{1,3}(?:[\s.'’]\d{3}){2,3})/i)
        || propTextLower.match(/(?:precio|valor)\s*:\s*\*?\$?\s*([\d][\d.\s'’]*)\s*(mil\s*millones?|millones?|millon|millón|mll|mlls|mill|mills|mm|m)?/i);
      if (colombianSaleMatch) {
        const parsed = parseColombianCurrency(colombianSaleMatch[0]);
        if (parsed && parsed >= 30_000_000 && !isPhoneNumberNotPrice(parsed, prop.rawText)) {
          propSalePrice = parsed;
        } else if (colombianSaleMatch[2]) {
          const computed = parseColombianPriceOrBudget(colombianSaleMatch[1].replace(/[\s'’]/g, ""), colombianSaleMatch[2] || "", true);
          if (computed >= 30_000_000 && !isPhoneNumberNotPrice(computed, prop.rawText)) {
            propSalePrice = computed;
          }
        }
      }
    }
  }

  // 2. Extracción de Presupuesto de Venta en Demanda
  // 🛡️ DOCTRINA v31.62 / v31.74: Presupuesto oficial de BD primero y extracción robusta
  let reqSaleBudget = (!isReqRentMatch && !isPropPureRent) ? parseSafePrice(req.presupuestoMax, req.rawText) : 0;
  
  // Blindaje anti-edad: si el presupuesto guardado es desproporcionado pero el texto habla de millones reales o años
  if (reqSaleBudget >= 5_000_000_000 && reqTextLower && !reqTextLower.includes("mil millones") && !reqTextLower.includes("billones")) {
    reqSaleBudget = 0; // Forzar reevaluación limpia con el texto
  }

  if (reqTextLower && !isReqRentMatch && !isPropPureRent && !isReqOpenBudget) {
    const buyMatch = reqTextLower.match(/(?:presupuesto\s*(?:para\s*)?compra|ppto\s*(?:para\s*)?compra|compra\s*:|inversi[oó]n|presupuesto(?:\s*m[aá]ximo)?)\s*:?\s*\*?\$?\s*([^\n•]+)/i);
    if (buyMatch) {
      const parsed = parseColombianCurrency(buyMatch[0]);
      if (parsed && parsed >= 30_000_000) {
        reqSaleBudget = parsed;
      }
    }
    if (reqSaleBudget <= 0) {
      const singleMatch = reqTextLower.match(/(?:presupuesto|ppto|valor|precio|inversi[oó]n|compra)\s*:?\s*\*?\$?\s*(\d{1,4}(?:[.,]\d{1,3})?|\d+)\s*(?:mil\s*millones?|millones?|millon|millón|mll|mlls|mill|mills|mm|m)\b/i);
      if (singleMatch) {
        const parsed = parseColombianPriceOrBudget(singleMatch[1], singleMatch[2] || "millones", true);
        if (parsed >= 10_000_000) reqSaleBudget = parsed;
      }
    }
    if (reqSaleBudget <= 0) {
      const rangeMatch = reqTextLower.match(/(?:presupuesto(?:\s*m[aá]ximo)?|prespuesto(?:\s*m[aá]ximo)?|ppto(?:\s*m[aá]ximo)?|hasta|tope|valor|inversi[oó]n|compra)?\s*:?\s*\*?\$?\s*(\d{1,4}(?:[.,]\d{1,3})?)\s*(?:a|hasta|-|y)\s*\*?\$?\s*(\d{1,4}(?:[.,]\d{1,3})?)\*?\s*(mil\s*millones?|millones?|millon|millón|mll|mlls|mill|mills|mm|m)?\b/i);
      if (rangeMatch && (rangeMatch[0].includes("presupuesto") || rangeMatch[0].includes("prespuesto") || rangeMatch[0].includes("ppto") || rangeMatch[0].includes("compra") || rangeMatch[3])) {
        const parsedMax = parseColombianPriceOrBudget(rangeMatch[2], rangeMatch[3] || "", true);
        if (parsedMax >= 10_000_000) reqSaleBudget = parsedMax;
      }
    }
  }

  if (propSalePrice < 30_000_000) propSalePrice = 0;

  // 3. Canon de Arriendo en Oferta
  // 🛡️ DOCTRINA v31.62 / v31.74: Canon oficial de BD primero y jerga colombiana
  let propRentPrice = !isPropPureVenta ? parseSafePrice(prop.rentPrice || prop.priceRent, prop.rawText) : 0;
  
  if (propTextLower && !isPropPureVenta) {
    const rentExplicitMatch = propTextLower.match(/(?:canon(?:\s*de\s*arriendo)?|valor\s*(?:de\s*)?arriendo|precio\s*(?:de\s*)?arriendo|arrendamiento\s*:|arriendo\s*:|vr\s*[\.\/]?\s*renta|renta\s*:)\s*:?\s*\*?\$?\s*([^\n•]+)/i);
    if (rentExplicitMatch) {
      const parsed = parseColombianCurrency(rentExplicitMatch[0]);
      if (parsed && parsed >= 300_000 && parsed <= 100_000_000 && !isPhoneNumberNotPrice(parsed, prop.rawText)) {
        propRentPrice = parsed;
      }
    }
  }

  // 4. Presupuesto de Arriendo en Demanda
  let reqRentBudget = isReqRentMatch ? parseSafePrice(req.presupuestoMax, req.rawText) : 0;
  if (reqTextLower && !isReqOpenBudget) {
    const rentMatch = reqTextLower.match(/(?:presupuesto\s*(?:para\s*)?(?:alquiler|arriendo|renta)|ppto\s*(?:para\s*)?(?:alquiler|arriendo)|alquiler\s*:|canon\s*:)\s*:?\s*\*?\$?\s*([^\n•]+)/i);
    if (rentMatch) {
      const parsed = parseColombianCurrency(rentMatch[0]);
      if (parsed && parsed >= 300_000 && parsed <= 100_000_000) {
        reqRentBudget = parsed;
      }
    }
    if (reqRentBudget <= 0 && isReqRentMatch) {
      const matchRangeRent = reqTextLower.match(/(?:de|entre)\s*(\d{1,3}(?:[.,]\d+)?)\s*(?:a|hasta|-|o|u|y)\s*(\d{1,3}(?:[.,]\d+)?)\s*(mil\s*millones?|millones|millón|mll|mlls|mm|m)\b/i);
      if (matchRangeRent) {
        const computedMax = parseColombianPriceOrBudget(matchRangeRent[2], matchRangeRent[3] || "", false);
        if (computedMax >= 300_000 && computedMax <= 100_000_000) reqRentBudget = computedMax;
      }
    }
  }

  // DETECCIÓN INTELIGENTE DE NEGOCIO DUAL (VENTA Y ARRIENDO SIMULTÁNEOS)
  const hasSaleSignals = propSalePrice > 0 || reqSaleBudget > 0 || /\b(?:venta|ventas|vende|compra|comprar)\b/i.test(propTextLower) || /\b(?:compra|comprar)\b/i.test(reqTextLower);
  const hasRentSignals = propRentPrice > 0 || reqRentBudget > 0 || /\b(?:arriendo|arrendamiento|alquiler|renta)\b/i.test(propTextLower) || /\b(?:arriendo|arrendamiento|alquiler|renta)\b/i.test(reqTextLower);
  
  const isDualBiz = cleanReqBiz.includes("venta_arriendo") || cleanPropBiz.includes("venta_arriendo") || 
    (cleanReqBiz.includes("arriendo") && cleanPropBiz.includes("venta_arriendo")) ||
    (cleanReqBiz.includes("venta") && cleanPropBiz.includes("venta_arriendo")) ||
    (hasSaleSignals && hasRentSignals && (propSalePrice > 0 || propRentPrice > 0) && (reqSaleBudget > 0 || reqRentBudget > 0));

  const showSalePrice = propSalePrice > 0 || reqSaleBudget > 0 || !isReqRentMatch || isDualBiz;
  const showRentPrice = propRentPrice > 0 || reqRentBudget > 0 || isReqRentMatch || isPropPureRent || isDualBiz;
  let propAdminFee = parseSafePrice(prop.adminFee, prop.rawText);

  // Extracción temprana de metraje de oferta y requerimiento para evaluar coherencia de segmento financiero (Doctrina v31.90)
  let areaR = parseFloat(req.areaMin || req.areaMinimaM2 || "0");
  let areaRMax = 0;
  if (reqTextLower) {
    const normReqAreaText = reqTextLower.replace(/[\u2013\u2014]/g, "-");
    const areaRangeR = normReqAreaText.match(/(?:📐|area|área|superficie|m2|mts2|mts|mt2|metros(?:\s+cuadrados)?|m²)?\s*:?\s*(?:de\s+)?(\d+(?:[.,]\d+)?)\s*(?:m2|mts2|mts|mt2|metros(?:\s+cuadrados)?|m²)?\s*(?:a|-|hasta)\s*(\d+(?:[.,]\d+)?)\s*(?:m2|mts2|mts|mt2|metros(?:\s+cuadrados)?|m²)?/i);
    if (areaRangeR && (areaRangeR[1] || areaRangeR[2])) {
      const hasCtx = /(?:📐|area|área|superficie|m2|mts2|mts|mt2|metros|m²)/i.test(areaRangeR[0]);
      const n1 = parseFloat(areaRangeR[1].replace(",", "."));
      const n2 = parseFloat(areaRangeR[2].replace(",", "."));
      if (hasCtx && !isNaN(n1) && !isNaN(n2) && n1 >= 15 && n1 <= 15000 && n2 >= 15 && n2 <= 15000) {
        areaR = Math.min(n1, n2);
        areaRMax = Math.max(n1, n2);
      }
    } else if (areaR <= 0) {
      const mRA = normReqAreaText.match(/(?:📐|area|área|superficie|m2|mts2|mts|mt2|m[ií]nimo|min|de)?\s*:?\s*([\d.,]+)\s*(?:m2|mts2?|m²|metros)/i);
      if (mRA) {
        let valRA = parseFloat(mRA[1].replace(/\./g, "").replace(",", "."));
        if (!isNaN(valRA) && valRA > 10 && valRA < 10000) areaR = valRA;
      }
    }
  }

  let areaP = parseFloat(prop.areaTotal || prop.areaPrivate || "0");
  if (areaP <= 0 && propTextLower) {
    const m2Match = propTextLower.match(/(?:área|area|superficie)\s*:?\s*(\d{1,4}(?:[.,]\d{1,2})?)\s*(?:m2|mts2|mts|mt2|metros|m²)?/i)
      || propTextLower.match(/(\d{1,4}(?:[.,]\d{1,2})?)\s*(?:m2|mts2|mts|mt2|metros(?:\s+cuadrados)?|m²)/i);
    if (m2Match) {
      const rawDec = parseFloat(m2Match[1].replace(",", "."));
      if (!isNaN(rawDec) && rawDec > 10 && rawDec < 2000 && rawDec !== propAdminFee && rawDec !== propSalePrice) {
        areaP = rawDec;
      }
    }
  } else if (areaP > 1000 && areaP < 100000 && !prop.propertyType?.includes("lote") && !prop.propertyType?.includes("land") && !prop.propertyType?.includes("finca") && !prop.propertyType?.includes("farm")) {
    areaP = areaP / 100;
  }

  // Chequeo de Coherencia de Segmento Financiero y Metraje (Doctrina v31.90)
  const segmentSaleCheck = checkFinancialSegmentCoherence({
    budgetMax: reqSaleBudget,
    offeredPrice: propSalePrice,
    offeredArea: areaP,
    isSale: true
  });

  const segmentRentCheck = checkFinancialSegmentCoherence({
    budgetMax: reqRentBudget,
    offeredPrice: propRentPrice,
    offeredArea: areaP,
    isSale: false
  });

  // Evaluación Fila 1: Precio de Venta
  let reqSaleLabel = (isReqRentMatch && !isDualBiz) ? "N/A (Búsqueda de Arriendo)" : (isReqOpenBudget ? "Presupuesto Abierto" : (reqSaleBudget > 0 ? formatCOP(reqSaleBudget) : "Flexible / Presupuesto Abierto"));
  let propSaleLabel = propSalePrice >= 30_000_000 ? formatCOP(propSalePrice) : ((isPropPureRent && !isDualBiz) ? "N/A (Inmueble en Arriendo)" : "N/E (Consultar)");

  let saleS: MatchStatus = "neutral";
  if (isReqRentMatch && !isDualBiz) {
    saleS = "exact";
  } else if (isReqOpenBudget) {
    saleS = propSalePrice > 0 ? "plus" : "neutral";
  } else if (reqSaleBudget > 0 && propSalePrice > 0) {
    if (!segmentSaleCheck.isCompatible) {
      saleS = "missing"; // Guillotina Inflexible por desproporción de segmento financiero y metraje (Doctrina v31.90)
      propSaleLabel = `${formatCOP(propSalePrice)} (Sub-segmento < 58% ppto)`;
    } else if (propSalePrice <= reqSaleBudget) {
      saleS = "exact"; // Coincide idéntico o está dentro de presupuesto
    } else if (propSalePrice <= reqSaleBudget * 1.10) {
      saleS = "warn";  // Negociable (+10% margen)
    } else {
      saleS = isDualBiz && propRentPrice > 0 && reqRentBudget > 0 ? "warn" : "missing"; // Si es dual y arriendo cumple, no aplicar guillotina total
    }
  } else {
    saleS = "neutral";
  }

  if (showSalePrice) {
    add("Precio de Venta", reqSaleLabel, propSaleLabel, saleS, (isReqRentMatch && !isDualBiz) ? 0 : 15, <DollarSign className="w-3.5 h-3.5" />);
  }

  // Evaluación Fila 2: Canon de Arriendo
  const propAdminInfo = parseAdminFee(prop.rawText || "");
  const isPropAdminIncluded = propAdminInfo.isIncluded || propTextLower.includes("incluida la administraci") || propTextLower.includes("incluida administraci") || propTextLower.includes("admon incluida") || propTextLower.includes("administracion incluida") || propTextLower.includes("con admon") || propTextLower.includes("con administración");
  const propRentSuffix = propAdminInfo.requiresInquiry ? " + Admin" : (isPropAdminIncluded ? " (Inc. Adm)" : "");
  let reqRentLabel = (!isReqRentMatch && !isDualBiz) ? "N/A (Búsqueda de Venta)" : (isReqOpenBudget ? "Presupuesto Abierto" : (reqRentBudget > 0 ? formatCOP(reqRentBudget) : "Flexible / Presupuesto Abierto"));
  let propRentLabel = propRentPrice > 0 ? `${formatCOP(propRentPrice)}${propRentSuffix}` : ((isPropPureVenta && !isDualBiz) ? "N/A (Inmueble en Venta)" : "N/E (Consultar)");

  let rentS: MatchStatus = "neutral";
  if (!isReqRentMatch && !isDualBiz) {
    rentS = "exact";
  } else if (isReqOpenBudget) {
    rentS = propRentPrice > 0 ? "warn" : "neutral";
  } else if (reqRentBudget > 0 && propRentPrice > 0) {
    if (!segmentRentCheck.isCompatible) {
      rentS = "missing"; // Guillotina Inflexible por desproporción de segmento en arriendo (Doctrina v31.90)
      propRentLabel = `${formatCOP(propRentPrice)}${propRentSuffix} (Sub-segmento < 55% canon)`;
    } else if (propRentPrice <= reqRentBudget) {
      rentS = "exact"; // Coincide dentro del canon presupuestado
    } else if (propRentPrice <= reqRentBudget * 1.10) {
      rentS = "warn";  // Diferencia negociable (+10% margen)
    } else {
      rentS = isDualBiz && propSalePrice > 0 && reqRentBudget > 0 && propSalePrice <= reqRentBudget ? "warn" : "missing";
    }
  } else {
    rentS = "neutral";
  }

  if (showRentPrice) {
    add("Precio de Arriendo / Canon", reqRentLabel, propRentLabel, rentS, (!isReqRentMatch && !isDualBiz) ? 0 : 15, <DollarSign className="w-3.5 h-3.5" />);
  }

  // 5. Cuota de Administración (Valor admin)
  propAdminFee = parseSafePrice(prop.adminFee, prop.rawText);

  const reqAdminInfo = parseAdminFee(req.rawText || "");
  const isReqAdminIncluded = reqAdminInfo.isIncluded || reqTextLower.includes("incluida la administraci") || reqTextLower.includes("incluida administraci") || reqTextLower.includes("admon incluida") || reqTextLower.includes("con admon incluida") || reqTextLower.includes("administracion incluida");
  let reqAdminMax = parseSafePrice((req as any).adminFeeMax || (req as any).adminFee, req.rawText);
  if (reqAdminMax <= 0 && reqAdminInfo.fee) {
    reqAdminMax = reqAdminInfo.fee;
  }

  let propAdminLabel = isPropAdminIncluded
    ? "Incluida en el canon"
    : (propAdminFee > 0
        ? `${formatCOP(propAdminFee)} / mes`
        : (propAdminInfo.requiresInquiry
            ? "Administración mensual: Averiguar"
            : (isReqRentMatch || isPropPureRent ? "Administración mensual: Consultar" : "Flexible / N/E")));
  let reqAdminLabel = reqAdminMax > 0
    ? `≤ ${formatCOP(reqAdminMax)} Max.`
    : (isReqAdminIncluded
        ? "Debe ir incluida en el canon"
        : (reqTextLower.includes("admin") ? "Administración flexible" : "Sin restricción de administración"));

  let adminS: MatchStatus = "neutral";
  if (isReqAdminIncluded) {
    reqAdminLabel = "Debe ir incluida en el canon";
    if (isPropAdminIncluded) {
      adminS = "exact";
    } else if (propAdminFee > 0) {
      adminS = "missing"; // 🔴 Exige que vaya incluida en el canon y la oferta cobra administración aparte
    } else {
      adminS = "neutral";
    }
  } else if (isPropAdminIncluded) {
    adminS = "exact";
  } else if (reqAdminMax > 0 && propAdminFee > 0) {
    if (propAdminFee > reqAdminMax) {
      adminS = "missing";
    } else {
      adminS = "exact";
    }
  } else if (reqAdminInfo.requiresInquiry && reqAdminMax > 0) {
    adminS = "warn"; // Pendiente de verificación frente al tope demandado
  } else {
    adminS = "neutral";
  }


  add("Valor admin", reqAdminLabel, propAdminLabel, adminS, 5, <Receipt className="w-3.5 h-3.5" />);

  // Extracción de áreas y características de espacios exteriores (Terraza / Balcón / Patio - Doctrina v31.91)
  const propOutdoor = parseOutdoorAreas(propRawText || "");
  const reqOutdoor = parseOutdoorAreas(reqTextLower || "");

  const effectivePropTerraceArea = (editFormData?.propTerraceArea !== undefined && editFormData?.propTerraceArea !== '')
    ? (parseFloat(String(editFormData.propTerraceArea).replace(',', '.')) || 0)
    : (Number(prop?.amenities?.areaTerraza) || propOutdoor.terraceArea || 0);

  const effectivePropBalconyArea = (editFormData?.propBalconyArea !== undefined && editFormData?.propBalconyArea !== '')
    ? (parseFloat(String(editFormData.propBalconyArea).replace(',', '.')) || 0)
    : (Number(prop?.amenities?.areaBalcon) || propOutdoor.balconyArea || 0);

  const effectiveReqTerraceArea = (editFormData?.reqTerraceArea !== undefined && editFormData?.reqTerraceArea !== '')
    ? (parseFloat(String(editFormData.reqTerraceArea).replace(',', '.')) || 0)
    : (Number(req?.caracteristicasDeseadas?.areaTerraza) || reqOutdoor.terraceArea || 0);

  const effectiveReqBalconyArea = (editFormData?.reqBalconyArea !== undefined && editFormData?.reqBalconyArea !== '')
    ? (parseFloat(String(editFormData.reqBalconyArea).replace(',', '.')) || 0)
    : (Number(req?.caracteristicasDeseadas?.areaBalcon) || reqOutdoor.balconyArea || 0);

  let areS: MatchStatus = "neutral";
  let areaPropLabel = areaP > 0 ? `${areaP} m²` : "N/E";
  if (areaP > 0) {
    if (effectivePropTerraceArea > 0 && effectivePropBalconyArea > 0) {
      areaPropLabel = `${areaP} m² (+ ${effectivePropTerraceArea} m² terraza + ${effectivePropBalconyArea} m² balcón)`;
    } else if (effectivePropTerraceArea > 0) {
      areaPropLabel = `${areaP} m² (+ ${effectivePropTerraceArea} m² terraza)`;
    } else if (effectivePropBalconyArea > 0) {
      areaPropLabel = `${areaP} m² (+ ${effectivePropBalconyArea} m² balcón)`;
    }
  }

  if (showSalePrice && !isReqRentMatch && !segmentSaleCheck.isCompatible) {
    areS = "missing"; // Guillotina de metraje insuficiente para el segmento de presupuesto (Doctrina v31.90)
    areaPropLabel = `${areaP} m² (Área reducida para ppto $${(reqSaleBudget / 1_000_000).toLocaleString("es-CO")}M)`;
  } else if (showRentPrice && isReqRentMatch && !segmentRentCheck.isCompatible) {
    areS = "missing"; // Guillotina de metraje insuficiente para el canon presupuestado (Doctrina v31.90)
    areaPropLabel = `${areaP} m² (Área reducida para canon $${(reqRentBudget / 1_000_000).toLocaleString("es-CO")}M)`;
  } else if (areaR > 0 && areaP > 0) {
    if (areaP < areaR) {
      areS = "missing"; // Área inferior al mínimo exigido (Tolerancia 0%) -> 0% Guillotina Inmediata
    } else if (areaRMax > 0 && areaP > areaRMax * 1.35) {
      areS = "missing"; // Excede +35% el área máxima solicitada -> Guillotina
    } else if (areaRMax > 0 && areaP > areaRMax * 1.15 && areaP <= areaRMax * 1.35) {
      areS = "plus"; // 10 pts + Bono Confort (Plus Ofertado)
    } else if (areaP >= areaR) {
      areS = "exact"; // 10 pts (100% de la casilla - Coincide)
    }
  } else if (areaR === 0 && areaP > 0) {
    areS = "neutral";
  }
  const reqAreaLabel = areaR > 0 ? (areaRMax > 0 ? `${areaR} - ${areaRMax} m²` : `≥ ${areaR} m²`) : "Sin mínimo de área exigido";

  add("Área Total", reqAreaLabel, areaPropLabel, areS, 10, <Ruler className="w-3.5 h-3.5" />);

  const SPANISH_NUM_MAP: Record<string, number> = { "un": 1, "uno": 1, "una": 1, "dos": 2, "tres": 3, "cuatro": 4, "cinco": 5, "seis": 6 };
  let bedR = req.habitacionesMin ? Number(req.habitacionesMin) : 0;
  if (bedR <= 0 && reqTextLower) {
    const bedMatchR = reqTextLower.match(/(?:de\s+)?(un|una|uno|dos|tres|cuatro|cinco|\d+)(?:\s*(?:\([0-9]+\)|un|una|uno|dos|tres|cuatro|cinco|\d+)?\s*(?:a|-|o|hasta)\s*(un|una|uno|dos|tres|cuatro|cinco|\d+))?\s*(?:alcoba|alcobas|hab|habs|habitacion|habitaciones|dormitorio|dormitorios|cuartos|cuarto)/i);
    if (bedMatchR) {
      const w = bedMatchR[1].toLowerCase();
      bedR = SPANISH_NUM_MAP[w] || parseInt(w, 10) || 0;
    }
  }

  let bedP = prop.bedrooms ? Number(prop.bedrooms) : 0;
  if (bedP <= 0 && propTextLower) {
    const bedMatchP = propTextLower.match(/(\d+)\s*(?:alcoba|alcobas|hab|habs|habitacion|habitaciones|dormitorio|dormitorios|cuartos)/i);
    if (bedMatchP) bedP = parseInt(bedMatchP[1], 10);
  }

  let bedS: MatchStatus = "neutral";
  if (bedR > 0 && bedP > 0) {
    if (bedP < bedR) {
      bedS = "missing"; // Oferta < Demanda -> Bloqueo Doctrinal
    } else if (bedP === bedR) {
      bedS = "exact";
    } else {
      bedS = "plus";
    }
  } else if (bedR === 0 && bedP > 0) {
    bedS = "neutral";
  }
  const reqBedLabel = bedR > 0 ? `${bedR} hab${bedR > 1 ? "s" : ""}.` : "Sin mínimo de alcobas";

  add("Habitaciones", reqBedLabel, bedP > 0 ? `${bedP} hab.` : "N/E", bedS, 8, <Bed className="w-3.5 h-3.5" />);

  let bathR = req.banosMin ? Number(req.banosMin) : 0;
  if (bathR <= 0 && reqTextLower) {
    const bathMatchR = reqTextLower.match(/(?:de\s+)?(un|una|uno|dos|tres|cuatro|cinco|\d+)(?:\s*(?:\([0-9]+\)|un|una|uno|dos|tres|cuatro|cinco|\d+))?\s*(?:baño|baños|bano|banos|wc)/i);
    if (bathMatchR) {
      const bw = bathMatchR[1].toLowerCase();
      bathR = SPANISH_NUM_MAP[bw] || parseInt(bw, 10) || 0;
    }
  }

  let bathP = prop.bathrooms ? Number(prop.bathrooms) : 0;
  if (bathP <= 0 && propTextLower) {
    const bathMatchP = propTextLower.match(/(?:de\s+)?(un|una|uno|dos|tres|cuatro|cinco|\d+)(?:\s*(?:\([0-9]+\)|un|una|uno|dos|tres|cuatro|cinco|\d+))?\s*(?:baño|baños|bano|banos|wc)/i);
    if (bathMatchP) {
      const bw = bathMatchP[1].toLowerCase();
      bathP = SPANISH_NUM_MAP[bw] || parseInt(bw, 10) || 0;
    }
  }

  let bathS: MatchStatus = "neutral";
  if (bathR > 0 && bathP > 0) {
    if (bathP < bathR) {
      bathS = "missing"; // Oferta < Demanda -> Bloqueo Doctrinal
    } else if (bathP === bathR) {
      bathS = "exact";
    } else {
      bathS = "plus";
    }
  } else if (bathR === 0 && bathP > 0) {
    bathS = "neutral";
  }
  const reqBathLabel = bathR > 0 ? `≥ ${bathR} baño${bathR > 1 ? "s" : ""}` : "Sin mínimo de baños";

  add("Baños", reqBathLabel, bathP > 0 ? `${bathP} baño${bathP > 1 ? "s" : ""}` : "N/E", bathS, 5, <Bath className="w-3.5 h-3.5" />);

  let garR = req.parqueaderosMin ? Number(req.parqueaderosMin) : 0;
  if (garR <= 0 && reqTextLower) {
    const garMatchR = reqTextLower.match(/(?:🚙|🚗|🚘)?\s*(?:con\s+)?(un|una|uno|dos|tres|cuatro|cinco|\d+)(?:\s*(?:\([0-9]+\)|un|una|uno|dos|tres|cuatro|cinco|\d+))?\s*(?:garaje|garajes|parqueadero|parqueaderos|parqueo|parqueos|ptero|cochera|parq|parqs)/i)
                   || reqTextLower.match(/(?:parqueadero|parqueaderos|garaje|garajes|parqueo|parqueos)\s*:?\s*(un|una|uno|dos|tres|cuatro|cinco|\d+)/i);
    if (garMatchR) {
      const gw = garMatchR[1].toLowerCase();
      garR = SPANISH_NUM_MAP[gw] || parseInt(gw, 10) || 0;
    }
  }

  let garP = prop.garages ? Number(prop.garages) : 0;
  if (garP <= 0 && propTextLower) {
    const garMatchP = propTextLower.match(/(?:🚙|🚗|🚘)?\s*(?:con\s+)?(un|una|uno|dos|tres|cuatro|cinco|\d+)(?:\s*(?:\([0-9]+\)|un|una|uno|dos|tres|cuatro|cinco|\d+))?\s*(?:garaje|garajes|parqueadero|parqueaderos|parqueo|parqueos|ptero|cochera|parq|parqs)/i)
                   || propTextLower.match(/(?:parqueadero|parqueaderos|garaje|garajes|parqueo|parqueos)\s*:?\s*(un|una|uno|dos|tres|cuatro|cinco|\d+)/i);
    if (garMatchP) {
      const gw = garMatchP[1].toLowerCase();
      garP = SPANISH_NUM_MAP[gw] || parseInt(gw, 10) || 0;
    }
  }

  let effectiveGarType = (prop.garageType || "").toLowerCase();
  if (!effectiveGarType && propTextLower) {
    if (propTextLower.includes("independiente") || propTextLower.includes("no lineal") || propTextLower.includes("sin servidumbre")) {
      effectiveGarType = "independiente";
    } else if (propTextLower.includes("lineal") || propTextLower.includes("en linea") || propTextLower.includes("en línea") || propTextLower.includes("servidumbre")) {
      effectiveGarType = "lineal";
    }
  }

  const reqWantsIndep = reqTextLower.includes("independiente") || reqTextLower.includes("libre") || reqTextLower.includes("no lineal");

  let garS: MatchStatus = "neutral";
  let garPropLabel = garP > 0 ? `${garP} garaje${garP > 1 ? "s" : ""}${effectiveGarType ? ` (${effectiveGarType})` : ""}` : "N/E";

  if (garR > 0 && garP > 0) {
    if (garP < garR) {
      garS = "missing"; // Oferta < Demanda -> Bloqueo Doctrinal
    } else if (reqWantsIndep && effectiveGarType === "lineal") {
      garS = "missing"; // 🔴 EN DURO: Demanda exige garaje independiente y oferta es lineal/servidumbre -> Guillotina
      garPropLabel = `${garP} garaje${garP > 1 ? "s" : ""} (Lineales / Servidumbre - Incompatible)`;
    } else if (garP > garR) {
      garS = "plus"; // Más parqueaderos -> Bono de confort
    } else {
      garS = "exact";
    }
  } else if (garR === 0 && garP > 0) {
    garS = "neutral";
  }
  const garReqLabel = garR > 0 ? `≥ ${garR} garaje${garR > 1 ? "s" : ""}${reqWantsIndep ? " (Independientes En Duro)" : ""}` : "Sin exigencia de garaje";

  add("Parqueaderos", garReqLabel, garPropLabel, garS, 5, <Car className="w-3.5 h-3.5" />);

  // 12. Antigüedad / Año de Construcción (Doctrina v31.87 - EN DURO)
  const currentSystemYear = 2026;
  let ageR = req.antiguedadMax ? Number(req.antiguedadMax) : (req.preferredAge ? Number(req.preferredAge) : 0);
  if (ageR <= 0 && (req.caracteristicasDeseadas as any)?.antiguedadMax) {
    ageR = Number((req.caracteristicasDeseadas as any).antiguedadMax);
  }
  if (ageR <= 0 && reqTextLower) {
    const parsedAge = parseMaxAge(reqTextLower);
    if (parsedAge && parsedAge > 0) ageR = parsedAge;
  }

  let yearBuiltP = prop.yearBuilt ? Number(prop.yearBuilt) : (prop.constructionYear ? Number(prop.constructionYear) : null);
  let ageP = prop.antiguedadAnos != null ? Number(prop.antiguedadAnos)
    : (yearBuiltP ? (currentSystemYear - yearBuiltP) : -1);

  if (ageP < 0 && (prop.amenities as any)?.antiguedad) {
    const rawAnt = String((prop.amenities as any).antiguedad);
    const mY = rawAnt.match(/\b(19\d\d|20\d\d)\b/);
    if (mY) {
      yearBuiltP = parseInt(mY[1], 10);
      ageP = Math.max(0, currentSystemYear - yearBuiltP);
    } else {
      const mA = rawAnt.match(/(\d{1,2})\s*años/i);
      if (mA) ageP = parseInt(mA[1], 10);
    }
  }

  if (ageP < 0 && propTextLower) {
    const yMatch = propTextLower.match(/\b(?:año|construido en|de|construcci[oó]n\s*:?)\s*:?\s*(19\d\d|20\d\d)\b/i);
    if (yMatch) {
      yearBuiltP = parseInt(yMatch[1], 10);
      ageP = Math.max(0, currentSystemYear - yearBuiltP);
    } else {
      const ageMatchP = propTextLower.match(/(?:antigüedad|antiguedad|edad|tiene|edificio\s*(?:de)?|\|)\s*:?\s*(\d{1,2})\s*a[ñn]os/i)
                     || propTextLower.match(/(\d{1,2})\s*a[ñn]os\s*(?:de\s*)?(?:construido|antigüedad|edificio|construcci[oó]n)/i);
      if (ageMatchP) {
        ageP = parseInt(ageMatchP[1], 10);
        if (!yearBuiltP) yearBuiltP = currentSystemYear - ageP;
      } else if (propTextLower.includes("a estrenar") || propTextLower.includes("para estrenar") || propTextLower.includes("sobre planos") || propTextLower.includes("nuevo")) {
        ageP = 0;
        yearBuiltP = currentSystemYear;
      }
    }
  }

  if (ageP >= 0 && !yearBuiltP && ageP <= 120) {
    yearBuiltP = currentSystemYear - ageP;
  }

  // ── Exención de Antigüedad: Solo es flexible si la demanda NO especificó un tope numérico (ageR <= 0)
  const isAgeFlexible = (ageR <= 0) && (
    /sin\s+importar\s+(?:la\s+)?antig[üu]edad|no\s+importa\s+(?:la\s+)?antig[üu]edad|antig[üu]edad\s+(?:no\s+)?flexible|cualquier\s+antig[üu]edad|(?:bien\s+cuidado|buen\s+estado|remodelad[oa]|renov[aáa]d[oa]|refom[aáa]d[oa]|restaurad[oa]|reformad[oa])\s+(?:no\s+importa|independientemente)/i.test(reqTextLower)
    || /(?:desde\s+que|siempre\s+(?:y\s+cuando|que))\s+(?:est[eé]\s+)?(?:bien\s+cuidado|en\s+buen\s+estado|remodelad[oa]|renov[aáa]d[oa]|reformad[oa])/i.test(reqTextLower)
  );

  const reqDemandsModern = /\b(?:moderno|modernos|para\s*estrenar|a\s*estrenar|estrenar|acabados\s*modernos|nuevo|pareja\s*joven|bonito,\s*moderno)\b/i.test(reqTextLower);
  const propNeedsRemodel = /\b(?:para\s*remodelar|potencial\s*de\s*remodelaci[oó]n|remodelar|para\s*actualizar|original)\b/i.test(propTextLower);

  let ageS: MatchStatus = "neutral";
  if (reqDemandsModern && (propNeedsRemodel || ageP >= 25)) {
    ageS = "missing"; // 🔴 Incompatible: demanda exige moderno y oferta es antigua para remodelar -> Guillotina Doctrinal
  } else if (ageR > 0 && ageP >= 0) {
    if (ageP <= ageR) {
      ageS = "exact"; // Cumple la antigüedad en duro
    } else {
      ageS = "missing"; // 🔴 Supera el máximo de antigüedad exigido (Cero tolerancia +3) -> Guillotina Doctrinal EN DURO
    }
  } else if (isAgeFlexible) {
    ageS = ageP >= 0 ? "plus" : "neutral";
  } else if (ageR <= 0 && ageP >= 0) {
    ageS = reqDemandsModern && ageP > 15 ? "warn" : "exact";
  } else if (ageR > 0 && ageP < 0) {
    ageS = "neutral";
  }

  const reqAgeLabel = reqDemandsModern && (propNeedsRemodel || ageP >= 25)
    ? "Exige Moderno / Reciente (En Duro)"
    : (ageR > 0
      ? `Máx ${ageR} años (En Duro)`
      : (isAgeFlexible
        ? "Flexible (Remodelado / Bien Cuidado)"
        : (reqDemandsModern ? "Exige Moderno / Estrenar (En Duro)" : "Sin límite de antigüedad")));

  const propAgeLabel = ageP >= 0 
    ? (ageR > 0 && ageP > ageR
        ? `${ageP} años (${yearBuiltP ? yearBuiltP + ' - ' : ''}Supera tope de ${ageR}a)`
        : (ageP === 0 ? "A estrenar / Sobre planos (0 años)" : (propNeedsRemodel ? `${yearBuiltP ? yearBuiltP + ' ' : ''}(${ageP} años - Para Remodelar)` : (yearBuiltP ? `${yearBuiltP} (${ageP} años)` : `${ageP} años`))))
    : "N/E (Consultar antigüedad)";
  add("Antigüedad / Año", reqAgeLabel, propAgeLabel, ageS, 5, <Calendar className="w-3.5 h-3.5" />);

  // 13. Estrato Socioeconómico
  const ESTRATO_MAP: Record<string, number> = { "uno": 1, "dos": 2, "tres": 3, "cuatro": 4, "cinco": 5, "seis": 6 };
  const estratoArr: number[] = Array.isArray(req.estratoDeseado) ? req.estratoDeseado
    : req.estratoDeseado ? [Number(req.estratoDeseado)] : [];

  if (estratoArr.length === 0 && reqTextLower) {
    const estMatchR = reqTextLower.match(/(?:estrato|estr\.)\s*:?\s*([1-6]|uno|dos|tres|cuatro|cinco|seis)\b/i);
    if (estMatchR) {
      const eVal = ESTRATO_MAP[estMatchR[1].toLowerCase()] || Number(estMatchR[1]);
      if (eVal >= 1 && eVal <= 6) estratoArr.push(eVal);
    }
  }

  let estratoP = prop.stratum || prop.estrato || (prop.amenities as any)?.estrato;
  if ((!estratoP || Number(estratoP) <= 0) && propTextLower) {
    const estMatchP = propTextLower.match(/(?:estrato|estr\.)\s*:?\s*([1-6]|uno|dos|tres|cuatro|cinco|seis)\b/i);
    if (estMatchP) {
      const eP = ESTRATO_MAP[estMatchP[1].toLowerCase()] || Number(estMatchP[1]);
      if (eP >= 1 && eP <= 6) estratoP = eP;
    }
  }

  const hasEstratoReq = estratoArr.length > 0 && estratoArr[0] > 0;
  let estS: MatchStatus = "neutral";
  if (hasEstratoReq && estratoP && Number(estratoP) > 0) {
    if (estratoArr.length === 1 && estratoArr[0] === Number(estratoP)) {
      estS = "exact";
    } else if (estratoArr.includes(Number(estratoP))) {
      estS = "exact";
    } else if (Math.abs(Number(estratoP) - estratoArr[0]) <= 1) {
      estS = "warn"; // Diferencia de ±1 estrato: aproximado
    } else {
      estS = "missing"; // 🔴 Estrato incompatible (diferencia > 1) → Guillotina (BUG 2 fix)
    }
  } else if (!hasEstratoReq && (estratoP && Number(estratoP) > 0)) {
    estS = "neutral";
  }
  const reqEstratoLabel = hasEstratoReq ? `Estrato ${estratoArr.join(", ")}` : "Cualquier estrato";

  add("Estrato", reqEstratoLabel, (estratoP && Number(estratoP) > 0) ? `Estrato ${estratoP}` : "N/E", estS, 7, <Shield className="w-3.5 h-3.5" />);

  // 15. Espacio Exterior (Balcón / Terraza / Patio / Jardín) - REACTIVO ("POR ARTE DE MAGIA")
  const isHouse = (req.tipoInmuebleDeseado || req.propertyType || prop.propertyType || "").toLowerCase().includes("casa");
  const reqPatio = isHouse && (reqTextLower.includes("patio") || reqTextLower.includes("jardin") || reqTextLower.includes("jardín") || reqOutdoor.hasPatio);
  const propPatio = isHouse && (propRawText.includes("patio") || propRawText.includes("jardin") || propRawText.includes("jardín") || propOutdoor.hasPatio);
  const reqBalcon = !isHouse && (reqTextLower.includes("balcon") || reqTextLower.includes("balcón") || reqOutdoor.hasBalcony || effectiveReqBalconyArea > 0);
  const reqTerraza = !isHouse && (reqTextLower.includes("terraza") || reqOutdoor.hasTerrace || effectiveReqTerraceArea > 0);
  const propBalcon = !isHouse && (propRawText.includes("balcon") || propRawText.includes("balcón") || prop.hasBalcony || propOutdoor.hasBalcony || effectivePropBalconyArea > 0);
  const propTerraza = !isHouse && (propRawText.includes("terraza") || prop.hasTerrace || propOutdoor.hasTerrace || effectivePropTerraceArea > 0);

  if (isHouse ? (reqPatio || propPatio) : (reqBalcon || reqTerraza || propBalcon || propTerraza)) {
    let extS: MatchStatus = "neutral";
    let reqExtLabel = "Flexible / No exigido";
    let propExtLabel = "Sin dato especificado";

    if (isHouse) {
      if (reqPatio && propPatio) {
        extS = "exact";
        reqExtLabel = "Exige Patio / Jardín";
        propExtLabel = "Sí (Cuenta con Patio / Jardín)";
      } else if (reqPatio && !propPatio) {
        extS = "warn";
        reqExtLabel = "Exige Patio / Jardín";
        propExtLabel = "Sin patio especificado";
      } else if (!reqPatio && propPatio) {
        extS = "plus";
        reqExtLabel = "Flexible";
        propExtLabel = "Sí (Patio / Jardín Privado)";
      }
      add("Espacio Exterior (Patio / Jardín)", reqExtLabel, propExtLabel, extS, 5, <Trees className="w-3.5 h-3.5" />);
    } else {
      // Formatear etiquetas de la oferta con medidas reales de terraza y balcón (Doctrina v31.91)
      if (propBalcon && propTerraza) {
        if (effectivePropBalconyArea > 0 && effectivePropTerraceArea > 0) {
          propExtLabel = `Sí (Balcón ${effectivePropBalconyArea} m² + Terraza ${effectivePropTerraceArea} m²)`;
        } else if (effectivePropTerraceArea > 0) {
          propExtLabel = `Sí (Balcón + Terraza ${effectivePropTerraceArea} m²)`;
        } else if (effectivePropBalconyArea > 0) {
          propExtLabel = `Sí (Balcón ${effectivePropBalconyArea} m² + Terraza)`;
        } else {
          propExtLabel = "Sí (Balcón y Terraza Privada)";
        }
      } else if (propTerraza) {
        propExtLabel = effectivePropTerraceArea > 0 ? `Sí (Terraza Privada ${effectivePropTerraceArea} m²)` : "Sí (Cuenta con Terraza)";
      } else if (propBalcon) {
        propExtLabel = effectivePropBalconyArea > 0 ? `Sí (Balcón ${effectivePropBalconyArea} m²)` : "Sí (Cuenta con Balcón)";
      } else {
        propExtLabel = "No tiene balcón ni terraza";
      }

      // Formatear etiqueta de la demanda
      if (reqBalcon && reqTerraza) {
        reqExtLabel = "Exige Balcón y Terraza";
      } else if (reqTerraza) {
        reqExtLabel = effectiveReqTerraceArea > 0 ? `Exige Terraza (≥ ${effectiveReqTerraceArea} m²)` : "Exige Terraza";
      } else if (reqBalcon) {
        reqExtLabel = effectiveReqBalconyArea > 0 ? `Exige Balcón (≥ ${effectiveReqBalconyArea} m²)` : "Exige Balcón";
      }

      // Evaluar coincidencia
      if ((reqBalcon || reqTerraza) && (propBalcon || propTerraza)) {
        if (reqTerraza && effectiveReqTerraceArea > 0) {
          if (!propTerraza) {
            extS = "missing";
          } else if (effectivePropTerraceArea > 0 && effectivePropTerraceArea < effectiveReqTerraceArea) {
            extS = "missing"; // Guillotina por metraje de terraza insuficiente
          } else {
            extS = "exact";
          }
        } else if (reqBalcon && effectiveReqBalconyArea > 0) {
          if (!propBalcon) {
            extS = "missing";
          } else if (effectivePropBalconyArea > 0 && effectivePropBalconyArea < effectiveReqBalconyArea) {
            extS = "missing"; // Guillotina por metraje de balcón insuficiente
          } else {
            extS = "exact";
          }
        } else {
          extS = "exact";
        }
      } else if ((reqBalcon || reqTerraza) && !propBalcon && !propTerraza) {
        extS = "missing"; // 🔴 BUG 3 fix: Demanda exige balcón/terraza y oferta no tiene → Guillotina doctrinal
        if (reqTerraza) reqExtLabel = effectiveReqTerraceArea > 0 ? `Exige Terraza ≥ ${effectiveReqTerraceArea} m² (Indispensable)` : "Exige Terraza (Indispensable)";
        else if (reqBalcon) reqExtLabel = effectiveReqBalconyArea > 0 ? `Exige Balcón ≥ ${effectiveReqBalconyArea} m² (Indispensable)` : "Exige Balcón (Indispensable)";
        propExtLabel = "No tiene balcón ni terraza";
      } else if (!reqBalcon && !reqTerraza && (propBalcon || propTerraza)) {
        extS = "plus";
        reqExtLabel = "Flexible / No exigido";
      }
      add("Espacio Exterior (Balcón / Terraza)", reqExtLabel, propExtLabel, extS, 5, <Sparkles className="w-3.5 h-3.5" />);
    }
  }

  // 15B. Fila Reactiva Dedicada: Área de Terraza (m²) si hay medida especificada o exigida (Doctrina v31.91)
  if (effectiveReqTerraceArea > 0 || effectivePropTerraceArea > 0) {
    let terS: MatchStatus = "neutral";
    const reqTerLabel = effectiveReqTerraceArea > 0 ? `≥ ${effectiveReqTerraceArea} m²` : (reqTerraza ? "Exige Terraza" : "Flexible");
    const propTerLabel = effectivePropTerraceArea > 0 ? `${effectivePropTerraceArea} m²` : (propTerraza ? "Tiene terraza (m² N/E)" : "No tiene");

    if (effectiveReqTerraceArea > 0) {
      if (effectivePropTerraceArea >= effectiveReqTerraceArea) {
        terS = "exact";
      } else if (effectivePropTerraceArea > 0 && effectivePropTerraceArea < effectiveReqTerraceArea) {
        terS = "missing"; // Metraje de terraza inferior al piso demandado -> Guillotina
      } else if (!propTerraza) {
        terS = "missing";
      } else {
        terS = "warn";
      }
    } else {
      terS = effectivePropTerraceArea > 0 ? "plus" : "neutral";
    }

    add("Área de Terraza", reqTerLabel, propTerLabel, terS, 5, <Layers className="w-3.5 h-3.5" />);
  }

  // 15C. Fila Reactiva Dedicada: Área de Balcón (m²) si hay medida especificada o exigida (Doctrina v31.91)
  if (effectiveReqBalconyArea > 0 || effectivePropBalconyArea > 0) {
    let balS: MatchStatus = "neutral";
    const reqBalLabel = effectiveReqBalconyArea > 0 ? `≥ ${effectiveReqBalconyArea} m²` : (reqBalcon ? "Exige Balcón" : "Flexible");
    const propBalLabel = effectivePropBalconyArea > 0 ? `${effectivePropBalconyArea} m²` : (propBalcon ? "Tiene balcón (m² N/E)" : "No tiene");

    if (effectiveReqBalconyArea > 0) {
      if (effectivePropBalconyArea >= effectiveReqBalconyArea) {
        balS = "exact";
      } else if (effectivePropBalconyArea > 0 && effectivePropBalconyArea < effectiveReqBalconyArea) {
        balS = "missing";
      } else if (!propBalcon) {
        balS = "missing";
      } else {
        balS = "warn";
      }
    } else {
      balS = effectivePropBalconyArea > 0 ? "plus" : "neutral";
    }

    add("Área de Balcón", reqBalLabel, propBalLabel, balS, 4, <Sparkles className="w-3.5 h-3.5" />);
  }

  // 16. Equipamiento (Ascensor / Conjunto Cerrado) - REACTIVO ("POR ARTE DE MAGIA")
  const reqConj = isHouse && (reqTextLower.includes("conjunto cerrado") || reqTextLower.includes("conjunto"));
  const propConj = isHouse && (propRawText.includes("conjunto cerrado") || propRawText.includes("conjunto"));
  const reqAsc = !isHouse && reqTextLower.includes("ascensor");
  const propAsc = !isHouse && (propRawText.includes("ascensor") || prop.hasElevator);

  if (isHouse ? (reqConj || propConj) : (reqAsc || propAsc)) {
    let eqS: MatchStatus = "neutral";
    let reqEqLabel = "Flexible";
    let propEqLabel = "Sin dato especificado";
    if (isHouse) {
      if (reqConj && propConj) {
        eqS = "exact";
        reqEqLabel = "Exige Conjunto Cerrado";
        propEqLabel = "Sí (Conjunto Cerrado)";
      } else if (reqConj && !propConj) {
        eqS = "missing"; // 🔴 BUG 4 fix: Demanda exige conjunto cerrado y oferta no lo tiene → Guillotina
        reqEqLabel = "Exige Conjunto Cerrado (Indispensable)";
        propEqLabel = "Casa Independiente / Sin conjunto";
      } else if (!reqConj && propConj) {
        eqS = "plus";
        reqEqLabel = "Flexible";
        propEqLabel = "Sí (Conjunto Cerrado)";
      }
      add("Equipamiento (Conjunto Cerrado)", reqEqLabel, propEqLabel, eqS, 5, <ShieldCheck className="w-3.5 h-3.5" />);
    } else {
      if (reqAsc && propAsc) {
        eqS = "exact";
        reqEqLabel = "Exige Ascensor";
        propEqLabel = "Sí (Edificio con Ascensor)";
      } else if (reqAsc && !propAsc) {
        eqS = "missing"; // 🔴 BUG 4 fix: Demanda exige ascensor y oferta no lo tiene → Guillotina
        reqEqLabel = "Exige Ascensor (Indispensable)";
        propEqLabel = "Sin ascensor especificado";
      } else if (!reqAsc && propAsc) {
        eqS = "plus";
        reqEqLabel = "Flexible";
        propEqLabel = "Sí (Edificio con Ascensor)";
      }
      add("Equipamiento (Ascensor)", reqEqLabel, propEqLabel, eqS, 5, <Layers className="w-3.5 h-3.5" />);
    }
  }

  // 17. Depósito / Cuarto Útil - EN DURO (Doctrina v31.87)
  const reqDep = reqTextLower.includes("deposito") || reqTextLower.includes("depósito") || reqTextLower.includes("cuarto util") || reqTextLower.includes("cuarto útil") || reqTextLower.includes("bodega") || Boolean((req.caracteristicasDeseadas as any)?.deposito);
  const propDep = propRawText.includes("deposito") || propRawText.includes("depósito") || propRawText.includes("cuarto util") || propRawText.includes("cuarto útil") || propRawText.includes("bodega") || propRawText.includes("locker") || prop.hasStorage || Boolean((prop.amenities as any)?.deposito) || Boolean((prop.amenities as any)?.cuarto_util) || Boolean((prop.amenities as any)?.storage);

  if (reqDep || propDep) {
    let depS: MatchStatus = "neutral";
    let reqDepLabel = "Flexible / No exigido";
    let propDepLabel = "Sin dato especificado";
    if (reqDep && propDep) {
      depS = "exact";
      reqDepLabel = "Exige Depósito / Cuarto Útil (En Duro)";
      propDepLabel = "Sí (Cuenta con Depósito Privado)";
    } else if (reqDep && !propDep) {
      depS = "missing"; // 🔴 EN DURO (Doctrina v31.87): Demanda exige depósito y la oferta no cuenta con él -> Guillotina (No Cumple)
      reqDepLabel = "Exige Depósito / Cuarto Útil (En Duro)";
      propDepLabel = "No tiene depósito especificado (No Cumple)";
    } else if (!reqDep && propDep) {
      depS = "plus";
      reqDepLabel = "Flexible";
      propDepLabel = "Sí (Incluye Depósito Privado)";
    }
    add("Depósito / Cuarto Útil", reqDepLabel, propDepLabel, depS, 4, <Archive className="w-3.5 h-3.5" />);
  }

  // 18. Tipología de Cocina - EN DURO (Doctrina v31.87)
  const reqKitchenStructured = req.kitchenType || (req.caracteristicasDeseadas as any)?.kitchenType || (req.caracteristicasDeseadas as any)?.cocina;
  const propKitchenStructured = prop.kitchenType || (prop.amenities as any)?.kitchenType || (prop.amenities as any)?.cocina;

  let reqKitchen = parseKitchenType(reqTextLower, reqKitchenStructured);
  let propKitchen = parseKitchenType(propRawText, propKitchenStructured);

  if (reqKitchen || propKitchen) {
    let kStatus: MatchStatus = "neutral";
    const reqKLower = (reqKitchen || "").toLowerCase();
    const propKLower = (propKitchen || "").toLowerCase();

    const isReqOpen = reqKLower.includes("abierta") || reqKLower.includes("isla") || reqKLower.includes("americana");
    const isReqClosed = reqKLower.includes("cerrada") || reqKLower.includes("independiente") || reqKLower.includes("tradicional");

    const isPropOpen = propKLower.includes("abierta") || propKLower.includes("isla") || propKLower.includes("americana");
    const isPropClosed = propKLower.includes("cerrada") || propKLower.includes("independiente") || propKLower.includes("tradicional");

    if (isReqOpen && isPropClosed) {
      kStatus = "missing"; // 🔴 Choque arquitectónico EN DURO (Demanda exige abierta y oferta es cerrada) -> Guillotina
    } else if (isReqClosed && isPropOpen) {
      kStatus = "missing"; // 🔴 Choque arquitectónico EN DURO (Demanda exige cerrada y oferta es abierta) -> Guillotina
    } else if (isReqOpen && !isPropOpen) {
      if (ageP >= 25) {
        kStatus = "missing"; // 🔴 Inmueble de más de 25 años con cocina cerrada tradicional -> Guillotina
      } else if (isPropClosed) {
        kStatus = "missing";
      } else {
        kStatus = "missing"; // 🔴 Demanda exige cocina abierta y oferta no especifica cocina abierta -> Guillotina EN DURO
      }
    } else if (isReqClosed && !isPropClosed) {
      if (isPropOpen) {
        kStatus = "missing";
      } else if (ageP >= 25) {
        kStatus = "exact"; // Por época arquitectónica las cocinas de >25 años son cerradas
      } else {
        kStatus = "exact";
      }
    } else if (reqKitchen && propKitchen) {
      kStatus = (reqKLower === propKLower || (isReqOpen && isPropOpen) || (isReqClosed && isPropClosed)) ? "exact" : "missing";
    } else if (!reqKitchen && propKitchen) {
      kStatus = "plus";
    }

    const reqKitchenLabel = reqKitchen ? `Cocina ${reqKitchen} (En Duro)` : "Flexible / No exigido";
    const propKitchenLabel = propKitchen 
      ? `Cocina ${propKitchen}` 
      : (reqKitchen && isReqOpen && ageP >= 25 ? `Cocina tradicional cerrada (${ageP} años - Incompatible)` : "Cocina no especificada (No Cumple)");

    add(
      "Tipología de Cocina",
      reqKitchenLabel,
      propKitchenLabel,
      kStatus,
      4,
      <Utensils className="w-3.5 h-3.5" />
    );
  }

  // 19. Chimeneas por Combustible (Leña / Gas / Bioetanol)
  const propHasFireplace = propRawText.includes("chimenea") || propRawText.includes("doble sala") || propRawText.includes("doble altura");
  const reqWantsFireplace = reqTextLower.includes("chimenea") || reqTextLower.includes("doble sala");
  
  const deduceFireplaceFuel = (text: string): string => {
    if (text.includes("gas") || text.includes("chimenea a gas")) return "a Gas";
    if (text.includes("bioetanol") || text.includes("ecol") || text.includes("bio-etanol")) return "de Bioetanol";
    if (text.includes("leña") || text.includes("tradicional") || text.includes("madera")) return "Convencional a Leña";
    return "Tradicional";
  };

  if (propHasFireplace || reqWantsFireplace) {
    let fpStatus: MatchStatus = "neutral";
    const propFuel = deduceFireplaceFuel(propRawText);
    const reqFuel = deduceFireplaceFuel(reqTextLower);
    if (reqWantsFireplace && propHasFireplace) fpStatus = "exact";
    else if (!reqWantsFireplace && propHasFireplace) fpStatus = "plus";
    else if (reqWantsFireplace && !propHasFireplace) fpStatus = "warn";
    else fpStatus = "neutral";

    add(
      "Chimenea",
      reqWantsFireplace ? `Exige Chimenea ${reqFuel}` : "Flexible",
      propHasFireplace ? `Sí (Chimenea ${propFuel})` : "Sin chimenea especificada",
      fpStatus,
      3,
      <Flame className="w-3.5 h-3.5" />
    );
  }

  // 20. Cuarto de Servicio (CBS) con/sin baño - EN DURO (Doctrina v31.87)
  const reqCBS = reqTextLower.includes("cbs") || reqTextLower.includes("cuarto de servicio") || reqTextLower.includes("alcoba de servicio") || reqTextLower.includes("cuarto y baño de servicio") || reqTextLower.includes("cuarto y bano de servicio") || Boolean((req.caracteristicasDeseadas as any)?.cbs);
  const propCBS = propRawText.includes("cbs") || propRawText.includes("cuarto de servicio") || propRawText.includes("alcoba de servicio") || propRawText.includes("cuarto y baño de servicio") || propRawText.includes("alcoba para el servicio") || prop.hasServiceRoom || Boolean((prop.amenities as any)?.cbs) || Boolean((prop.amenities as any)?.cuartoBanoServicio);
  
  if (reqCBS || propCBS) {
    const reqHasBathInCBS = reqTextLower.includes("con baño") || reqTextLower.includes("con bano") || reqTextLower.includes("cuarto y baño");
    const propHasBathInCBS = propRawText.includes("con baño") || propRawText.includes("con bano") || propRawText.includes("cuarto y baño") || propRawText.includes("cbs");
    const propHasServiceBathOnly = !propCBS && (propRawText.includes("baño de servicio") || propRawText.includes("bano de servicio"));

    let cbsStatus: MatchStatus = "neutral";
    if (reqCBS && propCBS) {
      cbsStatus = "exact";
    } else if (reqCBS && !propCBS) {
      cbsStatus = "missing"; // 🔴 EN DURO (Doctrina v31.87): Demanda exige CBS y oferta no cuenta con cuarto de servicio -> Guillotina (No Coincide)
    } else if (!reqCBS && propCBS) {
      cbsStatus = "plus";
    } else {
      cbsStatus = "neutral";
    }

    add(
      "Cuarto de Servicio (CBS)",
      reqCBS ? (reqHasBathInCBS ? "Exige CBS con Baño (En Duro)" : "Exige Cuarto de Servicio (En Duro)") : "Flexible / No exigido",
      propCBS ? (propHasBathInCBS ? "Sí (Con Baño Privado)" : "Sí (Sin Baño)") : (propHasServiceBathOnly ? "Solo Baño de Servicio (Sin Cuarto - No Cumple)" : "Sin CBS especificado (No Cumple)"),
      cbsStatus,
      4,
      <Home className="w-3.5 h-3.5" />
    );
  }

  // 21. Estudio / Star de TV / Home Office - EN DURO (Doctrina v31.87)
  const propHasStudy = propRawText.includes("estudio") || propRawText.includes("estar de tv") || propRawText.includes("star de tv") || propRawText.includes("sala de tv") || (prop as any).hasStudy || (prop as any).hasEstarTv || Boolean((prop.amenities as any)?.estudio);
  const reqWantsStudy = reqTextLower.includes("estudio") || reqTextLower.includes("estar de tv") || reqTextLower.includes("star de tv") || reqTextLower.includes("home office") || Boolean((req.caracteristicasDeseadas as any)?.estudio);

  if (propHasStudy || reqWantsStudy) {
    let studyStatus: MatchStatus = "neutral";
    if (reqWantsStudy && propHasStudy) studyStatus = "exact";
    else if (reqWantsStudy && !propHasStudy) {
      studyStatus = "missing"; // 🔴 EN DURO (Doctrina v31.87): Demanda exige estudio y oferta no cuenta con él -> Guillotina (No Cumple)
    } else if (!reqWantsStudy && propHasStudy) studyStatus = "plus";
    else studyStatus = "neutral";
    add(
      "Estudio / Star de TV",
      reqWantsStudy ? "Exige Estudio / Star de TV (En Duro)" : "Flexible",
      propHasStudy ? "Sí (Cuenta con Estudio / Estar TV)" : "Sin estudio especificado (No Cumple)",
      studyStatus,
      4,
      <Tv className="w-3.5 h-3.5" />
    );
  }

  // 22. Vigilancia & Seguridad 24/7 (Doctrina v31.90)
  const reqDemands24h = demands24hSecurity(reqTextLower) || demands24hSecurity((req as any).notes || "") || demands24hSecurity(String((req.caracteristicasDeseadas as any)?.seguridad || ""));
  const reqVig = reqDemands24h || reqTextLower.includes("vigilancia") || reqTextLower.includes("porteria") || reqTextLower.includes("portería") || reqTextLower.includes("seguridad");
  const propSecCombined = propRawText + " " + (prop.description || "") + " " + String((prop.amenities as any)?.seguridad || "");
  const propSecType = parseSecurityType(propSecCombined);
  const propVig = propSecType === "24_7" || propRawText.includes("vigilancia") || propRawText.includes("porteria") || propRawText.includes("portería") || propRawText.includes("24 horas") || propRawText.includes("24/7");

  if (reqVig || propVig || propSecType !== "none") {
    let vigStatus: MatchStatus = "neutral";
    let propVigLabel = "Sin vigilancia especificada";
    const reqVigLabel = reqDemands24h ? "Exige Vigilancia 24 Horas" : (reqVig ? "Prefiere Vigilancia" : "Flexible");

    if (propSecType === "automated") {
      propVigLabel = "Edificio Automatizado / Conserje (Sin Vigilancia 24H)";
    } else if (propSecType === "24_7") {
      propVigLabel = "Sí (Portería y Vigilancia 24/7)";
    } else if (propVig) {
      propVigLabel = "Sí (Portería / Vigilancia)";
    } else {
      propVigLabel = "Sin vigilancia 24H especificada (No Cumple)";
    }

    if (reqDemands24h) {
      if (propSecType === "24_7") {
        vigStatus = "exact";
      } else {
        // En duro: edificio automatizado, conserje o sin vigilancia 24h es GUILLOTINA 0% (missing)
        vigStatus = "missing";
      }
    } else if (reqVig) {
      if (propSecType === "24_7" || propVig) vigStatus = "exact";
      else if (propSecType === "automated") vigStatus = "warn";
      else vigStatus = "warn";
    } else {
      // Demanda flexible
      if (propSecType === "24_7" || propVig) vigStatus = "plus";
      else vigStatus = "neutral";
    }

    add(
      "Vigilancia & Seguridad 24/7",
      reqVigLabel,
      propVigLabel,
      vigStatus,
      3,
      <Shield className="w-3.5 h-3.5" />
    );
  }

  // 23. Parqueadero de Visitantes
  const reqVisitantes = reqTextLower.includes("visitantes") || reqTextLower.includes("parqueadero de visitantes") || reqTextLower.includes("parqueo visitantes");
  const propVisitantes = propRawText.includes("visitantes") || propRawText.includes("parqueadero de visitantes") || propRawText.includes("parqueadero para visitantes") || prop.hasVisitorParking;
  if (reqVisitantes || propVisitantes) {
    let vStatus: MatchStatus = "neutral";
    if (reqVisitantes && propVisitantes) vStatus = "exact";
    else if (reqVisitantes && !propVisitantes) vStatus = "warn";
    else if (!reqVisitantes && propVisitantes) vStatus = "plus";
    else vStatus = "neutral";
    add(
      "Parqueadero de Visitantes",
      reqVisitantes ? "Exige Parqueadero de Visitantes" : "Flexible",
      propVisitantes ? "Sí (Parqueadero para Visitantes)" : "Sin visitantes especificado",
      vStatus,
      3,
      <Car className="w-3.5 h-3.5" />
    );
  }

  // 24. Garajes para Moto
  const reqMoto = reqTextLower.includes("moto") || reqTextLower.includes("motocicleta") || reqTextLower.includes("parqueadero moto");
  const propMoto = propRawText.includes("moto") || propRawText.includes("motocicleta") || propRawText.includes("parqueadero moto") || propRawText.includes("garaje moto");
  if (reqMoto || propMoto) {
    let motoS: MatchStatus = "neutral";
    if (reqMoto && propMoto) motoS = "exact";
    else if (!reqMoto && propMoto) motoS = "plus";
    else if (reqMoto && !propMoto) motoS = "warn";
    add(
      "Garajes para Moto",
      reqMoto ? "Exige Parqueadero Moto" : "Flexible",
      propMoto ? "Sí (Cuenta con Garaje Moto)" : "Sin dato de moto",
      motoS,
      3,
      <Car className="w-3.5 h-3.5" />
    );
  }

  // 25. Piso y Nivel del Edificio (Doctrina v31.9)
  const reqFloorFromField = (req.caracteristicasDeseadas as any)?.piso || (req as any).floorDetail || null;
  const propFloorFromField = prop.floorDetail || (prop.amenities as any)?.piso || null;
  const reqFloorMatch = reqFloorFromField ? null : reqTextLower.match(/piso\s*(\d+)|primer\s*piso|segundo\s*piso|tercer\s*piso|piso\s*alto|piso\s*bajo/i);
  const propFloorMatch = propFloorFromField ? null : propRawText.match(/piso\s*(\d+)|primer\s*piso|segundo\s*piso|tercer\s*piso|piso\s*alto|piso\s*bajo/i);

  if (reqFloorFromField || propFloorFromField || reqFloorMatch || propFloorMatch) {
    const reqFloorLabel = reqFloorFromField ? String(reqFloorFromField) : (reqFloorMatch ? reqFloorMatch[0].toUpperCase() : "Flexible");
    const propFloorLabel = propFloorFromField ? String(propFloorFromField) : (propFloorMatch ? propFloorMatch[0].toUpperCase() : "Consultar");
    let floorS: MatchStatus = "neutral";
    const reqMinFloorMatch = reqTextLower.match(/(?:piso\s*(\d+)\s*(?:en adelante|hacia arriba|\+)|piso\s*m[ií]nimo\s*(\d+)|m[ií]nimo\s*piso\s*(\d+)|desde\s*el\s*piso\s*(\d+))/i);
    const reqMinFloor = (req as any).pisoMinimo || (reqMinFloorMatch ? parseInt(reqMinFloorMatch[1] || reqMinFloorMatch[2] || reqMinFloorMatch[3] || reqMinFloorMatch[4], 10) : null);
    const propFloorNum = (prop.piso !== undefined && prop.piso !== null) ? Number(prop.piso) : (propFloorMatch && propFloorMatch[1] ? parseInt(propFloorMatch[1], 10) : (propRawText.includes("primer piso") ? 1 : null));
    const reqNoFirstFloor = /no\s*(?:en\s*)?(?:primer|1er|1\s*er)\s*piso/i.test(reqTextLower);

    if (reqNoFirstFloor && propFloorNum === 1) {
      floorS = "missing"; // 🔴 Cliente vetó explícitamente 1er piso
    } else if (reqMinFloor && propFloorNum && propFloorNum < reqMinFloor) {
      floorS = "missing"; // 🔴 Por debajo del piso mínimo exigido
    } else if (reqFloorLabel !== "Flexible" && propFloorLabel !== "Consultar") {
      floorS = reqFloorLabel.toLowerCase() === propFloorLabel.toLowerCase() ? "exact" : "warn";
    } else if (reqFloorLabel === "Flexible" && propFloorLabel !== "Consultar") {
      floorS = "plus";
    }
    add(
      "Piso / Nivel",
      reqFloorLabel,
      propFloorLabel,
      floorS,
      3,
      <Layers className="w-3.5 h-3.5" />
    );
  }

  // 26. Ubicación en Piso (Vista Exterior / Interior) (Doctrina v31.7 / v31.76)
  const reqWantsExterior = /\b(muy\s+iluminad[ao]|iluminad[ao]|buena\s+vista|linda\s+vista|vista\s+(?:agradable|despejada|panor[aá]mica|abierta|exterior|verde)|mucha\s+luz|luz\s+natural|exterior)\b/i.test(reqTextLower);
  const reqWantsInterior = /\b(interior|vista\s+interior)\b/i.test(reqTextLower) && !reqWantsExterior;

  let reqExtInt = (req.caracteristicasDeseadas as any)?.interiorExterior 
    || (reqWantsExterior ? "Exterior" : (reqWantsInterior ? "Interior" : null));
  
  const propHasExterior = /\b(exterior|vista\s+exterior|muy\s+iluminad[ao]|iluminad[ao]|linda\s+vista|vista\s+panor[aá]mica|vista\s+despejada)\b/i.test(propRawText);
  const propHasInterior = /\b(interior|vista\s+interior)\b/i.test(propRawText) && !propHasExterior;

  let propExtInt = (prop.amenities as any)?.interiorExterior 
    || prop.interiorExterior 
    || (propHasExterior ? "Exterior" : (propHasInterior ? "Interior" : null));
  if (propExtInt && /na|n\/a|sin\s*especificar/i.test(String(propExtInt))) propExtInt = null;
  if (reqExtInt && /na|n\/a|flexible|sin\s*restricci[oó]n/i.test(String(reqExtInt))) reqExtInt = null;

  const isMultiUnit = /apartamento|apto|apartaestudio|loft|penthouse|oficina|consultorio/i.test(prop.propertyType || req.tipoInmuebleDeseado || "");
  if (reqExtInt || propExtInt || isMultiUnit) {
    let viewS: MatchStatus = "neutral";
    if (reqWantsExterior && propHasInterior) {
      viewS = "missing"; // 🔴 Cliente exige iluminación/exterior y la oferta es interior -> Incompatible
    } else if (reqExtInt && propExtInt) {
      viewS = String(reqExtInt).toLowerCase() === String(propExtInt).toLowerCase() ? "exact" : "missing";
    } else if (!reqExtInt && propExtInt) {
      viewS = "exact"; // Oferta tiene vista definida y demanda es flexible -> Coincide!
    } else if (reqExtInt && !propExtInt) {
      viewS = reqExtInt === "Exterior" ? "warn" : "neutral";
    }

    const reqViewLabel = reqExtInt 
      ? (reqWantsExterior && !reqTextLower.includes("exterior") ? "Exige Vista Exterior (Muy iluminado)" : `Exige Vista ${reqExtInt}`) 
      : "Sin exigencia de vista";
    const propViewLabel = propExtInt 
      ? `Vista ${propExtInt}` 
      : (reqExtInt === "Exterior" ? "Vista no especificada (Por confirmar si es Exterior)" : "Vista no especificada (Consultar)");

    add(
      "Ubicación en Piso (Vista)",
      reqViewLabel,
      propViewLabel,
      viewS,
      3,
      <Compass className="w-3.5 h-3.5" />
    );
  }

  // 27. Estado de Conservación del Inmueble (Tolerancia Cero: Para Remodelar vs Remodelado / Estrenar)
  const isReqParaRemodelar = /\b(para remodelar|por remodelar|a remodelar|para reformar|a reformar|destruido|precio de oportunidad|de oportunidad)\b/i.test(reqTextLower);
  const isPropRemodelado = /\b(remodelad[oa]|totalmente remodelad[oa]|completamente remodelad[oa]|estrenar|para estrenar|a estrenar|nuevo|sobre planos)\b/i.test(propRawText);
  const isPropParaRemodelar = /\b(para remodelar|por remodelar|a remodelar|para reformar|a reformar|en obra gris|en obra negra)\b/i.test(propRawText);
  const isReqParaEstrenar = /\b(para estrenar|a estrenar|estrenar|nuevo|sobre planos)\b/i.test(reqTextLower);

  const reqState = isReqParaRemodelar ? "A Remodelar / Oportunidad" : (reqTextLower.includes("remodelado") ? "Remodelado" : (isReqParaEstrenar ? "Excelente / A Estrenar" : null));
  const propState = isPropParaRemodelar ? "A Remodelar" : (isPropRemodelado ? "Remodelado / Excelente" : (propRawText.includes("excelente estado") ? "Excelente" : null));

  if (reqState || propState) {
    let stateS: MatchStatus = "neutral";
    if (reqState && propState) {
      if ((reqState as string) === (propState as string) || (reqState.includes("Remodelar") && propState.includes("Remodelar")) || (reqState.includes("Remodelado") && propState.includes("Remodelado"))) {
        stateS = "exact";
      } else {
        stateS = "missing"; // 🔴 Incompatibilidad fatal: Remodelar vs Remodelado/Estrenar
      }
    } else if (isReqParaRemodelar && !isPropParaRemodelar) {
      stateS = "missing"; // 🔴 Exige para remodelar y el predio no es para remodelar
    } else if (!reqState && propState) {
      stateS = "plus";
    }
    add(
      "Estado del Inmueble",
      reqState ? reqState : "Flexible",
      propState ? propState : "Bueno (Estándar)",
      stateS,
      3,
      <ShieldCheck className="w-3.5 h-3.5" />
    );
  }

  // 27.5. Capacidad / Adecuación para Carro Eléctrico - EN DURO (Doctrina v31.87)
  const reqWantsEV = /\b(?:carro\s*el[eé]ctrico|veh[ií]culo\s*el[eé]ctrico|electrolinera|carga\s*el[eé]ctrica|toma\s*el[eé]ctric\w*)\b/i.test(reqTextLower) ||
    Boolean((req.caracteristicasDeseadas as any)?.carro_electrico);
  const propHasEV = /\b(?:carro\s*el[eé]ctrico|veh[ií]culo\s*el[eé]ctrico|electrolinera|carga\s*el[eé]ctrica|toma\s*el[eé]ctric\w*)\b/i.test(propRawText) ||
    Boolean((prop.amenities as any)?.carro_electrico);

  if (reqWantsEV || propHasEV) {
    let evStatus: MatchStatus = "neutral";
    if (reqWantsEV && propHasEV) {
      evStatus = "exact";
    } else if (!reqWantsEV && propHasEV) {
      evStatus = "plus";
    } else if (reqWantsEV && !propHasEV) {
      evStatus = "missing"; // 🔴 EN DURO (Doctrina v31.87): Demanda exige adecuación para vehículo eléctrico y oferta no la tiene -> Guillotina (No Cumple)
    }
    add(
      "Carro Eléctrico",
      reqWantsEV ? "Exige capacidad para carro eléctrico (En Duro)" : "No requerido",
      propHasEV ? "Sí (Capacidad / Adecuación eléctrica)" : (ageP > 15 ? `Edificio antiguo (${ageP} años) sin tomas (No Cumple)` : "Sin adecuación eléctrica especificada (No Cumple)"),
      evStatus,
      4,
      <Zap className="w-3.5 h-3.5" />
    );
  }

  // 28. Cava de Vinos
  const reqWine = reqTextLower.includes("cava") || reqTextLower.includes("cava de vinos");
  const propWine = propRawText.includes("cava") || propRawText.includes("cava de vinos");
  if (reqWine || propWine) {
    let wineS: MatchStatus = "neutral";
    if (reqWine && propWine) wineS = "exact";
    else if (!reqWine && propWine) wineS = "plus";
    else if (reqWine && !propWine) wineS = "warn";
    add(
      "Cava de Vinos",
      reqWine ? "Exige Cava de Vinos" : "Flexible",
      propWine ? "Sí (Cava de vinos incluida)" : "Sin cava especificada",
      wineS,
      3,
      <Wine className="w-3.5 h-3.5" />
    );
  }

  // 29. Terrazas con Área y BBQ Condicional
  const reqTerraceBBQ = reqTextLower.includes("bbq") && reqTextLower.includes("terraza");
  const propTerraceBBQ = propRawText.includes("bbq") && (propRawText.includes("terraza") || propRawText.includes("parrilla"));
  if (reqTerraceBBQ || propTerraceBBQ) {
    let bbqs: MatchStatus = "neutral";
    if (reqTerraceBBQ && propTerraceBBQ) bbqs = "exact";
    else if (!reqTerraceBBQ && propTerraceBBQ) bbqs = "plus";
    else if (reqTerraceBBQ && !propTerraceBBQ) bbqs = "warn";
    add(
      "Terraza con Zona BBQ",
      reqTerraceBBQ ? "Exige Terraza con BBQ" : "Flexible",
      propTerraceBBQ ? "Sí (Terraza con Zona BBQ privada)" : "Sin BBQ en terraza",
      bbqs,
      3,
      <Flame className="w-3.5 h-3.5" />
    );
  }

  // 30. Disponibilidad / Entrega Inmediata vs Futura (Doctrina v31.80)
  const reqImmediate = /\b(?:para\s*ya|arriendo\s*para\s*ya|inmediat[oa]|urgente|lo\s*antes\s*posible|este\s*mes|entrega\s*inmediata|disponibilidad\s*inmediata|ingreso\s*inmediato|mudanza\s*inmediata)\b/i.test(reqTextLower);
  const propImmediate = /\b(?:disponible\s*ya|disponibilidad\s*inmediata|para\s*entrega\s*inmediata|desocupado|vac[ií]o|para\s*ya)\b/i.test(propRawText);
  const propFutureMatch = propRawText.match(/\b(?:disponible\s*(?:para|a\s*partir\s*de|desde|en)?|desocupan?\s*(?:el|en)?|entrega\s*(?:para|a\s*partir\s*de|en)?)\s*(?:finales\s*de|mediados\s*de|principios\s*de)?\s*(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre|nov\.?|dic\.?|ene\.?|feb\.?|mar\.?|abr\.?|may\.?|jun\.?|jul\.?|ago\.?|sep\.?|oct\.?|\d{1,2}\s*de\s*[a-z]+)\b/i);

  if (reqImmediate || propFutureMatch || propImmediate) {
    let dispStatus: MatchStatus = "neutral";
    let reqDispLabel = reqImmediate ? "Inmediata (Para Ya)" : "Flexible";
    let propDispLabel = propImmediate ? "Inmediata / Desocupado" : (propFutureMatch ? propFutureMatch[0].trim() : "Disponible");

    if (reqImmediate && propFutureMatch) {
      dispStatus = "missing"; // 🔴 Choque temporal directo (Para Ya vs Entrega diferida) -> Guillotina (No Coincide)
    } else if (reqImmediate && propImmediate) {
      dispStatus = "exact";
    } else if (!reqImmediate && propFutureMatch) {
      dispStatus = "neutral";
    } else if (!reqImmediate && propImmediate) {
      dispStatus = "plus";
    } else {
      dispStatus = "neutral";
    }

    add(
      "Disponibilidad / Entrega",
      reqDispLabel,
      propDispLabel,
      dispStatus,
      4,
      <Calendar className="w-3.5 h-3.5" />
    );
  }

  // ── INYECCIÓN DINÁMICA DE LAS 64 CARACTERÍSTICAS & AMENIDADES ("POR ARTE DE MAGIA") ──
  for (const item of DYNAMIC_AMENITIES) {
    const itemNorm = item.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const reqStoredVal = (req.caracteristicasDeseadas as any)?.[item.name] || (req.caracteristicasDeseadas as any)?.[itemNorm];
    const propStoredVal = (prop.amenities as any)?.[item.name] || (prop.amenities as any)?.[itemNorm];

    const inReq = item.patterns.some(p => reqTextLower.includes(p)) || Boolean(reqStoredVal);
    const inProp = item.patterns.some(p => propRawText.includes(p)) || Boolean(propStoredVal);

    if (!inReq && !inProp) continue;

    let amS: MatchStatus = "neutral";
    let reqLabel = typeof reqStoredVal === 'string' && reqStoredVal.trim() ? reqStoredVal : "Flexible";
    let propLabel = typeof propStoredVal === 'string' && propStoredVal.trim() ? propStoredVal : "Sin especificar";

    if (inReq && inProp) {
      amS = "exact";
      if (!reqStoredVal) reqLabel = `Exige ${item.name} (En Duro)`;
      if (!propStoredVal) propLabel = `Sí (Cuenta con ${item.name})`;
    } else if (!inReq && inProp) {
      amS = "plus";
      if (!reqStoredVal) reqLabel = "Flexible";
      if (!propStoredVal) propLabel = `Sí (${item.name} Incluido)`;
    } else if (inReq && !inProp) {
      amS = "missing"; // 🔴 EN DURO (Doctrina v31.87): Si la demanda solicitó esta característica y la oferta no la tiene -> Guillotina (No Cumple)
      if (!reqStoredVal) reqLabel = `Exige ${item.name} (En Duro)`;
      if (!propStoredVal) propLabel = `Sin ${item.name} especificado (No Cumple)`;
    }

    add(item.name, reqLabel, propLabel, amS, item.weight || 3, item.icon);
  }

  // ── INYECCIÓN DE CARACTERÍSTICAS PERSONALIZADAS ("OTRA CARACTERÍSTICA" EN COTEJO) ──
  const propAmenitiesObj = (prop.amenities && typeof prop.amenities === 'object') ? prop.amenities : {};
  const reqCaractObj = (req.caracteristicasDeseadas && typeof req.caracteristicasDeseadas === 'object') ? req.caracteristicasDeseadas : {};

  const standardReservedKeys = new Set([
    'antiguedad', 'cocina', 'interiorexterior', 'depositos', 'deposito', 'cuartobanoservicio', 'cbs',
    'balcon', 'terraza', 'piso', 'pisominimo', 'pisomaximo', 'floordetail', 'antiguedadmax', 'estratodeseado', 'areamin', 'presupuestomax', 'presupuestomin',
    'kitchentype', 'vigilancia', 'seguridad', 'visitantes', 'moto', 'motos', 'cava', 'bbq', 'chimenea', 'estudio', 'patio',
    'shut', 'gas', 'caldera', 'parqueadero', 'disponibilidad', 'entrega',
    'adminfeeincluded', 'adminincluded', 'adminfee', 'lavanderiaindependiente', 'tipopisos',
    'areaterraza', 'areabalcon', 'terracearea', 'balconyarea', 'terrazaarea', 'balconarea',
    'wants', 'gives', 'iscollaborativepool', 'collaborativepool', 'comisiones', 'calificacion', 'origen',
    'metadata', 'rawtext', 'status', 'userid', 'agentid', 'id'
  ]);

  const customKeys = new Set<string>();
  for (const k of Object.keys(propAmenitiesObj)) {
    const norm = k.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!standardReservedKeys.has(norm) && !DYNAMIC_AMENITIES.some(a => a.name.toLowerCase().replace(/[^a-z0-9]/g, '') === norm)) {
      customKeys.add(k);
    }
  }
  for (const k of Object.keys(reqCaractObj)) {
    const norm = k.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!standardReservedKeys.has(norm) && !DYNAMIC_AMENITIES.some(a => a.name.toLowerCase().replace(/[^a-z0-9]/g, '') === norm)) {
      customKeys.add(k);
    }
  }

  for (const key of Array.from(customKeys)) {
    const keyClean = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (standardReservedKeys.has(keyClean) || rows.some(r => {
      const rClean = r.label.toLowerCase().replace(/[^a-z0-9]/g, '');
      return rClean === keyClean || rClean.includes(keyClean) || keyClean.includes(rClean);
    })) {
      continue;
    }

    const pVal = propAmenitiesObj[key];
    const rVal = reqCaractObj[key];
    if (pVal === undefined && rVal === undefined) continue;
    if (Array.isArray(pVal) || Array.isArray(rVal) || (typeof pVal === 'object' && pVal !== null) || (typeof rVal === 'object' && rVal !== null)) continue;

    const hasP = pVal !== undefined && pVal !== null && pVal !== "" && pVal !== false;
    const hasR = rVal !== undefined && rVal !== null && rVal !== "" && rVal !== false;

    let st: MatchStatus = "neutral";
    let rLbl = hasR ? String(rVal) : "Flexible / No exigido";
    let pLbl = hasP ? String(pVal) : "Sin especificar";

    if (hasR && hasP) {
      const pStr = String(pVal).toLowerCase();
      if (pStr === "no" || pStr.includes("no cuenta") || pStr.includes("no tiene") || pStr.includes("no admite")) {
        st = "missing";
      } else {
        st = "exact";
      }
    } else if (!hasR && hasP) {
      st = "plus";
    } else if (hasR && !hasP) {
      st = "missing"; // 🔴 EN DURO (Doctrina v31.87): Característica solicitada por la demanda no provista por la oferta -> Guillotina (No Cumple)
      pLbl = "Sin dato especificado (No Cumple)";
    }

    const formattedLabel = key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
    add(formattedLabel, rLbl, pLbl, st, 3, <Sparkles className="w-3.5 h-3.5 text-amber-400" />);
  }

  // 30. Teléfono / Contacto WhatsApp
  const reqContactPhone = extractPhoneFromItem(req);
  const propContactPhone = extractPhoneFromItem(prop);
  add(
    "Teléfono / Contacto WhatsApp",
    reqContactPhone.display || "N/E",
    propContactPhone.display || "N/E",
    (reqContactPhone.cleanNumber && propContactPhone.cleanNumber) ? "exact" : "neutral",
    0,
    <Phone className="w-3.5 h-3.5" />
  );


  // ── ESTADÍSTICA Y TABULACIÓN DOCTRINAL DE MATCH VECY (v31.80) ──
  // 1. Guillotina Total Inflexible: Si CUALQUIER fila en todo el cotejo tiene estado "missing" ("No Coincide" / "No Cumple" en rojo) -> 0% Inmediato
  const hasAnyMissingRow = rows.some(r => r.status === "missing");
  let autoScore = 0;

  if (!hasAnyMissingRow) {
    // Casillas evaluables (todas excepto la fila puramente informativa de Teléfono)
    const evaluableRows = rows.filter(r => !r.label.includes("Teléfono"));

    // Comprobar si todas las casillas son idénticas y exactas
    const isAllExact = evaluableRows.every(r => r.status === "exact" || r.status === "ok");

    if (isAllExact) {
      autoScore = 100;
    } else {
      let totalDeduction = 0;

      for (const r of evaluableRows) {
        if (r.status === "exact" || r.status === "ok") {
          continue; // Coincidencia 100% exacta: 0 deducción
        }

        const lbl = r.label.toLowerCase();

        // ── Nivel 1: Financiero Crítico (Precio de Venta, Canon de Arriendo, Presupuesto)
        if (lbl.includes("precio de venta") || lbl.includes("precio de arriendo") || lbl.includes("canon")) {
          if (r.status === "neutral") {
            // Falta el precio o presupuesto: Castigo severo por incertidumbre financiera (cae cerca al 80%-83%)
            totalDeduction += 16.50;
          } else if (r.status === "warn") {
            totalDeduction += 2.50;
          }
        }
        // ── Nivel 2: Habitacional Duro (Área Total, Habitaciones, Baños, Parqueaderos)
        else if (lbl.includes("área total") || lbl.includes("habitaciones") || lbl.includes("baños") || lbl.includes("parqueaderos")) {
          if (r.status === "plus") {
            totalDeduction += 0.03; // Plus habitacional (ej. más alcobas o garajes de los pedidos)
          } else if (r.status === "warn") {
            totalDeduction += 0.80; // Margen funcional negociable
          } else if (r.status === "neutral") {
            totalDeduction += 3.50; // Incertidumbre en metraje o espacios
          }
        }
        // ── Nivel 3: Confort y Estructura (Valor admin, Piso, Vista, Antigüedad, Estrato, CBS, Estudio, Depósito, Cocina, Chimenea, Vigilancia, Parqueadero Visitantes, Cava, BBQ, etc.)
        else if (
          lbl.includes("admin") || lbl.includes("piso") || lbl.includes("vista") || lbl.includes("antigüedad") ||
          lbl.includes("estrato") || lbl.includes("servicio") || lbl.includes("estudio") || lbl.includes("depósito") ||
          lbl.includes("cocina") || lbl.includes("chimenea") || lbl.includes("vigilancia") || lbl.includes("visitantes") ||
          lbl.includes("moto") || lbl.includes("cava") || lbl.includes("bbq") || lbl.includes("balcón") || lbl.includes("terraza") || lbl.includes("ascensor") ||
          lbl.includes("disponibilidad") || lbl.includes("entrega")
        ) {
          if (r.status === "plus") {
            totalDeduction += 0.02; // Plus de confort (ej. balcón privado, ascensor)
          } else if (r.status === "warn") {
            totalDeduction += 0.40; // Aproximado
          } else if (r.status === "neutral") {
            totalDeduction += 1.20; // Dato pendiente de confort
          }
        }
        // ── Nivel 4: 59 Amenidades Dinámicas Secundarias (Piscina, Gimnasio, Kiosco, Shut, Canchas, etc.)
        else {
          if (r.status === "plus") {
            totalDeduction += 0.01; // Plus ofertado secundario (agrega valor pero resta micro-fracción para no ser 100%)
          } else if (r.status === "warn") {
            totalDeduction += 0.15; // Desea y no tiene especificado
          } else if (r.status === "neutral") {
            totalDeduction += 0.05; // Duda de amenidad secundaria
          }
        }
      }

      if (totalDeduction === 0) {
        autoScore = 100;
      } else {
        // Garantizar escala continua con 2 decimales entre 80.00% y 99.99%
        const calculated = 100 - totalDeduction;
        autoScore = Math.max(80.00, Math.min(99.99, Number(calculated.toFixed(2))));
      }
    }
  }

  const result = { rows, autoScore, pts, max };
  if (scoreRowsCache.size > 2000) scoreRowsCache.clear();
  scoreRowsCache.set(cacheKey, result);
  return result;
}

function formatCOP(val: string | number) {
  const num = parseFloat(String(val));
  if (isNaN(num) || num === 0) return "N/E";
  return "$" + Math.round(num).toLocaleString('es-CO');
}

function isValidRealPhoneNumber(clean: string): boolean {
  if (!clean) return false;
  // Rechazar identificadores de grupo de WhatsApp o hilos de Baileys (empiezan por 11, 12036, 1203, o tienen > 13 dígitos)
  if (clean.startsWith("11") || clean.startsWith("12036") || clean.startsWith("1203") || clean.length > 13) {
    return false;
  }
  // Celular Colombia: 10 dígitos (3XXXXXXXXX) o 12 dígitos (573XXXXXXXXX)
  if ((clean.length === 10 && clean.startsWith("3")) || (clean.length === 12 && clean.startsWith("573"))) {
    return true;
  }
  // Fijo Colombia: 10 dígitos (60XXXXXXXX) o 12 dígitos (5760XXXXXXXX)
  if ((clean.length === 10 && clean.startsWith("60")) || (clean.length === 12 && clean.startsWith("5760"))) {
    return true;
  }
  // Números internacionales válidos (entre 10 y 12 dígitos sin prefijos sospechosos)
  if (clean.length >= 10 && clean.length <= 12) {
    return true;
  }
  return false;
}

function extractContactNameFromText(rawText: string | null | undefined): string | null {
  if (!rawText) return null;
  const blacklist = new Set([
    'para', 'con', 'por', 'fotos', 'mas', 'más', 'informacion', 'información', 'informes',
    'amoblado', 'sin', 'incluida', 'inmueble', 'venta', 'arriendo', 'canon', 'precio',
    'cbs', 'piso', 'rmacion', 'rmación', 'inmobiliaria', 'inmobiliario', 'red', 'grupo',
    'directo', 'cita', 'previa', 'whatsapp', 'telefono', 'teléfono', 'celular'
  ]);

  const match = rawText.match(/\b(?:contacto|agente|broker|asesor|asesora|atención|atencion)\s*:?\s*([A-Za-zÁÉÍÓÚáéíóúñÑ]{3,20}(?:\s+[A-Za-zÁÉÍÓÚáéíóúñÑ]{3,20})?)/i);
  if (match) {
    const foundName = match[1].trim();
    const firstWord = foundName.split(/\s+/)[0].toLowerCase();
    if (!blacklist.has(firstWord) && !blacklist.has(foundName.toLowerCase())) {
      return foundName.replace(/\b\w/g, c => c.toUpperCase());
    }
  }
  return null;
}

function isGenericBrokerName(name?: string | null): boolean {
  if (!name) return true;
  const lower = name.trim().toLowerCase();
  return lower.startsWith('asesor +') || lower.startsWith('cliente +') || lower.startsWith('broker +') || lower.includes('sin nombre') || lower.includes('desconocido') || lower === '';
}

function extractPhoneFromItem(item: any): { display: string; cleanNumber: string | null; name: string | null } {
  if (!item) return { display: "Número no disponible", cleanNumber: null, name: null };

  const textName = extractContactNameFromText(item.rawText || item.description);
  const senderName = item.nombreUsuarioWhatsapp || item.pushName || textName || null;

  // 1. Revisar candidatos directos
  const candidates = [
    item.idUsuarioWhatsapp,
    item.contactPhone,
    item.brokerPhone,
    item.phone,
    item.usuarioWhatsapp,
    item.contactNumber,
    item.sellerPhone,
    item.captadorPhone
  ];

  for (const cand of candidates) {
    if (!cand) continue;
    const clean = String(cand).split("@")[0].replace(/\D/g, "");

    // ⛔ EXCLUSIÓN ABSOLUTA: El número de JanIA / VECY Oficial (573192919978) JAMÁS debe mostrarse como teléfono del captador o requiriente
    if (clean === "573192919978" || clean === "3192919978") {
      continue;
    }

    if (isValidRealPhoneNumber(clean)) {
      const formatted = (clean.length === 12 && clean.startsWith("573"))
        ? `+57 ${clean.substring(2, 5)} ${clean.substring(5, 8)} ${clean.substring(8)}`
        : (clean.length === 10 && clean.startsWith("3"))
        ? `+57 ${clean.substring(0, 3)} ${clean.substring(3, 6)} ${clean.substring(6)}`
        : `+${clean}`;
      const cleanNum = clean.length === 10 ? `57${clean}` : clean;
      return {
        display: senderName ? `${senderName} (${formatted})` : formatted,
        cleanNumber: cleanNum,
        name: senderName
      };
    }
  }

  // 1.5. Buscar enlaces directos wa.me o api.whatsapp.com en el texto
  const textToSearch = `${item.rawText || ""} ${item.description || ""} ${item.name || ""} ${item.rawMessage || ""}`;
  const waMatch = textToSearch.match(/(?:wa\.me\/|api\.whatsapp\.com\/send\/?\?(?:[^&\s]*&)*phone=)(?:\+?57)?(3\d{9})/i);
  if (waMatch) {
    const clean10 = waMatch[1];
    if (clean10 !== "3192919978") {
      const formatted = `+57 ${clean10.substring(0, 3)} ${clean10.substring(3, 6)} ${clean10.substring(6)}`;
      return {
        display: senderName ? `${senderName} (${formatted})` : formatted,
        cleanNumber: `57${clean10}`,
        name: senderName
      };
    }
  }

  // 2. Buscar en el texto del mensaje por cualquier celular colombiano de 10 dígitos que NO sea el del sistema
  // Regex flexible para: 310 856 1634, 310 856 16 34, 310-856-1634, +57 310 856 16 34, (310) 856 1634, 3108561634
  const phoneMatches = textToSearch.match(/(?:\+?57[\s.-]*)?(?:\(?3\d{2}\)?[\s.-]*\d{3}[\s.-]*\d{2}[\s.-]*\d{2}|\(?3\d{2}\)?[\s.-]*\d{3}[\s.-]*\d{4}|3\d{9})\b/g);
  if (phoneMatches && phoneMatches.length > 0) {
    for (const pMatch of phoneMatches) {
      const rawMatch = pMatch.replace(/\D/g, "");
      const clean10 = rawMatch.startsWith("57") && rawMatch.length === 12 ? rawMatch.substring(2) : rawMatch;
      if (clean10.length === 10 && clean10.startsWith("3") && clean10 !== "3192919978") {
        const formatted = `+57 ${clean10.substring(0, 3)} ${clean10.substring(3, 6)} ${clean10.substring(6)}`;
        return {
          display: senderName ? `${senderName} (${formatted})` : formatted,
          cleanNumber: `57${clean10}`,
          name: senderName
        };
      }
    }
  }

  return {
    display: senderName ? `${senderName} (+57 N/E - Completar al editar)` : "+57 (Teléfono N/E - Completar al editar)",
    cleanNumber: null,
    name: senderName
  };
}

function formatPhoneDisplay(phone: string | null | undefined) {
  if (!phone) return "Número no disponible";
  const clean = String(phone).split("@")[0].replace(/\D/g, "");
  if (!isValidRealPhoneNumber(clean)) return "Número no disponible";

  if (clean.length === 12 && clean.startsWith("573")) {
    return `+57 ${clean.substring(2, 5)} ${clean.substring(5, 8)} ${clean.substring(8)}`;
  }
  if (clean.length === 10 && clean.startsWith("3")) {
    return `+57 ${clean.substring(0, 3)} ${clean.substring(3, 6)} ${clean.substring(6)}`;
  }
  return `+${clean}`;
}

function isPhoneValidForWA(phone: string | null | undefined): boolean {
  if (!phone) return false;
  const clean = String(phone).split("@")[0].replace(/\D/g, "");
  return isValidRealPhoneNumber(clean);
}

function getValidWaLink(phone: string | null | undefined, text: string): string {
  if (!phone) return '#';
  const clean = String(phone).split("@")[0].replace(/\D/g, "");
  if (!isValidRealPhoneNumber(clean)) return '#';
  const num = clean.startsWith("57") ? clean : `57${clean}`;
  return `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
}

function renderTextWithClickableLinks(text: string | null | undefined) {
  if (!text) return null;
  // Normalizar espacios múltiples o tabulaciones exageradas que los brokers usan para formatear columnas en WhatsApp
  const cleanedText = text
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const urlPattern = /(https?:\/\/[^\s<"']+|wa\.me\/[^\s<"']+|whatsapp\.com\/[^\s<"']+)/gi;
  const parts = cleanedText.split(urlPattern);

  return parts.map((part, i) => {
    if (/^(https?:\/\/|wa\.me\/|whatsapp\.com\/)/i.test(part)) {
      const punctMatch = part.match(/[.,;:)]+$/);
      const trailingPunct = punctMatch ? punctMatch[0] : '';
      const cleanUrl = part.slice(0, part.length - trailingPunct.length);
      const href = cleanUrl.startsWith("http") ? cleanUrl : `https://${cleanUrl}`;
      return (
        <span key={i}>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 underline font-semibold break-all inline-flex items-center gap-1 my-0.5"
          >
            {cleanUrl} <ExternalLink className="w-3 h-3 inline" />
          </a>
          {trailingPunct}
        </span>
      );
    }
    return part;
  });
}

function checkTxCompatFrontend(reqTypeRaw: string, propTypeRaw: string, propAccepted: string[] = []): boolean {
  if (!reqTypeRaw || !propTypeRaw) return false;
  const r = reqTypeRaw.toLowerCase().trim();
  const p = propTypeRaw.toLowerCase().trim();
  const accepted = propAccepted.map(t => t.toLowerCase().trim());

  if (r === p) return true;
  if (accepted.length > 0 && accepted.includes(r)) return true;

  if (p === "venta_o_arriendo" && (r === "venta" || r === "arriendo" || r === "arriendo_con_opcion_de_compra")) return true;
  if (r === "venta_o_arriendo" && (p === "venta" || p === "arriendo" || p === "arriendo_con_opcion_de_compra")) return true;

  if (p === "venta_permuta" && (r === "venta" || r === "permuta")) return true;
  if (r === "venta_permuta" && (p === "venta" || p === "permuta")) return true;

  if (p === "arriendo_con_opcion_de_compra" && r === "venta") return true;
  if (r === "arriendo_con_opcion_de_compra" && p === "venta") return true;

  return false;
}

export default function AdminMatches() {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [minScore, setMinScore] = React.useState('80');
  const [transactionFilter, setTransactionFilter] = React.useState<'all' | 'venta' | 'arriendo' | 'permuta' | 'opcion_compra' | 'standby'>('venta');
  const [ageFilter, setAgeFilter] = React.useState<'active_10' | 'all'>('active_10');
  const [activeTab, setActiveTab] = React.useState<'calificados' | 'incompletos'>('calificados');
  
  // Estados para Edición Interactiva de Fichas Prediales directamente desde el Cotejo
  const [editingMatchId, setEditingMatchId] = React.useState<number | null>(null);
  const [isSavingOnly, setIsSavingOnly] = React.useState(false);
  const [isRecalculating, setIsRecalculating] = React.useState(false);
  const [editForm, setEditForm] = React.useState<Record<string, any>>({});
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [feedbackStatusMap, setFeedbackStatusMap] = React.useState<Record<number, 'exitoso' | 'rechazado' | 'en_negociacion'>>({});
  const [commercialStatusFeedbackMap, setCommercialStatusFeedbackMap] = React.useState<Record<number, string>>({});
  const [statusUpdatingMatchId, setStatusUpdatingMatchId] = React.useState<number | null>(null);
  const [dismissedMatchIds, setDismissedMatchIds] = React.useState<Set<number>>(new Set());
  const [saveStatusMap, setSaveStatusMap] = React.useState<Record<number, 'saved' | 'recalculated'>>({});
  const [customAttributesByMatch, setCustomAttributesByMatch] = React.useState<Record<number, { key: string; label: string }[]>>({});
  const [localUpdateTick, setLocalUpdateTick] = React.useState(0);

  const scrollToTop = () => {
    const mainEl = document.querySelector('main');
    if (mainEl) {
      mainEl.scrollTo({ top: 0, behavior: 'smooth' });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.documentElement.scrollTo({ top: 0, behavior: 'smooth' });
    document.body.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getCleanMatchReason = (rawReason?: string | null): string | null => {
    if (!rawReason) return null;
    const s = String(rawReason).trim();
    if (!s) return null;
    if (s.startsWith('{')) {
      try {
        const parsed = JSON.parse(s);
        if (typeof parsed.summary === 'string' && parsed.summary.trim()) {
          return parsed.summary.trim();
        }
        if (typeof parsed.reason === 'string' && parsed.reason.trim()) {
          return parsed.reason.trim();
        }
        return null;
      } catch {
        return null;
      }
    }
    return s;
  };

  const handleAddAttributeToCard = (matchId: number, attrKey: string) => {
    const attributeDefs: Record<string, { key: string; label: string }> = {
      vista: { key: 'vista', label: 'Ubicación en Piso (Vista)' },
      antiguedad: { key: 'antiguedad', label: 'Antigüedad / Año' },
      cocina: { key: 'cocina', label: 'Tipología de Cocina' },
      cbs: { key: 'cbs', label: 'Cuarto de Servicio (CBS)' },
      deposito: { key: 'deposito', label: 'Depósito / Cuarto Útil' },
      balcon: { key: 'balcon', label: 'Balcón / Terraza / Patio' },
      terraza_area: { key: 'terraza_area', label: 'Área de Terraza (m²)' },
      balcon_area: { key: 'balcon_area', label: 'Área de Balcón (m²)' },
      garaje_tipo: { key: 'garaje_tipo', label: 'Tipo de Garaje' },
      ascensor: { key: 'ascensor', label: 'Equipamiento (Ascensor)' },
      conjunto: { key: 'conjunto', label: 'Equipamiento (Conjunto Cerrado)' },
      chimenea: { key: 'chimenea', label: 'Chimenea' },
      gas: { key: 'gas', label: 'Gas Natural' },
      gimnasio: { key: 'gimnasio', label: 'Gimnasio' },
      piscina: { key: 'piscina', label: 'Piscina' },
      cancha: { key: 'cancha', label: 'Cancha Deportiva / Squash' },
      zona_infantil: { key: 'zona_infantil', label: 'Zona Infantil' },
      vigilancia: { key: 'vigilancia', label: 'Vigilancia & Seguridad 24/7' },
      planta: { key: 'planta', label: 'Planta Eléctrica' },
      estado: { key: 'estado', label: 'Estado del Inmueble' },
      lavanderia: { key: 'lavanderia', label: 'Zona de Lavandería' },
    };

    if (attrKey === 'custom') {
      const customName = window.prompt("Ingrese el nombre de la nueva característica (ej: Piscina Privada, Chimenea, Terraza BBQ):");
      if (!customName || !customName.trim()) return;
      const cleanKey = customName.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
      setCustomAttributesByMatch(prev => ({
        ...prev,
        [matchId]: [...(prev[matchId] || []), { key: cleanKey, label: customName.trim() }]
      }));
      toast.success(`Característica "${customName.trim()}" agregada a la tabla`);
      return;
    }

    const def = attributeDefs[attrKey];
    if (!def) return;

    setCustomAttributesByMatch(prev => {
      const current = prev[matchId] || [];
      if (current.some(item => item.key === def.key)) {
        toast.info(`La característica "${def.label}" ya se encuentra en la tabla`);
        return prev;
      }
      toast.success(`Característica "${def.label}" agregada a la tabla`);
      return {
        ...prev,
        [matchId]: [...current, def]
      };
    });
  };

  // Función de copiado al portapapeles infalible (Async Clipboard API con fallback a ExecCommand Textarea)
  const copyToClipboard = async (text: string): Promise<boolean> => {
    if (!text) return false;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (err) {
      console.warn("navigator.clipboard.writeText falló o no tiene foco, intentando fallback:", err);
    }

    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      textArea.setAttribute("readonly", "");
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand("copy");
      document.body.removeChild(textArea);
      return successful;
    } catch (fallbackErr) {
      console.error("Fallback execCommand falló:", fallbackErr);
      return false;
    }
  };

  // Extractor de frase o dato clave único para búsqueda instantánea en WhatsApp (Móvil y Web)
  const extractSmartSearchSnippet = (
    rawText?: string | null,
    fallback?: string,
    senderName?: string | null,
    groupName?: string | null,
    knownPhone?: string | null
  ): { snippet: string; description: string } => {
    const text = (rawText || fallback || "").replace(/__is_sub_message__/g, "").trim();

    // 1. Manija / Handle de marca única al inicio (ej: "🟠Clauproraiz", "@boutinhomes", "Wasi", etc.)
    const handleMatch = text.match(/(?:^|\s)[@🟠🟣🔵🟢]?([A-Za-z0-9_]{5,25}(?:raiz|inmo|homes|propiedades|inmobiliaria|realty))\b/i);
    if (handleMatch) {
      return { snippet: handleMatch[1], description: "Marca / Identificador del asesor" };
    }

    // 2. Teléfono literal escrito en el texto (con su formato exacto, ej: "310-6189450" o "310 618 9450")
    // En WhatsApp in-chat search, si el mensaje tiene guiones o espacios, el término exacto es el que encuentra el mensaje al 100%
    const phoneMatches = text.match(/(?:\+?57[\s.-]*)?(?:\(?3\d{2}\)?[\s.-]*\d{3}[\s.-]*\d{2}[\s.-]*\d{2}|\(?3\d{2}\)?[\s.-]*\d{3}[\s.-]*\d{4}|3\d{9})\b/g);
    if (phoneMatches && phoneMatches.length > 0) {
      for (const p of phoneMatches) {
        const clean = p.replace(/\D/g, "");
        const num10 = clean.startsWith("57") && clean.length === 12 ? clean.substring(2) : clean;
        if (num10.length === 10 && num10.startsWith("3") && num10 !== "3192919978") {
          return { snippet: p.trim(), description: "Celular del asesor tal como está publicado" };
        }
      }
    }

    // 3. Celular conocido de 10 dígitos (si no venía en el texto pero lo tenemos en BD)
    if (knownPhone) {
      const clean = String(knownPhone).replace(/\D/g, "");
      const num10 = clean.startsWith("57") && clean.length === 12 ? clean.substring(2) : clean;
      if (num10.length === 10 && num10.startsWith("3") && num10 !== "3192919978") {
        return { snippet: num10, description: "Celular del asesor (búsqueda 100% exacta)" };
      }
    }

    // 4. Nombre del Asesor / Remitente (si está identificado en WhatsApp y no es genérico)
    const isGeneric = (n?: string | null) => !n || n.toLowerCase().startsWith("asesor +") || n.toLowerCase().startsWith("cliente +") || n.toLowerCase().startsWith("broker +") || n.toLowerCase().includes("sin nombre") || n.toLowerCase().includes("desconocido") || n.toLowerCase().includes("completar al editar");
    if (senderName && !isGeneric(senderName)) {
      const cleanName = senderName.split(/[\n,|-]/)[0].trim();
      if (cleanName.length >= 3 && cleanName.length <= 32) {
        return { snippet: cleanName, description: "Nombre de quien publicó" };
      }
    }

    // 5. Rango de calles o dirección específica (ej: "De la 90 a la 79", "Cra 11 BIS con 123", "Calle 123 #45-67")
    const streetRangeMatch = text.match(/(?:de la\s+\d{1,3}\s+a la\s+\d{1,3}(?:\s+y de la\s+\d{1,3}\s+a la\s+\d{1,3})?)/i)
                          || text.match(/(?:entre\s+(?:calles?|carreras?|clls?|cras?)\s+\d{1,3}\s+y\s+\d{1,3})/i);
    if (streetRangeMatch) {
      return { snippet: streetRangeMatch[0].trim(), description: "Rango de calles exacto de la búsqueda" };
    }

    // 6. Código o ID único de portal inmobiliario (Wasi, FincaRaíz, Metrocuadrado)
    const urlCodeMatch = text.match(/(?:wasi\.co\/[^\/]+\/|fincaraiz\.com\.co\/[^\/]+\/|metrocuadrado\.com\/[^\/]+\/)(\d{5,10})\b/i)
                      || text.match(/(?:c[oó]digo|id|ref|referencia)\s*:?\s*#?\s*(\d{5,10})\b/i);
    if (urlCodeMatch) {
      return { snippet: urlCodeMatch[1], description: "Código único de publicación / portal" };
    }

    // 7. Firma o mención de contacto en el texto (ej: "León Aguilar Medina", "Cliente Roc", "Informes Patty")
    const sigMatch = text.match(/(?:informes|contacto|asesor|asesora|atenci[oó]n|cliente|firma)\s*:?\s*\*?([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){0,2})\*?/i);
    if (sigMatch) {
      const sig = sigMatch[1].trim();
      const blacklist = ["Apartamento", "Arriendo", "Venta", "Excelente", "Oportunidad", "Edificio", "Bogota", "Bogotá"];
      if (!blacklist.includes(sig) && sig.length >= 4) {
        return { snippet: sig, description: "Firma / Contacto en la publicación" };
      }
    }

    // 8. Dirección o cruce específico (Cra, Cll, Cl, Ak, Auto, etc.)
    const lines = text
      .split("\n")
      .map(l => l.replace(/[*_~`#•-]/g, "").trim())
      .filter(l => l.length >= 6 && !l.startsWith("http") && !l.startsWith("__"));

    const addressLine = lines.find(l => /(?:cra|carrera|cll|calle|diag|diagonal|trans|transversal|av|avenida|ak|ac)\.?\s*\d+/i.test(l));
    if (addressLine && addressLine.length >= 6 && addressLine.length <= 35) {
      return { snippet: addressLine.trim(), description: "Dirección o cruce específico" };
    }

    // 9. Frase distintiva PURGADA de stop-words comunes de bienes raíces
    const STOP_WORDS = new Set([
      "busco", "arriendo", "arrendar", "venta", "vendo", "compro", "compra",
      "apartamento", "apto", "casa", "inmueble", "propiedad", "lote", "oficina", "bodega",
      "para", "con", "por", "en", "de", "la", "el", "los", "las", "un", "una", "unos", "unas",
      "presupuesto", "precio", "valor", "canon", "millones", "mll", "mm", "cop",
      "m2", "mts", "mts2", "mt2", "metros", "habitaciones", "habs", "hab", "alcobas", "baños", "garajes", "parqueaderos",
      "mínimo", "minimo", "máximo", "maximo", "excelente", "sector", "zona", "zonas", "bogota", "bogotá",
      "mas", "más", "menos", "menos.", "que", "sea", "tenga", "mucho", "poco", "pero", "nada", "tiene", "ojalá", "ojala"
    ]);

    for (const line of lines) {
      const words = line.split(/\s+/).filter(w => w.length >= 4 && !STOP_WORDS.has(w.toLowerCase().replace(/[^a-záéíóúñ]/g, "")));
      if (words.length >= 2 && words.length <= 4) {
        return { snippet: words.join(" "), description: "Frase distintiva única" };
      }
    }

    const safeFirstLine = lines.find(l => !/(?:busco|vendo|arriendo|venta|compra)\s*(?:apartamento|apto|casa|inmueble)/i.test(l)) || lines[0] || text;
    const cleanWords = safeFirstLine.split(/\s+/).filter(w => w.length >= 4 && !STOP_WORDS.has(w.toLowerCase().replace(/[^a-záéíóúñ]/g, ""))).slice(0, 3).join(" ");
    return { snippet: (cleanWords || safeFirstLine.slice(0, 25)).trim(), description: "Texto clave" };
  };

  const handleCopy = async (
    text: string, 
    id: string, 
    mode: 'full' | 'search' | 'group' | 'author' | 'phone' = 'full', 
    groupName?: string,
    senderName?: string | null,
    knownPhone?: string | null
  ) => {
    try {
      if (!text && mode !== 'group') return;
      let targetText = text;
      let title = "📋 Publicación original copiada";
      let desc = groupName 
        ? `Texto original copiado con 100% de fidelidad para ubicar en el grupo "${groupName}".` 
        : senderName
          ? `Texto original copiado con 100% de fidelidad (recibido por chat directo con ${senderName}).`
          : "Texto original copiado con 100% de fidelidad al portapapeles.";

      if (mode === 'search') {
        const smart = extractSmartSearchSnippet(text, undefined, senderName, groupName, knownPhone);
        targetText = smart.snippet;
        title = `🎯 Clave única copiada: "${targetText}"`;
        desc = groupName 
          ? `(${smart.description}) 👉 Abre WhatsApp, entra al grupo "${groupName}" y pega esta clave en la lupa para ubicar al autor de una sin resaltados amarillos.`
          : `(${smart.description}) 👉 Pégala en el buscador de WhatsApp para ubicarlo de inmediato.`;
      } else if (mode === 'group') {
        targetText = (groupName || text || "").trim();
        title = "🏷️ Nombre de grupo copiado";
        desc = `Pega "${targetText}" en la barra de búsqueda de WhatsApp para abrir el grupo.`;
      } else if (mode === 'author') {
        targetText = text.trim();
        title = `👤 Asesor copiado: "${targetText}"`;
        desc = groupName 
          ? `Abre WhatsApp, entra al grupo "${groupName}" y pega su nombre en la lupa para ver su publicación.`
          : `Abre WhatsApp y busca a "${targetText}" en tus chats directos para ver sus mensajes.`;
      } else if (mode === 'phone') {
        targetText = text.trim();
        title = `📞 Celular copiado: ${targetText}`;
        desc = `Pégalo en WhatsApp para chatear o buscar los mensajes de este asesor.`;
      }

      const success = await copyToClipboard(targetText);
      if (success) {
        toast.success(title, { description: desc, duration: 6000 });
        setCopiedId(id);
        setTimeout(() => {
          setCopiedId(prev => (prev === id ? null : prev));
        }, 2000);
      } else {
        toast.error("Error al copiar al portapapeles");
      }
    } catch (e) {
      console.error("Error al copiar texto:", e);
    }
  };

  const utils = trpc.useUtils();
  const updatePropMut = trpc.janIA.updatePropertyDetails.useMutation();
  const updateReqMut = trpc.janIA.updateRequirementDetails.useMutation();
  const recalculateMatchMut = trpc.janIA.recalculateMatchForPair.useMutation();
  const recordFeedbackMut = trpc.janIA.recordMatchFeedback.useMutation();
  const updateCommercialStatusMut = trpc.janIA.updatePropertyCommercialStatus.useMutation();
  const saveAdvisorMut = trpc.janIA.saveAdvisorContact.useMutation();

  const handleSaveAdvisorDirect = async (isOffer: boolean, m: any) => {
    const rawPhone = isOffer ? editForm.propPhone : editForm.reqPhone;
    const rawName = isOffer ? editForm.propSenderName : editForm.reqSenderName;
    const rawGroup = isOffer ? editForm.propOrigenNombre : editForm.reqOrigenNombre;
    const currentItem = isOffer ? m.property : m.requirement;

    const cleanPhone = normalizePhoneInput(rawPhone);
    const validName = rawName && !isGenericBrokerName(rawName) ? rawName.trim() : null;

    if (!cleanPhone && !validName) {
      toast.error("Ingresa un número de celular o nombre de asesor válido");
      return;
    }

    try {
      await saveAdvisorMut.mutateAsync({
        phone: cleanPhone || currentItem?.idUsuarioWhatsapp,
        name: validName || currentItem?.nombreUsuarioWhatsapp,
        oldPhoneOrLid: currentItem?.idUsuarioWhatsapp,
        sourceGroup: rawGroup || currentItem?.origenNombre,
      });

      if (cleanPhone) {
        if (isOffer && m.property) {
          m.property.idUsuarioWhatsapp = cleanPhone;
          if (validName) m.property.nombreUsuarioWhatsapp = validName;
        } else if (!isOffer && m.requirement) {
          m.requirement.idUsuarioWhatsapp = cleanPhone;
          if (validName) m.requirement.nombreUsuarioWhatsapp = validName;
        }
      }

      toast.success("🏛️ Asesor guardado para siempre en la base de datos", {
        description: `${validName || 'Asesor'} (${cleanPhone || 'Sin celular'}) persistido y sincronizado en todas sus publicaciones.`,
      });
      setLocalUpdateTick(prev => prev + 1);
    } catch (err: any) {
      toast.error("Error guardando asesor: " + (err?.message || "Error"));
    }
  };

  const handleUpdateCommercialStatus = async (m: any, status: 'VENDIDO' | 'ARRENDADO' | 'INACTIVO') => {
    const propId = m.property?.id;
    if (!propId) return;

    const statusLabel = status === 'VENDIDO' ? 'Vendido' : status === 'ARRENDADO' ? 'Arrendado' : 'Ya No Disponible / Inactivo';
    const statusEmoji = status === 'VENDIDO' ? '🔑' : status === 'ARRENDADO' ? '🗝️' : '🤦🏻‍♀️';

    try {
      setStatusUpdatingMatchId(m.id);
      setCommercialStatusFeedbackMap(prev => ({ ...prev, [m.id]: `${statusEmoji} ¡Inmueble #${propId} marcado como ${statusLabel}!` }));
      setDismissedMatchIds(prev => new Set([...Array.from(prev), m.id]));

      toast.success(`${statusEmoji} Inmueble #${propId} marcado como ${statusLabel}`, {
        description: "Se ha actualizado en la base de datos y retirado de todas las coincidencias activas.",
      });

      await updateCommercialStatusMut.mutateAsync({
        propertyId: propId,
        status,
        matchId: m.id,
        requirementId: m.requirement?.id,
      });

      utils.janIA.getAllMatches.invalidate();
      setTimeout(() => {
        refetch();
      }, 600);
    } catch (e: any) {
      console.error("Error actualizando estado comercial:", e);
      toast.error("Error al actualizar el estado comercial del inmueble");
      setCommercialStatusFeedbackMap(prev => {
        const next = { ...prev };
        delete next[m.id];
        return next;
      });
      setDismissedMatchIds(prev => {
        const next = new Set(prev);
        next.delete(m.id);
        return next;
      });
    } finally {
      setStatusUpdatingMatchId(null);
    }
  };

  // Estados para Retroalimentación de Broker (Capa C - Active Learning v31.85 Selección Múltiple)
  const [rejectModalMatch, setRejectModalMatch] = React.useState<any>(null);
  const [selectedRejectReasons, setSelectedRejectReasons] = React.useState<string[]>([]);
  const [customRejectNote, setCustomRejectNote] = React.useState<string>('');
  const rejectReason = selectedRejectReasons.join(" · ");

  const toggleRejectReason = (label: string) => {
    setSelectedRejectReasons(prev =>
      prev.includes(label) ? prev.filter(r => r !== label) : [...prev, label]
    );
  };

  // Estados para Agregar Atributo / Campo al Cotejo (Robustecer Oferta y Demanda)
  const [addFieldModalMatch, setAddFieldModalMatch] = React.useState<any>(null);
  const [selectedAttributeKey, setSelectedAttributeKey] = React.useState<string>('mascotas');
  const [customAttributeName, setCustomAttributeName] = React.useState<string>('');
  const [addFieldReqVal, setAddFieldReqVal] = React.useState<string>('Exige / Indispensable');
  const [addFieldPropVal, setAddFieldPropVal] = React.useState<string>('Sí (Cuenta con ello)');
  const [addFieldStatus, setAddFieldStatus] = React.useState<MatchStatus>('exact');
  const [persistInOffer, setPersistInOffer] = React.useState<boolean>(true);
  const [persistInDemand, setPersistInDemand] = React.useState<boolean>(true);
  const [isSavingAddField, setIsSavingAddField] = React.useState<boolean>(false);

  const handleSaveNewField = async () => {
    if (!addFieldModalMatch) return;
    setIsSavingAddField(true);
    try {
      const isCustom = selectedAttributeKey === 'otra';
      const attrName = isCustom 
        ? customAttributeName.trim() 
        : (ATTRIBUTE_CATALOG.find(a => a.key === selectedAttributeKey)?.label || selectedAttributeKey);

      if (!attrName) {
        toast.error("Por favor especifica el nombre de la característica");
        setIsSavingAddField(false);
        return;
      }

      const attrKey = attrName.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const pId = addFieldModalMatch.property?.id;
      const rId = addFieldModalMatch.requirement?.id;

      const promises: Promise<any>[] = [];

      // 1. Guardar en Oferta si está seleccionado
      if (persistInOffer && pId) {
        const existingAmenities = { ...(addFieldModalMatch.property?.amenities || {}) };
        existingAmenities[attrKey] = addFieldPropVal || "Sí";
        promises.push(
          updatePropMut.mutateAsync({
            propertyId: pId,
            amenities: existingAmenities,
          })
        );
        if (addFieldModalMatch.property) {
          addFieldModalMatch.property.amenities = existingAmenities;
        }
      }

      // 2. Guardar en Demanda si está seleccionado
      if (persistInDemand && rId) {
        const existingCaract = { ...(addFieldModalMatch.requirement?.caracteristicasDeseadas || {}) };
        existingCaract[attrKey] = addFieldReqVal || "Exige";
        promises.push(
          updateReqMut.mutateAsync({
            requirementId: rId,
            caracteristicasDeseadas: existingCaract,
          })
        );
        if (addFieldModalMatch.requirement) {
          addFieldModalMatch.requirement.caracteristicasDeseadas = existingCaract;
        }
      }

      await Promise.all(promises);

      // Limpiar caché y forzar re-render de cotejo
      scoreRowsCache.clear();
      setLocalUpdateTick(t => t + 1);

      toast.success("✅ Atributo agregado y guardado con éxito", {
        description: `Característica "${attrName}" registrada permanentemente en la base de datos.`,
      });

      setAddFieldModalMatch(null);
      setSelectedAttributeKey('mascotas');
      setCustomAttributeName('');
    } catch (err: any) {
      console.error("Error al guardar nuevo atributo en cotejo:", err);
      toast.error("Error al guardar atributo: " + (err.message || "Error desconocido"));
    } finally {
      setIsSavingAddField(false);
    }
  };

  const handleFeedback = async (m: any, action: 'exitoso' | 'rechazado' | 'en_negociacion', reason?: string, note?: string) => {
    try {
      setFeedbackStatusMap(prev => ({ ...prev, [m.id]: action }));
      if (action === 'rechazado') {
        setDismissedMatchIds(prev => new Set([...Array.from(prev), m.id]));
        toast.success("⛔ Coincidencia descartada", {
          description: reason ? `Motivo: ${reason}` : "La coincidencia ha sido retirada del panel.",
        });
      }

      // Persistencia indestructible: Si se estaba editando este match, guardar datos de asesor antes de aplicar feedback
      if (editingMatchId === m.id) {
        const pPhone = normalizePhoneInput(editForm.propPhone);
        const pName = editForm.propSenderName && !isGenericBrokerName(editForm.propSenderName) ? editForm.propSenderName.trim() : null;
        if (pPhone || pName) {
          saveAdvisorMut.mutateAsync({
            phone: pPhone || m.property?.idUsuarioWhatsapp,
            name: pName || m.property?.nombreUsuarioWhatsapp,
            oldPhoneOrLid: m.property?.idUsuarioWhatsapp,
            sourceGroup: editForm.propOrigenNombre || m.property?.origenNombre,
          }).catch(() => {});
        }

        const rPhone = normalizePhoneInput(editForm.reqPhone);
        const rName = editForm.reqSenderName && !isGenericBrokerName(editForm.reqSenderName) ? editForm.reqSenderName.trim() : null;
        if (rPhone || rName) {
          saveAdvisorMut.mutateAsync({
            phone: rPhone || m.requirement?.idUsuarioWhatsapp,
            name: rName || m.requirement?.nombreUsuarioWhatsapp,
            oldPhoneOrLid: m.requirement?.idUsuarioWhatsapp,
            sourceGroup: editForm.reqOrigenNombre || m.requirement?.origenNombre,
          }).catch(() => {});
        }
      }

      await recordFeedbackMut.mutateAsync({
        matchId: m.id,
        propertyId: m.property?.id,
        requirementId: m.requirement?.id,
        action,
        motivoRechazo: reason || null,
        notasBroker: note || null,
      });

      utils.janIA.getAllMatches.invalidate();
      utils.properties.myList.invalidate();
      utils.janIA.getAllRequirements.invalidate();
      if (reason && (reason.toLowerCase().includes('tercer') || reason.toLowerCase().includes('referid'))) {
        toast.info("🛡️ Asignado a StandBy Directo Vecy", {
          description: "JanIA ha enviado el registro a la sección StandBy para protección de comisión 50/50.",
        });
      }
      if (action === 'rechazado') {
        setTimeout(() => {
          refetch();
        }, 800);
      }
    } catch (e: any) {
      console.error("Error registrando retroalimentación:", e);
      setFeedbackStatusMap(prev => {
        const next = { ...prev };
        delete next[m.id];
        return next;
      });
      setDismissedMatchIds(prev => {
        const next = new Set(prev);
        next.delete(m.id);
        return next;
      });
      toast.error("Error al descartar la coincidencia");
    }
  };

  const handleStartEdit = (m: any) => {
    if (editingMatchId === m.id) {
      setEditingMatchId(null);
      setEditForm({});
      return;
    }

    setEditingMatchId(m.id);
    const isPropDirect = m.property?.origenTipo === 'contacto_directo' || m.property?.origenTipo === 'dm';
    const isReqDirect = m.requirement?.origenTipo === 'contacto_directo' || m.requirement?.origenTipo === 'dm';

    setSaveStatusMap(prev => {
      const next = { ...prev };
      delete next[m.id];
      return next;
    });

    const propContact = extractPhoneFromItem(m.property);
    const reqContact = extractPhoneFromItem(m.requirement);

    setEditForm({
      // Oferta (Inmueble)
      propSenderName: m.property?.nombreUsuarioWhatsapp || (isPropDirect ? m.property?.origenNombre : '') || '',
      propPrice: m.property?.price || '',
      propRentPrice: m.property?.rentPrice || '',
      propAdminFee: m.property?.adminFee || '',
      propArea: m.property?.areaTotal || m.property?.areaPrivate || '',
      propBedrooms: m.property?.bedrooms ?? '',
      propBathrooms: m.property?.bathrooms ?? '',
      propGarages: m.property?.garages ?? '',
      propStratum: m.property?.stratum ?? '',
      propZone: m.property?.zone || m.property?.addressNeighborhood || '',
      propLocality: m.property?.addressLocality || '',
      propCity: m.property?.city || 'Bogotá',
      propPropertyType: m.property?.propertyType || '',
      propTransactionType: m.property?.transactionType || '',
      propPhone: (() => {
        const raw = m.property?.idUsuarioWhatsapp || m.property?.phone || m.property?.contactPhone || '';
        if (isValidRealPhoneNumber(raw)) return raw;
        if (propContact.cleanNumber) return propContact.cleanNumber;
        return '';
      })(),
      propOrigenNombre: isPropDirect ? '' : (m.property?.origenNombre || ''),
      propYearBuilt: m.property?.yearBuilt ?? '',
      propAntiguedadAnos: m.property?.antiguedadAnos ?? '',
      propAntiguedadRaw: m.property?.yearBuilt ? `${m.property.yearBuilt}` : (m.property?.antiguedadAnos !== null && m.property?.antiguedadAnos !== undefined ? `${m.property.antiguedadAnos}` : (m.property?.amenities?.antiguedad || '')),
      propExtInt: m.property?.amenities?.interiorExterior || (m.property?.rawText?.toLowerCase().includes('interior') ? 'Interior' : (m.property?.rawText?.toLowerCase().includes('exterior') ? 'Exterior' : '')),
      propCocina: m.property?.amenities?.cocina || '',
      propDepositos: m.property?.amenities?.depositos ?? '',
      propCuartoServicio: m.property?.amenities?.cuartoBanoServicio || '',
      propBalcon: m.property?.amenities?.balcon || '',
      propTerraceArea: m.property?.amenities?.areaTerraza ?? parseOutdoorAreas(m.property?.rawText || '').terraceArea ?? '',
      propBalconyArea: m.property?.amenities?.areaBalcon ?? parseOutdoorAreas(m.property?.rawText || '').balconyArea ?? '',
      propGarageType: m.property?.garageType || '',
      propPisoNivel: m.property?.floorDetail || m.property?.amenities?.piso || '',

      // Demanda (Requerimiento)
      reqSenderName: m.requirement?.nombreUsuarioWhatsapp || (isReqDirect ? m.requirement?.origenNombre : '') || '',
      reqBudget: m.requirement?.presupuestoMax || '',
      reqAdminMax: m.requirement?.adminFeeMax || '',
      reqArea: m.requirement?.areaMin || '',
      reqBedrooms: m.requirement?.habitacionesMin ?? '',
      reqBathrooms: m.requirement?.banosMin ?? '',
      reqGarages: m.requirement?.parqueaderosMin ?? '',
      reqStratum: m.requirement?.estratoDeseado ?? '',
      reqZone: m.requirement?.zonaDeseada || m.requirement?.addressNeighborhood || '',
      reqLocality: m.requirement?.addressLocality || '',
      reqCity: m.requirement?.ciudadDeseada || 'Bogotá',
      reqPropertyType: m.requirement?.tipoInmuebleDeseado || '',
      reqTransactionType: m.requirement?.tipoNegocioDeseado || '',
      reqPhone: (() => {
        const raw = m.requirement?.idUsuarioWhatsapp || m.requirement?.phone || m.requirement?.contactPhone || '';
        if (isValidRealPhoneNumber(raw)) return raw;
        if (reqContact.cleanNumber) return reqContact.cleanNumber;
        return '';
      })(),
      reqOrigenNombre: isReqDirect ? '' : (m.requirement?.origenNombre || ''),
      reqAntiguedadMax: m.requirement?.antiguedadMax || m.requirement?.caracteristicasDeseadas?.antiguedadMax || '',
      reqExtInt: m.requirement?.caracteristicasDeseadas?.interiorExterior || (m.requirement?.rawText?.toLowerCase().includes('interior') ? 'Interior' : (m.requirement?.rawText?.toLowerCase().includes('exterior') ? 'Exterior' : '')),
      reqCocina: m.requirement?.caracteristicasDeseadas?.cocina || '',
      reqDepositos: m.requirement?.caracteristicasDeseadas?.depositos ?? '',
      reqCuartoServicio: m.requirement?.caracteristicasDeseadas?.cuartoBanoServicio || '',
      reqBalcon: m.requirement?.caracteristicasDeseadas?.balcon || '',
      reqTerraceArea: m.requirement?.caracteristicasDeseadas?.areaTerraza ?? parseOutdoorAreas(m.requirement?.rawText || '').terraceArea ?? '',
      reqBalconyArea: m.requirement?.caracteristicasDeseadas?.areaBalcon ?? parseOutdoorAreas(m.requirement?.rawText || '').balconyArea ?? '',
      reqPisoNivel: m.requirement?.caracteristicasDeseadas?.piso || '',
    });
  };

  const normalizePhoneInput = (val?: string) => {
    if (!val || val.trim() === '') return undefined;
    const raw = val.trim();
    if (raw.includes('@lid') || raw.includes('@g.us')) return undefined;
    const cleanRaw = raw.split('@')[0];
    const digits = cleanRaw.replace(/\D/g, '');
    if (digits === '573192919978' || digits === '3192919978') return undefined;
    // Rechazar LIDs o identificadores internos de WhatsApp (> 13 dígitos o empieza por 11/1203)
    if (digits.length > 13 || digits.startsWith('11') || digits.startsWith('1203')) return undefined;
    if (digits.length === 10 && digits.startsWith('3')) return `57${digits}`;
    if (digits.length === 12 && digits.startsWith('573')) return digits;
    if (digits.length >= 10 && digits.length <= 12) return digits;
    return undefined;
  };

  const cleanNumberForSave = (val: any): string | undefined => {
    if (val === undefined || val === null) return undefined;
    let s = String(val).trim();
    if (!s || s === 'N/E' || /consultar|n\/e|na|n\/a|sin\s*restricci[oó]n|flexible/i.test(s)) return undefined;
    s = s.replace(/[^0-9.,]/g, '');
    if (!s) return undefined;
    if (s.includes('.') && s.includes(',')) {
      if (s.lastIndexOf('.') > s.lastIndexOf(',')) {
        s = s.replace(/,/g, '');
      } else {
        s = s.replace(/\./g, '').replace(',', '.');
      }
    } else if (s.includes(',')) {
      if (/,\d{3}(?:,|$)/.test(s)) s = s.replace(/,/g, '');
      else s = s.replace(',', '.');
    } else if (s.includes('.')) {
      const dotCount = (s.match(/\./g) || []).length;
      if (dotCount > 1) {
        s = s.replace(/\./g, '');
      } else if (/\.\d{3}$/.test(s)) {
        s = s.replace('.', '');
      }
    }
    const n = Number(s);
    return !isNaN(n) && n >= 0 ? s : undefined;
  };

  const cleanIntForSave = (val: any): number | undefined => {
    if (val === undefined || val === null) return undefined;
    const s = String(val).trim();
    if (!s || s === 'N/E' || /consultar|n\/e|na|n\/a|sin\s*restricci[oó]n|flexible/i.test(s)) return undefined;
    const n = parseInt(s.replace(/[^0-9]/g, ''), 10);
    return isNaN(n) ? undefined : n;
  };

  const handleOnlySave = async (m: any) => {
    setIsSavingOnly(true);
    try {
      const promises: Promise<any>[] = [];

      if (m.property?.id && (Object.keys(editForm).some(k => k.startsWith('prop')) || editForm.propPhone || editForm.propSenderName || editForm.propOrigenNombre)) {
        const cleanPropPhone = normalizePhoneInput(editForm.propPhone);
        const propAmenitiesToSave: Record<string, any> = { ...(m.property?.amenities || {}) };
        if (editForm.propExtInt !== undefined && editForm.propExtInt !== '') {
          propAmenitiesToSave.interiorExterior = editForm.propExtInt;
        }
        if (editForm.propCocina !== undefined && editForm.propCocina !== '') {
          propAmenitiesToSave.cocina = editForm.propCocina;
        }
        if (editForm.propDepositos !== undefined && editForm.propDepositos !== '') {
          propAmenitiesToSave.depositos = cleanIntForSave(editForm.propDepositos);
        }
        if (editForm.propCuartoServicio !== undefined && editForm.propCuartoServicio !== '') {
          propAmenitiesToSave.cuartoBanoServicio = editForm.propCuartoServicio;
        }
        if (editForm.propBalcon !== undefined && editForm.propBalcon !== '') {
          propAmenitiesToSave.balcon = editForm.propBalcon;
        }
        if (editForm.propTerraceArea !== undefined && editForm.propTerraceArea !== '') {
          propAmenitiesToSave.areaTerraza = cleanNumberForSave(editForm.propTerraceArea);
        }
        if (editForm.propBalconyArea !== undefined && editForm.propBalconyArea !== '') {
          propAmenitiesToSave.areaBalcon = cleanNumberForSave(editForm.propBalconyArea);
        }
        const parsedYear = cleanIntForSave(editForm.propYearBuilt);
        const parsedAge = cleanIntForSave(editForm.propAntiguedadAnos);
        if (parsedYear || parsedAge !== undefined) {
          const yr = parsedYear || (parsedAge !== undefined ? 2026 - parsedAge : '');
          const ag = parsedAge !== undefined ? parsedAge : (parsedYear ? 2026 - parsedYear : '');
          propAmenitiesToSave.antiguedad = `${yr} (${ag} años)`;
        }
        Object.keys(editForm).forEach(k => {
          if (k.startsWith('prop_custom_')) {
            const attrKey = k.replace('prop_custom_', '');
            propAmenitiesToSave[attrKey] = editForm[k];
          }
        });

        promises.push(
          updatePropMut.mutateAsync({
            propertyId: m.property.id,
            price: cleanNumberForSave(editForm.propPrice),
            rentPrice: cleanNumberForSave(editForm.propRentPrice),
            adminFee: cleanNumberForSave(editForm.propAdminFee),
            areaTotal: cleanNumberForSave(editForm.propArea),
            bedrooms: cleanIntForSave(editForm.propBedrooms),
            bathrooms: cleanIntForSave(editForm.propBathrooms),
            garages: cleanIntForSave(editForm.propGarages),
            stratum: cleanIntForSave(editForm.propStratum),
            zone: editForm.propZone && !/n\/e/i.test(editForm.propZone) ? String(editForm.propZone) : undefined,
            addressNeighborhood: editForm.propZone && !/n\/e/i.test(editForm.propZone) ? String(editForm.propZone) : undefined,
            addressLocality: editForm.propLocality && !/n\/e/i.test(editForm.propLocality) ? String(editForm.propLocality) : undefined,
            city: editForm.propCity && !/n\/e/i.test(editForm.propCity) ? String(editForm.propCity) : undefined,
            propertyType: editForm.propPropertyType ? String(editForm.propPropertyType) : undefined,
            transactionType: editForm.propTransactionType ? String(editForm.propTransactionType) : undefined,
            idUsuarioWhatsapp: cleanPropPhone,
            nombreUsuarioWhatsapp: editForm.propSenderName !== undefined && editForm.propSenderName.trim() !== '' ? String(editForm.propSenderName).trim() : undefined,
            origenNombre: editForm.propOrigenNombre !== undefined && editForm.propOrigenNombre.trim() !== '' ? String(editForm.propOrigenNombre).trim() : undefined,
            yearBuilt: parsedYear,
            antiguedadAnos: parsedAge,
            interiorExterior: editForm.propExtInt || undefined,
            garageType: editForm.propGarageType || undefined,
            floorDetail: editForm.propPisoNivel !== undefined && editForm.propPisoNivel !== '' ? String(editForm.propPisoNivel).trim() : undefined,
            amenities: propAmenitiesToSave,
          })
        );

        if (cleanPropPhone || (editForm.propSenderName && !isGenericBrokerName(editForm.propSenderName))) {
          promises.push(
            saveAdvisorMut.mutateAsync({
              phone: cleanPropPhone || m.property.idUsuarioWhatsapp,
              name: editForm.propSenderName ? String(editForm.propSenderName).trim() : m.property.nombreUsuarioWhatsapp,
              oldPhoneOrLid: m.property.idUsuarioWhatsapp,
              sourceGroup: editForm.propOrigenNombre ? String(editForm.propOrigenNombre).trim() : m.property.origenNombre,
            }).catch(e => console.warn("[handleOnlySave] Error auto-saving prop advisor:", e))
          );
        }
      }

      if (m.requirement?.id && (Object.keys(editForm).some(k => k.startsWith('req')) || editForm.reqPhone || editForm.reqSenderName || editForm.reqOrigenNombre)) {
        const cleanReqPhone = normalizePhoneInput(editForm.reqPhone);
        const reqCaractToSave: Record<string, any> = { ...(m.requirement?.caracteristicasDeseadas || {}) };
        if (editForm.reqExtInt !== undefined && editForm.reqExtInt !== '') {
          reqCaractToSave.interiorExterior = editForm.reqExtInt;
        }
        if (editForm.reqAntiguedadMax !== undefined && editForm.reqAntiguedadMax !== '') {
          reqCaractToSave.antiguedadMax = cleanIntForSave(editForm.reqAntiguedadMax);
        }
        if (editForm.reqCocina !== undefined && editForm.reqCocina !== '') {
          reqCaractToSave.cocina = editForm.reqCocina;
        }
        if (editForm.reqDepositos !== undefined && editForm.reqDepositos !== '') {
          reqCaractToSave.depositos = cleanIntForSave(editForm.reqDepositos);
        }
        if (editForm.reqCuartoServicio !== undefined && editForm.reqCuartoServicio !== '') {
          reqCaractToSave.cuartoBanoServicio = editForm.reqCuartoServicio;
        }
        if (editForm.reqBalcon !== undefined && editForm.reqBalcon !== '') {
          reqCaractToSave.balcon = editForm.reqBalcon;
        }
        if (editForm.reqTerraceArea !== undefined && editForm.reqTerraceArea !== '') {
          reqCaractToSave.areaTerraza = cleanNumberForSave(editForm.reqTerraceArea);
        }
        if (editForm.reqBalconyArea !== undefined && editForm.reqBalconyArea !== '') {
          reqCaractToSave.areaBalcon = cleanNumberForSave(editForm.reqBalconyArea);
        }
        if (editForm.reqPisoNivel !== undefined && editForm.reqPisoNivel !== '') {
          reqCaractToSave.piso = editForm.reqPisoNivel;
        }
        Object.keys(editForm).forEach(k => {
          if (k.startsWith('req_custom_')) {
            const attrKey = k.replace('req_custom_', '');
            reqCaractToSave[attrKey] = editForm[k];
          }
        });

        promises.push(
          updateReqMut.mutateAsync({
            requirementId: m.requirement.id,
            presupuestoMax: cleanNumberForSave(editForm.reqBudget),
            adminFeeMax: cleanNumberForSave(editForm.reqAdminMax),
            areaMin: cleanNumberForSave(editForm.reqArea),
            habitacionesMin: cleanIntForSave(editForm.reqBedrooms),
            banosMin: cleanIntForSave(editForm.reqBathrooms),
            parqueaderosMin: cleanIntForSave(editForm.reqGarages),
            estratoDeseado: cleanIntForSave(editForm.reqStratum),
            zonaDeseada: editForm.reqZone && !/n\/e/i.test(editForm.reqZone) ? String(editForm.reqZone) : undefined,
            addressNeighborhood: editForm.reqZone && !/n\/e/i.test(editForm.reqZone) ? String(editForm.reqZone) : undefined,
            ciudadDeseada: editForm.reqCity && !/n\/e/i.test(editForm.reqCity) ? String(editForm.reqCity) : undefined,
            tipoInmuebleDeseado: editForm.reqPropertyType ? String(editForm.reqPropertyType) : undefined,
            tipoNegocioDeseado: editForm.reqTransactionType ? String(editForm.reqTransactionType) : undefined,
            idUsuarioWhatsapp: cleanReqPhone,
            nombreUsuarioWhatsapp: editForm.reqSenderName !== undefined && editForm.reqSenderName.trim() !== '' ? String(editForm.reqSenderName).trim() : undefined,
            origenNombre: editForm.reqOrigenNombre !== undefined && editForm.reqOrigenNombre.trim() !== '' ? String(editForm.reqOrigenNombre).trim() : undefined,
            antiguedadMax: cleanIntForSave(editForm.reqAntiguedadMax),
            interiorExterior: editForm.reqExtInt || undefined,
            caracteristicasDeseadas: reqCaractToSave,
          })
        );

        if (cleanReqPhone || (editForm.reqSenderName && !isGenericBrokerName(editForm.reqSenderName))) {
          promises.push(
            saveAdvisorMut.mutateAsync({
              phone: cleanReqPhone || m.requirement.idUsuarioWhatsapp,
              name: editForm.reqSenderName ? String(editForm.reqSenderName).trim() : m.requirement.nombreUsuarioWhatsapp,
              oldPhoneOrLid: m.requirement.idUsuarioWhatsapp,
              sourceGroup: editForm.reqOrigenNombre ? String(editForm.reqOrigenNombre).trim() : m.requirement.origenNombre,
            }).catch(e => console.warn("[handleOnlySave] Error auto-saving req advisor:", e))
          );
        }
      }

      // Guardado en paralelo ultrarrápido con carrera protectora contra timeouts de red (máx 15s)
      if (promises.length > 0) {
        const savePromise = Promise.all(promises);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Tiempo de espera de red agotado al guardar")), 15000)
        );
        await Promise.race([savePromise, timeoutPromise]);
      }

      // Actualización optimista de memoria inmediata (0ms lag)
      if (m.property) {
        const parsedYear = cleanIntForSave(editForm.propYearBuilt);
        const parsedAge = cleanIntForSave(editForm.propAntiguedadAnos);
        const propAmenitiesToSave: Record<string, any> = { ...(m.property?.amenities || {}) };
        if (editForm.propExtInt) propAmenitiesToSave.interiorExterior = editForm.propExtInt;
        if (editForm.propCocina) propAmenitiesToSave.cocina = editForm.propCocina;
        if (editForm.propDepositos) propAmenitiesToSave.depositos = cleanIntForSave(editForm.propDepositos);
        if (editForm.propCuartoServicio) propAmenitiesToSave.cuartoBanoServicio = editForm.propCuartoServicio;
        if (editForm.propBalcon) propAmenitiesToSave.balcon = editForm.propBalcon;
        if (editForm.propTerraceArea) propAmenitiesToSave.areaTerraza = cleanNumberForSave(editForm.propTerraceArea);
        if (editForm.propBalconyArea) propAmenitiesToSave.areaBalcon = cleanNumberForSave(editForm.propBalconyArea);
        if (editForm.propPisoNivel) propAmenitiesToSave.piso = editForm.propPisoNivel;
        if (parsedYear || parsedAge !== undefined) {
          const yr = parsedYear || (parsedAge !== undefined ? 2026 - parsedAge : '');
          const ag = parsedAge !== undefined ? parsedAge : (parsedYear ? 2026 - parsedYear : '');
          propAmenitiesToSave.antiguedad = `${yr} (${ag} años)`;
        }

        Object.assign(m.property, {
          price: editForm.propPrice !== undefined && editForm.propPrice !== '' ? editForm.propPrice : m.property.price,
          rentPrice: editForm.propRentPrice !== undefined && editForm.propRentPrice !== '' ? editForm.propRentPrice : m.property.rentPrice,
          adminFee: editForm.propAdminFee !== undefined && editForm.propAdminFee !== '' ? editForm.propAdminFee : m.property.adminFee,
          areaTotal: editForm.propArea !== undefined && editForm.propArea !== '' ? editForm.propArea : m.property.areaTotal,
          bedrooms: editForm.propBedrooms !== undefined && editForm.propBedrooms !== '' ? Number(editForm.propBedrooms) : m.property.bedrooms,
          bathrooms: editForm.propBathrooms !== undefined && editForm.propBathrooms !== '' ? Number(editForm.propBathrooms) : m.property.bathrooms,
          garages: editForm.propGarages !== undefined && editForm.propGarages !== '' ? Number(editForm.propGarages) : m.property.garages,
          stratum: editForm.propStratum !== undefined && editForm.propStratum !== '' ? Number(editForm.propStratum) : m.property.stratum,
          zone: editForm.propZone || m.property.zone,
          city: editForm.propCity || m.property.city,
          idUsuarioWhatsapp: normalizePhoneInput(editForm.propPhone) || m.property.idUsuarioWhatsapp,
          nombreUsuarioWhatsapp: editForm.propSenderName !== undefined && editForm.propSenderName.trim() !== '' ? String(editForm.propSenderName).trim() : m.property.nombreUsuarioWhatsapp,
          origenNombre: editForm.propOrigenNombre ? String(editForm.propOrigenNombre).trim() : m.property.origenNombre,
          yearBuilt: parsedYear !== undefined ? parsedYear : m.property.yearBuilt,
          antiguedadAnos: parsedAge !== undefined ? parsedAge : (parsedYear ? 2026 - parsedYear : m.property.antiguedadAnos),
          interiorExterior: editForm.propExtInt || m.property.interiorExterior,
          garageType: editForm.propGarageType || m.property.garageType,
          floorDetail: editForm.propPisoNivel !== undefined && editForm.propPisoNivel !== '' ? String(editForm.propPisoNivel).trim() : m.property.floorDetail,
          amenities: propAmenitiesToSave,
        });
      }

      if (m.requirement) {
        const reqCaractToSave: Record<string, any> = { ...(m.requirement?.caracteristicasDeseadas || {}) };
        if (editForm.reqExtInt) reqCaractToSave.interiorExterior = editForm.reqExtInt;
        if (editForm.reqAntiguedadMax) reqCaractToSave.antiguedadMax = cleanIntForSave(editForm.reqAntiguedadMax);
        if (editForm.reqCocina) reqCaractToSave.cocina = editForm.reqCocina;
        if (editForm.reqDepositos) reqCaractToSave.depositos = cleanIntForSave(editForm.reqDepositos);
        if (editForm.reqCuartoServicio) reqCaractToSave.cuartoBanoServicio = editForm.reqCuartoServicio;
        if (editForm.reqBalcon) reqCaractToSave.balcon = editForm.reqBalcon;
        if (editForm.reqTerraceArea) reqCaractToSave.areaTerraza = cleanNumberForSave(editForm.reqTerraceArea);
        if (editForm.reqBalconyArea) reqCaractToSave.areaBalcon = cleanNumberForSave(editForm.reqBalconyArea);
        if (editForm.reqPisoNivel) reqCaractToSave.piso = editForm.reqPisoNivel;

        Object.assign(m.requirement, {
          presupuestoMax: editForm.reqBudget !== undefined && editForm.reqBudget !== '' ? editForm.reqBudget : m.requirement.presupuestoMax,
          adminFeeMax: editForm.reqAdminMax !== undefined && editForm.reqAdminMax !== '' ? editForm.reqAdminMax : m.requirement.adminFeeMax,
          areaMin: editForm.reqArea !== undefined && editForm.reqArea !== '' ? editForm.reqArea : m.requirement.areaMin,
          habitacionesMin: editForm.reqBedrooms !== undefined && editForm.reqBedrooms !== '' ? Number(editForm.reqBedrooms) : m.requirement.habitacionesMin,
          banosMin: editForm.reqBathrooms !== undefined && editForm.reqBathrooms !== '' ? Number(editForm.reqBathrooms) : m.requirement.banosMin,
          parqueaderosMin: editForm.reqGarages !== undefined && editForm.reqGarages !== '' ? Number(editForm.reqGarages) : m.requirement.parqueaderosMin,
          estratoDeseado: editForm.reqStratum !== undefined && editForm.reqStratum !== '' ? Number(editForm.reqStratum) : m.requirement.estratoDeseado,
          zonaDeseada: editForm.reqZone || m.requirement.zonaDeseada,
          ciudadDeseada: editForm.reqCity || m.requirement.ciudadDeseada,
          idUsuarioWhatsapp: normalizePhoneInput(editForm.reqPhone) || m.requirement.idUsuarioWhatsapp,
          nombreUsuarioWhatsapp: editForm.reqSenderName !== undefined && editForm.reqSenderName.trim() !== '' ? String(editForm.reqSenderName).trim() : m.requirement.nombreUsuarioWhatsapp,
          origenNombre: editForm.reqOrigenNombre ? String(editForm.reqOrigenNombre).trim() : m.requirement.origenNombre,
          antiguedadMax: cleanIntForSave(editForm.reqAntiguedadMax) ?? m.requirement.antiguedadMax,
          caracteristicasDeseadas: reqCaractToSave,
        });
      }

      scoreRowsCache.clear();
      const freshComputed = scoreRows(m.requirement, m.property);
      m._precomputedRows = freshComputed.rows;
      m._precomputedScore = freshComputed.autoScore;

      setSaveStatusMap(prev => ({ ...prev, [m.id]: 'saved' }));
      setTimeout(() => {
        setSaveStatusMap(prev => {
          const next = { ...prev };
          delete next[m.id];
          return next;
        });
      }, 4000);
      toast.success("✅ Ficha guardada y propagada en cascada a todas sus publicaciones");
      setEditingMatchId(null);
      setEditForm({});
      setLocalUpdateTick(prev => prev + 1);

      // Refrescar en segundo plano sin congelar
      utils.janIA.getAllMatches.invalidate().catch(() => {});
    } catch (err: any) {
      console.error("[handleOnlySave] Error:", err);
      toast.error("Error al guardar: " + (err.message || "Error desconocido"));
    } finally {
      setIsSavingOnly(false);
    }
  };

  const handleRecalculateMatch = async (m: any) => {
    setIsRecalculating(true);
    try {
      const savePromises: Promise<any>[] = [];

      if (m.property?.id && (Object.keys(editForm).some(k => k.startsWith('prop')) || editForm.propPhone || editForm.propSenderName || editForm.propOrigenNombre)) {
        const cleanPropPhone = normalizePhoneInput(editForm.propPhone);
        const propAmenitiesToSave: Record<string, any> = { ...(m.property?.amenities || {}) };
        if (editForm.propExtInt !== undefined && editForm.propExtInt !== '') {
          propAmenitiesToSave.interiorExterior = editForm.propExtInt;
        }
        if (editForm.propCocina !== undefined && editForm.propCocina !== '') {
          propAmenitiesToSave.cocina = editForm.propCocina;
        }
        if (editForm.propDepositos !== undefined && editForm.propDepositos !== '') {
          propAmenitiesToSave.depositos = cleanIntForSave(editForm.propDepositos);
        }
        if (editForm.propCuartoServicio !== undefined && editForm.propCuartoServicio !== '') {
          propAmenitiesToSave.cuartoBanoServicio = editForm.propCuartoServicio;
        }
        if (editForm.propBalcon !== undefined && editForm.propBalcon !== '') {
          propAmenitiesToSave.balcon = editForm.propBalcon;
        }
        if (editForm.propTerraceArea !== undefined && editForm.propTerraceArea !== '') {
          propAmenitiesToSave.areaTerraza = cleanNumberForSave(editForm.propTerraceArea);
        }
        if (editForm.propBalconyArea !== undefined && editForm.propBalconyArea !== '') {
          propAmenitiesToSave.areaBalcon = cleanNumberForSave(editForm.propBalconyArea);
        }
        const parsedYear = cleanIntForSave(editForm.propYearBuilt);
        const parsedAge = cleanIntForSave(editForm.propAntiguedadAnos);
        if (parsedYear || parsedAge !== undefined) {
          const yr = parsedYear || (parsedAge !== undefined ? 2026 - parsedAge : '');
          const ag = parsedAge !== undefined ? parsedAge : (parsedYear ? 2026 - parsedYear : '');
          propAmenitiesToSave.antiguedad = `${yr} (${ag} años)`;
        }
        Object.keys(editForm).forEach(k => {
          if (k.startsWith('prop_custom_')) {
            const attrKey = k.replace('prop_custom_', '');
            propAmenitiesToSave[attrKey] = editForm[k];
          }
        });

        savePromises.push(
          updatePropMut.mutateAsync({
            propertyId: m.property.id,
            price: cleanNumberForSave(editForm.propPrice),
            rentPrice: cleanNumberForSave(editForm.propRentPrice),
            adminFee: cleanNumberForSave(editForm.propAdminFee),
            areaTotal: cleanNumberForSave(editForm.propArea),
            bedrooms: cleanIntForSave(editForm.propBedrooms),
            bathrooms: cleanIntForSave(editForm.propBathrooms),
            garages: cleanIntForSave(editForm.propGarages),
            stratum: cleanIntForSave(editForm.propStratum),
            zone: editForm.propZone && !/n\/e/i.test(editForm.propZone) ? String(editForm.propZone) : undefined,
            addressNeighborhood: editForm.propZone && !/n\/e/i.test(editForm.propZone) ? String(editForm.propZone) : undefined,
            addressLocality: editForm.propLocality && !/n\/e/i.test(editForm.propLocality) ? String(editForm.propLocality) : undefined,
            city: editForm.propCity && !/n\/e/i.test(editForm.propCity) ? String(editForm.propCity) : undefined,
            propertyType: editForm.propPropertyType ? String(editForm.propPropertyType) : undefined,
            transactionType: editForm.propTransactionType ? String(editForm.propTransactionType) : undefined,
            idUsuarioWhatsapp: cleanPropPhone,
            nombreUsuarioWhatsapp: editForm.propSenderName !== undefined && editForm.propSenderName.trim() !== '' ? String(editForm.propSenderName).trim() : undefined,
            origenNombre: editForm.propOrigenNombre !== undefined && editForm.propOrigenNombre.trim() !== '' ? String(editForm.propOrigenNombre).trim() : undefined,
            yearBuilt: parsedYear,
            antiguedadAnos: parsedAge,
            interiorExterior: editForm.propExtInt || undefined,
            garageType: editForm.propGarageType || undefined,
            floorDetail: editForm.propPisoNivel !== undefined && editForm.propPisoNivel !== '' ? String(editForm.propPisoNivel).trim() : undefined,
            amenities: propAmenitiesToSave,
          })
        );

        if (cleanPropPhone || (editForm.propSenderName && !isGenericBrokerName(editForm.propSenderName))) {
          savePromises.push(
            saveAdvisorMut.mutateAsync({
              phone: cleanPropPhone || m.property.idUsuarioWhatsapp,
              name: editForm.propSenderName ? String(editForm.propSenderName).trim() : m.property.nombreUsuarioWhatsapp,
              oldPhoneOrLid: m.property.idUsuarioWhatsapp,
              sourceGroup: editForm.propOrigenNombre ? String(editForm.propOrigenNombre).trim() : m.property.origenNombre,
            }).catch(e => console.warn("[handleRecalculateMatch] Error auto-saving prop advisor:", e))
          );
        }
      }

      if (m.requirement?.id && (Object.keys(editForm).some(k => k.startsWith('req')) || editForm.reqPhone || editForm.reqSenderName || editForm.reqOrigenNombre)) {
        const cleanReqPhone = normalizePhoneInput(editForm.reqPhone);
        const reqCaractToSave: Record<string, any> = { ...(m.requirement?.caracteristicasDeseadas || {}) };
        if (editForm.reqExtInt !== undefined && editForm.reqExtInt !== '') {
          reqCaractToSave.interiorExterior = editForm.reqExtInt;
        }
        if (editForm.reqAntiguedadMax !== undefined && editForm.reqAntiguedadMax !== '') {
          reqCaractToSave.antiguedadMax = cleanIntForSave(editForm.reqAntiguedadMax);
        }
        if (editForm.reqCocina !== undefined && editForm.reqCocina !== '') {
          reqCaractToSave.cocina = editForm.reqCocina;
        }
        if (editForm.reqDepositos !== undefined && editForm.reqDepositos !== '') {
          reqCaractToSave.depositos = cleanIntForSave(editForm.reqDepositos);
        }
        if (editForm.reqCuartoServicio !== undefined && editForm.reqCuartoServicio !== '') {
          reqCaractToSave.cuartoBanoServicio = editForm.reqCuartoServicio;
        }
        if (editForm.reqBalcon !== undefined && editForm.reqBalcon !== '') {
          reqCaractToSave.balcon = editForm.reqBalcon;
        }
        if (editForm.reqTerraceArea !== undefined && editForm.reqTerraceArea !== '') {
          reqCaractToSave.areaTerraza = cleanNumberForSave(editForm.reqTerraceArea);
        }
        if (editForm.reqBalconyArea !== undefined && editForm.reqBalconyArea !== '') {
          reqCaractToSave.areaBalcon = cleanNumberForSave(editForm.reqBalconyArea);
        }
        if (editForm.reqPisoNivel !== undefined && editForm.reqPisoNivel !== '') {
          reqCaractToSave.piso = editForm.reqPisoNivel;
        }
        Object.keys(editForm).forEach(k => {
          if (k.startsWith('req_custom_')) {
            const attrKey = k.replace('req_custom_', '');
            reqCaractToSave[attrKey] = editForm[k];
          }
        });

        savePromises.push(
          updateReqMut.mutateAsync({
            requirementId: m.requirement.id,
            presupuestoMax: cleanNumberForSave(editForm.reqBudget),
            adminFeeMax: cleanNumberForSave(editForm.reqAdminMax),
            areaMin: cleanNumberForSave(editForm.reqArea),
            habitacionesMin: cleanIntForSave(editForm.reqBedrooms),
            banosMin: cleanIntForSave(editForm.reqBathrooms),
            parqueaderosMin: cleanIntForSave(editForm.reqGarages),
            estratoDeseado: cleanIntForSave(editForm.reqStratum),
            zonaDeseada: editForm.reqZone && !/n\/e/i.test(editForm.reqZone) ? String(editForm.reqZone) : undefined,
            addressNeighborhood: editForm.reqZone && !/n\/e/i.test(editForm.reqZone) ? String(editForm.reqZone) : undefined,
            ciudadDeseada: editForm.reqCity && !/n\/e/i.test(editForm.reqCity) ? String(editForm.reqCity) : undefined,
            tipoInmuebleDeseado: editForm.reqPropertyType ? String(editForm.reqPropertyType) : undefined,
            tipoNegocioDeseado: editForm.reqTransactionType ? String(editForm.reqTransactionType) : undefined,
            idUsuarioWhatsapp: cleanReqPhone,
            nombreUsuarioWhatsapp: editForm.reqSenderName !== undefined && editForm.reqSenderName.trim() !== '' ? String(editForm.reqSenderName).trim() : undefined,
            origenNombre: editForm.reqOrigenNombre !== undefined && editForm.reqOrigenNombre.trim() !== '' ? String(editForm.reqOrigenNombre).trim() : undefined,
            antiguedadMax: cleanIntForSave(editForm.reqAntiguedadMax),
            interiorExterior: editForm.reqExtInt || undefined,
            caracteristicasDeseadas: reqCaractToSave,
          })
        );

        if (cleanReqPhone || (editForm.reqSenderName && !isGenericBrokerName(editForm.reqSenderName))) {
          savePromises.push(
            saveAdvisorMut.mutateAsync({
              phone: cleanReqPhone || m.requirement.idUsuarioWhatsapp,
              name: editForm.reqSenderName ? String(editForm.reqSenderName).trim() : m.requirement.nombreUsuarioWhatsapp,
              oldPhoneOrLid: m.requirement.idUsuarioWhatsapp,
              sourceGroup: editForm.reqOrigenNombre ? String(editForm.reqOrigenNombre).trim() : m.requirement.origenNombre,
            }).catch(e => console.warn("[handleRecalculateMatch] Error auto-saving req advisor:", e))
          );
        }
      }

      if (savePromises.length > 0) {
        const savePromise = Promise.all(savePromises);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Tiempo de espera de red agotado")), 15000)
        );
        await Promise.race([savePromise, timeoutPromise]);
      }

      // Actualización optimista inmediata en memoria local
      if (m.property) {
        const parsedYear = cleanIntForSave(editForm.propYearBuilt);
        const parsedAge = cleanIntForSave(editForm.propAntiguedadAnos);
        const propAmenitiesToSave: Record<string, any> = { ...(m.property?.amenities || {}) };
        if (editForm.propExtInt) propAmenitiesToSave.interiorExterior = editForm.propExtInt;
        if (editForm.propCocina) propAmenitiesToSave.cocina = editForm.propCocina;
        if (editForm.propDepositos) propAmenitiesToSave.depositos = cleanIntForSave(editForm.propDepositos);
        if (editForm.propCuartoServicio) propAmenitiesToSave.cuartoBanoServicio = editForm.propCuartoServicio;
        if (editForm.propBalcon) propAmenitiesToSave.balcon = editForm.propBalcon;
        if (editForm.propPisoNivel) propAmenitiesToSave.piso = editForm.propPisoNivel;
        if (parsedYear || parsedAge !== undefined) {
          const yr = parsedYear || (parsedAge !== undefined ? 2026 - parsedAge : '');
          const ag = parsedAge !== undefined ? parsedAge : (parsedYear ? 2026 - parsedYear : '');
          propAmenitiesToSave.antiguedad = `${yr} (${ag} años)`;
        }

        Object.assign(m.property, {
          price: editForm.propPrice !== undefined && editForm.propPrice !== '' ? editForm.propPrice : m.property.price,
          rentPrice: editForm.propRentPrice !== undefined && editForm.propRentPrice !== '' ? editForm.propRentPrice : m.property.rentPrice,
          adminFee: editForm.propAdminFee !== undefined && editForm.propAdminFee !== '' ? editForm.propAdminFee : m.property.adminFee,
          areaTotal: editForm.propArea !== undefined && editForm.propArea !== '' ? editForm.propArea : m.property.areaTotal,
          bedrooms: editForm.propBedrooms !== undefined && editForm.propBedrooms !== '' ? Number(editForm.propBedrooms) : m.property.bedrooms,
          bathrooms: editForm.propBathrooms !== undefined && editForm.propBathrooms !== '' ? Number(editForm.propBathrooms) : m.property.bathrooms,
          garages: editForm.propGarages !== undefined && editForm.propGarages !== '' ? Number(editForm.propGarages) : m.property.garages,
          stratum: editForm.propStratum !== undefined && editForm.propStratum !== '' ? Number(editForm.propStratum) : m.property.stratum,
          zone: editForm.propZone || m.property.zone,
          city: editForm.propCity || m.property.city,
          idUsuarioWhatsapp: normalizePhoneInput(editForm.propPhone) || m.property.idUsuarioWhatsapp,
          nombreUsuarioWhatsapp: editForm.propSenderName !== undefined && editForm.propSenderName.trim() !== '' ? String(editForm.propSenderName).trim() : m.property.nombreUsuarioWhatsapp,
          origenNombre: editForm.propOrigenNombre ? String(editForm.propOrigenNombre).trim() : m.property.origenNombre,
          yearBuilt: parsedYear !== undefined ? parsedYear : m.property.yearBuilt,
          antiguedadAnos: parsedAge !== undefined ? parsedAge : (parsedYear ? 2026 - parsedYear : m.property.antiguedadAnos),
          interiorExterior: editForm.propExtInt || m.property.interiorExterior,
          garageType: editForm.propGarageType || m.property.garageType,
          floorDetail: editForm.propPisoNivel !== undefined && editForm.propPisoNivel !== '' ? String(editForm.propPisoNivel).trim() : m.property.floorDetail,
          amenities: propAmenitiesToSave,
        });
      }

      if (m.requirement) {
        const reqCaractToSave: Record<string, any> = { ...(m.requirement?.caracteristicasDeseadas || {}) };
        if (editForm.reqExtInt) reqCaractToSave.interiorExterior = editForm.reqExtInt;
        if (editForm.reqAntiguedadMax) reqCaractToSave.antiguedadMax = cleanIntForSave(editForm.reqAntiguedadMax);
        if (editForm.reqCocina) reqCaractToSave.cocina = editForm.reqCocina;
        if (editForm.reqDepositos) reqCaractToSave.depositos = cleanIntForSave(editForm.reqDepositos);
        if (editForm.reqCuartoServicio) reqCaractToSave.cuartoBanoServicio = editForm.reqCuartoServicio;
        if (editForm.reqBalcon) reqCaractToSave.balcon = editForm.reqBalcon;
        if (editForm.reqPisoNivel) reqCaractToSave.piso = editForm.reqPisoNivel;

        Object.assign(m.requirement, {
          presupuestoMax: editForm.reqBudget !== undefined && editForm.reqBudget !== '' ? editForm.reqBudget : m.requirement.presupuestoMax,
          adminFeeMax: editForm.reqAdminMax !== undefined && editForm.reqAdminMax !== '' ? editForm.reqAdminMax : m.requirement.adminFeeMax,
          areaMin: editForm.reqArea !== undefined && editForm.reqArea !== '' ? editForm.reqArea : m.requirement.areaMin,
          habitacionesMin: editForm.reqBedrooms !== undefined && editForm.reqBedrooms !== '' ? Number(editForm.reqBedrooms) : m.requirement.habitacionesMin,
          banosMin: editForm.reqBathrooms !== undefined && editForm.reqBathrooms !== '' ? Number(editForm.reqBathrooms) : m.requirement.banosMin,
          parqueaderosMin: editForm.reqGarages !== undefined && editForm.reqGarages !== '' ? Number(editForm.reqGarages) : m.requirement.parqueaderosMin,
          estratoDeseado: editForm.reqStratum !== undefined && editForm.reqStratum !== '' ? Number(editForm.reqStratum) : m.requirement.estratoDeseado,
          zonaDeseada: editForm.reqZone || m.requirement.zonaDeseada,
          ciudadDeseada: editForm.reqCity || m.requirement.ciudadDeseada,
          idUsuarioWhatsapp: normalizePhoneInput(editForm.reqPhone) || m.requirement.idUsuarioWhatsapp,
          nombreUsuarioWhatsapp: editForm.reqSenderName !== undefined && editForm.reqSenderName.trim() !== '' ? String(editForm.reqSenderName).trim() : m.requirement.nombreUsuarioWhatsapp,
          origenNombre: editForm.reqOrigenNombre ? String(editForm.reqOrigenNombre).trim() : m.requirement.origenNombre,
          antiguedadMax: cleanIntForSave(editForm.reqAntiguedadMax) ?? m.requirement.antiguedadMax,
          caracteristicasDeseadas: reqCaractToSave,
        });
      }

      scoreRowsCache.clear();
      const freshComputed = scoreRows(m.requirement, m.property);
      m._precomputedRows = freshComputed.rows;
      m._precomputedScore = freshComputed.autoScore;

      if (m.property?.id || m.requirement?.id) {
        await recalculateMatchMut.mutateAsync({
          propertyId: m.property?.id || undefined,
          requirementId: m.requirement?.id || undefined,
        });
      }

      setSaveStatusMap(prev => ({ ...prev, [m.id]: 'recalculated' }));
      setTimeout(() => {
        setSaveStatusMap(prev => {
          const next = { ...prev };
          delete next[m.id];
          return next;
        });
      }, 4000);
      toast.success("⚡ Recalculado y sincronizado en tiempo real");
      setEditingMatchId(null);
      setEditForm({});
      setLocalUpdateTick(prev => prev + 1);

      utils.janIA.getAllMatches.invalidate().catch(() => {});
    } catch (err: any) {
      console.error("[handleRecalculateMatch] Error:", err);
      toast.error("Error al recalcular: " + (err.message || "Error desconocido"));
    } finally {
      setIsRecalculating(false);
    }
  };

  // Fetch matches directly from server API (actualización inteligente sin sobrecargar Supabase Egress)
  const { data: matches = [], isLoading, isError, refetch } = trpc.janIA.getAllMatches.useQuery(undefined, {
    refetchInterval: false, // Evita descargar megabytes en bucle cada 60s; se actualiza con [Refrescar] o al editar
    staleTime: 180000,      // Mantiene los datos frescos durante 3 minutos
    refetchOnWindowFocus: false,
    retry: 2,
  });


  const getStatusColor = (status: string) => {
    switch (status) {
      case 'suggested': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'interested': return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'converted': return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
      default: return 'bg-zinc-800 text-zinc-400 border border-zinc-700';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      suggested: '🟢 Match Calificado',
      interested: '📋 Pendiente Enriquecer Ficha',
      converted: 'Cerrado/Negocio',
    };
    return labels[status] || status;
  };

  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25); // 25 por defecto para ver todos los matches sin truncar
  const [expandedMatchIds, setExpandedMatchIds] = useState<Set<number>>(new Set());

  const toggleExpandMatch = (matchId: number) => {
    setExpandedMatchIds((prev) => {
      const next = new Set(prev);
      if (next.has(matchId)) {
        next.delete(matchId);
      } else {
        next.add(matchId);
      }
      return next;
    });
  };

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, minScore, transactionFilter, ageFilter]);

  // 1. Indexación ultra-rápida sin bloqueo de hilo principal (<1ms)
  const processedMatches = useMemo(() => {
    const seenMatchIds = new Set<number>();
    const seenPairs = new Set<string>();
    const results: any[] = [];

    for (const match of (matches as any[])) {
      if (!match || !match.id || !match.property || !match.requirement) continue;
      if (dismissedMatchIds.has(match.id) || feedbackStatusMap[match.id] === 'rechazado' || match.status === 'rejected' || match.status === 'rechazado') continue;

      const property = match.property;
      const requirement = match.requirement;
      // REGLA DOCTRINAL v29.0: Descartar inmediatamente auto-matches (la misma publicación guardada como oferta y demanda)
      const rCleanChars = (requirement.rawText || requirement.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      const pCleanChars = (property.rawText || property.description || property.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      const rPhotoLink = (requirement.enlace_origen || requirement.externalUrl || "").trim().toLowerCase();
      const pPhotoLink = (property.enlace_origen || property.externalUrl || "").trim().toLowerCase();
      const isSharedPhotoLink = rPhotoLink.length > 15 && pPhotoLink.length > 15 && rPhotoLink === pPhotoLink;
      const isExactClone = rCleanChars.length > 30 && pCleanChars.length > 30 && (rCleanChars === pCleanChars || rCleanChars.includes(pCleanChars) || pCleanChars.includes(rCleanChars));

      if (isExactClone || isSharedPhotoLink) {
        continue;
      }

      // Aislamiento de Especímenes de Benchmark / Pruebas para Entrenamiento JanIA
      if (
        property.estadoComercial === 'BENCHMARK' || 
        (property as any).estado_comercial === 'BENCHMARK' ||
        property.name?.includes('(Test 100% Exacto)') || 
        requirement.name?.includes('(Test 100% Exacto)') ||
        match.matchReason?.includes('Benchmark Doctrinal')
      ) {
        continue;
      }

      // Cálculo de afinidad comercial y guillotina técnica
      const computed = scoreRows(requirement, property);
      const exactScore = computed.autoScore;

      // REGLA DOCTRINAL v28.9: Si la guillotina técnica (missing en barrio, tipo, negocio, ciudad o núcleo físico)
      // condena el match a 0%, el dbScore de Supabase NUNCA puede rescatarlo. La guillotina es absoluta.
      const dbScore = parseFloat(String(match.matchScore || "0"));
      const effectiveScore = exactScore > 0 ? exactScore : 0; // Si autoScore=0 (guillotina activa) → 0%. Punto.

      // Del 79% para abajo NO se mostrarán en nuestra página de coincidencias (Regla Doctrinal v26.8)
      if (effectiveScore < 80) {
        continue;
      }

      if (seenMatchIds.has(match.id)) continue;
      
      const pId = property.id;
      const rId = requirement.id;
      if (pId && rId) {
        const pairKey = `${pId}-${rId}`;
        if (seenPairs.has(pairKey)) continue;
        seenPairs.add(pairKey);
      }

      seenMatchIds.add(match.id);

      const matchIdStr = `m${match.id} #${match.id} ${match.id}`;
      const propSearchStr = `${matchIdStr} ${property.id || ""} ${property.name || ""} ${property.rawText || ""} ${property.description || ""} ${property.city || ""} ${property.zone || ""} ${property.addressNeighborhood || ""} ${property.brokerName || ""} ${property.brokerPhone || ""} ${property.nombreUsuarioWhatsapp || ""} ${property.idUsuarioWhatsapp || ""} ${property.origenNombre || ""}`.toLowerCase();
      const reqSearchStr = `${requirement.id || ""} ${requirement.name || ""} ${requirement.rawText || ""} ${requirement.ciudadDeseada || ""} ${requirement.zonaDeseada || ""} ${requirement.addressNeighborhood || ""} ${requirement.brokerName || ""} ${requirement.brokerPhone || ""} ${requirement.nombreUsuarioWhatsapp || ""} ${requirement.idUsuarioWhatsapp || ""} ${requirement.origenNombre || ""}`.toLowerCase();

      results.push({
        ...match,
        _precomputedRows: computed.rows,
        _precomputedScore: effectiveScore,
        _searchIndex: `${propSearchStr} ${reqSearchStr}`,
      });
    }

    return results;
  }, [matches, localUpdateTick]);

  // 2. Filtrado instantáneo (<0.001ms) con useDeferredValue para evitar bloqueos del hilo principal
  const deferredSearchTerm = React.useDeferredValue(searchTerm);

  const filteredMatches = useMemo(() => {
    const searchLower = (deferredSearchTerm || "").toLowerCase().trim();
    return processedMatches.filter((match) => {
      const displayScore = match._precomputedScore;

      // Filtro de Score
      if (minScore === "80_94") {
        if (displayScore < 80 || displayScore >= 95) return false;
      } else {
        const minVal = parseFloat(minScore);
        if (displayScore < minVal) return false;
      }

      // Filtro de Antigüedad / Vigencia: ≤ 10 días por defecto (Regla Doctrinal v31.84/v31.86)
      // Excepción estratégica: Si el usuario está filtrando específicamente por nichos especializados ('permuta', 'opcion_compra'),
      // se muestran los matches existentes de ese nicho para asegurar visibilidad operativa de las oportunidades.
      if (ageFilter === 'active_10' && transactionFilter !== 'permuta' && transactionFilter !== 'opcion_compra') {
        const propDaysAgo = getPropertyEffectiveDaysAgo(match._effectiveProp || match.property);
        const reqDaysAgo = getRequirementEffectiveDaysAgo(match._effectiveReq || match.requirement);
        if (propDaysAgo > 10 || reqDaysAgo > 10) return false;
      }

      // Filtro de Transacción: Compraventa vs Arriendo vs Permutas vs 50/50 (Standby)
      if (transactionFilter !== 'all') {
        const effProp = match._effectiveProp || match.property;
        const effReq = match._effectiveReq || match.requirement;
        const propTx = String(effProp?.transactionType || '').toLowerCase();
        const reqTx = String(effReq?.tipoNegocioDeseado || '').toLowerCase();
        const propRaw = String(effProp?.rawText || '').toLowerCase();
        const reqRaw = String(effReq?.rawText || '').toLowerCase();

        const isStandby = checkIsStandbyDirectoVecy(effProp, effReq);

        if (transactionFilter === 'standby') {
          if (!isStandby) return false;
        } else {
          // REGLA DOCTRINAL: Si el match es Standby 50/50, pertenece EXCLUSIVAMENTE a la sección 50/50.
          // NUNCA debe mostrarse en Compraventa, ni en Arriendo, ni en Permuta.
          if (isStandby) return false;

          const isPureRentProp = propTx === 'arriendo' || propTx === 'arriendo_temporal';
          const isPureRentReq = reqTx === 'arriendo' || reqTx === 'arriendo_temporal';
          const isRentMatch = isPureRentProp || isPureRentReq || 
            /\b(?:en arriendo|arriendo|alquilo|alquiler|canon)\b/i.test(propRaw) ||
            /\b(?:tomo en arriendo|para arrendar|busco arriendo|en renta)\b/i.test(reqRaw);

          if (transactionFilter === 'venta') {
            if (isPureRentProp || isPureRentReq) return false;
            if (isRentMatch && !propTx.includes('venta') && !reqTx.includes('venta')) return false;
          } else if (transactionFilter === 'arriendo') {
            if (!isRentMatch && propTx !== 'venta_o_arriendo' && reqTx !== 'venta_o_arriendo') return false;
          } else if (transactionFilter === 'permuta') {
            if (!checkIsPermutaMatch(effProp, effReq)) return false;
          } else if (transactionFilter === 'opcion_compra') {
            if (!checkIsOpcionCompraMatch(effProp, effReq)) return false;
          }
        }
      }

      // Filtro de Búsqueda
      if (searchLower && !match._searchIndex.includes(searchLower)) {
        return false;
      }

      return true;
    });
  }, [processedMatches, minScore, deferredSearchTerm, transactionFilter, ageFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredMatches.length / pageSize));
  const paginatedMatches = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const slice = filteredMatches.slice(start, start + pageSize);

    // Calcular scoreRows únicamente para los 10 items visibles en pantalla y reactivo a edición y guardado
    return slice.map((m: any) => {
      const isEditingThisCard = editingMatchId === m.id;

      if (isEditingThisCard) {
        const parsedYear = cleanIntForSave(editForm.propYearBuilt);
        const parsedAge = cleanIntForSave(editForm.propAntiguedadAnos);
        const effectivePropAmenities = { ...(m.property?.amenities || {}) };
        if (editForm.propExtInt !== undefined) effectivePropAmenities.interiorExterior = editForm.propExtInt;
        if (editForm.propCocina !== undefined) effectivePropAmenities.cocina = editForm.propCocina;
        if (editForm.propDepositos !== undefined) effectivePropAmenities.depositos = cleanIntForSave(editForm.propDepositos);
        if (editForm.propCuartoServicio !== undefined) effectivePropAmenities.cuartoBanoServicio = editForm.propCuartoServicio;
        if (editForm.propBalcon !== undefined) effectivePropAmenities.balcon = editForm.propBalcon;
        if (editForm.propPisoNivel !== undefined) effectivePropAmenities.piso = editForm.propPisoNivel;
        if (parsedYear || parsedAge !== undefined) {
          const yr = parsedYear || (parsedAge !== undefined ? 2026 - parsedAge : '');
          const ag = parsedAge !== undefined ? parsedAge : (parsedYear ? 2026 - parsedYear : '');
          effectivePropAmenities.antiguedad = `${yr} (${ag} años)`;
        }
        Object.keys(editForm).forEach(k => {
          if (k.startsWith('prop_custom_')) {
            effectivePropAmenities[k.replace('prop_custom_', '')] = editForm[k];
          }
        });

        const effectiveProp = {
          ...m.property,
          price: editForm.propPrice !== undefined && editForm.propPrice !== '' ? editForm.propPrice : m.property?.price,
          rentPrice: editForm.propRentPrice !== undefined && editForm.propRentPrice !== '' ? editForm.propRentPrice : m.property?.rentPrice,
          adminFee: editForm.propAdminFee !== undefined && editForm.propAdminFee !== '' ? editForm.propAdminFee : m.property?.adminFee,
          areaTotal: editForm.propArea !== undefined && editForm.propArea !== '' ? editForm.propArea : m.property?.areaTotal,
          bedrooms: editForm.propBedrooms !== undefined && editForm.propBedrooms !== '' ? editForm.propBedrooms : m.property?.bedrooms,
          bathrooms: editForm.propBathrooms !== undefined && editForm.propBathrooms !== '' ? editForm.propBathrooms : m.property?.bathrooms,
          garages: editForm.propGarages !== undefined && editForm.propGarages !== '' ? editForm.propGarages : m.property?.garages,
          stratum: editForm.propStratum !== undefined && editForm.propStratum !== '' ? editForm.propStratum : m.property?.stratum,
          zone: editForm.propZone !== undefined && editForm.propZone !== '' ? editForm.propZone : m.property?.zone,
          city: editForm.propCity !== undefined && editForm.propCity !== '' ? editForm.propCity : m.property?.city,
          yearBuilt: parsedYear ?? m.property?.yearBuilt,
          antiguedadAnos: parsedAge ?? m.property?.antiguedadAnos,
          interiorExterior: editForm.propExtInt !== undefined ? editForm.propExtInt : m.property?.interiorExterior,
          garageType: editForm.propGarageType !== undefined ? editForm.propGarageType : m.property?.garageType,
          floorDetail: editForm.propPisoNivel !== undefined ? editForm.propPisoNivel : m.property?.floorDetail,
          amenities: effectivePropAmenities,
        };

        const effectiveReqCaract = { ...(m.requirement?.caracteristicasDeseadas || {}) };
        if (editForm.reqExtInt !== undefined) effectiveReqCaract.interiorExterior = editForm.reqExtInt;
        if (editForm.reqAntiguedadMax !== undefined) effectiveReqCaract.antiguedadMax = cleanIntForSave(editForm.reqAntiguedadMax);
        if (editForm.reqCocina !== undefined) effectiveReqCaract.cocina = editForm.reqCocina;
        if (editForm.reqDepositos !== undefined) effectiveReqCaract.depositos = cleanIntForSave(editForm.reqDepositos);
        if (editForm.reqCuartoServicio !== undefined) effectiveReqCaract.cuartoBanoServicio = editForm.reqCuartoServicio;
        if (editForm.reqBalcon !== undefined) effectiveReqCaract.balcon = editForm.reqBalcon;
        if (editForm.reqPisoNivel !== undefined) effectiveReqCaract.piso = editForm.reqPisoNivel;
        Object.keys(editForm).forEach(k => {
          if (k.startsWith('req_custom_')) {
            effectiveReqCaract[k.replace('req_custom_', '')] = editForm[k];
          }
        });

        const effectiveReq = {
          ...m.requirement,
          presupuestoMax: editForm.reqBudget !== undefined && editForm.reqBudget !== '' ? editForm.reqBudget : m.requirement?.presupuestoMax,
          adminFeeMax: editForm.reqAdminMax !== undefined && editForm.reqAdminMax !== '' ? editForm.reqAdminMax : m.requirement?.adminFeeMax,
          areaMin: editForm.reqArea !== undefined && editForm.reqArea !== '' ? editForm.reqArea : m.requirement?.areaMin,
          habitacionesMin: editForm.reqBedrooms !== undefined && editForm.reqBedrooms !== '' ? editForm.reqBedrooms : m.requirement?.habitacionesMin,
          banosMin: editForm.reqBathrooms !== undefined && editForm.reqBathrooms !== '' ? editForm.reqBathrooms : m.requirement?.banosMin,
          parqueaderosMin: editForm.reqGarages !== undefined && editForm.reqGarages !== '' ? editForm.reqGarages : m.requirement?.parqueaderosMin,
          estratoDeseado: editForm.reqStratum !== undefined && editForm.reqStratum !== '' ? editForm.reqStratum : m.requirement?.estratoDeseado,
          zonaDeseada: editForm.reqZone !== undefined && editForm.reqZone !== '' ? editForm.reqZone : m.requirement?.zonaDeseada,
          ciudadDeseada: editForm.reqCity !== undefined && editForm.reqCity !== '' ? editForm.reqCity : m.requirement?.ciudadDeseada,
          antiguedadMax: cleanIntForSave(editForm.reqAntiguedadMax) ?? m.requirement?.antiguedadMax,
          interiorExterior: editForm.reqExtInt !== undefined ? editForm.reqExtInt : m.requirement?.interiorExterior,
          caracteristicasDeseadas: effectiveReqCaract,
        };

        const computed = scoreRows(effectiveReq, effectiveProp, editForm);
        return {
          ...m,
          _effectiveProp: effectiveProp,
          _effectiveReq: effectiveReq,
          _precomputedRows: computed.rows,
          _precomputedScore: computed.autoScore,
        };
      }

      // En modo lectura: evaluar scoreRows directamente sobre los datos vigentes de m.property y m.requirement
      const computed = scoreRows(m.requirement, m.property);
      return {
        ...m,
        _effectiveProp: m.property,
        _effectiveReq: m.requirement,
        _precomputedRows: computed.rows,
        _precomputedScore: computed.autoScore,
      };
    });
  }, [filteredMatches, currentPage, pageSize, editingMatchId, editForm, localUpdateTick]);



  const { data: botStatus, isLoading: isBotStatusLoading, isError: isBotStatusError, refetch: refetchBotStatus } = trpc.janIA.getBotStatus.useQuery(undefined, {
    refetchInterval: 180000, // 3 minutos
    staleTime: 120000,
    refetchOnWindowFocus: false,
    retry: 2,
  });

  const kpiStats = useMemo(() => {
    const rawList = processedMatches || [];
    const list = ageFilter === 'active_10'
      ? rawList.filter(m => 
          getPropertyEffectiveDaysAgo(m._effectiveProp || m.property) <= 10 &&
          getRequirementEffectiveDaysAgo(m._effectiveReq || m.requirement) <= 10
        )
      : rawList;

    const total = list.length;
    const perfect = list.filter((m: any) => m._precomputedScore >= 95).length;
    const approx = list.filter((m: any) => {
      const s = m._precomputedScore;
      return s >= 85 && s < 95;
    }).length;

    const totalProps = (botStatus as any)?.totalProperties ?? (botStatus?.todayProperties ?? 0);
    const totalReqs = (botStatus as any)?.totalRequirements ?? (botStatus?.todayRequirements ?? 0);

    return { total, perfect, approx, totalProps, totalReqs };
  }, [processedMatches, botStatus, ageFilter]);

  const filterCounts = useMemo(() => {
    const rawList = processedMatches || [];
    const list = ageFilter === 'active_10'
      ? rawList.filter(m => 
          getPropertyEffectiveDaysAgo(m._effectiveProp || m.property) <= 10 &&
          getRequirementEffectiveDaysAgo(m._effectiveReq || m.requirement) <= 10
        )
      : rawList;

    const searchLower = (searchTerm || '').toLowerCase().trim();
    const effectiveList = searchLower
      ? list.filter((m: any) => m._searchIndex && m._searchIndex.includes(searchLower))
      : list;

    let countVenta = 0;
    let countArriendo = 0;
    let countPermuta = 0;
    let countOpcionCompra = 0;
    let countStandby = 0;

    for (const m of effectiveList) {
      const effProp = m._effectiveProp || m.property;
      const effReq = m._effectiveReq || m.requirement;
      const propTx = (effProp?.transactionType || "").toLowerCase();
      const reqTx = (effReq?.tipoNegocioDeseado || "").toLowerCase();
      const propRaw = String(effProp?.rawText || '').toLowerCase();
      const reqRaw = String(effReq?.rawText || '').toLowerCase();

      const isStandby = checkIsStandbyDirectoVecy(effProp, effReq);
      if (isStandby) {
        countStandby++;
        continue;
      }

      const isPureRentProp = propTx === 'arriendo' || propTx === 'arriendo_temporal';
      const isPureRentReq = reqTx === 'arriendo' || reqTx === 'arriendo_temporal';
      const isRentMatch = isPureRentProp || isPureRentReq || 
        /\b(?:en arriendo|arriendo|alquilo|alquiler|canon)\b/i.test(propRaw) ||
        /\b(?:tomo en arriendo|para arrendar|busco arriendo|en renta)\b/i.test(reqRaw);

      if (!isPureRentProp && !isPureRentReq && (!isRentMatch || propTx.includes('venta') || reqTx.includes('venta'))) {
        countVenta++;
      }

      if (isRentMatch || propTx === 'venta_o_arriendo' || reqTx === 'venta_o_arriendo') {
        countArriendo++;
      }

      if (checkIsPermutaMatch(effProp, effReq)) {
        countPermuta++;
      }

      if (checkIsOpcionCompraMatch(effProp, effReq)) {
        countOpcionCompra++;
      }
    }

    return {
      all: effectiveList.length,
      venta: countVenta,
      arriendo: countArriendo,
      permuta: countPermuta,
      opcionCompra: countOpcionCompra,
      standby: countStandby
    };
  }, [processedMatches, searchTerm, ageFilter]);

  const exportData = () => {
    const headers = ['ID Coincidencia', 'Porcentaje Match', 'Propiedad', 'Propietario Telefono', 'Requerimiento', 'Interesado Telefono', 'Estado', 'Fecha'];
    const rows = (filteredMatches as any[]).map((m: any) => [
      `M${m.id}`,
      `${parseFloat(String(m.matchScore)).toFixed(0)}%`,
      m.property?.name,
      m.property?.idUsuarioWhatsapp ? `+${m.property.idUsuarioWhatsapp.split('@')[0]}` : 'N/A',
      m.requirement?.name,
      m.requirement?.idUsuarioWhatsapp ? `+${m.requirement.idUsuarioWhatsapp.split('@')[0]}` : 'N/A',
      m.status,
      new Date(m.createdAt).toLocaleDateString('es-CO')
    ]);

    const csvContent = [headers.join(','), ...rows.map((e: any[]) => e.map((val: any) => `"${val}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `coincidencias_vecy_network_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="pt-4 sm:pt-6">
      {/* Ribbon Maestro Unificado: Marcadores KPI de Alto Nivel y Estación de Acciones */}
      <div className="mb-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Marcador 1: Matches Detectados */}
        <div className="bg-gradient-to-b from-[#16161b] to-black/80 border border-[#bf953f]/30 p-3 rounded-2xl flex items-center gap-3 shadow-md hover:border-[#bf953f]/60 transition-all">
          <div className="w-10 h-10 rounded-xl bg-[#bf953f]/10 border border-[#bf953f]/30 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-[#bf953f]" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold truncate">Matches Detectados</p>
            <p className="text-lg sm:text-xl font-black text-white leading-tight">
              {isLoading ? (
                <span className="animate-pulse text-zinc-500 font-medium text-sm">...</span>
              ) : isError ? (
                <span className="text-amber-400 font-normal text-xs">Error</span>
              ) : (
                Number(kpiStats.total || 0).toLocaleString('es-CO')
              )}
            </p>
          </div>
        </div>

        {/* Marcador 2: Matches Perfectos (≥95%) */}
        <div className="bg-gradient-to-b from-[#0f1f17] to-black/80 border border-emerald-500/30 p-3 rounded-2xl flex items-center gap-3 shadow-md hover:border-emerald-500/60 transition-all">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-emerald-400/80 font-bold truncate">Perfectos (≥95%)</p>
            <p className="text-lg sm:text-xl font-black text-emerald-400 leading-tight">
              {isLoading ? (
                <span className="animate-pulse text-zinc-500 font-medium text-sm">...</span>
              ) : isError ? (
                <span className="text-amber-400 font-normal text-xs">Error</span>
              ) : (
                Number(kpiStats.perfect || 0).toLocaleString('es-CO')
              )}
            </p>
          </div>
        </div>

        {/* Marcador 3: Total Ofertas */}
        <div className="bg-gradient-to-b from-[#1d170a] to-black/80 border border-amber-500/30 p-3 rounded-2xl flex items-center gap-3 shadow-md hover:border-amber-500/60 transition-all">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5 text-[#bf953f]" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-amber-400/80 font-bold truncate">Total Ofertas</p>
            <p className="text-lg sm:text-xl font-black text-[#bf953f] leading-tight">
              {isBotStatusLoading ? (
                <span className="animate-pulse text-zinc-500 font-medium text-sm">...</span>
              ) : isBotStatusError ? (
                <span className="text-amber-400 font-normal text-xs">Error</span>
              ) : (
                Number(kpiStats.totalProps || 0).toLocaleString('es-CO')
              )}
            </p>
          </div>
        </div>

        {/* Marcador 4: Total Demandas */}
        <div className="bg-gradient-to-b from-[#0a171d] to-black/80 border border-cyan-500/30 p-3 rounded-2xl flex items-center gap-3 shadow-md hover:border-cyan-500/60 transition-all">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shrink-0">
            <ClipboardList className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-cyan-400/80 font-bold truncate">Total Demandas</p>
            <p className="text-lg sm:text-xl font-black text-cyan-400 leading-tight">
              {isBotStatusLoading ? (
                <span className="animate-pulse text-zinc-500 font-medium text-sm">...</span>
              ) : isBotStatusError ? (
                <span className="text-amber-400 font-normal text-xs">Error</span>
              ) : (
                Number(kpiStats.totalReqs || 0).toLocaleString('es-CO')
              )}
            </p>
          </div>
        </div>

        {/* Módulo 5: Acciones Rápidas (Refrescar en vivo y Exportar reporte CSV) */}
        <div className="col-span-2 sm:col-span-3 lg:col-span-1 bg-gradient-to-b from-[#141418] to-black/80 border border-white/10 p-2.5 rounded-2xl flex flex-row lg:flex-col justify-center gap-1.5 shadow-md hover:border-[#bf953f]/40 transition-all">
          <Button 
            onClick={() => { refetch(); refetchBotStatus(); }} 
            variant="outline" 
            className="flex-1 lg:flex-initial h-7 border-white/15 bg-white/5 hover:bg-white/10 hover:border-[#bf953f]/40 text-zinc-200 hover:text-white text-xs px-2.5 rounded-xl font-bold transition-all gap-1.5 cursor-pointer justify-center"
            title="Consultar la base de datos para cargar nuevas coincidencias detectadas por JanIA al instante sin recargar la página"
          >
            <RotateCcw className={`w-3.5 h-3.5 text-[#bf953f] ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refrescar</span>
          </Button>

          <Button 
            disabled={filteredMatches.length === 0}
            onClick={exportData} 
            className="flex-1 lg:flex-initial h-7 bg-gradient-to-r from-[#bf953f] via-[#fcf6ba] to-[#bf953f] hover:brightness-110 text-black font-extrabold flex items-center justify-center gap-1.5 text-xs px-2.5 rounded-xl shadow-[0_0_12px_rgba(191,149,63,0.3)] transition-all cursor-pointer"
            title="Descargar reporte en formato Excel (.CSV) con los datos, teléfonos y porcentajes de las coincidencias filtradas"
          >
            <Download className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Exportar CSV</span>
          </Button>
        </div>
      </div>

      {/* ===== BARRA DE BÚSQUEDA Y FILTROS FIJA (STICKY COMMAND TOOLBAR) ===== */}
      <div className="sticky top-0 z-30 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-3 bg-[#09090c] border-b border-[#bf953f]/40 shadow-[0_15px_35px_rgba(0,0,0,0.95)] transition-all">
        {/* VISTA COMPUTADORA (>= lg: Una sola fila continua, amplia, ultra-elegante y proporcionada) */}
        <div className="hidden lg:flex items-center justify-between gap-4 w-full">
          {/* Buscador amplio */}
          <div className="relative flex-1 min-w-[280px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#bf953f] pointer-events-none" />
            <Input
              placeholder="Buscar por barrio, nombre, asesor, teléfono..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-8 bg-black/70 border-white/15 focus:border-[#bf953f] text-white placeholder-zinc-500 text-xs h-10 rounded-xl transition-all shadow-inner"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-1 rounded-md transition-colors cursor-pointer"
                title="Limpiar búsqueda"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Pills de Operación Comercial (Compraventa, Arriendo, Permuta, 50/50) */}
          <div className="flex items-center gap-1.5 bg-black/70 border border-white/15 rounded-xl p-1 text-white h-10 shrink-0 overflow-x-auto scrollbar-none">
            <button
              type="button"
              onClick={() => { setTransactionFilter('venta'); setCurrentPage(1); }}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                transactionFilter === 'venta'
                  ? 'bg-emerald-600 text-white shadow-md font-extrabold'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
              title="Filtrar coincidencias de Compraventa"
            >
              <span>🏷️ Compraventa</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${transactionFilter === 'venta' ? 'bg-black/30 text-white' : 'bg-white/10 text-zinc-400'}`}>
                {filterCounts.venta}
              </span>
            </button>
            <button
              type="button"
              onClick={() => { setTransactionFilter('arriendo'); setCurrentPage(1); }}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                transactionFilter === 'arriendo'
                  ? 'bg-blue-600 text-white shadow-md font-extrabold'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
              title="Filtrar coincidencias de Arriendo"
            >
              <span>🔑 Arriendo</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${transactionFilter === 'arriendo' ? 'bg-black/30 text-white' : 'bg-white/10 text-zinc-400'}`}>
                {filterCounts.arriendo}
              </span>
            </button>
            <button
              type="button"
              onClick={() => { setTransactionFilter('permuta'); setCurrentPage(1); }}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                transactionFilter === 'permuta'
                  ? 'bg-purple-600 text-white shadow-md font-extrabold'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
              title="Filtrar coincidencias de Permuta"
            >
              <span>🔄 Permuta</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${transactionFilter === 'permuta' ? 'bg-black/30 text-white' : 'bg-white/10 text-zinc-400'}`}>
                {filterCounts.permuta}
              </span>
            </button>
            <button
              type="button"
              onClick={() => { setTransactionFilter('standby'); setCurrentPage(1); }}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                transactionFilter === 'standby'
                  ? 'bg-amber-600 text-white shadow-md font-extrabold'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
              title="Filtrar coincidencias Standby Directo Vecy (50/50 No Tercería)"
            >
              <span>🛡️ 50/50</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${transactionFilter === 'standby' ? 'bg-black/30 text-white' : 'bg-white/10 text-zinc-400'}`}>
                {filterCounts.standby}
              </span>
            </button>
          </div>

          {/* Filtro de Calificación */}
          <div className="flex items-center gap-2 bg-black/70 border border-white/15 rounded-xl px-3 text-white h-10 text-xs shrink-0">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#bf953f] shrink-0" />
            <span className="text-zinc-400 text-[11px] shrink-0">Filtro:</span>
            <select
              value={minScore}
              onChange={(e) => setMinScore(e.target.value)}
              className="bg-transparent border-none text-white focus:ring-0 text-xs font-semibold cursor-pointer outline-none"
            >
              <option className="bg-[#0c0c0e]" value="80">⚡ Todos (80% - 100%)</option>
              <option className="bg-[#0c0c0e]" value="80_94">⚡ Aprox. (80% - 94%)</option>
              <option className="bg-[#0c0c0e]" value="95">🎯 Perfectos (95% - 100%)</option>
            </select>
          </div>

          {/* Filtro de Antigüedad / Vigencia (≤ 10 días) */}
          <div className="flex items-center gap-2 bg-black/70 border border-white/15 rounded-xl px-3 text-white h-10 text-xs shrink-0">
            <Clock className="w-3.5 h-3.5 text-[#bf953f] shrink-0" />
            <span className="text-zinc-400 text-[11px] shrink-0">Vigencia:</span>
            <select
              value={ageFilter}
              onChange={(e) => { setAgeFilter(e.target.value as 'active_10' | 'all'); setCurrentPage(1); }}
              className="bg-transparent border-none text-white focus:ring-0 text-xs font-semibold cursor-pointer outline-none"
            >
              <option className="bg-[#0c0c0e]" value="active_10">⚡ Vigentes (≤ 10 días)</option>
              <option className="bg-[#0c0c0e]" value="all">🌐 Todo el Histórico</option>
            </select>
          </div>

          {/* Ver Por Página */}
          <div className="flex items-center gap-2 bg-black/70 border border-white/15 rounded-xl px-3 text-white h-10 text-xs shrink-0">
            <span className="text-zinc-400 text-[11px] shrink-0">Ver:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-transparent border-none text-white focus:ring-0 text-xs font-semibold cursor-pointer outline-none"
            >
              <option className="bg-[#0c0c0e]" value="10">10 por pág.</option>
              <option className="bg-[#0c0c0e]" value="25">25 por pág.</option>
              <option className="bg-[#0c0c0e]" value="50">50 por pág.</option>
              <option className="bg-[#0c0c0e]" value="100">100 por pág.</option>
            </select>
          </div>
        </div>

        {/* VISTA MÓVIL Y TABLET (< lg: Adaptada limpiamente en 2 niveles sin desbordes) */}
        <div className="flex lg:hidden flex-col gap-2.5">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#bf953f] pointer-events-none" />
              <Input
                placeholder="Buscar por barrio, asesor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-8 bg-black/70 border-white/15 focus:border-[#bf953f] text-white placeholder-zinc-500 text-xs h-10 rounded-xl"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              onClick={() => { refetch(); refetchBotStatus(); }}
              className="h-10 w-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-zinc-300 hover:text-white flex items-center justify-center shrink-0"
              title="Refrescar"
            >
              <RotateCcw className={`w-3.5 h-3.5 text-[#bf953f] ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            <button
              disabled={filteredMatches.length === 0}
              onClick={exportData}
              className="h-10 px-2.5 rounded-xl bg-[#bf953f] hover:bg-[#a67d32] text-black font-extrabold flex items-center justify-center gap-1 text-xs shrink-0"
              title="Exportar CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="text-[10px]">CSV</span>
            </button>
          </div>

          <div className="flex items-center justify-between gap-2 overflow-x-auto scrollbar-none pb-0.5">
            <div className="flex items-center gap-1 bg-black/70 border border-white/15 rounded-xl p-1 text-white h-9 shrink-0 overflow-x-auto scrollbar-none">
              <button
                type="button"
                onClick={() => { setTransactionFilter('venta'); setCurrentPage(1); }}
                className={`px-2 py-1 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1 whitespace-nowrap ${
                  transactionFilter === 'venta'
                    ? 'bg-emerald-600 text-white shadow-md font-extrabold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <span>🏷️ Compraventa</span>
                <span className="text-[9px] px-1 rounded-full bg-black/30">{filterCounts.venta}</span>
              </button>
              <button
                type="button"
                onClick={() => { setTransactionFilter('arriendo'); setCurrentPage(1); }}
                className={`px-2 py-1 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1 whitespace-nowrap ${
                  transactionFilter === 'arriendo'
                    ? 'bg-blue-600 text-white shadow-md font-extrabold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <span>🔑 Arriendo</span>
                <span className="text-[9px] px-1 rounded-full bg-black/30">{filterCounts.arriendo}</span>
              </button>
              <button
                type="button"
                onClick={() => { setTransactionFilter('permuta'); setCurrentPage(1); }}
                className={`px-2 py-1 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1 whitespace-nowrap ${
                  transactionFilter === 'permuta'
                    ? 'bg-purple-600 text-white shadow-md font-extrabold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <span>🔄 Permuta</span>
                <span className="text-[9px] px-1 rounded-full bg-black/30">{filterCounts.permuta}</span>
              </button>
              <button
                type="button"
                onClick={() => { setTransactionFilter('standby'); setCurrentPage(1); }}
                className={`px-2 py-1 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1 whitespace-nowrap ${
                  transactionFilter === 'standby'
                    ? 'bg-amber-600 text-white shadow-md font-extrabold'
                    : 'text-zinc-400 hover:text-white'
                }`}
                title="Standby Directo Vecy (50/50 No Tercería)"
              >
                <span>🛡️ 50/50</span>
                <span className="text-[9px] px-1 rounded-full bg-black/30">{filterCounts.standby}</span>
              </button>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <div className="flex items-center bg-black/70 border border-white/15 rounded-xl px-2 h-9 text-xs">
                <select
                  value={minScore}
                  onChange={(e) => setMinScore(e.target.value)}
                  className="bg-transparent border-none text-white focus:ring-0 text-[11px] font-semibold cursor-pointer outline-none"
                >
                  <option className="bg-[#0c0c0e]" value="80">⚡ 80%-100%</option>
                  <option className="bg-[#0c0c0e]" value="80_94">⚡ 80%-94%</option>
                  <option className="bg-[#0c0c0e]" value="95">🎯 ≥95%</option>
                </select>
              </div>

              <div className="flex items-center bg-black/70 border border-white/15 rounded-xl px-2 h-9 text-xs">
                <select
                  value={ageFilter}
                  onChange={(e) => { setAgeFilter(e.target.value as 'active_10' | 'all'); setCurrentPage(1); }}
                  className="bg-transparent border-none text-white focus:ring-0 text-[11px] font-semibold cursor-pointer outline-none"
                >
                  <option className="bg-[#0c0c0e]" value="active_10">⚡ ≤10d</option>
                  <option className="bg-[#0c0c0e]" value="all">🌐 Todo</option>
                </select>
              </div>

              <div className="flex items-center bg-black/70 border border-white/15 rounded-xl px-2 h-9 text-xs">
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-transparent border-none text-white focus:ring-0 text-[11px] font-semibold cursor-pointer outline-none"
                >
                  <option className="bg-[#0c0c0e]" value="10">10</option>
                  <option className="bg-[#0c0c0e]" value="25">25</option>
                  <option className="bg-[#0c0c0e]" value="50">50</option>
                  <option className="bg-[#0c0c0e]" value="100">100</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Matches Grid */}
      {isLoading ? (
        <div className="mt-6 py-20 flex flex-col items-center justify-center gap-4">
          <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
          <p className="text-zinc-500 text-sm">Buscando reportes de matching...</p>
        </div>
      ) : isError ? (
        <div className="mt-6 p-12 text-center border border-amber-500/20 rounded-2xl bg-amber-500/5">
          <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-amber-200">No se pudieron cargar las coincidencias</h3>
          <p className="text-zinc-400 text-xs mt-1 mb-4">Ocurrió un error temporal de conexión o tiempo de espera con el servidor.</p>
          <Button onClick={() => { refetch(); refetchBotStatus(); }} className="bg-[#bf953f] hover:bg-[#a67d32] text-black text-xs font-bold px-4 py-2 rounded-xl">
            Reintentar Conexión
          </Button>
        </div>
      ) : filteredMatches.length === 0 ? (
        <div className="mt-6 p-20 text-center border border-white/5 rounded-2xl bg-zinc-950/40">
          <Sparkles className="w-12 h-12 text-[#bf953f] mx-auto mb-4 opacity-40 animate-pulse" />
          <h3 className="text-lg font-semibold text-zinc-300">No se encontraron coincidencias</h3>
          <p className="text-zinc-500 text-sm mt-1">Intenta reducir el filtro de match mínimo o realizar una nueva búsqueda.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          <div className="grid grid-cols-1 gap-6">
            <AnimatePresence>
              {(paginatedMatches as any[]).map((m: any, idx: number) => {
                const isEditingThisCard = editingMatchId === m.id;

                const effectiveProp = m._effectiveProp || m.property;
                const effectiveReq = m._effectiveReq || m.requirement;
                const baseRows = m._precomputedRows || [];
                const dynamicAttrs = (customAttributesByMatch[m.id] || []).filter(
                  (attr) => !baseRows.some((r: any) => r.label.toLowerCase() === attr.label.toLowerCase())
                );
                const rows = [
                  ...baseRows,
                  ...dynamicAttrs.map((attr) => {
                    const propVal = editForm[`prop_custom_${attr.label.toLowerCase().replace(/[^a-z0-9]/g, '')}`] !== undefined
                      ? editForm[`prop_custom_${attr.label.toLowerCase().replace(/[^a-z0-9]/g, '')}`]
                      : ((effectiveProp?.amenities as any)?.[attr.key] || 'N/E');
                    const reqVal = editForm[`req_custom_${attr.label.toLowerCase().replace(/[^a-z0-9]/g, '')}`] !== undefined
                      ? editForm[`req_custom_${attr.label.toLowerCase().replace(/[^a-z0-9]/g, '')}`]
                      : ((effectiveReq?.caracteristicasDeseadas as any)?.[attr.key] || 'Flexible / Sin restricción');
                    return {
                      label: attr.label,
                      propVal: propVal || 'N/E',
                      reqVal: reqVal || 'Flexible / Sin restricción',
                      status: 'exact' as MatchStatus,
                      weight: 3,
                      icon: <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    };
                  })
                ];
                const score = m._precomputedScore !== undefined ? m._precomputedScore : parseFloat(m.matchScore?.toString() || "0");
                const date = formatColombiaDate(m.createdAt);

                const exactCount = rows.filter((r: any) => r.status === "exact" || r.status === "ok").length;
                const plusCount = rows.filter((r: any) => r.status === "plus").length;
                const warnCount = rows.filter((r: any) => r.status === "warn").length;
                const failCount = rows.filter((r: any) => r.status === "missing").length;

                const dotColor = score >= 95 
                  ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" 
                  : "bg-[#bf953f] shadow-[0_0_8px_rgba(191,149,63,0.5)]";
                const scoreColor = score >= 95 ? "text-emerald-400" : "text-[#bf953f]";

              return (
                <motion.div 
                  key={m.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3, delay: Math.min(idx * 0.03, 0.3) }}
                  className={`bg-[#0b0b0b] border rounded-3xl overflow-hidden shadow-xl transition-all duration-300 relative group cv-auto-card ${
                    isEditingThisCard ? 'border-emerald-500/50 ring-2 ring-emerald-500/20' : 'border-white/5 hover:border-[#bf953f]/25'
                  }`}
                >
                  <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-gradient-to-b from-[#bf953f] to-[#a67d32] opacity-50 group-hover:opacity-100 transition-opacity" />

                  {/* Top Bar info */}
                  <div className="bg-white/[0.01] px-3.5 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5">
                    <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                      <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${dotColor}`} />
                      <span className={`text-lg sm:text-xl font-extrabold tracking-tight ${scoreColor}`}>{score.toFixed(0)}% Match</span>
                      <span className="text-zinc-500 text-[11px] sm:text-xs">Afinidad por IA</span>
                      {score === 100 ? (
                        <span className="text-[9px] bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 px-2 py-0.5 rounded-full font-extrabold flex items-center gap-1 shadow-[0_0_12px_rgba(52,211,153,0.3)]">
                          🎯 100% MATCH PERFECTO
                        </span>
                      ) : score >= 95 ? (
                        <span className="text-[9px] bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 shadow-[0_0_12px_rgba(6,182,212,0.3)]">
                          🎯 MATCH CASI PERFECTO (95% - 99%)
                        </span>
                      ) : (
                        <span className="text-[9px] bg-[#bf953f]/15 border border-[#bf953f]/40 text-[#bf953f] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                          ⚡ MATCH APROXIMADO (85% - 94%)
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4 flex-wrap w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
                      <button
                        onClick={() => handleStartEdit(m)}
                        className={`text-xs px-3 py-1.5 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95 h-9 min-h-[36px] w-full sm:w-auto ${
                          isEditingThisCard 
                            ? 'bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40' 
                            : 'bg-[#bf953f]/15 hover:bg-[#bf953f]/25 text-[#bf953f] border border-[#bf953f]/30'
                        }`}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        {isEditingThisCard ? 'Cancelar Edición' : '✏️ Editar Fichas (Completar N/E)'}
                      </button>

                      <div className="flex items-center gap-3 text-zinc-500 text-xs font-mono ml-auto sm:ml-0">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{date}</span>
                        </div>
                        <span className="text-[10px] text-zinc-600 font-mono">#M{m.id}</span>
                      </div>
                    </div>
                  </div>

                  {/* Summary badges */}
                  <div className="px-4 sm:px-6 py-2.5 flex items-center gap-2 sm:gap-3 border-b border-white/5 flex-wrap bg-black/20">
                    <span className="text-[10px] uppercase tracking-widest text-zinc-600 font-bold">Cotejo:</span>
                    <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-semibold">
                      <CheckCircle2 className="w-2.5 h-2.5" /> {exactCount} coinciden
                    </span>
                    {plusCount > 0 && (
                      <span className="flex items-center gap-1 text-[10px] text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-0.5 rounded-full font-semibold">
                        <Sparkles className="w-2.5 h-2.5" /> {plusCount} plus ofertados
                      </span>
                    )}
                    {warnCount > 0 && (
                      <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full font-semibold">
                        <AlertTriangle className="w-2.5 h-2.5" /> {warnCount} aproximados
                      </span>
                    )}
                    <span className="ml-auto text-[10px] text-zinc-500">
                      Score VECY: <strong className="text-zinc-300">{score.toFixed(0)}%</strong>
                    </span>
                  </div>

                  {/* Parties Split View */}
                  <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 border-b border-white/5 bg-zinc-950/20">
                    
                    {/* Inmueble (Oferta) */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-[9px] uppercase font-bold tracking-widest text-[#bf953f] bg-[#bf953f]/5 px-2 py-0.5 rounded border border-[#bf953f]/15">
                          🏢 Inmueble / Oferta
                        </span>
                        <div className="flex items-center gap-2 flex-wrap">
                          {(() => {
                            const repCount = Number(m.property?.republicacionesCount || 0);
                            const effectiveDate = (repCount > 0 && m.property?.fechaUltimaPublicacion)
                              ? m.property.fechaUltimaPublicacion
                              : (m.property?.fechaUltimaPublicacion || m.property?.createdAt);

                            const getDaysAgo = (d: any): number => {
                              if (!d) return 0;
                              const dateObj = new Date(d);
                              return Math.max(0, Math.floor((Date.now() - dateObj.getTime()) / (1000 * 60 * 60 * 24)));
                            };

                            const daysAgo = getDaysAgo(effectiveDate);
                            const diasTexto = daysAgo === 0 ? "hoy" : daysAgo === 1 ? "1 día" : `${daysAgo} días`;

                            return (
                              <>
                                {/* Insignia de Republicación y Actualización Doctrinal v31.16 */}
                                {repCount > 0 ? (
                                  <span
                                    className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-extrabold text-amber-300 bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 border border-amber-500/50 px-2.5 py-0.5 rounded-md shadow-[0_0_14px_rgba(245,158,11,0.35)] animate-in fade-in"
                                    title={`Inmueble republicado ${repCount} ${repCount === 1 ? 'vez' : 'veces'}. Fecha de última actualización: ${formatColombiaDate(effectiveDate)}`}
                                  >
                                    <span>🔥 Republicado y Actualizado hace {diasTexto} (100% Activo)</span>
                                  </span>
                                ) : daysAgo > 10 ? (
                                  <span
                                    className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-400/90 bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 rounded-md"
                                    title={`Publicación inicial de hace ${daysAgo} días. Supera 10 días sin republicación. Verificar disponibilidad con el captador.`}
                                  >
                                    <span>⏳ Publicación de hace {daysAgo} días · Confirmar disponibilidad</span>
                                  </span>
                                ) : null}

                                {/* Fecha vigente de publicación (eliminando la fecha anterior desactualizada) */}
                                {effectiveDate && (
                                  <span
                                    className="text-[10px] text-zinc-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-md flex items-center gap-1 font-mono"
                                    title={repCount > 0 ? `Fecha de última actualización comercial (${repCount} republicaciones)` : "Fecha de publicación del inmueble"}
                                  >
                                    📅 {formatColombiaDate(effectiveDate)}
                                  </span>
                                )}
                              </>
                            );
                          })()}
                          {(() => {
                            const isPropDirect = m.property?.origenTipo === 'contacto_directo' || m.property?.origenTipo === 'dm';
                            if (isPropDirect) {
                              return (
                                <span
                                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-md"
                                  title="Inmueble recibido por mensaje directo (chat privado) a JanIA"
                                >
                                  <span>💬 Chat Privado (DM JanIA)</span>
                                </span>
                              );
                            }
                            if (m.property?.origenNombre) {
                              return (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopy(m.property.origenNombre, `grp-prop-${m.id}`, 'group', m.property.origenNombre);
                                  }}
                                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 hover:border-amber-400/40 px-2 py-0.5 rounded-md transition-all truncate max-w-[220px]"
                                  title={`Clic para copiar nombre exacto del grupo: "${m.property.origenNombre}"`}
                                >
                                  <span>📍 {m.property.origenNombre}</span>
                                  <Copy className="w-2.5 h-2.5 opacity-70 hover:opacity-100" />
                                </button>
                              );
                            }
                            return (
                              <span
                                className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-300/80 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md"
                                title="Inmueble histórico pionero de julio 2026. Puedes asignarle el grupo haciendo clic en 'Editar Fichas'."
                              >
                                <span>📍 Registro Histórico Red (Julio 2026)</span>
                              </span>
                            );
                          })()}
                        </div>
                      </div>
                      <h4 className="text-sm sm:text-base font-bold text-white mt-1 break-words">{m.property?.name}</h4>
                      
                      {/* Texto Completo Extraído + Resumen Estructurado Obligatorio */}
                      <div className="text-xs text-zinc-300 bg-white/[0.02] border border-white/5 p-3 rounded-xl leading-relaxed whitespace-pre-wrap break-words space-y-3 select-text cursor-text">
                        {(() => {
                          const rawPText = (m.property?.rawText || m.property?.description || "").replace(/^undefined\s*/i, "").trim();
                          const propUrl = extractPublicLink(m.property);
                          let pText = rawPText;
                          if (propUrl && !pText.includes(propUrl) && !pText.includes(propUrl.replace(/^https?:\/\//i, ''))) {
                            const isPdf = propUrl.toLowerCase().includes('.pdf');
                            const label = isPdf ? "📄 Documento adjunto:" : "Info y galería acá:";
                            pText = pText ? `${pText}\n\n${label}\n${propUrl}` : `${label}\n${propUrl}`;
                          }
                          const isGenericImagePlaceholder = pText.includes("[Publicación de Imagen / Flyer Comercial Inmobiliario sin texto en pie de foto]");
                          const propContact = extractPhoneFromItem(m.property);
                          const isPropDirect = m.property?.origenTipo === 'contacto_directo' || m.property?.origenTipo === 'dm';
                          const propSender = m.property?.nombreUsuarioWhatsapp || (isPropDirect ? m.property?.origenNombre : null) || propContact.name;
                          const propSpecs: string[] = [];
                          if (m.property?.propertyType) propSpecs.push(`• Tipo: ${m.property.propertyType}`);
                          if (m.property?.transactionType) propSpecs.push(`• Negocio: ${m.property.transactionType}`);
                          if (m.property?.zone || m.property?.addressNeighborhood) propSpecs.push(`• Sector: ${m.property.zone || m.property.addressNeighborhood}`);
                          if (m.property?.city || m.property?.addressCity) propSpecs.push(`• Ciudad: ${m.property.city || m.property.addressCity}`);
                          if (m.property?.price && Number(m.property.price) > 0) propSpecs.push(`• Precio: ${formatCOP(m.property.price)}`);
                          if (m.property?.rentPrice && Number(m.property.rentPrice) > 0) propSpecs.push(`• Canon: ${formatCOP(m.property.rentPrice)}`);
                          if (m.property?.areaTotal && Number(m.property.areaTotal) > 0) propSpecs.push(`• Área: ${m.property.areaTotal} m²`);
                          if (m.property?.bedrooms) propSpecs.push(`• Habitaciones: ${m.property.bedrooms}`);
                          if (m.property?.bathrooms) propSpecs.push(`• Baños: ${m.property.bathrooms}`);
                          if (m.property?.garages) propSpecs.push(`• Parqueaderos: ${m.property.garages}`);

                          const fallbackText = m.property?.name ? `${m.property.name}. Ciudad: ${m.property.city || 'Bogotá, D.C.'}. ${m.property.price ? 'Precio: ' + formatCOP(m.property.price) : ''}` : "Publicación sin texto descriptivo registrado";

                          return (
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold not-italic">
                                  {isGenericImagePlaceholder ? "🖼️ Desglose de Flyer / Oferta:" : "💬 Publicación Original:"}
                                </p>
                                {(() => {
                                  const copyKey = `prop-${m.id}`;
                                  const isCopied = copiedId === copyKey;
                                  return (
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleCopy(pText || fallbackText, copyKey, 'full', isPropDirect ? undefined : m.property?.origenNombre, propSender, propContact.cleanNumber);
                                        }}
                                        className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all duration-300 border shadow-sm ${
                                          isCopied
                                            ? "bg-cyan-500/25 text-cyan-300 border-cyan-400/60 shadow-[0_0_15px_rgba(6,182,212,0.45)] scale-105"
                                            : "text-cyan-300 hover:text-cyan-200 bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-500/30 hover:border-cyan-400/50 active:scale-95"
                                        }`}
                                        title={isPropDirect ? "Copiar texto original fiel de la oferta recibida por chat privado" : "Copiar texto original fiel de la oferta para ubicar en el grupo de WhatsApp"}
                                      >
                                        {isCopied ? (
                                          <>
                                            <Check className="w-3.5 h-3.5 text-cyan-300 animate-in zoom-in-50 duration-200" />
                                            <span className="text-cyan-200 font-extrabold">¡Copiado!</span>
                                          </>
                                        ) : (
                                          <>
                                            <Copy className="w-3.5 h-3.5 text-cyan-400" />
                                            <span>📋 Copiar Publicación</span>
                                          </>
                                        )}
                                      </button>
                                    </div>
                                  );
                                })()}
                              </div>
                              {!isGenericImagePlaceholder && (
                                <p className="italic text-zinc-200 select-text cursor-text">{renderTextWithClickableLinks(pText || fallbackText)}</p>
                              )}
                              {isGenericImagePlaceholder && (
                                <div className="space-y-1 text-zinc-200 select-text cursor-text">
                                  <p className="text-amber-300/90 font-medium text-[11px]">Captado desde Imagen / Flyer sin texto en pie de foto:</p>
                                  {propSpecs.length > 0 && (
                                    <div className="bg-black/30 rounded-lg p-2 font-mono text-[11px] space-y-0.5 text-zinc-300 border border-white/5 select-text">
                                      {propSpecs.map((s, idx) => (
                                        <p key={idx}>{s}</p>
                                      ))}
                                    </div>
                                  )}
                                  {propUrl && (
                                    <p className="text-xs text-blue-400 font-semibold pt-1 select-text">
                                      {renderTextWithClickableLinks(propUrl)}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        {/* Visualizador de Flyer / Imagen Publicada en el Anuncio */}
                        {(() => {
                          const propImgs = extractItemImages(m.property);
                          if (propImgs.length === 0) return null;
                          return (
                            <div className="mt-2.5 pt-2.5 border-t border-amber-500/20 space-y-2 not-italic">
                              <p className="text-[10px] text-amber-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
                                🖼️ Imagen / Flyer del Anuncio Original ({propImgs.length}):
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {propImgs.slice(0, 4).map((imgUrl, imgIdx) => (
                                  <div key={imgIdx} className="relative group rounded-xl overflow-hidden border border-amber-500/30 bg-black/50">
                                    <img 
                                      src={imgUrl} 
                                      alt={`Flyer Inmueble ${imgIdx + 1}`} 
                                      className="w-full h-44 object-contain bg-zinc-950 group-hover:scale-105 transition-transform duration-300 cursor-pointer"
                                      onClick={() => window.open(imgUrl, '_blank')}
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                      }}
                                    />
                                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent p-2 flex items-center justify-between gap-1">
                                      <span className="text-[9px] text-amber-200 font-semibold truncate">Flyer #{imgIdx + 1}</span>
                                      <a
                                        href={imgUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        download
                                        className="text-[9px] bg-amber-400 hover:bg-amber-300 text-black font-bold px-2 py-0.5 rounded shadow transition-colors flex items-center gap-1 shrink-0"
                                        title="Ver / Descargar imagen del flyer"
                                      >
                                        <Download className="w-2.5 h-2.5" /> Abrir / Descargar
                                      </a>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                      
                      {(() => {
                        const propContact = extractPhoneFromItem(m.property);
                        const isPropDirect = m.property?.origenTipo === 'contacto_directo' || m.property?.origenTipo === 'dm';
                        const senderName = m.property?.nombreUsuarioWhatsapp || (isPropDirect ? m.property?.origenNombre : null) || propContact.name;
                        const isSenderKnown = senderName && !isGenericBrokerName(senderName);
                        const formattedPhone = propContact.display.includes('(')
                          ? propContact.display.split('(')[1].replace(')', '').trim()
                          : propContact.display;
                        const clean10 = propContact.cleanNumber 
                          ? (propContact.cleanNumber.startsWith("57") && propContact.cleanNumber.length === 12 ? propContact.cleanNumber.substring(2) : propContact.cleanNumber)
                          : null;

                        return (
                          <div className="bg-gradient-to-r from-[#bf953f]/10 via-amber-950/20 to-zinc-950 border border-[#bf953f]/25 rounded-2xl p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm hover:border-[#bf953f]/45 transition-all">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-9 h-9 rounded-full bg-[#bf953f]/20 border border-[#bf953f]/40 flex items-center justify-center text-[#bf953f] flex-shrink-0 shadow-inner">
                                <Phone className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-[9px] text-[#bf953f]/80 uppercase tracking-widest font-extrabold flex items-center gap-1">
                                  <span>Captador / Vendedor</span>
                                </p>
                                {isSenderKnown ? (
                                  <div className="mt-0.5">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleCopy(senderName, `prop-sender-${m.id}`, 'author', isPropDirect ? undefined : m.property?.origenNombre);
                                      }}
                                      className="text-xs sm:text-sm font-extrabold text-amber-200 hover:text-amber-100 flex items-center gap-1.5 group cursor-pointer text-left transition-all"
                                      title="Toca para copiar el nombre del asesor y ubicarlo en WhatsApp"
                                    >
                                      <span className="text-[10px] bg-amber-500/20 border border-amber-500/30 px-1.5 py-0.2 rounded text-amber-300">👤 Asesor</span>
                                      <span className="underline decoration-dotted decoration-amber-400/50 group-hover:decoration-amber-300">{senderName}</span>
                                      <Copy className="w-3 h-3 opacity-60 group-hover:opacity-100 text-amber-300 shrink-0 transition-opacity" />
                                    </button>
                                    {clean10 ? (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleCopy(clean10, `prop-phone-${m.id}`, 'phone', isPropDirect ? undefined : m.property?.origenNombre);
                                        }}
                                        className="text-xs font-bold text-zinc-300 hover:text-white flex items-center gap-1 group cursor-pointer mt-0.5 transition-all text-left"
                                        title="Toca para copiar el celular de 10 dígitos para WhatsApp"
                                      >
                                        <span className="text-[#25D366]">📞</span>
                                        <span className="group-hover:underline">{formattedPhone}</span>
                                        <Copy className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100 text-zinc-400 shrink-0 transition-opacity" />
                                      </button>
                                    ) : (
                                      <p className="text-xs font-semibold text-zinc-400 mt-0.5 flex items-center gap-1">
                                        <span className="text-zinc-500">📞</span>
                                        <span>{formattedPhone}</span>
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  <div className="mt-0.5">
                                    {clean10 ? (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleCopy(clean10, `prop-phone-${m.id}`, 'phone', isPropDirect ? undefined : m.property?.origenNombre);
                                        }}
                                        className="text-xs font-bold text-zinc-200 hover:text-white flex items-center gap-1 group cursor-pointer text-left"
                                        title="Toca para copiar el celular de 10 dígitos para WhatsApp"
                                      >
                                        <span className="text-[#25D366]">📞</span>
                                        <span className="group-hover:underline">{formattedPhone}</span>
                                        <Copy className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100 text-zinc-400 shrink-0 transition-opacity" />
                                      </button>
                                    ) : (
                                      <p className="text-xs font-bold text-zinc-200 select-all">{propContact.display}</p>
                                    )}
                                    <p className="text-[10px] text-zinc-500 italic mt-0.5">👤 Nombre no asignado (Completar al editar)</p>
                                  </div>
                                )}
                              </div>
                            </div>
                            {clean10 ? (
                              <a 
                                href={`https://wa.me/57${clean10}?text=${encodeURIComponent(`Hola! Te contacto por el inmueble "${m.property?.name || 'de la red'}" publicado en ${isPropDirect ? 'VECY Network' : (m.property?.origenNombre || 'VECY Network')}. Tienes un Match del ${score.toFixed(0)}% con un requerimiento activo.`)}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="group bg-[#25D366] hover:bg-[#20ba5a] text-black text-xs font-extrabold px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 shadow-md hover:shadow-[0_0_20px_rgba(37,211,102,0.4)] hover:scale-105 active:scale-95 min-h-[38px] w-full sm:w-auto shrink-0"
                              >
                                <span>Contactar WA</span>
                                <ExternalLink className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                              </a>
                            ) : null}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Requerimiento (Demanda) */}
                    <div className="space-y-3 lg:pl-6 lg:border-l border-white/5 pt-4 lg:pt-0 border-t lg:border-t-0 border-white/5">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-[9px] uppercase font-bold tracking-widest text-cyan-400 bg-cyan-500/5 px-2 py-0.5 rounded border border-cyan-500/15">
                          🔍 Requerimiento / Demanda
                        </span>
                        <div className="flex items-center gap-2 flex-wrap">
                          {m.requirement?.createdAt && (
                            <span className="text-[10px] text-zinc-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-md flex items-center gap-1 font-mono" title="Fecha de publicación del requerimiento">
                              📅 {formatColombiaDate(m.requirement.createdAt)}
                            </span>
                          )}
                          {(() => {
                            const isReqDirect = m.requirement?.origenTipo === 'contacto_directo' || m.requirement?.origenTipo === 'dm';
                            if (isReqDirect) {
                              return (
                                <span
                                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-md"
                                  title="Requerimiento recibido por mensaje directo (chat privado) a JanIA"
                                >
                                  <span>💬 Chat Privado (DM JanIA)</span>
                                </span>
                              );
                            }
                            if (m.requirement?.origenNombre) {
                              return (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopy(m.requirement.origenNombre, `grp-req-${m.id}`, 'group', m.requirement.origenNombre);
                                  }}
                                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-cyan-300 hover:text-cyan-200 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 hover:border-cyan-400/40 px-2 py-0.5 rounded-md transition-all truncate max-w-[220px]"
                                  title={`Clic para copiar nombre exacto del grupo: "${m.requirement.origenNombre}"`}
                                >
                                  <span>📍 {m.requirement.origenNombre}</span>
                                  <Copy className="w-2.5 h-2.5 opacity-70 hover:opacity-100" />
                                </button>
                              );
                            }
                            return (
                              <span
                                className="inline-flex items-center gap-1 text-[10px] font-medium text-cyan-300/80 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-md"
                                title="Requerimiento sin trazabilidad de grupo. Puedes asignárselo haciendo clic en 'Editar Fichas'."
                              >
                                <span>📍 Red Histórica (Sin grupo asignado)</span>
                              </span>
                            );
                          })()}
                        </div>
                      </div>
                      <h4 className="text-sm sm:text-base font-bold text-white mt-1 break-words">
                        {m.requirement?.name || `Requerimiento #${m.requirement?.id}`}
                      </h4>
                      
                      {/* Texto Completo Extraído + Resumen Estructurado del Requerimiento */}
                      <div className="text-xs text-zinc-300 bg-white/[0.02] border border-white/5 p-3 rounded-xl leading-relaxed whitespace-pre-wrap break-words space-y-3 select-text cursor-text">
                        {(() => {
                          const rawRText = (m.requirement?.rawText || m.requirement?.description || "").replace(/^undefined\s*/i, "").trim();
                          const reqUrl = extractPublicLink(m.requirement);
                          let rText = rawRText;
                          if (reqUrl && !rText.includes(reqUrl) && !rText.includes(reqUrl.replace(/^https?:\/\//i, ''))) {
                            const isPdf = reqUrl.toLowerCase().includes('.pdf');
                            const label = isPdf ? "📄 Documento adjunto:" : "Info y enlace acá:";
                            rText = rText ? `${rText}\n\n${label}\n${reqUrl}` : `${label}\n${reqUrl}`;
                          }
                          const isGenericImagePlaceholder = rText.includes("[Publicación de Imagen / Flyer Comercial Inmobiliario sin texto en pie de foto]");
                          const reqContact = extractPhoneFromItem(m.requirement);
                          const isReqDirect = m.requirement?.origenTipo === 'contacto_directo' || m.requirement?.origenTipo === 'dm';
                          const reqSender = m.requirement?.nombreUsuarioWhatsapp || (isReqDirect ? m.requirement?.origenNombre : null) || reqContact.name;
                          const reqSpecs: string[] = [];
                          if (m.requirement?.tipoInmuebleDeseado) reqSpecs.push(`• Tipo: ${m.requirement.tipoInmuebleDeseado}`);
                          if (m.requirement?.tipoNegocioDeseado) reqSpecs.push(`• Negocio: ${m.requirement.tipoNegocioDeseado}`);
                          if (m.requirement?.zonaDeseada || m.requirement?.addressNeighborhood) reqSpecs.push(`• Sector: ${m.requirement.zonaDeseada || m.requirement.addressNeighborhood}`);
                          if (m.requirement?.ciudadDeseada || m.requirement?.addressCity) reqSpecs.push(`• Ciudad: ${m.requirement.ciudadDeseada || m.requirement.addressCity}`);
                          if (m.requirement?.presupuestoMax && Number(m.requirement.presupuestoMax) > 0) reqSpecs.push(`• Presupuesto: ${formatCOP(m.requirement.presupuestoMax)}`);
                          if (m.requirement?.areaMin && Number(m.requirement.areaMin) > 0) reqSpecs.push(`• Área Mín: ${m.requirement.areaMin} m²`);
                          if (m.requirement?.habitacionesMin) reqSpecs.push(`• Habitaciones: ${m.requirement.habitacionesMin}+`);
                          if (m.requirement?.banosMin) reqSpecs.push(`• Baños: ${m.requirement.banosMin}+`);
                          if (m.requirement?.parqueaderosMin) reqSpecs.push(`• Parqueaderos: ${m.requirement.parqueaderosMin}+`);

                          return (
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold not-italic">
                                  {isGenericImagePlaceholder ? "🖼️ Desglose de Flyer / Demanda:" : "💬 Solicita:"}
                                </p>
                                {(() => {
                                  const copyKey = `req-${m.id}`;
                                  const isCopied = copiedId === copyKey;
                                  return (
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleCopy(rText, copyKey, 'full', isReqDirect ? undefined : m.requirement?.origenNombre, reqSender, reqContact.cleanNumber);
                                        }}
                                        className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all duration-300 border shadow-sm ${
                                          isCopied
                                            ? "bg-cyan-500/25 text-cyan-300 border-cyan-400/60 shadow-[0_0_15px_rgba(6,182,212,0.45)] scale-105"
                                            : "text-cyan-300 hover:text-cyan-200 bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-500/30 hover:border-cyan-400/50 active:scale-95"
                                        }`}
                                        title={isReqDirect ? "Copiar texto original fiel del requerimiento recibido por chat privado" : "Copiar texto original fiel del requerimiento para ubicar en el grupo de WhatsApp"}
                                      >
                                        {isCopied ? (
                                          <>
                                            <Check className="w-3.5 h-3.5 text-cyan-300 animate-in zoom-in-50 duration-200" />
                                            <span className="text-cyan-200 font-extrabold">¡Copiado!</span>
                                          </>
                                        ) : (
                                          <>
                                            <Copy className="w-3.5 h-3.5 text-cyan-400" />
                                            <span>📋 Copiar Publicación</span>
                                          </>
                                        )}
                                      </button>
                                    </div>
                                  );
                                })()}
                              </div>
                              {!isGenericImagePlaceholder && (
                                <p className="italic text-zinc-200 select-text cursor-text">{renderTextWithClickableLinks(rText)}</p>
                              )}
                              {isGenericImagePlaceholder && (
                                <div className="space-y-1 text-zinc-200 select-text cursor-text">
                                  <p className="text-cyan-300/90 font-medium text-[11px]">Captado desde Imagen / Flyer sin texto en pie de foto:</p>
                                  {reqSpecs.length > 0 && (
                                    <div className="bg-black/30 rounded-lg p-2 font-mono text-[11px] space-y-0.5 text-zinc-300 border border-white/5 select-text">
                                      {reqSpecs.map((s, idx) => (
                                        <p key={idx}>{s}</p>
                                      ))}
                                    </div>
                                  )}
                                  {reqUrl && (
                                    <p className="text-xs text-blue-400 font-semibold pt-1 select-text">
                                      {renderTextWithClickableLinks(reqUrl)}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        {/* Visualizador de Flyer / Imagen Publicada en el Anuncio del Requerimiento */}
                        {(() => {
                          const reqImgs = extractItemImages(m.requirement);
                          if (reqImgs.length === 0) return null;
                          return (
                            <div className="mt-2.5 pt-2.5 border-t border-cyan-500/20 space-y-2 not-italic">
                              <p className="text-[10px] text-cyan-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
                                🖼️ Imagen / Flyer del Requerimiento Original ({reqImgs.length}):
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {reqImgs.slice(0, 4).map((imgUrl, imgIdx) => (
                                  <div key={imgIdx} className="relative group rounded-xl overflow-hidden border border-cyan-500/30 bg-black/50">
                                    <img 
                                      src={imgUrl} 
                                      alt={`Flyer Requerimiento ${imgIdx + 1}`} 
                                      className="w-full h-44 object-contain bg-zinc-950 group-hover:scale-105 transition-transform duration-300 cursor-pointer"
                                      onClick={() => window.open(imgUrl, '_blank')}
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                      }}
                                    />
                                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent p-2 flex items-center justify-between gap-1">
                                      <span className="text-[9px] text-cyan-200 font-semibold truncate">Flyer #{imgIdx + 1}</span>
                                      <a
                                        href={imgUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        download
                                        className="text-[9px] bg-cyan-400 hover:bg-cyan-300 text-black font-bold px-2 py-0.5 rounded shadow transition-colors flex items-center gap-1 shrink-0"
                                        title="Ver / Descargar imagen del flyer"
                                      >
                                        <Download className="w-2.5 h-2.5" /> Abrir / Descargar
                                      </a>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      
                      {(() => {
                        const reqContact = extractPhoneFromItem(m.requirement);
                        const isReqDirect = m.requirement?.origenTipo === 'contacto_directo' || m.requirement?.origenTipo === 'dm';
                        const senderName = m.requirement?.nombreUsuarioWhatsapp || (isReqDirect ? m.requirement?.origenNombre : null) || reqContact.name;
                        const isSenderKnown = senderName && !isGenericBrokerName(senderName);
                        const formattedPhone = reqContact.display.includes('(')
                          ? reqContact.display.split('(')[1].replace(')', '').trim()
                          : reqContact.display;
                        const clean10 = reqContact.cleanNumber 
                          ? (reqContact.cleanNumber.startsWith("57") && reqContact.cleanNumber.length === 12 ? reqContact.cleanNumber.substring(2) : reqContact.cleanNumber)
                          : null;

                        return (
                          <div className="bg-gradient-to-r from-cyan-950/30 via-blue-950/20 to-zinc-950 border border-cyan-500/25 rounded-2xl p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm hover:border-cyan-500/45 transition-all">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-9 h-9 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 flex-shrink-0 shadow-inner">
                                <Phone className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-[9px] text-cyan-400/80 uppercase tracking-widest font-extrabold flex items-center gap-1">
                                  <span>Requiriente / Comprador</span>
                                </p>
                                {isSenderKnown ? (
                                  <div className="mt-0.5">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleCopy(senderName, `req-sender-${m.id}`, 'author', isReqDirect ? undefined : m.requirement?.origenNombre);
                                      }}
                                      className="text-xs sm:text-sm font-extrabold text-cyan-200 hover:text-cyan-100 flex items-center gap-1.5 group cursor-pointer text-left transition-all"
                                      title="Toca para copiar el nombre del asesor y ubicarlo en WhatsApp"
                                    >
                                      <span className="text-[10px] bg-cyan-500/20 border border-cyan-500/30 px-1.5 py-0.2 rounded text-cyan-300">👤 Asesor</span>
                                      <span className="underline decoration-dotted decoration-cyan-400/50 group-hover:decoration-cyan-300">{senderName}</span>
                                      <Copy className="w-3 h-3 opacity-60 group-hover:opacity-100 text-cyan-300 shrink-0 transition-opacity" />
                                    </button>
                                    {clean10 ? (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleCopy(clean10, `req-phone-${m.id}`, 'phone', isReqDirect ? undefined : m.requirement?.origenNombre);
                                        }}
                                        className="text-xs font-bold text-zinc-300 hover:text-white flex items-center gap-1 group cursor-pointer mt-0.5 transition-all text-left"
                                        title="Toca para copiar el celular de 10 dígitos para WhatsApp"
                                      >
                                        <span className="text-[#25D366]">📞</span>
                                        <span className="group-hover:underline">{formattedPhone}</span>
                                        <Copy className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100 text-zinc-400 shrink-0 transition-opacity" />
                                      </button>
                                    ) : (
                                      <p className="text-xs font-semibold text-zinc-400 mt-0.5 flex items-center gap-1">
                                        <span className="text-zinc-500">📞</span>
                                        <span>{formattedPhone}</span>
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  <div className="mt-0.5">
                                    {clean10 ? (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleCopy(clean10, `req-phone-${m.id}`, 'phone', isReqDirect ? undefined : m.requirement?.origenNombre);
                                        }}
                                        className="text-xs font-bold text-zinc-200 hover:text-white flex items-center gap-1 group cursor-pointer text-left"
                                        title="Toca para copiar el celular de 10 dígitos para WhatsApp"
                                      >
                                        <span className="text-[#25D366]">📞</span>
                                        <span className="group-hover:underline">{formattedPhone}</span>
                                        <Copy className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100 text-zinc-400 shrink-0 transition-opacity" />
                                      </button>
                                    ) : (
                                      <p className="text-xs font-bold text-zinc-200 select-all">{reqContact.display}</p>
                                    )}
                                    <p className="text-[10px] text-zinc-500 italic mt-0.5">👤 Nombre no asignado (Completar al editar)</p>
                                  </div>
                                )}
                              </div>
                            </div>
                            {clean10 ? (
                              <a 
                                href={`https://wa.me/57${clean10}?text=${encodeURIComponent(`Hola! Te contacto por tu requerimiento de inmueble en ${m.requirement?.zonaDeseada || m.requirement?.ciudadDeseada || 'VECY Network'}. Encontramos una propiedad con un Match del ${score.toFixed(0)}%.`)}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="group bg-[#25D366] hover:bg-[#20ba5a] text-black text-xs font-extrabold px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 shadow-md hover:shadow-[0_0_20px_rgba(37,211,102,0.4)] hover:scale-105 active:scale-95 min-h-[38px] w-full sm:w-auto shrink-0"
                              >
                                <span>Contactar WA</span>
                                <ExternalLink className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                              </a>
                            ) : null}
                          </div>
                        );
                      })()}
                    </div>

                  </div>

                  {/* COTEJO DETALLADO CAMPO POR CAMPO (PLEGABLE / DESPLEGABLE CON BOTÓN DE CONTROL) */}
                  {(() => {
                    const isCotejoExpanded = expandedMatchIds.has(m.id) || isEditingThisCard;

                    return (
                      <>
                        {/* Barra de Control de Despliegue */}
                        <div className="bg-zinc-950/90 border-b border-white/5 px-3.5 sm:px-6 py-3 flex items-center justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              type="button"
                              onClick={() => toggleExpandMatch(m.id)}
                              className={`flex items-center gap-2 text-xs font-bold px-3.5 py-2 rounded-xl border transition-all cursor-pointer select-none active:scale-95 ${
                                isCotejoExpanded 
                                  ? 'bg-[#bf953f]/20 border-[#bf953f] text-[#bf953f] shadow-[0_0_12px_rgba(191,149,63,0.3)]' 
                                  : 'bg-zinc-900 border-white/10 text-zinc-300 hover:text-white hover:border-[#bf953f]/50'
                              }`}
                            >
                              <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
                              <span>{isCotejoExpanded ? '🔼 Ocultar Tabla de Cotejo' : `📊 Ver Tabla de Cotejo Técnico (${rows.length} Atributos)`}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setAddFieldModalMatch(m);
                                setSelectedAttributeKey('mascotas');
                                setCustomAttributeName('');
                                setAddFieldReqVal('Exige / Indispensable');
                                setAddFieldPropVal('Sí (Cuenta con ello)');
                                setAddFieldStatus('exact');
                                setPersistInOffer(true);
                                setPersistInDemand(true);
                              }}
                              className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 transition-all cursor-pointer shadow-sm active:scale-95"
                              title="Agregar un atributo o pregunta surgida en la visita para robustecer este match"
                            >
                              <Plus className="w-3.5 h-3.5 text-amber-400" />
                              <span>+ Agregar Atributo al Cotejo</span>
                            </button>
                          </div>

                          {/* Resumen Compacto de Cumplimiento cuando está Plegado */}
                          {!isCotejoExpanded && (
                            <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] font-bold text-zinc-400 flex-wrap">
                              <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                ✓ {exactCount + plusCount} Coincidencias
                              </span>
                              {warnCount > 0 && (
                                <span className="text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                                  ⚠️ {warnCount} Aproximados
                                </span>
                              )}
                              {failCount > 0 && (
                                <span className="text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                                  ✕ {failCount} Diferencias
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Detalle Completo de la Tabla de Cotejo (Solo renderizado cuando se expande o edita) */}
                        {isCotejoExpanded && (
                          <div className="bg-black/30 border-b border-white/5 p-3 sm:p-4 md:p-6 overflow-x-hidden animate-in fade-in-50 duration-200">
                            <h5 className="text-xs font-bold uppercase tracking-widest text-[#bf953f] mb-3 flex items-center justify-between gap-2 flex-wrap">
                              <span className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4" />
                                Cotejo técnico de afinidad comercial ({rows.length} características evaluadas)
                              </span>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAddFieldModalMatch(m);
                                    setSelectedAttributeKey('mascotas');
                                    setCustomAttributeName('');
                                    setAddFieldReqVal('Exige / Indispensable');
                                    setAddFieldPropVal('Sí (Cuenta con ello)');
                                    setAddFieldStatus('exact');
                                    setPersistInOffer(true);
                                    setPersistInDemand(true);
                                  }}
                                  className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/25 text-amber-300 transition-all cursor-pointer active:scale-95"
                                  title="Agregar un atributo o pregunta surgida en la visita para robustecer este match"
                                >
                                  <Plus className="w-3 h-3 text-amber-400" />
                                  + Agregar Atributo
                                </button>
                                {isEditingThisCard && (
                                  <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded font-bold animate-pulse">
                                    ⚡ Recálculo en tiempo real activo
                                  </span>
                                )}
                              </div>
                            </h5>
                    
                    {/* VISTA ESCRITORIO (md:table - 4 columnas) */}
                    <div className="hidden md:block overflow-x-auto scrollbar-thin">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-white/10 text-[10px] uppercase tracking-widest text-zinc-500">
                            <th className="text-left py-2.5 px-3">Característica</th>
                            <th className="text-left py-2.5 px-3 text-[#bf953f]">Ofrecido (Oferta) {isEditingThisCard && <span className="text-[9px] text-amber-400 font-normal">(Modo Edición)</span>}</th>
                            <th className="text-left py-2.5 px-3 text-cyan-400">Buscado (Demanda) {isEditingThisCard && <span className="text-[9px] text-cyan-300 font-normal">(Modo Edición)</span>}</th>
                            <th className="text-center py-2.5 px-3 w-28">Cumplimiento</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((row: any, rIdx: number) => {
                            const isExact = row.status === "exact" || row.status === "ok";
                            const isPlus = row.status === "plus";
                            const isWarn = row.status === "warn";
                            const isMissing = row.status === "missing";
                            const isNeutral = row.status === "neutral";
                            
                            const badgeBg = isExact 
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                              : isPlus
                                ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                                : isWarn 
                                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" 
                                  : isMissing
                                    ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                    : "bg-zinc-800 text-zinc-400 border border-zinc-700/50";
                            
                            const badgeText = isExact ? "Coincide" : isPlus ? "Plus Ofertado" : isWarn ? "Aproximado" : isMissing ? "No Cumple" : "Dato Pendiente";

                            const renderRowInput = (label: string, isOffer: boolean, defaultVal: string) => {
                              if (!isEditingThisCard) {
                                return (
                                  <span 
                                    onClick={() => handleStartEdit(m)} 
                                    className="cursor-pointer hover:underline hover:text-white transition-colors"
                                    title="Haz clic aquí para editar esta casilla N/E"
                                  >
                                    {defaultVal}
                                  </span>
                                );
                              }

                              const cleanLbl = label.toLowerCase();
                              
                              if (cleanLbl.includes('precio de venta')) {
                                return isOffer ? (
                                  <input
                                    type="text"
                                    placeholder="Ej: 700000000"
                                    value={editForm.propPrice || ''}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, propPrice: e.target.value }))}
                                    className="w-full bg-black/80 border border-[#bf953f] text-[#bf953f] font-bold text-xs p-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#bf953f]"
                                  />
                                ) : (
                                  <input
                                    type="text"
                                    placeholder="Ej: 700000000"
                                    value={editForm.reqBudget || ''}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, reqBudget: e.target.value }))}
                                    className="w-full bg-black/80 border border-cyan-500 text-cyan-300 font-bold text-xs p-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                  />
                                );
                              }

                              if (cleanLbl.includes('precio de arriendo') || cleanLbl.includes('canon')) {
                                return isOffer ? (
                                  <input
                                    type="text"
                                    placeholder="Ej: 2500000"
                                    value={editForm.propRentPrice || ''}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, propRentPrice: e.target.value }))}
                                    className="w-full bg-black/80 border border-[#bf953f] text-[#bf953f] font-bold text-xs p-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#bf953f]"
                                  />
                                ) : (
                                  <input
                                    type="text"
                                    placeholder="Ej: 2500000"
                                    value={editForm.reqBudget || ''}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, reqBudget: e.target.value }))}
                                    className="w-full bg-black/80 border border-cyan-500 text-cyan-300 font-bold text-xs p-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                  />
                                );
                              }

                              if (cleanLbl.includes('valor admin') || cleanLbl.includes('cuota de administración') || cleanLbl.includes('administración')) {
                                return isOffer ? (
                                  <input
                                    type="text"
                                    placeholder="Ej: 500000"
                                    value={editForm.propAdminFee || ''}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, propAdminFee: e.target.value }))}
                                    className="w-full bg-black/80 border border-[#bf953f] text-[#bf953f] font-bold text-xs p-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#bf953f]"
                                  />
                                ) : (
                                  <input
                                    type="text"
                                    placeholder="Ej: 600000"
                                    value={editForm.reqAdminMax || ''}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, reqAdminMax: e.target.value }))}
                                    className="w-full bg-black/80 border border-cyan-500 text-cyan-300 font-bold text-xs p-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                  />
                                );
                              }

                              if (cleanLbl.includes('área total') || cleanLbl.includes('área')) {
                                return isOffer ? (
                                  <input
                                    type="text"
                                    placeholder="Ej: 87"
                                    value={editForm.propArea || ''}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, propArea: e.target.value }))}
                                    className="w-full bg-black/80 border border-[#bf953f] text-[#bf953f] font-bold text-xs p-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#bf953f]"
                                  />
                                ) : (
                                  <input
                                    type="text"
                                    placeholder="Ej: 80"
                                    value={editForm.reqArea || ''}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, reqArea: e.target.value }))}
                                    className="w-full bg-black/80 border border-cyan-500 text-cyan-300 font-bold text-xs p-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                  />
                                );
                              }

                              if (cleanLbl.includes('habitaciones')) {
                                return isOffer ? (
                                  <input
                                    type="number"
                                    placeholder="Ej: 3"
                                    value={editForm.propBedrooms ?? ''}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, propBedrooms: e.target.value }))}
                                    className="w-full bg-black/80 border border-[#bf953f] text-[#bf953f] font-bold text-xs p-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#bf953f]"
                                  />
                                ) : (
                                  <input
                                    type="number"
                                    placeholder="Ej: 3"
                                    value={editForm.reqBedrooms ?? ''}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, reqBedrooms: e.target.value }))}
                                    className="w-full bg-black/80 border border-cyan-500 text-cyan-300 font-bold text-xs p-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                  />
                                );
                              }

                              if (cleanLbl.includes('baños')) {
                                return isOffer ? (
                                  <input
                                    type="number"
                                    placeholder="Ej: 3"
                                    value={editForm.propBathrooms ?? ''}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, propBathrooms: e.target.value }))}
                                    className="w-full bg-black/80 border border-[#bf953f] text-[#bf953f] font-bold text-xs p-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#bf953f]"
                                  />
                                ) : (
                                  <input
                                    type="number"
                                    placeholder="Ej: 2"
                                    value={editForm.reqBathrooms ?? ''}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, reqBathrooms: e.target.value }))}
                                    className="w-full bg-black/80 border border-cyan-500 text-cyan-300 font-bold text-xs p-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                  />
                                );
                              }

                              if (cleanLbl.includes('parqueaderos') || cleanLbl.includes('garajes')) {
                                return isOffer ? (
                                  <input
                                    type="number"
                                    placeholder="Ej: 2"
                                    value={editForm.propGarages ?? ''}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, propGarages: e.target.value }))}
                                    className="w-full bg-black/80 border border-[#bf953f] text-[#bf953f] font-bold text-xs p-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#bf953f]"
                                  />
                                ) : (
                                  <input
                                    type="number"
                                    placeholder="Ej: 2"
                                    value={editForm.reqGarages ?? ''}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, reqGarages: e.target.value }))}
                                    className="w-full bg-black/80 border border-cyan-500 text-cyan-300 font-bold text-xs p-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                  />
                                );
                              }

                              if (cleanLbl.includes('estrato')) {
                                return isOffer ? (
                                  <input
                                    type="number"
                                    placeholder="Ej: 4"
                                    value={editForm.propStratum ?? ''}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, propStratum: e.target.value }))}
                                    className="w-full bg-black/80 border border-[#bf953f] text-[#bf953f] font-bold text-xs p-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#bf953f]"
                                  />
                                ) : (
                                  <input
                                    type="number"
                                    placeholder="Ej: 4"
                                    value={editForm.reqStratum ?? ''}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, reqStratum: e.target.value }))}
                                    className="w-full bg-black/80 border border-cyan-500 text-cyan-300 font-bold text-xs p-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                  />
                                );
                              }

                              if (cleanLbl.includes('barrio')) {
                                return isOffer ? (
                                  <input
                                    type="text"
                                    placeholder="Ej: Cedritos"
                                    value={editForm.propZone || ''}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, propZone: e.target.value }))}
                                    className="w-full bg-black/80 border border-[#bf953f] text-[#bf953f] font-bold text-xs p-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#bf953f]"
                                  />
                                ) : (
                                  <input
                                    type="text"
                                    placeholder="Ej: Rosales"
                                    value={editForm.reqZone || ''}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, reqZone: e.target.value }))}
                                    className="w-full bg-black/80 border border-cyan-500 text-cyan-300 font-bold text-xs p-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                  />
                                );
                              }

                              if (cleanLbl.includes('tipo de inmueble')) {
                                return isOffer ? (
                                  <select
                                    value={editForm.propPropertyType || ''}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, propPropertyType: e.target.value }))}
                                    className="w-full bg-black/80 border border-[#bf953f] text-[#bf953f] font-bold text-xs p-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#bf953f]"
                                  >
                                    <option value="">Seleccionar Subtipo...</option>
                                    <option value="apartamento_estandar">Apartamento</option>
                                    <option value="apartaestudio">Apartaestudio</option>
                                    <option value="loft">Loft</option>
                                    <option value="apartamento_duplex">Apartamento Dúplex</option>
                                    <option value="penthouse">Pent House</option>
                                    <option value="penthouse_duplex">Pent House Dúplex</option>
                                    <option value="casa">Casa</option>
                                    <option value="casa_campestre">Casa Campestre</option>
                                    <option value="casa_quinta">Casa Quinta</option>
                                    <option value="villa">Villa</option>
                                    <option value="farm">Finca</option>
                                    <option value="cabin">Cabaña</option>
                                    <option value="building">Edificio</option>
                                    <option value="commercial">Local Comercial</option>
                                    <option value="office">Oficina</option>
                                    <option value="consultorio">Consultorio Médico / Dotacional</option>
                                    <option value="warehouse">Bodega</option>
                                    <option value="land">Lote / Terreno</option>
                                    <option value="hotel">Hotel</option>
                                    <option value="hostal">Hostal</option>
                                    <option value="aparta_hotel">Aparta Hotel</option>
                                    <option value="aparta_suit">Aparta Suit</option>
                                    <option value="motel">Motel</option>
                                  </select>
                                ) : (
                                  <select
                                    value={editForm.reqPropertyType || ''}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, reqPropertyType: e.target.value }))}
                                    className="w-full bg-black/80 border border-cyan-500 text-cyan-300 font-bold text-xs p-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                  >
                                    <option value="">Seleccionar Subtipo...</option>
                                    <option value="apartamento_estandar">Apartamento</option>
                                    <option value="apartaestudio">Apartaestudio</option>
                                    <option value="loft">Loft</option>
                                    <option value="apartamento_duplex">Apartamento Dúplex</option>
                                    <option value="penthouse">Pent House</option>
                                    <option value="penthouse_duplex">Pent House Dúplex</option>
                                    <option value="casa">Casa</option>
                                    <option value="casa_campestre">Casa Campestre</option>
                                    <option value="casa_quinta">Casa Quinta</option>
                                    <option value="villa">Villa</option>
                                    <option value="farm">Finca</option>
                                    <option value="cabin">Cabaña</option>
                                    <option value="building">Edificio</option>
                                    <option value="commercial">Local Comercial</option>
                                    <option value="office">Oficina</option>
                                    <option value="consultorio">Consultorio Médico / Dotacional</option>
                                    <option value="warehouse">Bodega</option>
                                    <option value="land">Lote / Terreno</option>
                                    <option value="hotel">Hotel</option>
                                    <option value="hostal">Hostal</option>
                                    <option value="aparta_hotel">Aparta Hotel</option>
                                    <option value="aparta_suit">Aparta Suit</option>
                                    <option value="motel">Motel</option>
                                  </select>
                                );
                              }

                              if (cleanLbl.includes('tipo de negocio')) {
                                return isOffer ? (
                                  <select
                                    value={editForm.propTransactionType || ''}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, propTransactionType: e.target.value }))}
                                    className="w-full bg-black/80 border border-[#bf953f] text-[#bf953f] font-bold text-xs p-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#bf953f]"
                                  >
                                    <option value="">Seleccionar Negocio...</option>
                                    <option value="venta">Venta</option>
                                    <option value="arriendo">Arriendo</option>
                                    <option value="venta_o_arriendo">Venta o Arriendo</option>
                                    <option value="arriendo_con_opcion_de_compra">Arriendo con opción de compra</option>
                                    <option value="arriendo_temporal">Arriendo temporal</option>
                                    <option value="permuta">Permuta Pura (100%)</option>
                                    <option value="venta_permuta">Venta / Permuta (Venpermuto General)</option>
                                    <option value="venta_permuta_50_50">Venta 50% / Permuta 50%</option>
                                    <option value="venta_permuta_60_40">Venta 60% / Permuta 40%</option>
                                    <option value="venta_permuta_70_30">Venta 70% / Permuta 30%</option>
                                    <option value="venta_permuta_80_20">Venta 80% / Permuta 20%</option>
                                    <option value="venta_permuta_90_10">Venta 90% / Permuta 10%</option>
                                    <option value="venta_permuta_10_90">Venta 10% / Permuta 90%</option>
                                    <option value="venta_permuta_20_80">Venta 20% / Permuta 80%</option>
                                    <option value="venta_permuta_30_70">Venta 30% / Permuta 70%</option>
                                    <option value="venta_permuta_40_60">Venta 40% / Permuta 60%</option>
                                    <option value="aporte">Aporte a Proyecto</option>
                                  </select>
                                ) : (
                                  <select
                                    value={editForm.reqTransactionType || ''}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, reqTransactionType: e.target.value }))}
                                    className="w-full bg-black/80 border border-cyan-500 text-cyan-300 font-bold text-xs p-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                  >
                                    <option value="">Seleccionar Negocio...</option>
                                    <option value="venta">Venta</option>
                                    <option value="arriendo">Arriendo</option>
                                    <option value="venta_o_arriendo">Venta o Arriendo</option>
                                    <option value="arriendo_con_opcion_de_compra">Arriendo con opción de compra</option>
                                    <option value="arriendo_temporal">Arriendo temporal</option>
                                    <option value="permuta">Permuta Pura (100%)</option>
                                    <option value="venta_permuta">Venta / Permuta (Venpermuto General)</option>
                                    <option value="venta_permuta_50_50">Venta 50% / Permuta 50%</option>
                                    <option value="venta_permuta_60_40">Venta 60% / Permuta 40%</option>
                                    <option value="venta_permuta_70_30">Venta 70% / Permuta 30%</option>
                                    <option value="venta_permuta_80_20">Venta 80% / Permuta 20%</option>
                                    <option value="venta_permuta_90_10">Venta 90% / Permuta 10%</option>
                                    <option value="venta_permuta_10_90">Venta 10% / Permuta 90%</option>
                                    <option value="venta_permuta_20_80">Venta 20% / Permuta 80%</option>
                                    <option value="venta_permuta_30_70">Venta 30% / Permuta 70%</option>
                                    <option value="venta_permuta_40_60">Venta 40% / Permuta 60%</option>
                                    <option value="aporte">Aporte a Proyecto</option>
                                  </select>
                                );
                              }

                              if (cleanLbl.includes('localidad')) {
                                return isOffer ? (
                                  <input
                                    type="text"
                                    placeholder="Ej: Usaquén, Chapinero"
                                    value={editForm.propLocality || ''}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, propLocality: e.target.value }))}
                                    className="w-full bg-black/80 border border-[#bf953f] text-[#bf953f] font-bold text-xs p-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#bf953f]"
                                  />
                                ) : (
                                  <input
                                    type="text"
                                    placeholder="Ej: Usaquén, Chapinero"
                                    value={editForm.reqLocality || ''}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, reqLocality: e.target.value }))}
                                    className="w-full bg-black/80 border border-cyan-500 text-cyan-300 font-bold text-xs p-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                  />
                                );
                              }

                              if (cleanLbl.includes('teléfono') || cleanLbl.includes('contacto') || cleanLbl.includes('asesor')) {
                                return isOffer ? (
                                  <div className="space-y-1.5 w-full">
                                    <div className="relative">
                                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs">👤</span>
                                      <input
                                        type="text"
                                        placeholder="Nombre Asesor (ej: Erika Del Pilar)"
                                        value={editForm.propSenderName || ''}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, propSenderName: e.target.value }))}
                                        className="w-full bg-black/80 border border-[#bf953f] text-[#bf953f] font-bold text-xs pl-6 pr-2 py-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#bf953f]"
                                      />
                                    </div>
                                    <div className="relative">
                                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs">📞</span>
                                      <input
                                        type="text"
                                        placeholder="WhatsApp (ej: +57 310 123 4567)"
                                        value={editForm.propPhone || ''}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, propPhone: e.target.value }))}
                                        className="w-full bg-black/80 border border-[#bf953f] text-[#bf953f] font-bold text-xs pl-6 pr-2 py-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#bf953f]"
                                      />
                                    </div>
                                    <div className="relative">
                                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs">📍</span>
                                      <input
                                        type="text"
                                        placeholder="Grupo WhatsApp (ej: Rosales-Chicó)"
                                        value={editForm.propOrigenNombre || ''}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, propOrigenNombre: e.target.value }))}
                                        className="w-full bg-black/80 border border-[#bf953f] text-[#bf953f] font-bold text-xs pl-6 pr-2 py-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#bf953f]"
                                      />
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleSaveAdvisorDirect(true, m)}
                                      disabled={saveAdvisorMut.isPending}
                                      className="w-full mt-1 py-1.5 px-2 rounded-lg bg-gradient-to-r from-amber-600/30 to-amber-700/30 hover:from-amber-600/50 hover:to-amber-700/50 border border-amber-500/50 text-amber-300 font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                                      title="Guardar asesor permanentemente en PostgreSQL para que jamás se pierda"
                                    >
                                      {saveAdvisorMut.isPending ? "⏳ Guardando..." : "💾 Guardar Asesor Permanente"}
                                    </button>
                                  </div>
                                ) : (
                                  <div className="space-y-1.5 w-full">
                                    <div className="relative">
                                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs">👤</span>
                                      <input
                                        type="text"
                                        placeholder="Nombre Asesor (ej: Erika Del Pilar)"
                                        value={editForm.reqSenderName || ''}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, reqSenderName: e.target.value }))}
                                        className="w-full bg-black/80 border border-cyan-500 text-cyan-300 font-bold text-xs pl-6 pr-2 py-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                      />
                                    </div>
                                    <div className="relative">
                                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs">📞</span>
                                      <input
                                        type="text"
                                        placeholder="WhatsApp (ej: +57 310 123 4567)"
                                        value={editForm.reqPhone || ''}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, reqPhone: e.target.value }))}
                                        className="w-full bg-black/80 border border-cyan-500 text-cyan-300 font-bold text-xs pl-6 pr-2 py-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                      />
                                    </div>
                                    <div className="relative">
                                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs">📍</span>
                                      <input
                                        type="text"
                                        placeholder="Grupo WhatsApp (ej: VECY INMUEBLES NETWORK)"
                                        value={editForm.reqOrigenNombre || ''}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, reqOrigenNombre: e.target.value }))}
                                        className="w-full bg-black/80 border border-cyan-500 text-cyan-300 font-bold text-xs pl-6 pr-2 py-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                      />
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleSaveAdvisorDirect(false, m)}
                                      disabled={saveAdvisorMut.isPending}
                                      className="w-full mt-1 py-1.5 px-2 rounded-lg bg-gradient-to-r from-cyan-600/30 to-blue-700/30 hover:from-cyan-600/50 hover:to-blue-700/50 border border-cyan-500/50 text-cyan-300 font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                                      title="Guardar asesor permanentemente en PostgreSQL para que jamás se pierda"
                                    >
                                      {saveAdvisorMut.isPending ? "⏳ Guardando..." : "💾 Guardar Asesor Permanente"}
                                    </button>
                                  </div>
                                );
                              }

                              if (cleanLbl.includes('antigüedad') || cleanLbl.includes('antiguedad') || cleanLbl.includes('año')) {
                                const displayYear = editForm.propYearBuilt ?? '';
                                const displayAge = editForm.propAntiguedadAnos ?? '';
                                const rawInput = editForm.propAntiguedadRaw !== undefined
                                  ? editForm.propAntiguedadRaw
                                  : (displayYear ? `${displayYear}` : (displayAge !== '' ? `${displayAge}` : ''));
                                return isOffer ? (
                                  <div className="space-y-1 w-full">
                                    <input
                                      type="text"
                                      placeholder="Ej: 1994 ó 32"
                                      value={rawInput}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        let digits = val.replace(/[^0-9]/g, '');
                                        let y: number | undefined = undefined;
                                        let a: number | undefined = undefined;
                                        if (digits.length === 4) {
                                          const num = parseInt(digits, 10);
                                          if (num >= 1900 && num <= 2030) {
                                            y = num;
                                            a = Math.max(0, 2026 - num);
                                          }
                                        } else if (digits.length > 0 && digits.length <= 3) {
                                          const num = parseInt(digits, 10);
                                          if (num >= 0 && num <= 120) {
                                            a = num;
                                            y = 2026 - num;
                                          }
                                        }
                                        setEditForm(prev => ({
                                          ...prev,
                                          propAntiguedadRaw: val,
                                          propYearBuilt: y !== undefined ? y : (digits.length === 4 ? parseInt(digits, 10) : prev.propYearBuilt),
                                          propAntiguedadAnos: a !== undefined ? a : (digits.length <= 3 && digits.length > 0 ? parseInt(digits, 10) : prev.propAntiguedadAnos),
                                        }));
                                      }}
                                      className="w-full bg-black/80 border border-[#bf953f] text-[#bf953f] font-bold text-xs p-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#bf953f]"
                                    />
                                    {(displayYear || displayAge !== '') && (
                                      <span className="text-[10px] text-emerald-400 font-bold block">
                                        📅 Año: {displayYear || (displayAge ? 2026 - Number(displayAge) : '1994')} · ⏳ {displayAge !== '' ? displayAge : (displayYear ? 2026 - Number(displayYear) : '32')} años
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <div className="space-y-1 w-full">
                                    <input
                                      type="number"
                                      placeholder="Máx años (ej: 10, o vacío flexible)"
                                      value={editForm.reqAntiguedadMax !== undefined ? editForm.reqAntiguedadMax : ''}
                                      onChange={(e) => setEditForm(prev => ({ ...prev, reqAntiguedadMax: e.target.value }))}
                                      className="w-full bg-black/80 border border-cyan-500 text-cyan-300 font-bold text-xs p-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                    />
                                    <span className="text-[10px] text-cyan-400/80 block">
                                      {editForm.reqAntiguedadMax && Number(editForm.reqAntiguedadMax) > 0 ? `Tope: Máx ${editForm.reqAntiguedadMax} años` : 'Flexible / Sin restricción de edad'}
                                    </span>
                                  </div>
                                );
                              }

                              if (cleanLbl.includes('ubicación en piso') || cleanLbl.includes('vista')) {
                                return isOffer ? (
                                  <select
                                    value={editForm.propExtInt || ''}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, propExtInt: e.target.value }))}
                                    className="w-full bg-black/80 border border-[#bf953f] text-[#bf953f] font-bold text-xs p-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#bf953f]"
                                  >
                                    <option value="">Seleccionar Vista...</option>
                                    <option value="Interior">Interior</option>
                                    <option value="Exterior">Exterior</option>
                                    <option value="Exterior e Interior">Exterior e Interior (Mixto)</option>
                                  </select>
                                ) : (
                                  <select
                                    value={editForm.reqExtInt || ''}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, reqExtInt: e.target.value }))}
                                    className="w-full bg-black/80 border border-cyan-500 text-cyan-300 font-bold text-xs p-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                  >
                                    <option value="">Flexible / Sin restricción</option>
                                    <option value="Exterior">Exige Vista Exterior</option>
                                    <option value="Interior">Exige Vista Interior</option>
                                    <option value="Exterior e Interior">Exige Mixto</option>
                                  </select>
                                );
                              }

                              if (cleanLbl.includes('cocina')) {
                                return isOffer ? (
                                  <select
                                    value={editForm.propCocina || ''}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, propCocina: e.target.value }))}
                                    className="w-full bg-black/80 border border-[#bf953f] text-[#bf953f] font-bold text-xs p-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#bf953f]"
                                  >
                                    <option value="">Seleccionar Tipo Cocina...</option>
                                    <option value="Cerrada">Cocina Cerrada / Tradicional</option>
                                    <option value="Abierta">Cocina Abierta / Tipo Americano</option>
                                    <option value="Abierta tipo Isla">Abierta con Isla</option>
                                    <option value="Integral">Cocina Integral</option>
                                    <option value="Semi-abierta">Semi-abierta</option>
                                  </select>
                                ) : (
                                  <select
                                    value={editForm.reqCocina || ''}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, reqCocina: e.target.value }))}
                                    className="w-full bg-black/80 border border-cyan-500 text-cyan-300 font-bold text-xs p-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                  >
                                    <option value="">Flexible / No exigido</option>
                                    <option value="Cerrada">Exige Cocina Cerrada</option>
                                    <option value="Abierta">Exige Cocina Abierta</option>
                                    <option value="Abierta tipo Isla">Exige Isla</option>
                                    <option value="Integral">Exige Cocina Integral</option>
                                  </select>
                                );
                              }

                              if (cleanLbl.includes('servicio') || cleanLbl.includes('cbs')) {
                                return isOffer ? (
                                  <select
                                    value={editForm.propCuartoServicio || ''}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, propCuartoServicio: e.target.value }))}
                                    className="w-full bg-black/80 border border-[#bf953f] text-[#bf953f] font-bold text-xs p-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#bf953f]"
                                  >
                                    <option value="">Seleccionar Opción CBS...</option>
                                    <option value="Sí (Con Baño Privado)">Sí (Con Baño Privado)</option>
                                    <option value="Sí (Sin Baño)">Sí (Sin Baño)</option>
                                    <option value="Solo baño de servicio">Solo baño de servicio</option>
                                    <option value="No tiene">No tiene</option>
                                  </select>
                                ) : (
                                  <select
                                    value={editForm.reqCuartoServicio || ''}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, reqCuartoServicio: e.target.value }))}
                                    className="w-full bg-black/80 border border-cyan-500 text-cyan-300 font-bold text-xs p-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                  >
                                    <option value="">Flexible / No exigido</option>
                                    <option value="Exige CBS con Baño">Exige CBS con Baño</option>
                                    <option value="Exige Cuarto de Servicio">Exige Cuarto de Servicio</option>
                                    <option value="No requerido">No requerido</option>
                                  </select>
                                );
                              }

                              if (cleanLbl.includes('depósito') || cleanLbl.includes('deposito') || cleanLbl.includes('cuarto útil') || cleanLbl.includes('cuarto util')) {
                                return isOffer ? (
                                  <input
                                    type="text"
                                    placeholder="Ej: 1 ó Si (Incluye Depósito)"
                                    value={editForm.propDepositos !== undefined ? editForm.propDepositos : (defaultVal !== 'N/E' ? defaultVal : '')}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, propDepositos: e.target.value }))}
                                    className="w-full bg-black/80 border border-[#bf953f] text-[#bf953f] font-bold text-xs p-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#bf953f]"
                                  />
                                ) : (
                                  <input
                                    type="text"
                                    placeholder="Ej: 1 ó Exige Depósito"
                                    value={editForm.reqDepositos !== undefined ? editForm.reqDepositos : (defaultVal !== 'N/E' ? defaultVal : '')}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, reqDepositos: e.target.value }))}
                                    className="w-full bg-black/80 border border-cyan-500 text-cyan-300 font-bold text-xs p-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                  />
                                );
                              }

                              if (cleanLbl.includes('área de terraza') || cleanLbl.includes('area de terraza')) {
                                return isOffer ? (
                                  <input
                                    type="text"
                                    placeholder="Ej: 72 m²"
                                    value={editForm.propTerraceArea !== undefined ? editForm.propTerraceArea : (defaultVal !== 'N/E' ? defaultVal : '')}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, propTerraceArea: e.target.value }))}
                                    className="w-full bg-black/80 border border-[#bf953f] text-[#bf953f] font-bold text-xs p-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#bf953f]"
                                  />
                                ) : (
                                  <input
                                    type="text"
                                    placeholder="Ej: 50 m² ó Flexible"
                                    value={editForm.reqTerraceArea !== undefined ? editForm.reqTerraceArea : (defaultVal !== 'N/E' ? defaultVal : '')}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, reqTerraceArea: e.target.value }))}
                                    className="w-full bg-black/80 border border-cyan-500 text-cyan-300 font-bold text-xs p-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                  />
                                );
                              }

                              if (cleanLbl.includes('área de balcón') || cleanLbl.includes('area de balcón') || cleanLbl.includes('area de balcon') || cleanLbl.includes('área de balcon')) {
                                return isOffer ? (
                                  <input
                                    type="text"
                                    placeholder="Ej: 4 m²"
                                    value={editForm.propBalconyArea !== undefined ? editForm.propBalconyArea : (defaultVal !== 'N/E' ? defaultVal : '')}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, propBalconyArea: e.target.value }))}
                                    className="w-full bg-black/80 border border-[#bf953f] text-[#bf953f] font-bold text-xs p-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#bf953f]"
                                  />
                                ) : (
                                  <input
                                    type="text"
                                    placeholder="Ej: 2 m² ó Flexible"
                                    value={editForm.reqBalconyArea !== undefined ? editForm.reqBalconyArea : (defaultVal !== 'N/E' ? defaultVal : '')}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, reqBalconyArea: e.target.value }))}
                                    className="w-full bg-black/80 border border-cyan-500 text-cyan-300 font-bold text-xs p-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                  />
                                );
                              }

                              if (cleanLbl.includes('balcón') || cleanLbl.includes('balcon') || cleanLbl.includes('terraza') || cleanLbl.includes('patio')) {
                                return isOffer ? (
                                  <select
                                    value={editForm.propBalcon || ''}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, propBalcon: e.target.value }))}
                                    className="w-full bg-black/80 border border-[#bf953f] text-[#bf953f] font-bold text-xs p-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#bf953f]"
                                  >
                                    <option value="">Seleccionar...</option>
                                    <option value="Balcón">Balcón</option>
                                    <option value="Terraza">Terraza Privada</option>
                                    <option value="Balcón y Terraza">Balcón y Terraza</option>
                                    <option value="Patio">Patio / Jardín</option>
                                    <option value="No tiene">No tiene</option>
                                  </select>
                                ) : (
                                  <select
                                    value={editForm.reqBalcon || ''}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, reqBalcon: e.target.value }))}
                                    className="w-full bg-black/80 border border-cyan-500 text-cyan-300 font-bold text-xs p-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                  >
                                    <option value="">Flexible / No exigido</option>
                                    <option value="Exige Balcón">Exige Balcón</option>
                                    <option value="Exige Terraza">Exige Terraza</option>
                                    <option value="Exige Patio">Exige Patio / Jardín</option>
                                  </select>
                                );
                              }

                              if (cleanLbl.includes('tipo de garaje')) {
                                return isOffer ? (
                                  <select
                                    value={editForm.propGarageType || ''}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, propGarageType: e.target.value }))}
                                    className="w-full bg-black/80 border border-[#bf953f] text-[#bf953f] font-bold text-xs p-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#bf953f]"
                                  >
                                    <option value="">Seleccionar Garaje...</option>
                                    <option value="independiente">Independiente</option>
                                    <option value="lineal">Lineal (Servidumbre)</option>
                                    <option value="mixto">Mixto</option>
                                    <option value="cubierto">Cubierto</option>
                                    <option value="descubierto">Descubierto</option>
                                  </select>
                                ) : (
                                  <select
                                    value={editForm.reqGarageType || ''}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, reqGarageType: e.target.value }))}
                                    className="w-full bg-black/80 border border-cyan-500 text-cyan-300 font-bold text-xs p-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                  >
                                    <option value="">Flexible / Sin restricción</option>
                                    <option value="independiente">Exige Independientes</option>
                                    <option value="cubierto">Exige Cubiertos</option>
                                  </select>
                                );
                              }

                              if (cleanLbl.includes('piso / nivel')) {
                                return isOffer ? (
                                  <input
                                    type="text"
                                    placeholder="Ej: Piso 2 alto"
                                    value={editForm.propPisoNivel !== undefined ? editForm.propPisoNivel : (defaultVal !== 'N/E' ? defaultVal : '')}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, propPisoNivel: e.target.value }))}
                                    className="w-full bg-black/80 border border-[#bf953f] text-[#bf953f] font-bold text-xs p-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#bf953f]"
                                  />
                                ) : (
                                  <input
                                    type="text"
                                    placeholder="Ej: Piso alto, Flexible"
                                    value={editForm.reqPisoNivel !== undefined ? editForm.reqPisoNivel : (defaultVal !== 'N/E' ? defaultVal : '')}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, reqPisoNivel: e.target.value }))}
                                    className="w-full bg-black/80 border border-cyan-500 text-cyan-300 font-bold text-xs p-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                  />
                                );
                              }

                              // Fallback general para cualquier otra casilla (Antigüedad, Permuta, Cocina, Balcón, Equipamiento, Depósito)
                              const propKey = `prop_custom_${cleanLbl.replace(/[^a-z0-9]/g, '')}`;
                              const reqKey = `req_custom_${cleanLbl.replace(/[^a-z0-9]/g, '')}`;
                              return isOffer ? (
                                <input
                                  type="text"
                                  placeholder={`Editar ${label}`}
                                  value={editForm[propKey] !== undefined ? editForm[propKey] : (defaultVal !== 'N/E' ? defaultVal : '')}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, [propKey]: e.target.value }))}
                                  className="w-full bg-black/80 border border-[#bf953f] text-[#bf953f] font-bold text-xs p-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#bf953f]"
                                />
                              ) : (
                                <input
                                  type="text"
                                  placeholder={`Editar ${label}`}
                                  value={editForm[reqKey] !== undefined ? editForm[reqKey] : (defaultVal !== 'N/E' ? defaultVal : '')}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, [reqKey]: e.target.value }))}
                                  className="w-full bg-black/80 border border-cyan-500 text-cyan-300 font-bold text-xs p-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                />
                              );
                            };

                            return (
                              <tr key={rIdx} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                                <td className="py-2.5 px-3 flex items-center gap-2 font-medium text-zinc-300 min-w-[160px]">
                                  {row.icon}
                                  <span>{row.label}</span>
                                </td>
                                <td className="py-2 px-3 text-[#bf953f] font-medium min-w-[180px]">
                                  {renderRowInput(row.label, true, row.propVal)}
                                </td>
                                <td className="py-2 px-3 text-cyan-300 min-w-[180px]">
                                  {renderRowInput(row.label, false, row.reqVal)}
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${badgeBg}`}>
                                    {badgeText}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* VISTA MÓVIL (md:hidden - Minitarjetas Apiladas) */}
                    <div className="grid grid-cols-1 gap-2.5 md:hidden">
                      {rows.map((row: any, rIdx: number) => {
                        const isExact = row.status === "exact" || row.status === "ok";
                        const isPlus = row.status === "plus";
                        const isWarn = row.status === "warn";
                        const isMissing = row.status === "missing";
                        const isNeutral = row.status === "neutral";
                        
                        const badgeBg = isExact 
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                          : isPlus
                            ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                            : isWarn 
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" 
                              : isMissing
                                ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                : "bg-zinc-800 text-zinc-400 border border-zinc-700/50";
                        
                        const badgeText = isExact ? "Coincide" : isPlus ? "Plus Ofertado" : isWarn ? "Aproximado" : isMissing ? "No Cumple" : "Dato Pendiente";

                        const renderMobileInput = (label: string, isOffer: boolean, defaultVal: string) => {
                          if (!isEditingThisCard) {
                            return (
                              <span 
                                onClick={() => handleStartEdit(m)} 
                                className="cursor-pointer hover:underline hover:text-white transition-colors"
                              >
                                {defaultVal}
                              </span>
                            );
                          }
                          const cleanLbl = label.toLowerCase();
                          if (cleanLbl.includes('precio de venta')) {
                            return isOffer ? (
                              <input type="text" placeholder="Ej: 700000000" value={editForm.propPrice || ''} onChange={(e) => setEditForm(prev => ({ ...prev, propPrice: e.target.value }))} className="w-full bg-black/80 border border-[#bf953f] text-[#bf953f] font-bold text-xs p-1.5 rounded-lg" />
                            ) : (
                              <input type="text" placeholder="Ej: 700000000" value={editForm.reqBudget || ''} onChange={(e) => setEditForm(prev => ({ ...prev, reqBudget: e.target.value }))} className="w-full bg-black/80 border border-cyan-500 text-cyan-300 font-bold text-xs p-1.5 rounded-lg" />
                            );
                          }
                          if (cleanLbl.includes('precio de arriendo') || cleanLbl.includes('canon')) {
                            return isOffer ? (
                              <input type="text" placeholder="Ej: 2500000" value={editForm.propRentPrice || ''} onChange={(e) => setEditForm(prev => ({ ...prev, propRentPrice: e.target.value }))} className="w-full bg-black/80 border border-[#bf953f] text-[#bf953f] font-bold text-xs p-1.5 rounded-lg" />
                            ) : (
                              <input type="text" placeholder="Ej: 2500000" value={editForm.reqBudget || ''} onChange={(e) => setEditForm(prev => ({ ...prev, reqBudget: e.target.value }))} className="w-full bg-black/80 border border-cyan-500 text-cyan-300 font-bold text-xs p-1.5 rounded-lg" />
                            );
                          }
                          if (cleanLbl.includes('valor admin') || cleanLbl.includes('cuota de administración') || cleanLbl.includes('administración')) {
                            return isOffer ? (
                              <input type="text" placeholder="Ej: 500000" value={editForm.propAdminFee || ''} onChange={(e) => setEditForm(prev => ({ ...prev, propAdminFee: e.target.value }))} className="w-full bg-black/80 border border-[#bf953f] text-[#bf953f] font-bold text-xs p-1.5 rounded-lg" />
                            ) : (
                              <input type="text" placeholder="Ej: 600000" value={editForm.reqAdminMax || ''} onChange={(e) => setEditForm(prev => ({ ...prev, reqAdminMax: e.target.value }))} className="w-full bg-black/80 border border-cyan-500 text-cyan-300 font-bold text-xs p-1.5 rounded-lg" />
                            );
                          }
                          if (cleanLbl.includes('área total') || cleanLbl.includes('área')) {
                            return isOffer ? (
                              <input type="text" placeholder="Ej: 87" value={editForm.propArea || ''} onChange={(e) => setEditForm(prev => ({ ...prev, propArea: e.target.value }))} className="w-full bg-black/80 border border-[#bf953f] text-[#bf953f] font-bold text-xs p-1.5 rounded-lg" />
                            ) : (
                              <input type="text" placeholder="Ej: 80" value={editForm.reqArea || ''} onChange={(e) => setEditForm(prev => ({ ...prev, reqArea: e.target.value }))} className="w-full bg-black/80 border border-cyan-500 text-cyan-300 font-bold text-xs p-1.5 rounded-lg" />
                            );
                          }
                          if (cleanLbl.includes('habitaciones')) {
                            return isOffer ? (
                              <input type="number" placeholder="Ej: 3" value={editForm.propBedrooms ?? ''} onChange={(e) => setEditForm(prev => ({ ...prev, propBedrooms: e.target.value }))} className="w-full bg-black/80 border border-[#bf953f] text-[#bf953f] font-bold text-xs p-1.5 rounded-lg" />
                            ) : (
                              <input type="number" placeholder="Ej: 3" value={editForm.reqBedrooms ?? ''} onChange={(e) => setEditForm(prev => ({ ...prev, reqBedrooms: e.target.value }))} className="w-full bg-black/80 border border-cyan-500 text-cyan-300 font-bold text-xs p-1.5 rounded-lg" />
                            );
                          }
                          if (cleanLbl.includes('baños')) {
                            return isOffer ? (
                              <input type="number" placeholder="Ej: 3" value={editForm.propBathrooms ?? ''} onChange={(e) => setEditForm(prev => ({ ...prev, propBathrooms: e.target.value }))} className="w-full bg-black/80 border border-[#bf953f] text-[#bf953f] font-bold text-xs p-1.5 rounded-lg" />
                            ) : (
                              <input type="number" placeholder="Ej: 2" value={editForm.reqBathrooms ?? ''} onChange={(e) => setEditForm(prev => ({ ...prev, reqBathrooms: e.target.value }))} className="w-full bg-black/80 border border-cyan-500 text-cyan-300 font-bold text-xs p-1.5 rounded-lg" />
                            );
                          }
                          if (cleanLbl.includes('parqueaderos') || cleanLbl.includes('garajes')) {
                            return isOffer ? (
                              <input type="number" placeholder="Ej: 2" value={editForm.propGarages ?? ''} onChange={(e) => setEditForm(prev => ({ ...prev, propGarages: e.target.value }))} className="w-full bg-black/80 border border-[#bf953f] text-[#bf953f] font-bold text-xs p-1.5 rounded-lg" />
                            ) : (
                              <input type="number" placeholder="Ej: 2" value={editForm.reqGarages ?? ''} onChange={(e) => setEditForm(prev => ({ ...prev, reqGarages: e.target.value }))} className="w-full bg-black/80 border border-cyan-500 text-cyan-300 font-bold text-xs p-1.5 rounded-lg" />
                            );
                          }
                          if (cleanLbl.includes('estrato')) {
                            return isOffer ? (
                              <input type="number" placeholder="Ej: 4" value={editForm.propStratum ?? ''} onChange={(e) => setEditForm(prev => ({ ...prev, propStratum: e.target.value }))} className="w-full bg-black/80 border border-[#bf953f] text-[#bf953f] font-bold text-xs p-1.5 rounded-lg" />
                            ) : (
                              <input type="number" placeholder="Ej: 4" value={editForm.reqStratum ?? ''} onChange={(e) => setEditForm(prev => ({ ...prev, reqStratum: e.target.value }))} className="w-full bg-black/80 border border-cyan-500 text-cyan-300 font-bold text-xs p-1.5 rounded-lg" />
                            );
                          }
                          if (cleanLbl.includes('barrio')) {
                            return isOffer ? (
                              <input type="text" placeholder="Ej: Cedritos" value={editForm.propZone || ''} onChange={(e) => setEditForm(prev => ({ ...prev, propZone: e.target.value }))} className="w-full bg-black/80 border border-[#bf953f] text-[#bf953f] font-bold text-xs p-1.5 rounded-lg" />
                            ) : (
                              <input type="text" placeholder="Ej: Rosales" value={editForm.reqZone || ''} onChange={(e) => setEditForm(prev => ({ ...prev, reqZone: e.target.value }))} className="w-full bg-black/80 border border-cyan-500 text-cyan-300 font-bold text-xs p-1.5 rounded-lg" />
                            );
                          }
                          if (cleanLbl.includes('tipo de inmueble')) {
                            return isOffer ? (
                              <input type="text" placeholder="Ej: Apartamento" value={editForm.propPropertyType || ''} onChange={(e) => setEditForm(prev => ({ ...prev, propPropertyType: e.target.value }))} className="w-full bg-black/80 border border-[#bf953f] text-[#bf953f] font-bold text-xs p-1.5 rounded-lg" />
                            ) : (
                              <input type="text" placeholder="Ej: Apartamento" value={editForm.reqPropertyType || ''} onChange={(e) => setEditForm(prev => ({ ...prev, reqPropertyType: e.target.value }))} className="w-full bg-black/80 border border-cyan-500 text-cyan-300 font-bold text-xs p-1.5 rounded-lg" />
                            );
                          }
                          if (cleanLbl.includes('tipo de negocio')) {
                            return isOffer ? (
                              <select value={editForm.propTransactionType || ''} onChange={(e) => setEditForm(prev => ({ ...prev, propTransactionType: e.target.value }))} className="w-full bg-black/80 border border-[#bf953f] text-[#bf953f] font-bold text-xs p-1.5 rounded-lg">
                                <option value="">Seleccionar...</option>
                                <option value="venta">Venta</option>
                                <option value="arriendo">Arriendo</option>
                                <option value="venta_o_arriendo">Venta o Arriendo</option>
                                <option value="arriendo_con_opcion_de_compra">Arriendo con opción de compra</option>
                                <option value="arriendo_temporal">Arriendo temporal</option>
                                <option value="permuta">Permuta</option>
                                <option value="venta_permuta">Venta / Permuta</option>
                                <option value="aporte">Aporte</option>
                              </select>
                            ) : (
                              <select value={editForm.reqTransactionType || ''} onChange={(e) => setEditForm(prev => ({ ...prev, reqTransactionType: e.target.value }))} className="w-full bg-black/80 border border-cyan-500 text-cyan-300 font-bold text-xs p-1.5 rounded-lg">
                                <option value="">Seleccionar...</option>
                                <option value="venta">Venta</option>
                                <option value="arriendo">Arriendo</option>
                                <option value="venta_o_arriendo">Venta o Arriendo</option>
                                <option value="arriendo_con_opcion_de_compra">Arriendo con opción de compra</option>
                                <option value="arriendo_temporal">Arriendo temporal</option>
                                <option value="permuta">Permuta</option>
                                <option value="venta_permuta">Venta / Permuta</option>
                                <option value="aporte">Aporte</option>
                              </select>
                            );
                          }
                          if (cleanLbl.includes('localidad')) {
                            return isOffer ? (
                              <input type="text" placeholder="Ej: Usaquén" value={editForm.propLocality || ''} onChange={(e) => setEditForm(prev => ({ ...prev, propLocality: e.target.value }))} className="w-full bg-black/80 border border-[#bf953f] text-[#bf953f] font-bold text-xs p-1.5 rounded-lg" />
                            ) : (
                              <input type="text" placeholder="Ej: Usaquén" value={editForm.reqLocality || ''} onChange={(e) => setEditForm(prev => ({ ...prev, reqLocality: e.target.value }))} className="w-full bg-black/80 border border-cyan-500 text-cyan-300 font-bold text-xs p-1.5 rounded-lg" />
                            );
                          }
                          if (cleanLbl.includes('teléfono') || cleanLbl.includes('contacto') || cleanLbl.includes('asesor')) {
                            return isOffer ? (
                              <div className="space-y-1.5 w-full">
                                <input type="text" placeholder="👤 Nombre Asesor (ej: Erika Del Pilar)" value={editForm.propSenderName || ''} onChange={(e) => setEditForm(prev => ({ ...prev, propSenderName: e.target.value }))} className="w-full bg-black/80 border border-[#bf953f] text-[#bf953f] font-bold text-xs p-1.5 rounded-lg" />
                                <input type="text" placeholder="📞 WhatsApp (ej: +57 310 123 4567)" value={editForm.propPhone || ''} onChange={(e) => setEditForm(prev => ({ ...prev, propPhone: e.target.value }))} className="w-full bg-black/80 border border-[#bf953f] text-[#bf953f] font-bold text-xs p-1.5 rounded-lg" />
                                <input type="text" placeholder="📍 Grupo WhatsApp (ej: Rosales-Chicó)" value={editForm.propOrigenNombre || ''} onChange={(e) => setEditForm(prev => ({ ...prev, propOrigenNombre: e.target.value }))} className="w-full bg-black/80 border border-[#bf953f] text-[#bf953f] font-bold text-xs p-1.5 rounded-lg" />
                                <button
                                  type="button"
                                  onClick={() => handleSaveAdvisorDirect(true, m)}
                                  disabled={saveAdvisorMut.isPending}
                                  className="w-full mt-1 py-1.5 px-2 rounded-lg bg-gradient-to-r from-amber-600/30 to-amber-700/30 hover:from-amber-600/50 hover:to-amber-700/50 border border-amber-500/50 text-amber-300 font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                                  title="Guardar asesor permanentemente en PostgreSQL para que jamás se pierda"
                                >
                                  {saveAdvisorMut.isPending ? "⏳ Guardando..." : "💾 Guardar Asesor Permanente"}
                                </button>
                              </div>
                            ) : (
                              <div className="space-y-1.5 w-full">
                                <input type="text" placeholder="👤 Nombre Asesor (ej: Erika Del Pilar)" value={editForm.reqSenderName || ''} onChange={(e) => setEditForm(prev => ({ ...prev, reqSenderName: e.target.value }))} className="w-full bg-black/80 border border-cyan-500 text-cyan-300 font-bold text-xs p-1.5 rounded-lg" />
                                <input type="text" placeholder="📞 WhatsApp (ej: +57 310 123 4567)" value={editForm.reqPhone || ''} onChange={(e) => setEditForm(prev => ({ ...prev, reqPhone: e.target.value }))} className="w-full bg-black/80 border border-cyan-500 text-cyan-300 font-bold text-xs p-1.5 rounded-lg" />
                                <input type="text" placeholder="📍 Grupo WhatsApp (ej: VECY INMUEBLES NETWORK)" value={editForm.reqOrigenNombre || ''} onChange={(e) => setEditForm(prev => ({ ...prev, reqOrigenNombre: e.target.value }))} className="w-full bg-black/80 border border-cyan-500 text-cyan-300 font-bold text-xs p-1.5 rounded-lg" />
                                <button
                                  type="button"
                                  onClick={() => handleSaveAdvisorDirect(false, m)}
                                  disabled={saveAdvisorMut.isPending}
                                  className="w-full mt-1 py-1.5 px-2 rounded-lg bg-gradient-to-r from-cyan-600/30 to-blue-700/30 hover:from-cyan-600/50 hover:to-blue-700/50 border border-cyan-500/50 text-cyan-300 font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                                  title="Guardar asesor permanentemente en PostgreSQL para que jamás se pierda"
                                >
                                  {saveAdvisorMut.isPending ? "⏳ Guardando..." : "💾 Guardar Asesor Permanente"}
                                </button>
                              </div>
                            );
                          }
                          if (cleanLbl.includes('antigüedad') || cleanLbl.includes('antiguedad') || cleanLbl.includes('año')) {
                            const displayYear = editForm.propYearBuilt ?? '';
                            const displayAge = editForm.propAntiguedadAnos ?? '';
                            const rawInput = editForm.propAntiguedadRaw !== undefined
                              ? editForm.propAntiguedadRaw
                              : (displayYear ? `${displayYear}` : (displayAge !== '' ? `${displayAge}` : ''));
                            return isOffer ? (
                              <div className="space-y-1 w-full">
                                <input
                                  type="text"
                                  placeholder="Ej: 1994 ó 32"
                                  value={rawInput}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    let digits = val.replace(/[^0-9]/g, '');
                                    let y: number | undefined = undefined;
                                    let a: number | undefined = undefined;
                                    if (digits.length === 4) {
                                      const parsedY = parseInt(digits, 10);
                                      if (parsedY >= 1900 && parsedY <= 2030) {
                                        y = parsedY;
                                        a = Math.max(0, 2026 - parsedY);
                                      }
                                    } else if (digits.length > 0 && digits.length <= 3) {
                                      const parsedA = parseInt(digits, 10);
                                      if (parsedA >= 0 && parsedA <= 120) {
                                        a = parsedA;
                                        y = 2026 - parsedA;
                                      }
                                    }
                                    setEditForm(prev => ({
                                      ...prev,
                                      propAntiguedadRaw: val,
                                      propYearBuilt: y !== undefined ? y : (digits.length === 4 ? parseInt(digits, 10) : prev.propYearBuilt),
                                      propAntiguedadAnos: a !== undefined ? a : (digits.length <= 3 && digits.length > 0 ? parseInt(digits, 10) : prev.propAntiguedadAnos),
                                    }));
                                  }}
                                  className="w-full bg-black/80 border border-[#bf953f] text-[#bf953f] font-bold text-xs p-1.5 rounded-lg"
                                />
                                {(displayYear || displayAge !== '') && (
                                  <span className="text-[10px] text-emerald-400 font-bold block">
                                    📅 Año: {displayYear || (displayAge ? 2026 - Number(displayAge) : '1994')} · ⏳ {displayAge !== '' ? displayAge : (displayYear ? 2026 - Number(displayYear) : '32')} años
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div className="space-y-1 w-full">
                                <input
                                  type="number"
                                  placeholder="Máx años (ej: 10, o vacío flexible)"
                                  value={editForm.reqAntiguedadMax !== undefined ? editForm.reqAntiguedadMax : ''}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, reqAntiguedadMax: e.target.value }))}
                                  className="w-full bg-black/80 border border-cyan-500 text-cyan-300 font-bold text-xs p-1.5 rounded-lg"
                                />
                                <span className="text-[10px] text-cyan-400/80 block">
                                  {editForm.reqAntiguedadMax && Number(editForm.reqAntiguedadMax) > 0 ? `Tope: Máx ${editForm.reqAntiguedadMax} años` : 'Flexible / Sin restricción de edad'}
                                </span>
                              </div>
                            );
                          }

                          if (cleanLbl.includes('ubicación en piso') || cleanLbl.includes('vista')) {
                            return isOffer ? (
                              <select value={editForm.propExtInt || ''} onChange={(e) => setEditForm(prev => ({ ...prev, propExtInt: e.target.value }))} className="w-full bg-black/80 border border-[#bf953f] text-[#bf953f] font-bold text-xs p-1.5 rounded-lg">
                                <option value="">Seleccionar Vista...</option>
                                <option value="Interior">Interior</option>
                                <option value="Exterior">Exterior</option>
                                <option value="Exterior e Interior">Exterior e Interior (Mixto)</option>
                              </select>
                            ) : (
                              <select value={editForm.reqExtInt || ''} onChange={(e) => setEditForm(prev => ({ ...prev, reqExtInt: e.target.value }))} className="w-full bg-black/80 border border-cyan-500 text-cyan-300 font-bold text-xs p-1.5 rounded-lg">
                                <option value="">Flexible / Sin restricción</option>
                                <option value="Exterior">Exige Vista Exterior</option>
                                <option value="Interior">Exige Vista Interior</option>
                                <option value="Exterior e Interior">Exige Mixto</option>
                              </select>
                            );
                          }

                          if (cleanLbl.includes('cocina')) {
                            return isOffer ? (
                              <select value={editForm.propCocina || ''} onChange={(e) => setEditForm(prev => ({ ...prev, propCocina: e.target.value }))} className="w-full bg-black/80 border border-[#bf953f] text-[#bf953f] font-bold text-xs p-1.5 rounded-lg">
                                <option value="">Seleccionar Cocina...</option>
                                <option value="Cerrada">Cocina Cerrada</option>
                                <option value="Abierta">Cocina Abierta</option>
                                <option value="Abierta tipo Isla">Con Isla</option>
                                <option value="Integral">Integral</option>
                                <option value="Semi-abierta">Semi-abierta</option>
                              </select>
                            ) : (
                              <select value={editForm.reqCocina || ''} onChange={(e) => setEditForm(prev => ({ ...prev, reqCocina: e.target.value }))} className="w-full bg-black/80 border border-cyan-500 text-cyan-300 font-bold text-xs p-1.5 rounded-lg">
                                <option value="">Flexible</option>
                                <option value="Cerrada">Exige Cocina Cerrada</option>
                                <option value="Abierta">Exige Cocina Abierta</option>
                                <option value="Abierta tipo Isla">Exige Isla</option>
                                <option value="Integral">Exige Integral</option>
                              </select>
                            );
                          }

                          if (cleanLbl.includes('servicio') || cleanLbl.includes('cbs')) {
                            return isOffer ? (
                              <select value={editForm.propCuartoServicio || ''} onChange={(e) => setEditForm(prev => ({ ...prev, propCuartoServicio: e.target.value }))} className="w-full bg-black/80 border border-[#bf953f] text-[#bf953f] font-bold text-xs p-1.5 rounded-lg">
                                <option value="">Seleccionar CBS...</option>
                                <option value="Sí (Con Baño Privado)">Sí (Con Baño Privado)</option>
                                <option value="Sí (Sin Baño)">Sí (Sin Baño)</option>
                                <option value="Solo baño de servicio">Solo baño de servicio</option>
                                <option value="No tiene">No tiene</option>
                              </select>
                            ) : (
                              <select value={editForm.reqCuartoServicio || ''} onChange={(e) => setEditForm(prev => ({ ...prev, reqCuartoServicio: e.target.value }))} className="w-full bg-black/80 border border-cyan-500 text-cyan-300 font-bold text-xs p-1.5 rounded-lg">
                                <option value="">Flexible</option>
                                <option value="Exige CBS con Baño">Exige CBS con Baño</option>
                                <option value="Exige Cuarto de Servicio">Exige Cuarto de Servicio</option>
                                <option value="No requerido">No requerido</option>
                              </select>
                            );
                          }

                          if (cleanLbl.includes('depósito') || cleanLbl.includes('deposito') || cleanLbl.includes('cuarto útil') || cleanLbl.includes('cuarto util')) {
                            return isOffer ? (
                              <input type="text" placeholder="Ej: 1 ó Sí" value={editForm.propDepositos !== undefined ? editForm.propDepositos : (defaultVal !== 'N/E' ? defaultVal : '')} onChange={(e) => setEditForm(prev => ({ ...prev, propDepositos: e.target.value }))} className="w-full bg-black/80 border border-[#bf953f] text-[#bf953f] font-bold text-xs p-1.5 rounded-lg" />
                            ) : (
                              <input type="text" placeholder="Ej: 1 ó Exige Depósito" value={editForm.reqDepositos !== undefined ? editForm.reqDepositos : (defaultVal !== 'N/E' ? defaultVal : '')} onChange={(e) => setEditForm(prev => ({ ...prev, reqDepositos: e.target.value }))} className="w-full bg-black/80 border border-cyan-500 text-cyan-300 font-bold text-xs p-1.5 rounded-lg" />
                            );
                          }

                          if (cleanLbl.includes('área de terraza') || cleanLbl.includes('area de terraza')) {
                            return isOffer ? (
                              <input type="text" placeholder="Ej: 72 m²" value={editForm.propTerraceArea !== undefined ? editForm.propTerraceArea : (defaultVal !== 'N/E' ? defaultVal : '')} onChange={(e) => setEditForm(prev => ({ ...prev, propTerraceArea: e.target.value }))} className="w-full bg-black/80 border border-[#bf953f] text-[#bf953f] font-bold text-xs p-1.5 rounded-lg" />
                            ) : (
                              <input type="text" placeholder="Ej: 50 m²" value={editForm.reqTerraceArea !== undefined ? editForm.reqTerraceArea : (defaultVal !== 'N/E' ? defaultVal : '')} onChange={(e) => setEditForm(prev => ({ ...prev, reqTerraceArea: e.target.value }))} className="w-full bg-black/80 border border-cyan-500 text-cyan-300 font-bold text-xs p-1.5 rounded-lg" />
                            );
                          }

                          if (cleanLbl.includes('área de balcón') || cleanLbl.includes('area de balcón') || cleanLbl.includes('area de balcon') || cleanLbl.includes('área de balcon')) {
                            return isOffer ? (
                              <input type="text" placeholder="Ej: 4 m²" value={editForm.propBalconyArea !== undefined ? editForm.propBalconyArea : (defaultVal !== 'N/E' ? defaultVal : '')} onChange={(e) => setEditForm(prev => ({ ...prev, propBalconyArea: e.target.value }))} className="w-full bg-black/80 border border-[#bf953f] text-[#bf953f] font-bold text-xs p-1.5 rounded-lg" />
                            ) : (
                              <input type="text" placeholder="Ej: 2 m²" value={editForm.reqBalconyArea !== undefined ? editForm.reqBalconyArea : (defaultVal !== 'N/E' ? defaultVal : '')} onChange={(e) => setEditForm(prev => ({ ...prev, reqBalconyArea: e.target.value }))} className="w-full bg-black/80 border border-cyan-500 text-cyan-300 font-bold text-xs p-1.5 rounded-lg" />
                            );
                          }

                          if (cleanLbl.includes('balcón') || cleanLbl.includes('balcon') || cleanLbl.includes('terraza') || cleanLbl.includes('patio')) {
                            return isOffer ? (
                              <select value={editForm.propBalcon || ''} onChange={(e) => setEditForm(prev => ({ ...prev, propBalcon: e.target.value }))} className="w-full bg-black/80 border border-[#bf953f] text-[#bf953f] font-bold text-xs p-1.5 rounded-lg">
                                <option value="">Seleccionar...</option>
                                <option value="Balcón">Balcón</option>
                                <option value="Terraza">Terraza Privada</option>
                                <option value="Balcón y Terraza">Balcón y Terraza</option>
                                <option value="Patio">Patio</option>
                                <option value="No tiene">No tiene</option>
                              </select>
                            ) : (
                              <select value={editForm.reqBalcon || ''} onChange={(e) => setEditForm(prev => ({ ...prev, reqBalcon: e.target.value }))} className="w-full bg-black/80 border border-cyan-500 text-cyan-300 font-bold text-xs p-1.5 rounded-lg">
                                <option value="">Flexible</option>
                                <option value="Exige Balcón">Exige Balcón</option>
                                <option value="Exige Terraza">Exige Terraza</option>
                                <option value="Exige Patio">Exige Patio / Jardín</option>
                              </select>
                            );
                          }

                          if (cleanLbl.includes('tipo de garaje')) {
                            return isOffer ? (
                              <select value={editForm.propGarageType || ''} onChange={(e) => setEditForm(prev => ({ ...prev, propGarageType: e.target.value }))} className="w-full bg-black/80 border border-[#bf953f] text-[#bf953f] font-bold text-xs p-1.5 rounded-lg">
                                <option value="">Seleccionar...</option>
                                <option value="independiente">Independiente</option>
                                <option value="lineal">Lineal</option>
                                <option value="mixto">Mixto</option>
                                <option value="cubierto">Cubierto</option>
                                <option value="descubierto">Descubierto</option>
                              </select>
                            ) : (
                              <select value={editForm.reqGarageType || ''} onChange={(e) => setEditForm(prev => ({ ...prev, reqGarageType: e.target.value }))} className="w-full bg-black/80 border border-cyan-500 text-cyan-300 font-bold text-xs p-1.5 rounded-lg">
                                <option value="">Flexible</option>
                                <option value="independiente">Exige Independientes</option>
                                <option value="cubierto">Exige Cubiertos</option>
                              </select>
                            );
                          }

                          if (cleanLbl.includes('piso / nivel')) {
                            return isOffer ? (
                              <input type="text" placeholder="Ej: Piso 2 alto" value={editForm.propPisoNivel !== undefined ? editForm.propPisoNivel : (defaultVal !== 'N/E' ? defaultVal : '')} onChange={(e) => setEditForm(prev => ({ ...prev, propPisoNivel: e.target.value }))} className="w-full bg-black/80 border border-[#bf953f] text-[#bf953f] font-bold text-xs p-1.5 rounded-lg" />
                            ) : (
                              <input type="text" placeholder="Ej: Piso alto, Flexible" value={editForm.reqPisoNivel !== undefined ? editForm.reqPisoNivel : (defaultVal !== 'N/E' ? defaultVal : '')} onChange={(e) => setEditForm(prev => ({ ...prev, reqPisoNivel: e.target.value }))} className="w-full bg-black/80 border border-cyan-500 text-cyan-300 font-bold text-xs p-1.5 rounded-lg" />
                            );
                          }

                          const propKey = `prop_custom_${cleanLbl.replace(/[^a-z0-9]/g, '')}`;
                          const reqKey = `req_custom_${cleanLbl.replace(/[^a-z0-9]/g, '')}`;
                          return isOffer ? (
                            <input type="text" placeholder={`Editar ${label}`} value={editForm[propKey] !== undefined ? editForm[propKey] : (defaultVal !== 'N/E' ? defaultVal : '')} onChange={(e) => setEditForm(prev => ({ ...prev, [propKey]: e.target.value }))} className="w-full bg-black/80 border border-[#bf953f] text-[#bf953f] font-bold text-xs p-1.5 rounded-lg" />
                          ) : (
                            <input type="text" placeholder={`Editar ${label}`} value={editForm[reqKey] !== undefined ? editForm[reqKey] : (defaultVal !== 'N/E' ? defaultVal : '')} onChange={(e) => setEditForm(prev => ({ ...prev, [reqKey]: e.target.value }))} className="w-full bg-black/80 border border-cyan-500 text-cyan-300 font-bold text-xs p-1.5 rounded-lg" />
                          );
                        };

                        return (
                          <div key={rIdx} className="bg-zinc-900/70 border border-white/5 rounded-2xl p-3 space-y-2">
                            {/* Cabecera con Nombre de Atributo y Badge de Cumplimiento a la derecha */}
                            <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-1.5">
                              <div className="flex items-center gap-1.5 font-bold text-xs text-zinc-200">
                                {row.icon}
                                <span>{row.label}</span>
                              </div>
                              <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider shrink-0 ${badgeBg}`}>
                                {badgeText}
                              </span>
                            </div>

                            {/* Subfilas Verticales: OFRECIDO (Dorada) vs BUSCADO (Cyan) */}
                            <div className="grid grid-cols-1 gap-1.5 text-xs pt-0.5">
                              <div className="bg-[#bf953f]/5 border border-[#bf953f]/10 p-2 rounded-xl">
                                <span className="text-[9px] uppercase tracking-wider font-extrabold text-[#bf953f]/80 block">
                                  🏢 Ofrecido (Oferta)
                                </span>
                                <span className="font-bold text-[#bf953f] break-words mt-0.5 block">
                                  {renderMobileInput(row.label, true, row.propVal)}
                                </span>
                              </div>

                              <div className="bg-cyan-500/5 border border-cyan-500/10 p-2 rounded-xl">
                                <span className="text-[9px] uppercase tracking-wider font-extrabold text-cyan-400/80 block">
                                  🔍 Buscado (Demanda)
                                </span>
                                <span className="font-bold text-cyan-300 break-words mt-0.5 block">
                                  {renderMobileInput(row.label, false, row.reqVal)}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* BARRA DE ACCIÓN: AGREGAR CARACTERÍSTICAS A LA FICHA */}
                    {isEditingThisCard && (
                      <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between gap-3">
                        <span className="text-[11px] text-zinc-400 flex items-center gap-1.5 font-medium">
                          <Sparkles className="w-3.5 h-3.5 text-[#bf953f]" />
                          <span>Enriquecer ficha técnica:</span>
                        </span>
                        <select
                          defaultValue=""
                          onChange={(e) => {
                            if (e.target.value) {
                              handleAddAttributeToCard(m.id, e.target.value);
                              e.target.value = "";
                            }
                          }}
                          className="bg-black/90 border border-[#bf953f]/40 text-amber-300 text-xs py-1.5 px-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#bf953f] cursor-pointer hover:border-[#bf953f] transition-colors"
                        >
                          <option value="" disabled>➕ Agregar Atributo o Amenidad...</option>
                          <option value="antiguedad">📅 Antigüedad / Año de Construcción</option>
                          <option value="vista">🧭 Ubicación en Piso (Vista)</option>
                          <option value="balcon">🌿 Balcón / Terraza / Patio</option>
                          <option value="cocina">🍽️ Tipología de Cocina</option>
                          <option value="cbs">🏠 Cuarto y Baño de Servicio (CBS)</option>
                          <option value="deposito">📦 Depósito / Cuarto Útil</option>
                          <option value="garaje_tipo">🚗 Tipo de Garaje (Independiente/Lineal)</option>
                          <option value="ascensor">🛗 Ascensor</option>
                          <option value="conjunto">🛡️ Conjunto Cerrado / Club House</option>
                          <option value="chimenea">🔥 Chimenea</option>
                          <option value="gas">🔥 Gas Natural</option>
                          <option value="gimnasio">🏋️ Gimnasio</option>
                          <option value="piscina">🏊 Piscina</option>
                          <option value="cancha">🎾 Cancha Deportiva / Squash</option>
                          <option value="zona_infantil">🎠 Zona Infantil</option>
                          <option value="vigilancia">👮 Vigilancia & Portería 24/7</option>
                          <option value="planta">⚡ Planta Eléctrica</option>
                          <option value="estado">🛠️ Estado del Inmueble</option>
                          <option value="lavanderia">🧺 Zona de Lavandería</option>
                          <option value="custom">✏️ Otro Atributo Personalizado...</option>
                        </select>
                      </div>
                    )}
                  </div>
                )}
              </>
            );
          })()}

                  {/* Síntesis o Justificación Humana de la IA (Limpia, sin volcados de JSON) */}
                  {(() => {
                    const cleanReason = getCleanMatchReason(m.matchReason);
                    if (!cleanReason) return null;
                    return (
                      <div className="px-4 sm:px-6 py-2.5 bg-white/[0.01] border-t border-white/5 text-xs text-zinc-400 leading-relaxed flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-[#bf953f] shrink-0" />
                        <span className="font-semibold text-zinc-300">Síntesis JanIA:</span>
                        <span className="text-zinc-400 italic">"{cleanReason}"</span>
                      </div>
                    );
                  })()}

                  {/* CAPA C: RETROALIMENTACIÓN ACTIVA DE BROKER / ENTRENAMIENTO JANIA */}
                  <div className="px-4 sm:px-6 py-3.5 bg-gradient-to-r from-zinc-950 via-zinc-900/90 to-zinc-950 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="text-[11px] text-zinc-300 flex items-center gap-2 font-semibold">
                      <Sparkles className="w-4 h-4 text-amber-400 animate-pulse shrink-0" />
                      <span>Calificación Comercial (Entrenamiento JanIA):</span>
                    </div>
                    {(() => {
                      if (commercialStatusFeedbackMap[m.id]) {
                        return (
                          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-black/80 border border-amber-400 text-amber-300 font-extrabold text-xs shadow-[0_0_25px_rgba(245,158,11,0.85),inset_0_0_12px_rgba(245,158,11,0.3)] animate-in zoom-in-95 duration-300">
                            <Check className="w-4 h-4 text-amber-300 animate-bounce" />
                            <span className="drop-shadow-[0_0_8px_rgba(245,158,11,0.9)]">{commercialStatusFeedbackMap[m.id]}</span>
                          </div>
                        );
                      }

                      const fbState = feedbackStatusMap[m.id];
                      if (fbState === 'exitoso') {
                        return (
                          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-black/80 border border-emerald-400 text-emerald-300 font-extrabold text-xs shadow-[0_0_25px_rgba(52,211,153,0.85),inset_0_0_12px_rgba(52,211,153,0.3)] animate-in zoom-in-95 duration-300">
                            <Check className="w-4 h-4 text-emerald-300 animate-bounce" />
                            <span className="drop-shadow-[0_0_8px_rgba(52,211,153,0.9)]">¡Trato en Curso Registrado con Éxito!</span>
                          </div>
                        );
                      }
                      if (fbState === 'rechazado') {
                        return (
                          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-black/80 border border-rose-400 text-rose-300 font-extrabold text-xs shadow-[0_0_25px_rgba(244,63,94,0.85),inset_0_0_12px_rgba(244,63,94,0.3)] animate-in zoom-in-95 duration-300">
                            <Check className="w-4 h-4 text-rose-300 animate-bounce" />
                            <span className="drop-shadow-[0_0_8px_rgba(244,63,94,0.9)]">¡Match Descartado y Aprendido!</span>
                          </div>
                        );
                      }

                      return (
                        <div className="grid grid-cols-1 sm:flex items-center gap-2.5 w-full sm:w-auto">
                          <button
                            type="button"
                            onClick={() => handleFeedback(m, 'exitoso')}
                            className="group relative h-10 sm:h-9 px-4 text-xs font-extrabold text-emerald-400 bg-black/70 hover:bg-black/90 border border-emerald-500/40 hover:border-emerald-300 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 hover:shadow-[0_0_22px_rgba(52,211,153,0.85),inset_0_0_10px_rgba(52,211,153,0.25)] hover:scale-105 active:scale-95 w-full sm:w-auto min-h-[40px] cursor-pointer"
                            title="Registrar trato en curso"
                          >
                            <ThumbsUp className="w-4 h-4 stroke-[2.5] text-emerald-400 transition-all duration-300 group-hover:scale-125 group-hover:-rotate-12 group-hover:text-emerald-300 group-hover:drop-shadow-[0_0_12px_rgba(52,211,153,1)]" />
                            <span className="font-extrabold text-emerald-400 transition-all duration-300 group-hover:text-emerald-200 group-hover:drop-shadow-[0_0_10px_rgba(52,211,153,0.9)]">
                              🤝 Trato en Curso
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => { setRejectModalMatch(m); setSelectedRejectReasons([]); setCustomRejectNote(''); }}
                            className="group relative h-10 sm:h-9 px-4 text-xs font-extrabold text-rose-400 bg-black/70 hover:bg-black/90 border border-rose-500/40 hover:border-rose-300 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 hover:shadow-[0_0_22px_rgba(244,63,94,0.85),inset_0_0_10px_rgba(244,63,94,0.25)] hover:scale-105 active:scale-95 w-full sm:w-auto min-h-[40px] cursor-pointer"
                            title="Descartar este match"
                          >
                            <ThumbsDown className="w-4 h-4 stroke-[2.5] text-rose-400 transition-all duration-300 group-hover:scale-125 group-hover:rotate-12 group-hover:text-rose-300 group-hover:drop-shadow-[0_0_12px_rgba(244,63,94,1)]" />
                            <span className="font-extrabold text-rose-400 transition-all duration-300 group-hover:text-rose-200 group-hover:drop-shadow-[0_0_10px_rgba(244,63,94,0.9)]">
                              ⛔ Descartar Match
                            </span>
                          </button>

                          {/* Menú Rápido de Estado Comercial del Inmueble (v31.16) */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                disabled={statusUpdatingMatchId === m.id}
                                className="group relative h-10 sm:h-9 px-3.5 text-xs font-extrabold text-amber-300 bg-black/70 hover:bg-black/90 border border-amber-500/40 hover:border-amber-300 rounded-xl flex items-center justify-center gap-1.5 transition-all duration-300 hover:shadow-[0_0_20px_rgba(245,158,11,0.7),inset_0_0_8px_rgba(245,158,11,0.2)] hover:scale-105 active:scale-95 w-full sm:w-auto min-h-[40px] cursor-pointer"
                                title="Actualizar estado comercial del inmueble si ya no está disponible"
                              >
                                {statusUpdatingMatchId === m.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
                                ) : (
                                  <Tag className="w-4 h-4 text-amber-400 transition-transform duration-300 group-hover:rotate-12" />
                                )}
                                <span className="font-extrabold text-amber-300">
                                  🏷️ Estado Inmueble ▾
                                </span>
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-zinc-950/95 border border-zinc-800 text-white min-w-[260px] p-2 shadow-2xl backdrop-blur-2xl rounded-2xl z-50">
                              <div className="px-2.5 py-1.5 text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider border-b border-white/10 mb-1 flex items-center justify-between">
                                <span>Estado Predial #{m.property?.id}</span>
                                <span className="text-amber-400 text-[9px]">1-Clic BD</span>
                              </div>
                              <DropdownMenuItem
                                onClick={() => handleUpdateCommercialStatus(m, 'VENDIDO')}
                                className="flex items-center gap-2.5 px-3 py-2.5 text-xs font-bold text-emerald-300 hover:text-emerald-100 hover:bg-emerald-950/60 rounded-xl cursor-pointer transition-colors"
                              >
                                <span className="text-sm">🔑</span>
                                <span>Marcar como Vendido</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleUpdateCommercialStatus(m, 'ARRENDADO')}
                                className="flex items-center gap-2.5 px-3 py-2.5 text-xs font-bold text-cyan-300 hover:text-cyan-100 hover:bg-cyan-950/60 rounded-xl cursor-pointer transition-colors"
                              >
                                <span className="text-sm">🗝️</span>
                                <span>Marcar como Arrendado</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleUpdateCommercialStatus(m, 'INACTIVO')}
                                className="flex items-center gap-2.5 px-3 py-2.5 text-xs font-bold text-rose-300 hover:text-rose-100 hover:bg-rose-950/60 rounded-xl cursor-pointer transition-colors"
                              >
                                <span className="text-sm">🤦🏻‍♀️</span>
                                <span>Marcar como Ya No Disponible / Inactivo</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      );
                    })()}
                  </div>

                  {/* BARRA DE EDICIÓN FLOTANTE / STICKY EN EL FOOTER DE LA TARJETA */}
                  {isEditingThisCard && (
                    <div className="sticky bottom-0 z-30 bg-gradient-to-r from-emerald-950 via-zinc-900 to-emerald-950 border-t border-emerald-500/40 p-3.5 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xl rounded-b-3xl">
                      <div className="flex items-center gap-2.5 text-emerald-400 text-xs font-semibold">
                        <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse shrink-0" />
                        <span>
                          Modo Edición Activo: Usa <strong>Guardar</strong> para registrar datos faltantes en la BD, o <strong>Recalcular</strong> si deseas buscar nuevas parejas en toda la red.
                        </span>
                      </div>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
                        {(() => {
                          const sStatus = saveStatusMap[m.id];
                          return (
                            <>
                              {sStatus === 'saved' && (
                                <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-black/90 border border-emerald-400 text-emerald-300 font-extrabold text-xs shadow-[0_0_20px_rgba(52,211,153,0.8)] animate-in zoom-in-95 shrink-0">
                                  <Check className="w-4 h-4 text-emerald-300 animate-bounce" />
                                  <span className="drop-shadow-[0_0_8px_rgba(52,211,153,0.9)]">¡Guardado en BD!</span>
                                </div>
                              )}
                              {sStatus === 'recalculated' && (
                                <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-black/90 border border-cyan-400 text-cyan-300 font-extrabold text-xs shadow-[0_0_20px_rgba(6,182,212,0.8)] animate-in zoom-in-95 shrink-0">
                                  <Sparkles className="w-4 h-4 text-cyan-300 animate-spin" />
                                  <span className="drop-shadow-[0_0_8px_rgba(6,182,212,0.9)]">¡Recalculado!</span>
                                </div>
                              )}
                              <Button
                                onClick={() => { setEditingMatchId(null); setEditForm({}); }}
                                variant="outline"
                                disabled={isSavingOnly || isRecalculating}
                                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-xs h-10 px-3 min-h-[44px] w-full sm:w-auto"
                              >
                                Cancelar
                              </Button>
                              <Button
                                onClick={() => handleOnlySave(m)}
                                disabled={isSavingOnly || isRecalculating}
                                className="group bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs h-10 px-4 shadow-md hover:shadow-[0_0_20px_rgba(245,158,11,0.5)] min-h-[44px] flex items-center justify-center gap-2 w-full sm:w-auto transition-all hover:scale-105 active:scale-95"
                              >
                                {isSavingOnly ? <Loader2 className="w-4 h-4 animate-spin text-black" /> : <Save className="w-4 h-4 transition-transform group-hover:scale-110" />}
                                <span>Guardar</span>
                              </Button>
                              <Button
                                onClick={() => handleRecalculateMatch(m)}
                                disabled={isSavingOnly || isRecalculating}
                                className="group bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs h-10 px-4 shadow-lg hover:shadow-[0_0_25px_rgba(16,185,129,0.6)] min-h-[44px] flex items-center justify-center gap-2 w-full sm:w-auto transition-all hover:scale-105 active:scale-95"
                              >
                                {isRecalculating ? <Loader2 className="w-4 h-4 animate-spin text-black" /> : <Sparkles className="w-4 h-4 transition-transform group-hover:rotate-45" />}
                                <span>Recalcular</span>
                              </Button>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  )}

                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Barra de Paginación Ultra-Rápida */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-[#0c0c0c] border border-white/5 shadow-xl">
            <div className="text-xs text-zinc-400 text-center sm:text-left">
              Mostrando <span className="text-white font-bold">{(currentPage - 1) * pageSize + 1}</span> a <span className="text-white font-bold">{Math.min(currentPage * pageSize, filteredMatches.length)}</span> de <span className="text-[#bf953f] font-bold">{filteredMatches.length}</span> coincidencias calificadas
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => {
                  setCurrentPage(p => Math.max(1, p - 1));
                  window.scrollTo({ top: 250, behavior: 'smooth' });
                }}
                className="h-9 px-3.5 text-xs font-semibold border-white/10 bg-zinc-900 text-zinc-300 hover:text-white hover:bg-zinc-800 disabled:opacity-30 transition-all cursor-pointer"
              >
                ← Anterior
              </Button>

              <div className="px-3.5 py-1.5 bg-black/60 border border-white/10 rounded-xl text-xs font-mono font-bold text-[#bf953f]">
                {currentPage} / {totalPages}
              </div>

              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => {
                  setCurrentPage(p => Math.min(totalPages, p + 1));
                  window.scrollTo({ top: 250, behavior: 'smooth' });
                }}
                className="h-9 px-3.5 text-xs font-semibold border-white/10 bg-zinc-900 text-zinc-300 hover:text-white hover:bg-zinc-800 disabled:opacity-30 transition-all cursor-pointer"
              >
                Siguiente →
              </Button>
            </div>
          </div>
        )}
      </div>
      )}

      {/* Footer Version Stamp */}
      <div className="pt-6 border-t border-white/5 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
        <div>VECY Network Colombia &copy; 2026</div>
        <div className="text-[#bf953f] font-bold">{VECY_VERSION_LABEL}</div>
      </div>

      {/* ── POPUP MEJORADO DE DESCARTE Y APRENDIZAJE DOCTRINAL JANIA ── */}
      {rejectModalMatch && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#101010] border-2 border-rose-500/50 rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-[0_0_60px_rgba(244,63,94,0.35)] overflow-hidden">
            
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-rose-500/15 border border-rose-500/30 rounded-2xl text-rose-400">
                  <ThumbsDown className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-extrabold text-white">
                      Descartar Coincidencia Comercial
                    </h3>
                    {selectedRejectReasons.length > 0 && (
                      <span className="text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-rose-400" />
                        {selectedRejectReasons.length} {selectedRejectReasons.length === 1 ? 'motivo seleccionado' : 'motivos seleccionados'}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] font-mono text-rose-400">
                    JanIA Active Feedback Loop · Selección Múltiple · Memoria Permanente
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {selectedRejectReasons.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedRejectReasons([])}
                    className="text-[10px] text-zinc-400 hover:text-rose-300 px-2 py-1 rounded bg-zinc-800/60 hover:bg-zinc-800 transition-colors"
                  >
                    Limpiar selección
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => { setRejectModalMatch(null); setSelectedRejectReasons([]); setCustomRejectNote(''); }}
                  className="w-8 h-8 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                  title="Cerrar ventana"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
              
              {/* Resumen Bilateral de la Pareja */}
              <div className="p-3.5 rounded-2xl bg-black/70 border border-white/10 space-y-2">
                <div className="flex items-center justify-between text-zinc-400 font-mono text-[11px]">
                  <span className="text-emerald-400 font-bold">🏢 Oferta #{rejectModalMatch.property?.id || '—'}</span>
                  <span className="text-zinc-500 font-bold">↔</span>
                  <span className="text-amber-400 font-bold">🔍 Demanda #{rejectModalMatch.requirement?.id || '—'}</span>
                </div>
                <div className="grid grid-cols-2 gap-2.5 text-[11px]">
                  <div className="bg-zinc-900/80 p-2.5 rounded-xl border border-white/5 truncate">
                    <div className="text-zinc-200 font-bold truncate">{rejectModalMatch.property?.name || 'Inmueble'}</div>
                    <div className="text-emerald-300 text-[10px] truncate mt-0.5">
                      📍 {rejectModalMatch.property?.zone || rejectModalMatch.property?.addressNeighborhood || 'Bogotá'}
                    </div>
                  </div>
                  <div className="bg-zinc-900/80 p-2.5 rounded-xl border border-white/5 truncate">
                    <div className="text-zinc-200 font-bold truncate">{rejectModalMatch.requirement?.name || rejectModalMatch.requirement?.nombreUsuarioWhatsapp || 'Requerimiento'}</div>
                    <div className="text-amber-300 text-[10px] truncate mt-0.5">
                      📍 {rejectModalMatch.requirement?.zonaDeseada || rejectModalMatch.requirement?.addressNeighborhood || 'Bogotá'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-zinc-300 font-medium">
                <span>Puedes marcar <strong>una o varias opciones</strong> que expliquen por qué no encajan:</span>
                <span className="text-[10px] text-zinc-500 font-mono">Selección Múltiple</span>
              </div>

              {/* Categorías Temáticas de Descarte */}
              <div className="space-y-3.5">
                {REJECT_CATEGORIES.map((cat, cIdx) => (
                  <div key={cIdx} className="space-y-1.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center justify-between px-1">
                      <span>{cat.category}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const catLabels = cat.options.map(o => o.label);
                          const allSelected = catLabels.every(l => selectedRejectReasons.includes(l));
                          if (allSelected) {
                            setSelectedRejectReasons(prev => prev.filter(l => !catLabels.includes(l)));
                          } else {
                            setSelectedRejectReasons(prev => Array.from(new Set([...prev, ...catLabels])));
                          }
                        }}
                        className="text-[9px] text-zinc-500 hover:text-zinc-300 underline font-normal lowercase"
                      >
                        {cat.options.every(o => selectedRejectReasons.includes(o.label)) ? 'desmarcar todas' : 'marcar todas'}
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {cat.options.map((opt) => {
                        const isSelected = selectedRejectReasons.includes(opt.label);
                        return (
                          <label
                            key={opt.id}
                            onClick={() => toggleRejectReason(opt.label)}
                            className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all select-none ${
                              isSelected
                                ? 'bg-rose-500/20 border-rose-500 text-rose-200 shadow-[0_0_15px_rgba(244,63,94,0.3)] font-semibold'
                                : 'bg-zinc-950/60 border-zinc-800/80 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleRejectReason(opt.label)}
                              className="accent-rose-500 w-4 h-4 rounded mt-0.5 shrink-0 cursor-pointer"
                            />
                            <span className="leading-snug flex-1">
                              <span className="mr-1.5">{opt.icon}</span>
                              <span className="font-medium">{opt.label}</span>
                              {(opt as any).hint && (
                                <span className="block text-[10px] text-amber-300/90 font-normal mt-0.5">
                                  🛡️ {(opt as any).hint}
                                </span>
                              )}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Alerta contextual si se selecciona opción de Tercería / Standby */}
              {selectedRejectReasons.some(r => r.toLowerCase().includes('tercer')) && (
                <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-[11px] text-amber-200 flex items-start gap-2 shadow-[0_0_15px_rgba(245,158,11,0.15)]">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                  <div>
                    <span className="font-bold block text-amber-300">Enrutamiento Automático a StandBy Directo Vecy</span>
                    <span>
                      {selectedRejectReasons.some(r => r.toLowerCase().includes('oferta'))
                        ? 'El Inmueble será marcado como StandBy Directo Vecy (No Tercería / No Referidos) y se enviará a la sección de Inmuebles StandBy para gestión y cierre exclusivo por nuestra inmobiliaria.'
                        : 'La Demanda será marcada como StandBy Directo Vecy (No Tercería / No Referidos) para asignación prioritaria con cartera propia.'}
                    </span>
                  </div>
                </div>
              )}

              {/* Campo de Detalle / Observación Pedagógica */}
              <div className="space-y-1.5 pt-2 border-t border-white/5">
                <label className="text-[11px] font-bold text-zinc-300 flex items-center justify-between">
                  <span>Detalle u observación específica adicional (Opcional):</span>
                  <span className="text-[10px] text-zinc-500 font-mono">Retroalimentación de aprendizaje</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="Ej: El cliente no acepta apartamento sin terraza privada o con administración superior a $400.000..."
                  value={customRejectNote}
                  onChange={(e) => setCustomRejectNote(e.target.value)}
                  className="w-full bg-black/80 border border-zinc-700 focus:border-rose-500 rounded-xl p-2.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>

              {/* Mensaje de Enseñanza y Auto-Búsqueda */}
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>
                  Al confirmar el descarte, JanIA registrará estos motivos en su base de aprendizaje permanente y no volverá a emparejar este par.
                </span>
              </div>

            </div>

            {/* Footer Actions */}
            <div className="p-4 sm:p-5 border-t border-white/10 bg-white/[0.02] flex items-center justify-between gap-3">
              <div className="text-zinc-400 text-xs font-mono">
                {selectedRejectReasons.length === 0 ? (
                  <span className="text-zinc-500 italic">Marca al menos una opción para continuar</span>
                ) : (
                  <span className="text-rose-400 font-semibold">{selectedRejectReasons.length} {selectedRejectReasons.length === 1 ? 'motivo seleccionado' : 'motivos seleccionados'}</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => { setRejectModalMatch(null); setSelectedRejectReasons([]); setCustomRejectNote(''); }}
                  className="border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-white text-xs h-9 px-4 cursor-pointer"
                >
                  Cancelar
                </Button>
                <Button
                  disabled={selectedRejectReasons.length === 0 || recordFeedbackMut.isPending}
                  type="button"
                  onClick={() => {
                    const reasonsJoined = selectedRejectReasons.join(" · ");
                    const finalReason = customRejectNote ? `${reasonsJoined} — Observación: ${customRejectNote}` : reasonsJoined;
                    handleFeedback(rejectModalMatch, 'rechazado', finalReason, customRejectNote);
                    setRejectModalMatch(null);
                    setSelectedRejectReasons([]);
                    setCustomRejectNote('');
                  }}
                  className="bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-extrabold text-xs h-9 px-5 flex items-center gap-2 shadow-lg shadow-rose-900/40 cursor-pointer disabled:opacity-40"
                >
                  {recordFeedbackMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ThumbsDown className="w-4 h-4" />}
                  {selectedRejectReasons.length > 1 ? `Confirmar Descarte (${selectedRejectReasons.length})` : 'Confirmar Descarte'}
                </Button>
              </div>
            </div>

          </div>
        </div>,
        document.body
      )}

      {/* ── MODAL AGREGAR ATRIBUTO AL COTEJO (ROBUSTECER OFERTA Y DEMANDA) ── */}
      {addFieldModalMatch && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#101010] border-2 border-amber-500/50 rounded-3xl max-w-xl w-full max-h-[92vh] flex flex-col shadow-[0_0_60px_rgba(245,158,11,0.3)] overflow-hidden">
            
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/15 border border-amber-500/30 rounded-2xl text-amber-400">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-extrabold text-white flex items-center gap-2">
                    + Agregar Atributo al Cotejo
                  </h3>
                  <p className="text-[11px] font-mono text-amber-400">
                    Pregunta de Visita · Robustecer Ficha de Oferta y Demanda
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setAddFieldModalMatch(null); setSelectedAttributeKey('mascotas'); setCustomAttributeName(''); }}
                className="w-8 h-8 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                title="Cerrar ventana"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Form */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
              
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-zinc-300 leading-relaxed text-[11px]">
                💡 Agrega una pregunta o especificación surgida durante la gestión de visita. Las respuestas quedarán grabadas en la base de datos para que la Oferta y la Demanda sean más completas en futuras búsquedas.
              </div>

              {/* Selector de Característica */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-300">
                  Característica o Atributo a Evaluar:
                </label>
                <select
                  value={selectedAttributeKey}
                  onChange={(e) => {
                    const k = e.target.value;
                    setSelectedAttributeKey(k);
                    const item = ATTRIBUTE_CATALOG.find(a => a.key === k);
                    if (item && k !== 'otra') {
                      setAddFieldReqVal(item.defaultReq);
                      setAddFieldPropVal(item.defaultProp);
                    }
                  }}
                  className="w-full bg-black/80 border border-zinc-700 focus:border-amber-500 rounded-xl p-2.5 text-xs text-zinc-200 focus:outline-none"
                >
                  {ATTRIBUTE_CATALOG.map((a) => (
                    <option key={a.key} value={a.key} className="bg-zinc-900 text-zinc-200">
                      {a.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Campo para nombre si seleccionó 'otra' */}
              {selectedAttributeKey === 'otra' && (
                <div className="space-y-1.5 animate-in fade-in duration-150">
                  <label className="text-[11px] font-bold text-amber-400">
                    Nombre de la Nueva Característica:
                  </label>
                  <Input
                    placeholder="Ej: Calentador a Gas, Altura Libre 3m, Planta Eléctrica Total..."
                    value={customAttributeName}
                    onChange={(e) => setCustomAttributeName(e.target.value)}
                    className="bg-black/80 border-amber-500/60 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-amber-400 h-9"
                  />
                </div>
              )}

              {/* Requerimiento de la Demanda */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-cyan-400">
                    🔍 Solicitado por la DEMANDA (Requerimiento #{addFieldModalMatch.requirement?.id}):
                  </label>
                </div>
                <Input
                  value={addFieldReqVal}
                  onChange={(e) => setAddFieldReqVal(e.target.value)}
                  placeholder="Ej: Exige / Indispensable, Deseable, Flexible..."
                  className="bg-black/80 border-zinc-700 focus:border-cyan-500 text-xs text-zinc-200 h-9"
                />
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                  {["Exige / Indispensable", "Deseable", "Flexible / No indispensable"].map((pill) => (
                    <button
                      key={pill}
                      type="button"
                      onClick={() => setAddFieldReqVal(pill)}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20 cursor-pointer"
                    >
                      {pill}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ofrecido por la Oferta */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-[#bf953f]">
                    🏢 Cuenta la OFERTA (Inmueble #{addFieldModalMatch.property?.id}):
                  </label>
                </div>
                <Input
                  value={addFieldPropVal}
                  onChange={(e) => setAddFieldPropVal(e.target.value)}
                  placeholder="Ej: Sí (Cuenta con ello), No cuenta, Por confirmar..."
                  className="bg-black/80 border-zinc-700 focus:border-[#bf953f] text-xs text-zinc-200 h-9"
                />
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                  {["Sí (Cuenta con ello)", "No cuenta", "Por confirmar con propietario"].map((pill) => (
                    <button
                      key={pill}
                      type="button"
                      onClick={() => setAddFieldPropVal(pill)}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-[#bf953f]/10 border border-[#bf953f]/30 text-[#bf953f] hover:bg-[#bf953f]/20 cursor-pointer"
                    >
                      {pill}
                    </button>
                  ))}
                </div>
              </div>

              {/* Calificación de Cumplimiento */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-300">
                  Estado de Cumplimiento en la Tabla:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                  {[
                    { val: "exact" as MatchStatus, label: "Coincide", color: "border-emerald-500 bg-emerald-500/20 text-emerald-300" },
                    { val: "plus" as MatchStatus, label: "Plus", color: "border-cyan-500 bg-cyan-500/20 text-cyan-300" },
                    { val: "warn" as MatchStatus, label: "Aproximado", color: "border-amber-500 bg-amber-500/20 text-amber-300" },
                    { val: "neutral" as MatchStatus, label: "Pendiente", color: "border-zinc-600 bg-zinc-800 text-zinc-300" },
                    { val: "missing" as MatchStatus, label: "No Cumple", color: "border-rose-500 bg-rose-500/20 text-rose-300" },
                  ].map((s) => (
                    <button
                      key={s.val}
                      type="button"
                      onClick={() => setAddFieldStatus(s.val)}
                      className={`text-[11px] font-bold py-1.5 px-2 rounded-xl border transition-all cursor-pointer text-center ${
                        addFieldStatus === s.val ? `${s.color} ring-2 ring-white/20 shadow-md` : 'border-zinc-800 bg-zinc-950 text-zinc-500 hover:border-zinc-700'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Opciones de Persistencia en Base de Datos */}
              <div className="pt-2 border-t border-white/5 space-y-2">
                <label className="text-[11px] font-bold text-zinc-300 block">
                  Persistencia y Enriquecimiento de Fichas:
                </label>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 cursor-pointer text-zinc-300">
                    <input
                      type="checkbox"
                      checked={persistInOffer}
                      onChange={(e) => setPersistInOffer(e.target.checked)}
                      className="accent-amber-500 rounded"
                    />
                    <span>Guardar en la Ficha del Inmueble (Oferta #{addFieldModalMatch.property?.id})</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-zinc-300">
                    <input
                      type="checkbox"
                      checked={persistInDemand}
                      onChange={(e) => setPersistInDemand(e.target.checked)}
                      className="accent-amber-500 rounded"
                    />
                    <span>Guardar en el Requerimiento (Demanda #{addFieldModalMatch.requirement?.id})</span>
                  </label>
                </div>
              </div>

            </div>

            {/* Footer Actions */}
            <div className="p-4 sm:p-5 border-t border-white/10 bg-white/[0.02] flex items-center justify-end gap-3">
              <Button
                variant="outline"
                type="button"
                onClick={() => { setAddFieldModalMatch(null); setSelectedAttributeKey('mascotas'); setCustomAttributeName(''); }}
                className="border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-white text-xs h-9 px-4 cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                disabled={isSavingAddField || (selectedAttributeKey === 'otra' && !customAttributeName.trim())}
                type="button"
                onClick={handleSaveNewField}
                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-xs h-9 px-5 flex items-center gap-2 shadow-lg shadow-amber-900/30 cursor-pointer disabled:opacity-40"
              >
                {isSavingAddField ? <Loader2 className="w-4 h-4 animate-spin text-black" /> : <Save className="w-4 h-4 text-black" />}
                Guardar en Cotejo y Base de Datos
              </Button>
            </div>

          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
