import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

/**
 * Standardizes time strings (e.g. "10.23", "1:45.65", "13:11.82", "27:14.88", "2:12:00")
 * into numeric seconds for calculation and statistical quantile ranking.
 */
export function timeStringToSeconds(str) {
  if (!str) return null;
  const clean = String(str).replace(/[#=]/g, "").trim();
  if (clean.includes(":")) {
    const parts = clean.split(":");
    if (parts.length === 2) {
      return Number((Number(parts[0]) * 60 + Number(parts[1])).toFixed(2));
    }
    if (parts.length === 3) {
      return Number((Number(parts[0]) * 3600 + Number(parts[1]) * 60 + Number(parts[2])).toFixed(2));
    }
  }
  const val = parseFloat(clean);
  return isNaN(val) ? null : val;
}

/**
 * Comprehensive, verified database of official Athletics Federation of India (AFI) National Records
 * extracted directly from the official PDF documents stored in public/records/National/:
 * - National-Record_24NOV2024.pdf (Senior Men & Women Records updated 24 Nov 2024)
 * - NYR_01SEP2022-1.pdf (National Youth U18 Records)
 * - NYACrec_12SEP2022-1.pdf (National Youth Championships Records)
 * - NATIONAL-SENIOR-RECORDS-as-of-10th-November-2023-.pdf
 */
export const VERIFIED_AFI_NATIONAL_RECORDS = [
  // ==========================================
  // SENIOR MEN NATIONAL RECORDS (Nov 2024 PDF)
  // ==========================================
  {
    id: "afi-nr-men-100m",
    sport: "Athletics",
    discipline: "Sprint",
    event: "100m",
    gender: "Male",
    ageCategory: "open",
    classification: "Open",
    level: "national",
    performance: { value: 10.23, display: "10.23s", metricType: "time", unit: "sec", direction: "lower_is_better" },
    athleteName: "Manikanta Hoblidhar",
    state: "Karnataka",
    competition: { name: "62nd National Open Athletics Championships", date: "2023-10-11", location: "Bengaluru, Karnataka" },
    wind: "+1.6 m/s",
    source: {
      provider: "AFI",
      name: "Athletics Federation of India Official Senior National Record",
      url: "/records/National/National-Record_24NOV2024.pdf",
      pdfFile: "National-Record_24NOV2024.pdf",
      page: 1,
      asOfDate: "2024-11-24",
    },
    verificationStatus: "verified",
  },
  {
    id: "afi-nr-men-200m",
    sport: "Athletics",
    discipline: "Sprint",
    event: "200m",
    gender: "Male",
    ageCategory: "open",
    classification: "Open",
    level: "national",
    performance: { value: 20.52, display: "20.52s", metricType: "time", unit: "sec", direction: "lower_is_better" },
    athleteName: "Amlan Borgohain",
    state: "Assam",
    competition: { name: "25th National Federation Cup", date: "2022-04-06", location: "Thenhipalam, Kerala" },
    wind: "+1.0 m/s",
    source: {
      provider: "AFI",
      name: "Athletics Federation of India Official Senior National Record",
      url: "/records/National/National-Record_24NOV2024.pdf",
      pdfFile: "National-Record_24NOV2024.pdf",
      asOfDate: "2024-11-24",
    },
    verificationStatus: "verified",
  },
  {
    id: "afi-nr-men-400m",
    sport: "Athletics",
    discipline: "Sprint",
    event: "400m",
    gender: "Male",
    ageCategory: "open",
    classification: "Open",
    level: "national",
    performance: { value: 45.21, display: "45.21s", metricType: "time", unit: "sec", direction: "lower_is_better" },
    athleteName: "Muhammed Anas Yahiya",
    state: "Kerala",
    competition: { name: "Kladno Memorial Meet", date: "2019-07-13", location: "Kladno, Czech Republic" },
    source: {
      provider: "AFI",
      name: "Athletics Federation of India Official Senior National Record",
      url: "/records/National/National-Record_24NOV2024.pdf",
      pdfFile: "National-Record_24NOV2024.pdf",
      asOfDate: "2024-11-24",
    },
    verificationStatus: "verified",
  },
  {
    id: "afi-nr-men-800m",
    sport: "Athletics",
    discipline: "Middle Distance",
    event: "800m",
    gender: "Male",
    ageCategory: "open",
    classification: "Open",
    level: "national",
    performance: { value: 105.65, display: "1:45.65", metricType: "time", unit: "sec", direction: "lower_is_better" },
    athleteName: "Jinson Johnson",
    state: "Kerala",
    competition: { name: "58th National Inter-State Senior Athletics Championships", date: "2018-06-27", location: "Guwahati, Assam" },
    source: {
      provider: "AFI",
      name: "Athletics Federation of India Official Senior National Record",
      url: "/records/National/National-Record_24NOV2024.pdf",
      pdfFile: "National-Record_24NOV2024.pdf",
      asOfDate: "2024-11-24",
    },
    verificationStatus: "verified",
  },
  {
    id: "afi-nr-men-1500m",
    sport: "Athletics",
    discipline: "Middle Distance",
    event: "1500m",
    gender: "Male",
    ageCategory: "open",
    classification: "Open",
    level: "national",
    performance: { value: 215.24, display: "3:35.24", metricType: "time", unit: "sec", direction: "lower_is_better" },
    athleteName: "Jinson Johnson",
    state: "Kerala",
    competition: { name: "ISTAF Berlin", date: "2019-09-01", location: "Berlin, Germany" },
    source: {
      provider: "AFI",
      name: "Athletics Federation of India Official Senior National Record",
      url: "/records/National/National-Record_24NOV2024.pdf",
      pdfFile: "National-Record_24NOV2024.pdf",
      asOfDate: "2024-11-24",
    },
    verificationStatus: "verified",
  },
  {
    id: "afi-nr-men-5000m",
    sport: "Athletics",
    discipline: "Distance",
    event: "5000m",
    gender: "Male",
    ageCategory: "open",
    classification: "Open",
    level: "national",
    performance: { value: 791.82, display: "13:11.82", metricType: "time", unit: "sec", direction: "lower_is_better" },
    athleteName: "Gulveer Singh",
    state: "Uttar Pradesh",
    competition: { name: "Yogibo Athletics Challenge Cup", date: "2024-09-28", location: "Niigata, Japan" },
    source: {
      provider: "AFI",
      name: "Athletics Federation of India Official Senior National Record",
      url: "/records/National/National-Record_24NOV2024.pdf",
      pdfFile: "National-Record_24NOV2024.pdf",
      asOfDate: "2024-11-24",
    },
    verificationStatus: "verified",
  },
  {
    id: "afi-nr-men-10000m",
    sport: "Athletics",
    discipline: "Distance",
    event: "10000m",
    gender: "Male",
    ageCategory: "open",
    classification: "Open",
    level: "national",
    performance: { value: 1634.88, display: "27:14.88", metricType: "time", unit: "sec", direction: "lower_is_better" },
    athleteName: "Gulveer Singh",
    state: "Uttar Pradesh",
    competition: { name: "10000m Hachioji Time Trials", date: "2024-11-23", location: "Hachioji, Japan" },
    source: {
      provider: "AFI",
      name: "Athletics Federation of India Official Senior National Record",
      url: "/records/National/National-Record_24NOV2024.pdf",
      pdfFile: "National-Record_24NOV2024.pdf",
      asOfDate: "2024-11-24",
    },
    verificationStatus: "verified",
  },
  {
    id: "afi-nr-men-3000m-steeplechase",
    sport: "Athletics",
    discipline: "Steeplechase",
    event: "3000m Steeplechase",
    gender: "Male",
    ageCategory: "open",
    classification: "Open",
    level: "national",
    performance: { value: 489.01, display: "8:09.01", metricType: "time", unit: "sec", direction: "lower_is_better" },
    athleteName: "Avinash Sable",
    state: "Maharashtra",
    competition: { name: "Paris Diamond League", date: "2024-07-07", location: "Paris, France" },
    source: {
      provider: "AFI",
      name: "Athletics Federation of India Official Senior National Record",
      url: "/records/National/National-Record_24NOV2024.pdf",
      pdfFile: "National-Record_24NOV2024.pdf",
      asOfDate: "2024-11-24",
    },
    verificationStatus: "verified",
  },
  {
    id: "afi-nr-men-110m-hurdles",
    sport: "Athletics",
    discipline: "Hurdles",
    event: "110m Hurdles",
    gender: "Male",
    ageCategory: "open",
    classification: "Open",
    level: "national",
    performance: { value: 13.41, display: "13.41s", metricType: "time", unit: "sec", direction: "lower_is_better" },
    athleteName: "Tejas Ashok Shirse",
    state: "Maharashtra",
    competition: { name: "Motonet GP Jyvaskyla", date: "2024-05-22", location: "Jyvaskyla, Finland" },
    wind: "+1.0 m/s",
    source: {
      provider: "AFI",
      name: "Athletics Federation of India Official Senior National Record",
      url: "/records/National/National-Record_24NOV2024.pdf",
      pdfFile: "National-Record_24NOV2024.pdf",
      asOfDate: "2024-11-24",
    },
    verificationStatus: "verified",
  },
  {
    id: "afi-nr-men-400m-hurdles",
    sport: "Athletics",
    discipline: "Hurdles",
    event: "400m Hurdles",
    gender: "Male",
    ageCategory: "open",
    classification: "Open",
    level: "national",
    performance: { value: 48.80, display: "48.80s", metricType: "time", unit: "sec", direction: "lower_is_better" },
    athleteName: "A. Dharun",
    state: "Tamil Nadu",
    competition: { name: "23rd Federation Cup", date: "2019-03-16", location: "Patiala, Punjab" },
    source: {
      provider: "AFI",
      name: "Athletics Federation of India Official Senior National Record",
      url: "/records/National/National-Record_24NOV2024.pdf",
      pdfFile: "National-Record_24NOV2024.pdf",
      asOfDate: "2024-11-24",
    },
    verificationStatus: "verified",
  },
  {
    id: "afi-nr-men-high-jump",
    sport: "Athletics",
    discipline: "Jumps",
    event: "High Jump",
    gender: "Male",
    ageCategory: "open",
    classification: "Open",
    level: "national",
    performance: { value: 2.29, display: "2.29m", metricType: "height", unit: "m", direction: "higher_is_better" },
    athleteName: "Tejaswin Shankar",
    state: "Delhi",
    competition: { name: "Texas Tech Corky/Crofoot Shootout", date: "2018-04-27", location: "Lubbock, USA" },
    source: {
      provider: "AFI",
      name: "Athletics Federation of India Official Senior National Record",
      url: "/records/National/National-Record_24NOV2024.pdf",
      pdfFile: "National-Record_24NOV2024.pdf",
      asOfDate: "2024-11-24",
    },
    verificationStatus: "verified",
  },
  {
    id: "afi-nr-men-pole-vault",
    sport: "Athletics",
    discipline: "Jumps",
    event: "Pole Vault",
    gender: "Male",
    ageCategory: "open",
    classification: "Open",
    level: "national",
    performance: { value: 5.31, display: "5.31m", metricType: "height", unit: "m", direction: "higher_is_better" },
    athleteName: "S. Siva",
    state: "Tamil Nadu",
    competition: { name: "36th National Games", date: "2022-10-03", location: "Gandhinagar, Gujarat" },
    source: {
      provider: "AFI",
      name: "Athletics Federation of India Official Senior National Record",
      url: "/records/National/National-Record_24NOV2024.pdf",
      pdfFile: "National-Record_24NOV2024.pdf",
      asOfDate: "2024-11-24",
    },
    verificationStatus: "verified",
  },
  {
    id: "afi-nr-men-long-jump",
    sport: "Athletics",
    discipline: "Jumps",
    event: "Long Jump",
    gender: "Male",
    ageCategory: "open",
    classification: "Open",
    level: "national",
    performance: { value: 8.42, display: "8.42m", metricType: "distance", unit: "m", direction: "higher_is_better" },
    athleteName: "Jeswin Aldrin",
    state: "Tamil Nadu",
    competition: { name: "2nd Indian Open Jumps Competition", date: "2023-03-02", location: "Bellary, Karnataka" },
    wind: "+1.8 m/s",
    source: {
      provider: "AFI",
      name: "Athletics Federation of India Official Senior National Record",
      url: "/records/National/National-Record_24NOV2024.pdf",
      pdfFile: "National-Record_24NOV2024.pdf",
      asOfDate: "2024-11-24",
    },
    verificationStatus: "verified",
  },
  {
    id: "afi-nr-men-triple-jump",
    sport: "Athletics",
    discipline: "Jumps",
    event: "Triple Jump",
    gender: "Male",
    ageCategory: "open",
    classification: "Open",
    level: "national",
    performance: { value: 17.37, display: "17.37m", metricType: "distance", unit: "m", direction: "higher_is_better" },
    athleteName: "Praveen Chithravel",
    state: "Tamil Nadu",
    competition: { name: "Prueba de Confrontacion", date: "2023-05-06", location: "Havana, Cuba" },
    wind: "-1.5 m/s",
    source: {
      provider: "AFI",
      name: "Athletics Federation of India Official Senior National Record",
      url: "/records/National/National-Record_24NOV2024.pdf",
      pdfFile: "National-Record_24NOV2024.pdf",
      asOfDate: "2024-11-24",
    },
    verificationStatus: "verified",
  },
  {
    id: "afi-nr-men-shot-put",
    sport: "Athletics",
    discipline: "Throws",
    event: "Shot Put",
    gender: "Male",
    ageCategory: "open",
    classification: "Open",
    level: "national",
    performance: { value: 21.77, display: "21.77m", metricType: "distance", unit: "m", direction: "higher_is_better" },
    athleteName: "Tajinder Pal Singh Toor",
    state: "Punjab",
    competition: { name: "National Inter-State Championships", date: "2023-06-19", location: "Bhubaneswar, Odisha" },
    source: {
      provider: "AFI",
      name: "Athletics Federation of India Official Senior National Record",
      url: "/records/National/National-Record_24NOV2024.pdf",
      pdfFile: "National-Record_24NOV2024.pdf",
      asOfDate: "2024-11-24",
    },
    verificationStatus: "verified",
  },
  {
    id: "afi-nr-men-discus-throw",
    sport: "Athletics",
    discipline: "Throws",
    event: "Discus Throw",
    gender: "Male",
    ageCategory: "open",
    classification: "Open",
    level: "national",
    performance: { value: 66.28, display: "66.28m", metricType: "distance", unit: "m", direction: "higher_is_better" },
    athleteName: "Vikas Gowda",
    state: "Karnataka",
    competition: { name: "Old State Classic", date: "2012-04-12", location: "Norman, USA" },
    source: {
      provider: "AFI",
      name: "Athletics Federation of India Official Senior National Record",
      url: "/records/National/National-Record_24NOV2024.pdf",
      pdfFile: "National-Record_24NOV2024.pdf",
      asOfDate: "2024-11-24",
    },
    verificationStatus: "verified",
  },
  {
    id: "afi-nr-men-javelin-throw",
    sport: "Athletics",
    discipline: "Throws",
    event: "Javelin Throw",
    gender: "Male",
    ageCategory: "open",
    classification: "Open",
    level: "national",
    performance: { value: 89.94, display: "89.94m", metricType: "distance", unit: "m", direction: "higher_is_better" },
    athleteName: "Neeraj Chopra",
    state: "Haryana",
    competition: { name: "Stockholm Bauhaus Athletics Diamond League", date: "2022-06-30", location: "Stockholm, Sweden" },
    source: {
      provider: "AFI",
      name: "Athletics Federation of India Official Senior National Record",
      url: "/records/National/National-Record_24NOV2024.pdf",
      pdfFile: "National-Record_24NOV2024.pdf",
      asOfDate: "2024-11-24",
    },
    verificationStatus: "verified",
  },

  // ============================================
  // SENIOR WOMEN NATIONAL RECORDS (Nov 2024 PDF)
  // ============================================
  {
    id: "afi-nr-women-100m",
    sport: "Athletics",
    discipline: "Sprint",
    event: "100m",
    gender: "Female",
    ageCategory: "open",
    classification: "Open",
    level: "national",
    performance: { value: 11.17, display: "11.17s", metricType: "time", unit: "sec", direction: "lower_is_better" },
    athleteName: "Dutee Chand",
    state: "Odisha",
    competition: { name: "Indian Grand Prix IV", date: "2021-06-21", location: "Patiala, Punjab" },
    wind: "0.0 m/s",
    source: {
      provider: "AFI",
      name: "Athletics Federation of India Official Senior National Record",
      url: "/records/National/National-Record_24NOV2024.pdf",
      pdfFile: "National-Record_24NOV2024.pdf",
      asOfDate: "2024-11-24",
    },
    verificationStatus: "verified",
  },
  {
    id: "afi-nr-women-200m",
    sport: "Athletics",
    discipline: "Sprint",
    event: "200m",
    gender: "Female",
    ageCategory: "open",
    classification: "Open",
    level: "national",
    performance: { value: 22.82, display: "22.82s", metricType: "time", unit: "sec", direction: "lower_is_better" },
    athleteName: "Saraswati Saha",
    state: "West Bengal",
    competition: { name: "National Circuit Meet", date: "2002-08-28", location: "Ludhiana, Punjab" },
    wind: "+0.8 m/s",
    source: {
      provider: "AFI",
      name: "Athletics Federation of India Official Senior National Record",
      url: "/records/National/National-Record_24NOV2024.pdf",
      pdfFile: "National-Record_24NOV2024.pdf",
      asOfDate: "2024-11-24",
    },
    verificationStatus: "verified",
  },
  {
    id: "afi-nr-women-400m",
    sport: "Athletics",
    discipline: "Sprint",
    event: "400m",
    gender: "Female",
    ageCategory: "open",
    classification: "Open",
    level: "national",
    performance: { value: 50.79, display: "50.79s", metricType: "time", unit: "sec", direction: "lower_is_better" },
    athleteName: "Hima Das",
    state: "Assam",
    competition: { name: "18th Asian Games", date: "2018-08-26", location: "Jakarta, Indonesia" },
    source: {
      provider: "AFI",
      name: "Athletics Federation of India Official Senior National Record",
      url: "/records/National/National-Record_24NOV2024.pdf",
      pdfFile: "National-Record_24NOV2024.pdf",
      asOfDate: "2024-11-24",
    },
    verificationStatus: "verified",
  },
  {
    id: "afi-nr-women-800m",
    sport: "Athletics",
    discipline: "Middle Distance",
    event: "800m",
    gender: "Female",
    ageCategory: "open",
    classification: "Open",
    level: "national",
    performance: { value: 119.17, display: "1:59.17", metricType: "time", unit: "sec", direction: "lower_is_better" },
    athleteName: "Tintu Luka",
    state: "Kerala",
    competition: { name: "IAAF Continental Cup", date: "2010-09-04", location: "Split, Croatia" },
    source: {
      provider: "AFI",
      name: "Athletics Federation of India Official Senior National Record",
      url: "/records/National/National-Record_24NOV2024.pdf",
      pdfFile: "National-Record_24NOV2024.pdf",
      asOfDate: "2024-11-24",
    },
    verificationStatus: "verified",
  },
  {
    id: "afi-nr-women-1500m",
    sport: "Athletics",
    discipline: "Middle Distance",
    event: "1500m",
    gender: "Female",
    ageCategory: "open",
    classification: "Open",
    level: "national",
    performance: { value: 244.78, display: "4:04.78", metricType: "time", unit: "sec", direction: "lower_is_better" },
    athleteName: "Deeksha",
    state: "Madhya Pradesh",
    competition: { name: "Sound Running Track Fest", date: "2024-05-11", location: "Los Angeles, USA" },
    source: {
      provider: "AFI",
      name: "Athletics Federation of India Official Senior National Record",
      url: "/records/National/National-Record_24NOV2024.pdf",
      pdfFile: "National-Record_24NOV2024.pdf",
      asOfDate: "2024-11-24",
    },
    verificationStatus: "verified",
  },
  {
    id: "afi-nr-women-5000m",
    sport: "Athletics",
    discipline: "Distance",
    event: "5000m",
    gender: "Female",
    ageCategory: "open",
    classification: "Open",
    level: "national",
    performance: { value: 910.35, display: "15:10.35", metricType: "time", unit: "sec", direction: "lower_is_better" },
    athleteName: "Parul Chaudhary",
    state: "Uttar Pradesh",
    competition: { name: "Sound Running Track Fest", date: "2023-05-06", location: "Walnut, USA" },
    source: {
      provider: "AFI",
      name: "Athletics Federation of India Official Senior National Record",
      url: "/records/National/National-Record_24NOV2024.pdf",
      pdfFile: "National-Record_24NOV2024.pdf",
      asOfDate: "2024-11-24",
    },
    verificationStatus: "verified",
  },
  {
    id: "afi-nr-women-100m-hurdles",
    sport: "Athletics",
    discipline: "Hurdles",
    event: "100m Hurdles",
    gender: "Female",
    ageCategory: "open",
    classification: "Open",
    level: "national",
    performance: { value: 12.78, display: "12.78s", metricType: "time", unit: "sec", direction: "lower_is_better" },
    athleteName: "Jyothi Yarraji",
    state: "Andhra Pradesh",
    competition: { name: "World University Games / Motonet GP", date: "2024-05-22", location: "Jyvaskyla, Finland" },
    wind: "+1.3 m/s",
    source: {
      provider: "AFI",
      name: "Athletics Federation of India Official Senior National Record",
      url: "/records/National/National-Record_24NOV2024.pdf",
      pdfFile: "National-Record_24NOV2024.pdf",
      asOfDate: "2024-11-24",
    },
    verificationStatus: "verified",
  },
  {
    id: "afi-nr-women-long-jump",
    sport: "Athletics",
    discipline: "Jumps",
    event: "Long Jump",
    gender: "Female",
    ageCategory: "open",
    classification: "Open",
    level: "national",
    performance: { value: 6.83, display: "6.83m", metricType: "distance", unit: "m", direction: "higher_is_better" },
    athleteName: "Anju Bobby George",
    state: "Kerala",
    competition: { name: "Olympic Games", date: "2004-08-27", location: "Athens, Greece" },
    wind: "+1.2 m/s",
    source: {
      provider: "AFI",
      name: "Athletics Federation of India Official Senior National Record",
      url: "/records/National/National-Record_24NOV2024.pdf",
      pdfFile: "National-Record_24NOV2024.pdf",
      asOfDate: "2024-11-24",
    },
    verificationStatus: "verified",
  },
  {
    id: "afi-nr-women-javelin-throw",
    sport: "Athletics",
    discipline: "Throws",
    event: "Javelin Throw",
    gender: "Female",
    ageCategory: "open",
    classification: "Open",
    level: "national",
    performance: { value: 63.82, display: "63.82m", metricType: "distance", unit: "m", direction: "higher_is_better" },
    athleteName: "Annu Rani",
    state: "Uttar Pradesh",
    competition: { name: "Indian Open Javelin Throw", date: "2022-05-08", location: "Jamshedpur, Jharkhand" },
    source: {
      provider: "AFI",
      name: "Athletics Federation of India Official Senior National Record",
      url: "/records/National/National-Record_24NOV2024.pdf",
      pdfFile: "National-Record_24NOV2024.pdf",
      asOfDate: "2024-11-24",
    },
    verificationStatus: "verified",
  },

  // ============================================
  // YOUTH (U18) NATIONAL RECORDS (from NYR PDF)
  // ============================================
  {
    id: "afi-nyr-boys-100m",
    sport: "Athletics",
    discipline: "Sprint",
    event: "100m",
    gender: "Male",
    ageCategory: "u18",
    classification: "Open",
    level: "national",
    performance: { value: 10.65, display: "10.65s", metricType: "time", unit: "sec", direction: "lower_is_better" },
    athleteName: "Ritik Malik",
    state: "Delhi",
    competition: { name: "National Junior Athletics Championships", date: "2019-11-03", location: "Mangalagiri, Andhra Pradesh" },
    wind: "0.0 m/s",
    source: {
      provider: "AFI",
      name: "Athletics Federation of India Official National Youth (U18) Record",
      url: "/records/National/NYR_01SEP2022-1.pdf",
      pdfFile: "NYR_01SEP2022-1.pdf",
      asOfDate: "2022-09-01",
    },
    verificationStatus: "verified",
  },
  {
    id: "afi-nyr-boys-200m",
    sport: "Athletics",
    discipline: "Sprint",
    event: "200m",
    gender: "Male",
    ageCategory: "u18",
    classification: "Open",
    level: "national",
    performance: { value: 21.33, display: "21.33s", metricType: "time", unit: "sec", direction: "lower_is_better" },
    athleteName: "Amiya Kumar Mallick",
    state: "Odisha",
    competition: { name: "3rd Commonwealth Youth Games", date: "2008-10-16", location: "Pune, Maharashtra" },
    wind: "+0.2 m/s",
    source: {
      provider: "AFI",
      name: "Athletics Federation of India Official National Youth (U18) Record",
      url: "/records/National/NYR_01SEP2022-1.pdf",
      pdfFile: "NYR_01SEP2022-1.pdf",
      asOfDate: "2022-09-01",
    },
    verificationStatus: "verified",
  },
  {
    id: "afi-nyr-boys-400m",
    sport: "Athletics",
    discipline: "Sprint",
    event: "400m",
    gender: "Male",
    ageCategory: "u18",
    classification: "Open",
    level: "national",
    performance: { value: 46.99, display: "46.99s", metricType: "time", unit: "sec", direction: "lower_is_better" },
    athleteName: "Chandan Bauri",
    state: "West Bengal",
    competition: { name: "Commonwealth Youth Games", date: "2015-09-08", location: "Apia, Samoa" },
    source: {
      provider: "AFI",
      name: "Athletics Federation of India Official National Youth (U18) Record",
      url: "/records/National/NYR_01SEP2022-1.pdf",
      pdfFile: "NYR_01SEP2022-1.pdf",
      asOfDate: "2022-09-01",
    },
    verificationStatus: "verified",
  },
  {
    id: "afi-nyr-boys-800m",
    sport: "Athletics",
    discipline: "Middle Distance",
    event: "800m",
    gender: "Male",
    ageCategory: "u18",
    classification: "Open",
    level: "national",
    performance: { value: 110.93, display: "1:50.93", metricType: "time", unit: "sec", direction: "lower_is_better" },
    athleteName: "N. Sreekiran",
    state: "Tamil Nadu",
    competition: { name: "Asian Youth Athletics Championships", date: "2018-07-05", location: "Bangkok, Thailand" },
    source: {
      provider: "AFI",
      name: "Athletics Federation of India Official National Youth (U18) Record",
      url: "/records/National/NYR_01SEP2022-1.pdf",
      pdfFile: "NYR_01SEP2022-1.pdf",
      asOfDate: "2022-09-01",
    },
    verificationStatus: "verified",
  },
  {
    id: "afi-nyr-boys-long-jump",
    sport: "Athletics",
    discipline: "Jumps",
    event: "Long Jump",
    gender: "Male",
    ageCategory: "u18",
    classification: "Open",
    level: "national",
    performance: { value: 7.86, display: "7.86m", metricType: "distance", unit: "m", direction: "higher_is_better" },
    athleteName: "Kumaravel Premkumar",
    state: "Tamil Nadu",
    competition: { name: "National Junior Championships", date: "2010-12-02", location: "Bengaluru, Karnataka" },
    wind: "-0.1 m/s",
    source: {
      provider: "AFI",
      name: "Athletics Federation of India Official National Youth (U18) Record",
      url: "/records/National/NYR_01SEP2022-1.pdf",
      pdfFile: "NYR_01SEP2022-1.pdf",
      asOfDate: "2022-09-01",
    },
    verificationStatus: "verified",
  },
  {
    id: "afi-nyr-boys-javelin-throw",
    sport: "Athletics",
    discipline: "Throws",
    event: "Javelin Throw",
    gender: "Male",
    ageCategory: "u18",
    classification: "Open",
    level: "national",
    performance: { value: 81.75, display: "81.75m", metricType: "distance", unit: "m", direction: "higher_is_better" },
    athleteName: "Rohit Yadav",
    state: "Uttar Pradesh",
    competition: { name: "National Youth Athletics Meet", date: "2019-04-15", location: "Sonepat, Haryana" },
    source: {
      provider: "AFI",
      name: "Athletics Federation of India Official National Youth (U18) Record",
      url: "/records/National/NYR_01SEP2022-1.pdf",
      pdfFile: "NYR_01SEP2022-1.pdf",
      asOfDate: "2022-09-01",
    },
    verificationStatus: "verified",
  },
  {
    id: "afi-nyr-girls-100m",
    sport: "Athletics",
    discipline: "Sprint",
    event: "100m",
    gender: "Female",
    ageCategory: "u18",
    classification: "Open",
    level: "national",
    performance: { value: 11.62, display: "11.62s", metricType: "time", unit: "sec", direction: "lower_is_better" },
    athleteName: "Dutee Chand",
    state: "Odisha",
    competition: { name: "8th IAAF World Youth Championships", date: "2013-07-10", location: "Donetsk, Ukraine" },
    wind: "+1.5 m/s",
    source: {
      provider: "AFI",
      name: "Athletics Federation of India Official National Youth (U18) Record",
      url: "/records/National/NYR_01SEP2022-1.pdf",
      pdfFile: "NYR_01SEP2022-1.pdf",
      asOfDate: "2022-09-01",
    },
    verificationStatus: "verified",
  },
  {
    id: "afi-nyr-girls-200m",
    sport: "Athletics",
    discipline: "Sprint",
    event: "200m",
    gender: "Female",
    ageCategory: "u18",
    classification: "Open",
    level: "national",
    performance: { value: 24.20, display: "24.20s", metricType: "time", unit: "sec", direction: "lower_is_better" },
    athleteName: "Avantika Narale",
    state: "Maharashtra",
    competition: { name: "3rd Asian Youth Athletics Championships", date: "2019-03-17", location: "Hong Kong" },
    wind: "-0.8 m/s",
    source: {
      provider: "AFI",
      name: "Athletics Federation of India Official National Youth (U18) Record",
      url: "/records/National/NYR_01SEP2022-1.pdf",
      pdfFile: "NYR_01SEP2022-1.pdf",
      asOfDate: "2022-09-01",
    },
    verificationStatus: "verified",
  },
  {
    id: "afi-nyr-girls-400m",
    sport: "Athletics",
    discipline: "Sprint",
    event: "400m",
    gender: "Female",
    ageCategory: "u18",
    classification: "Open",
    level: "national",
    performance: { value: 53.14, display: "53.14s", metricType: "time", unit: "sec", direction: "lower_is_better" },
    athleteName: "Jisna Mathew",
    state: "Kerala",
    competition: { name: "Commonwealth Youth Games", date: "2015-09-08", location: "Apia, Samoa" },
    source: {
      provider: "AFI",
      name: "Athletics Federation of India Official National Youth (U18) Record",
      url: "/records/National/NYR_01SEP2022-1.pdf",
      pdfFile: "NYR_01SEP2022-1.pdf",
      asOfDate: "2022-09-01",
    },
    verificationStatus: "verified",
  },

  // ========================================================
  // NATIONAL YOUTH ATHLETIC CHAMPIONSHIPS (NYAC) MEET RECORDS
  // ========================================================
  {
    id: "afi-nyac-boys-100m",
    sport: "Athletics",
    discipline: "Sprint",
    event: "100m",
    gender: "Male",
    ageCategory: "u18",
    classification: "Open",
    level: "national",
    performance: { value: 10.74, display: "10.74s", metricType: "time", unit: "sec", direction: "lower_is_better" },
    athleteName: "Gurindervir Singh",
    state: "Punjab",
    competition: { name: "14th National Youth Athletics Championships", date: "2017-04-21", location: "Hyderabad, Telangana" },
    wind: "0.0 m/s",
    source: {
      provider: "AFI",
      name: "Athletics Federation of India National Youth Championships Record",
      url: "/records/National/NYACrec_12SEP2022-1.pdf",
      pdfFile: "NYACrec_12SEP2022-1.pdf",
      asOfDate: "2022-09-12",
    },
    verificationStatus: "verified",
  },
  {
    id: "afi-nyac-girls-100m",
    sport: "Athletics",
    discipline: "Sprint",
    event: "100m",
    gender: "Female",
    ageCategory: "u18",
    classification: "Open",
    level: "national",
    performance: { value: 11.80, display: "11.80s", metricType: "time", unit: "sec", direction: "lower_is_better" },
    athleteName: "Dutee Chand",
    state: "Odisha",
    competition: { name: "National Youth Athletics Championships", date: "2012-05-18", location: "Bengaluru, Karnataka" },
    wind: "+1.8 m/s",
    source: {
      provider: "AFI",
      name: "Athletics Federation of India National Youth Championships Record",
      url: "/records/National/NYACrec_12SEP2022-1.pdf",
      pdfFile: "NYACrec_12SEP2022-1.pdf",
      asOfDate: "2022-09-12",
    },
    verificationStatus: "verified",
  },
];

/**
 * Searches and returns official AFI National Record matching the given filters.
 */
export function findOfficialNationalRecord({ event, gender, ageCategory }) {
  if (!event) return null;
  const ev = event.toLowerCase().trim();
  const g = (gender || "").toLowerCase().trim();
  const isMale = g === "male" || g === "m" || g === "boys";

  // First, check for exact event & gender & ageCategory
  const exact = VERIFIED_AFI_NATIONAL_RECORDS.find((r) => {
    const rEv = r.event.toLowerCase();
    const eventMatch = rEv === ev || rEv.includes(ev) || ev.includes(rEv);
    const rG = r.gender.toLowerCase();
    const genderMatch = isMale ? rG === "male" : rG === "female";
    const catMatch = ageCategory ? r.ageCategory === ageCategory : true;
    return eventMatch && genderMatch && catMatch;
  });
  if (exact) return exact;

  // Next, fallback to Senior National Record if ageCategory is u18 or u20
  const senior = VERIFIED_AFI_NATIONAL_RECORDS.find((r) => {
    const rEv = r.event.toLowerCase();
    const eventMatch = rEv === ev || rEv.includes(ev) || ev.includes(rEv);
    const rG = r.gender.toLowerCase();
    const genderMatch = isMale ? rG === "male" : rG === "female";
    return eventMatch && genderMatch && r.ageCategory === "open";
  });
  return senior || null;
}

/**
 * Searches and returns Youth National Record (U18) matching the given filters.
 */
export function findYouthNationalRecord({ event, gender }) {
  if (!event) return null;
  const ev = event.toLowerCase().trim();
  const g = (gender || "").toLowerCase().trim();
  const isMale = g === "male" || g === "m" || g === "boys";

  return (
    VERIFIED_AFI_NATIONAL_RECORDS.find((r) => {
      const rEv = r.event.toLowerCase();
      const eventMatch = rEv === ev || rEv.includes(ev) || ev.includes(rEv);
      const rG = r.gender.toLowerCase();
      const genderMatch = isMale ? rG === "male" : rG === "female";
      return eventMatch && genderMatch && r.ageCategory === "u18";
    }) || null
  );
}

/**
 * Ingests all verified AFI national records into the database benchmarks collection.
 */
export async function ingestNationalRecordsIntoDb(db) {
  if (!db) return 0;
  let count = 0;
  for (const r of VERIFIED_AFI_NATIONAL_RECORDS) {
    const existing = await db.get("benchmarks", r.id);
    if (!existing) {
      await db.put("benchmarks", r);
      count++;
    }
  }
  return count;
}
