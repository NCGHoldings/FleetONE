import { useState, useCallback, useRef } from "react";
import Tesseract from "tesseract.js";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, Loader2, Check, AlertTriangle, RefreshCw, Zap, Eye } from "lucide-react";
import { toast } from "@/hooks/use-toast";

// ========== TYPES ==========

export interface OCRExtractedData {
  vendorName: string;
  totalAmount: number;
  date: string;
  items: { name: string; qty: number; amount: number }[];
  fuelLiters: number;
  fuelPricePerLiter: number;
  fuelStation: string;
  category: string;
  rawText: string;
  confidence: number;
}

interface ReceiptOCRPreviewProps {
  onDataExtracted: (data: OCRExtractedData, modifiedFields: string[]) => void;
  onImageUploaded?: (url: string) => void;
  onCancel: () => void;
}

// ========== IMAGE PREPROCESSING (SOFTER — no adaptive threshold) ==========

/**
 * Softer preprocessing: upscale → grayscale → contrast stretch → light sharpen
 * AVOIDS adaptive threshold which was destroying text on receipt photos
 */
const preprocessImage = (file: File): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      const canvas = document.createElement("canvas");
      // Upscale small images (Tesseract needs ~300 DPI equivalent)
      const scale = Math.max(1, 2400 / Math.max(img.width, img.height));
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);

      const ctx = canvas.getContext("2d")!;
      // Use better interpolation
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Step 1: Convert to grayscale
      for (let i = 0; i < data.length; i += 4) {
        const gray = Math.round(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
        data[i] = gray;
        data[i + 1] = gray;
        data[i + 2] = gray;
      }

      // Step 2: Histogram stretch (auto-contrast) — gentler version
      // Find 2nd and 98th percentile to avoid outlier noise
      const histogram = new Array(256).fill(0);
      for (let i = 0; i < data.length; i += 4) {
        histogram[data[i]]++;
      }
      const totalPixels = data.length / 4;
      let cumulative = 0;
      let lowBound = 0, highBound = 255;
      for (let i = 0; i < 256; i++) {
        cumulative += histogram[i];
        if (cumulative >= totalPixels * 0.02 && lowBound === 0) lowBound = i;
        if (cumulative >= totalPixels * 0.98) { highBound = i; break; }
      }
      const range = highBound - lowBound || 1;
      for (let i = 0; i < data.length; i += 4) {
        const val = Math.min(255, Math.max(0, Math.round(((data[i] - lowBound) / range) * 255)));
        data[i] = val;
        data[i + 1] = val;
        data[i + 2] = val;
      }

      // Step 3: Increase contrast a bit more (S-curve)
      for (let i = 0; i < data.length; i += 4) {
        // Simple contrast boost: push darks darker, lights lighter
        const normalized = data[i] / 255;
        const contrasted = Math.round(255 / (1 + Math.exp(-8 * (normalized - 0.5))));
        data[i] = contrasted;
        data[i + 1] = contrasted;
        data[i + 2] = contrasted;
      }

      ctx.putImageData(imageData, 0, 0);

      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url);
          blob ? resolve(blob) : reject(new Error("Canvas toBlob failed"));
        },
        "image/png"
      );
    };

    img.onerror = () => reject(new Error("Image load failed"));
    img.src = url;
  });
};

// ========== FUZZY MATCH HELPER ==========

/** Check if any pattern appears in text, tolerating OCR errors */
const fuzzyContains = (text: string, pattern: string): boolean => {
  const t = text.toLowerCase().replace(/[^a-z0-9]/g, "");
  const p = pattern.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (t.includes(p)) return true;
  // Allow 1 char substitution for patterns >= 4 chars
  if (p.length >= 4) {
    for (let i = 0; i <= t.length - p.length; i++) {
      let mismatches = 0;
      for (let j = 0; j < p.length; j++) {
        if (t[i + j] !== p[j]) mismatches++;
        if (mismatches > 1) break;
      }
      if (mismatches <= 1) return true;
    }
  }
  return false;
};

// ========== SMART EXTRACTION FUNCTIONS ==========

// Known Sri Lankan fuel stations with OCR-tolerant matching
const FUEL_STATIONS = [
  { patterns: ["ceypetco", "ceylon petroleum", "cpc", "cpstl", "ceylonpetroleum"], name: "Ceypetco" },
  { patterns: ["indianoil", "indian oil", "ioc", "lanka ioc", "lankaioc", "indlan", "lndian", "indianoll", "lndianoil"], name: "Lanka IOC" },
  { patterns: ["laugfs", "laughs", "laugs"], name: "Laugfs" },
  { patterns: ["sinopec", "slnopec"], name: "Sinopec" },
  { patterns: ["z energy", "zenergy"], name: "Z Energy" },
];

// Category patterns for detection
const CATEGORY_PATTERNS: { category: string; patterns: string[] }[] = [
  { category: "fuel", patterns: ["fuel", "diesel", "petrol", "gasoline", "filling", "ceypetco", "indianoil", "ioc", "laugfs", "sinopec", "liters", "litres", "ltr", "nozzle", "octane", "auto diesel", "super diesel", "kerosene", "pump"] },
  { category: "food", patterns: ["restaurant", "cafe", "hotel", "food", "meals", "rice", "roti", "chicken", "fish", "kottu", "tea", "coffee", "canteen", "eatery", "bakery"] },
  { category: "repairs", patterns: ["repair", "mechanic", "garage", "service center", "workshop", "brake", "engine", "oil change", "filter", "lubricant", "bearing", "spare"] },
  { category: "tyre", patterns: ["tyre", "tire", "tube", "puncture", "wheel", "alignment", "balancing", "retreading"] },
  { category: "highway", patterns: ["highway", "expressway", "toll", "southern expressway", "e01", "e03", "katunayake"] },
  { category: "parking", patterns: ["parking", "car park", "vehicle park"] },
  { category: "body_wash", patterns: ["wash", "car wash", "body wash", "cleaning", "polish", "wax"] },
];

/** Extract vendor name — prioritize known stations, then first meaningful text line */
const extractVendorName = (text: string): string => {
  // Priority 1: Check known fuel station names with fuzzy matching
  for (const station of FUEL_STATIONS) {
    if (station.patterns.some(p => fuzzyContains(text, p))) {
      return station.name;
    }
  }

  // Priority 2: Look for lines that look like a business name
  const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 2);
  for (const line of lines.slice(0, 10)) {
    const cleaned = line
      .replace(/^(M\/s\.?|M\/S\.?)\s*/i, "")
      .replace(/[^a-zA-Z0-9\s\.\&\-\']/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    // Skip lines that are: dates, pure numbers, phone numbers, headers, or too short
    if (/^\d{2}[\/\-]\d{2}/.test(cleaned)) continue;
    if (/^[\d\s\.\,\-]+$/.test(cleaned)) continue;
    if (/^[\+\d\s\-]{7,}$/.test(cleaned)) continue;
    if (/^(total|sub.?total|amount|tax|vat|date|time|bill|invoice|receipt|qty|item|cash|change|balance|tel|fax|no\.?|tin|svat|reg)/i.test(cleaned)) continue;
    if (cleaned.length < 3) continue;

    // Looks like a name
    if (/[a-zA-Z]{2,}/.test(cleaned)) {
      return cleaned.slice(0, 60);
    }
  }

  return "";
};

/** Extract total amount — multi-strategy approach */
const extractAmount = (text: string): number => {
  const lines = text.split("\n").map(l => l.trim());

  // Strategy 1: Look for explicit "Total" labels
  const totalKeywords = [
    /(?:grand\s*total|net\s*(?:amount|total|amt)|total\s*(?:amount|due|payable|bill|amt|sale)|amount\s*(?:due|payable))\s*[:\-=]?\s*(?:rs\.?|lkr\.?|rp\.?)?\s*([\d,]+\.?\d*)/i,
    /(?:total)\s*[:\-=]?\s*(?:rs\.?|lkr\.?|rp\.?)?\s*([\d,]+\.?\d*)/i,
    /(?:rs\.?|lkr\.?)\s*([\d,]+\.?\d*)\s*(?:total|only|\/\-)/i,
    // OCR-mangled versions: "Tatal", "Tota1", "Totai"
    /(?:tatal|tota1|totai|t0tal|totel)\s*[:\-=]?\s*(?:rs\.?|lkr\.?|rp\.?)?\s*([\d,]+\.?\d*)/i,
    // "Raw Total" patterns seen in OCR
    /(?:raw\s*total|sub\s*total)\s*[:\(\-=]?\s*(?:rs\.?|lkr\.?)?\s*([\d,]+\.?\d*)/i,
  ];

  for (const pattern of totalKeywords) {
    for (const line of lines) {
      const match = line.match(pattern);
      if (match) {
        const amt = parseFloat(match[1].replace(/,/g, ""));
        if (amt > 0 && amt < 999999 && !isNaN(amt)) {
          return amt;
        }
      }
    }
  }

  // Strategy 2: Look for "Rs." or "LKR" followed by amount
  const currencyAmounts: number[] = [];
  const rsPattern = /(?:rs\.?|lkr\.?|rp\.?)\s*([\d,]+\.?\d{0,2})/gi;
  let match;
  while ((match = rsPattern.exec(text)) !== null) {
    const num = parseFloat(match[1].replace(/,/g, ""));
    if (num > 50 && num < 999999 && !isNaN(num)) {
      currencyAmounts.push(num);
    }
  }
  if (currencyAmounts.length > 0) {
    return Math.max(...currencyAmounts);
  }

  // Strategy 3: Find the largest standalone number (likely the total)
  // But filter out phone numbers (7+ consecutive digits), dates, receipt IDs
  const allNumbers: number[] = [];
  for (const line of lines) {
    // Skip lines that look like phone, ID, date, or receipt numbers
    if (/tel|phone|fax|mob|no\.?\s*:?\s*\d{5,}|tin|svat|reg/i.test(line)) continue;
    if (/receipt\s*(?:no|id|#)/i.test(line)) continue;

    const nums = line.match(/\b([\d,]+\.?\d{0,2})\b/g);
    if (nums) {
      for (const n of nums) {
        const clean = n.replace(/,/g, "");
        // Skip numbers that look like dates (YYYYMMDD, DDMMYYYY)
        if (/^\d{8}$/.test(clean)) continue;
        // Skip very long numbers (IDs, phones)
        if (clean.replace(".", "").length > 8) continue;
        const val = parseFloat(clean);
        if (val > 50 && val < 500000 && !isNaN(val)) {
          allNumbers.push(val);
        }
      }
    }
  }

  if (allNumbers.length > 0) {
    // The total is typically one of the larger amounts — pick the second largest
    // if there are duplicates (receipt often prints total twice)
    const sorted = [...new Set(allNumbers)].sort((a, b) => b - a);
    return sorted[0];
  }

  return 0;
};

/** Extract date from receipt text */
const extractDate = (text: string): string => {
  const datePatterns = [
    // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
    /(\d{2})[\/\-\.](\d{2})[\/\-\.](20\d{2})/,
    // YYYY-MM-DD or YYYY/MM/DD
    /(20\d{2})[\/\-\.](\d{2})[\/\-\.](\d{2})/,
    // DD/MM/YY
    /(\d{2})[\/\-\.](\d{2})[\/\-\.](\d{2})\b/,
    // Written: 20 Feb 2026
    /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*(20\d{2})/i,
    // Feb 20, 2026
    /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*(\d{1,2}),?\s*(20\d{2})/i,
  ];

  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      try {
        if (/^\(\d{2}\)/.test(pattern.source) && match[3]?.length === 4) {
          // DD/MM/YYYY
          const day = match[1].padStart(2, "0");
          const month = match[2].padStart(2, "0");
          const year = match[3];
          if (parseInt(month) <= 12 && parseInt(day) <= 31) {
            return `${year}-${month}-${day}`;
          }
        }
        if (match[1]?.length === 4) {
          // YYYY-MM-DD
          return `${match[1]}-${match[2]}-${match[3]}`;
        }
        if (match[3]?.length === 2) {
          // DD/MM/YY
          const yr = 2000 + parseInt(match[3]);
          if (yr >= 2020 && yr <= 2030) {
            return `${yr}-${match[2]}-${match[1]}`;
          }
        }
        // Try generic Date parsing for written formats
        const parsed = new Date(match[0]);
        if (!isNaN(parsed.getTime())) {
          return parsed.toISOString().split("T")[0];
        }
      } catch {
        continue;
      }
    }
  }

  // If no date found in any format, try a more relaxed approach
  const relaxedDate = text.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
  if (relaxedDate) {
    let [, a, b, c] = relaxedDate;
    let year = c.length === 2 ? `20${c}` : c;
    let month = b.padStart(2, "0");
    let day = a.padStart(2, "0");
    if (parseInt(month) > 12) {
      // Swap if month > 12 (probably MM/DD format)
      [month, day] = [day, month];
    }
    return `${year}-${month}-${day}`;
  }

  return new Date().toISOString().split("T")[0];
};

/** Extract fuel details — very tolerant of OCR errors */
const extractFuelDetails = (text: string, totalAmount: number): { liters: number; pricePerLiter: number; station: string } => {
  let liters = 0, pricePerLiter = 0, station = "";

  // Detect station with fuzzy matching
  for (const s of FUEL_STATIONS) {
    if (s.patterns.some(p => fuzzyContains(text, p))) {
      station = s.name;
      break;
    }
  }

  const lines = text.split("\n").map(l => l.trim());

  // ---- EXTRACT LITERS ----
  const literPatterns = [
    // "42.35 Ltr", "42.35 L", "42.35Ltrs"
    /(\d+\.?\d*)\s*(?:ltr|ltrs|liters?|litres?)\b/i,
    // "Qty: 42.35", "Quantity: 42.35"
    /(?:qty|quantity|volume|qly|oty)\s*[:\-=]?\s*(\d+\.?\d*)/i,
    // "42.35 L " (L followed by space/end)
    /(\d+\.?\d+)\s*L\s/i,
    // OCR mangled: "0 ofn." might be "0 Ltrs" — look for number before garbled text with "l" or "t"
    /(\d+\.?\d*)\s*(?:lts|lt|lis|itr|its)\b/i,
  ];

  for (const p of literPatterns) {
    const m = text.match(p);
    if (m) {
      const val = parseFloat(m[1]);
      if (val > 1 && val < 5000) {
        liters = val;
        break;
      }
    }
  }

  // ---- EXTRACT PRICE PER LITER ----
  const pricePatterns = [
    // "Rate: Rs. 366.00", "Rate/Ltr: 366"
    /(?:rate|price|unit\s*price|unit\s*rate)\s*(?:\/?\s*(?:ltr|liter|litre|l))?\s*[:\-=]?\s*(?:rs\.?|lkr\.?|rp\.?)?\s*(\d+\.?\d*)/i,
    // "Rs 366.00/Ltr", "366/L"
    /(?:rs\.?|lkr\.?)?\s*(\d+\.?\d*)\s*\/\s*(?:ltr|liter|litre|l)\b/i,
    // OCR mangled: "Primit" = "Price/lit", "Alt Rate" = "At Rate"
    /(?:primit|pric[eo]|alt\s*rate|at\s*rate|r[ae]te)\s*[:\-=]?\s*(?:rs\.?|hs\.?|lkr\.?|rp\.?)?\s*(\d+\.?\d*)/i,
    // Just "Rs. XXX" where XXX is in fuel price range (100-500)
    /(?:rs\.?|hs\.?)\s*(\d{3}\.?\d{0,2})\b/i,
  ];

  for (const p of pricePatterns) {
    for (const line of lines) {
      const m = line.match(p);
      if (m) {
        const val = parseFloat(m[1]);
        // Sri Lankan fuel prices typically between 100 and 600 LKR/liter
        if (val >= 80 && val <= 800) {
          pricePerLiter = val;
          break;
        }
      }
    }
    if (pricePerLiter > 0) break;
  }

  // ---- AUTO-CALCULATE MISSING VALUES ----
  if (totalAmount > 0) {
    if (liters > 0 && pricePerLiter === 0) {
      const calc = totalAmount / liters;
      if (calc >= 80 && calc <= 800) {
        pricePerLiter = Math.round(calc * 100) / 100;
      }
    }
    if (pricePerLiter > 0 && liters === 0) {
      const calc = totalAmount / pricePerLiter;
      if (calc > 1 && calc < 5000) {
        liters = Math.round(calc * 100) / 100;
      }
    }
  }

  // If we still have liters=0 and pricePerLiter=0 but we detected fuel category,
  // try to find two numbers on the same line or adjacent lines that multiply close to totalAmount
  if (totalAmount > 0 && liters === 0 && pricePerLiter === 0) {
    const numbers: number[] = [];
    const numRegex = /(\d+\.?\d*)/g;
    let nm;
    while ((nm = numRegex.exec(text)) !== null) {
      const v = parseFloat(nm[1]);
      if (v > 1 && v < 500000) numbers.push(v);
    }
    // Try all pairs
    for (let i = 0; i < numbers.length && liters === 0; i++) {
      for (let j = i + 1; j < numbers.length; j++) {
        const product = numbers[i] * numbers[j];
        // Check if product is within 5% of totalAmount
        if (Math.abs(product - totalAmount) / totalAmount < 0.05) {
          // The smaller number in fuel range = price per liter, larger = liters (usually)
          const a = Math.min(numbers[i], numbers[j]);
          const b = Math.max(numbers[i], numbers[j]);
          if (a >= 80 && a <= 800) {
            pricePerLiter = a;
            liters = b;
          } else if (b >= 80 && b <= 800) {
            pricePerLiter = b;
            liters = a;
          }
          break;
        }
      }
    }
  }

  return { liters, pricePerLiter, station };
};

/** Extract line items from receipt */
const extractLineItems = (text: string): { name: string; qty: number; amount: number }[] => {
  const items: { name: string; qty: number; amount: number }[] = [];
  const lines = text.split("\n");

  for (const line of lines) {
    // "Item Name    2    500.00"
    const m1 = line.match(/^(.{3,30}?)\s{2,}(\d+)\s{2,}([\d,]+\.?\d{0,2})\s*$/);
    if (m1) {
      items.push({ name: m1[1].trim(), qty: parseInt(m1[2]), amount: parseFloat(m1[3].replace(/,/g, "")) });
      continue;
    }
    // "1. Item Name  Rs. 500.00"
    const m2 = line.match(/^\d+[\.\)]\s*(.{3,30}?)\s+(?:rs\.?)?\s*([\d,]+\.?\d{0,2})\s*$/i);
    if (m2) {
      items.push({ name: m2[1].trim(), qty: 1, amount: parseFloat(m2[2].replace(/,/g, "")) });
    }
  }

  return items.slice(0, 10);
};

/** Detect expense category from text */
const detectCategory = (text: string): string => {
  let bestCategory = "other";
  let bestScore = 0;

  for (const cp of CATEGORY_PATTERNS) {
    const score = cp.patterns.filter(p => fuzzyContains(text, p)).length;
    if (score > bestScore) {
      bestScore = score;
      bestCategory = cp.category;
    }
  }

  return bestCategory;
};

// ========== COMPONENT ==========

export const ReceiptOCRPreview = ({ onDataExtracted, onImageUploaded, onCancel }: ReceiptOCRPreviewProps) => {
  const [step, setStep] = useState<"upload" | "scanning" | "preview">("upload");
  const [imageUrl, setImageUrl] = useState("");
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrStatus, setOcrStatus] = useState("");
  const [extractedData, setExtractedData] = useState<OCRExtractedData | null>(null);
  const [modifiedFields, setModifiedFields] = useState<Set<string>>(new Set());
  const [originalData, setOriginalData] = useState<OCRExtractedData | null>(null);
  const [showRawText, setShowRawText] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please upload an image (JPG, PNG, WebP)", variant: "destructive" });
      return;
    }

    const originalUrl = URL.createObjectURL(file);
    setImageUrl(originalUrl);
    setStep("scanning");
    setOcrProgress(0);
    setOcrStatus("Enhancing image...");

    try {
      // Step 1: Preprocess
      setOcrProgress(5);
      let processedBlob: Blob;
      try {
        processedBlob = await preprocessImage(file);
        setOcrProgress(15);
        setOcrStatus("Image enhanced. Running OCR...");
      } catch {
        processedBlob = file;
        setOcrProgress(15);
      }

      // Step 2: Run Tesseract — try BOTH original and preprocessed, pick the better one
      setOcrStatus("Scanning receipt (pass 1/2)...");
      const [resultProcessed, resultOriginal] = await Promise.all([
        Tesseract.recognize(processedBlob, "eng", {
          logger: (m: any) => {
            if (m.status === "recognizing text") {
              setOcrProgress(15 + Math.round(m.progress * 35));
              setOcrStatus(`Pass 1: ${Math.round(m.progress * 100)}%`);
            }
          },
        }),
        Tesseract.recognize(file, "eng", {
          logger: (m: any) => {
            if (m.status === "recognizing text") {
              setOcrProgress(50 + Math.round(m.progress * 35));
              setOcrStatus(`Pass 2: ${Math.round(m.progress * 100)}%`);
            }
          },
        }),
      ]);

      // Pick the result with higher confidence
      const result = resultProcessed.data.confidence >= resultOriginal.data.confidence
        ? resultProcessed
        : resultOriginal;

      // Also combine texts for extraction — more text = more data to find
      const combinedText = result.data.text + "\n---PASS2---\n" +
        (result === resultProcessed ? resultOriginal.data.text : resultProcessed.data.text);

      const rawText = result.data.text;
      setOcrProgress(90);
      setOcrStatus("Extracting data...");

      // Step 3: Extract data from COMBINED text for maximum extraction
      const totalAmount = extractAmount(combinedText);
      const fuelDetails = extractFuelDetails(combinedText, totalAmount);
      const category = detectCategory(combinedText);

      const data: OCRExtractedData = {
        vendorName: extractVendorName(combinedText),
        totalAmount,
        date: extractDate(combinedText),
        items: extractLineItems(combinedText),
        fuelLiters: fuelDetails.liters,
        fuelPricePerLiter: fuelDetails.pricePerLiter,
        fuelStation: fuelDetails.station,
        category,
        rawText, // Show only the primary pass in the raw viewer
        confidence: result.data.confidence,
      };

      setExtractedData(data);
      setOriginalData({ ...data });
      setOcrProgress(100);
      setOcrStatus("Done!");
      setStep("preview");

      if (onImageUploaded) onImageUploaded(originalUrl);
    } catch (error: any) {
      toast({ title: "OCR Failed", description: error.message, variant: "destructive" });
      setStep("upload");
    }
  }, [toast, onImageUploaded]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const updateField = (field: string, value: any) => {
    if (!extractedData) return;
    setExtractedData({ ...extractedData, [field]: value });
    if (originalData && value !== (originalData as any)[field]) {
      setModifiedFields((prev) => new Set(prev).add(field));
    } else {
      setModifiedFields((prev) => {
        const next = new Set(prev);
        next.delete(field);
        return next;
      });
    }
  };

  const handleConfirm = () => {
    if (extractedData) {
      onDataExtracted(extractedData, Array.from(modifiedFields));
    }
  };

  const handleRetry = () => {
    setStep("upload");
    setExtractedData(null);
    setOriginalData(null);
    setModifiedFields(new Set());
    setImageUrl("");
  };

  // Editable field with modification tracking
  const EditableField = ({ label, field, value, type = "text", prefix = "" }: { label: string; field: string; value: any; type?: string; prefix?: string }) => {
    const isModified = modifiedFields.has(field);
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-1.5">
          <Label className="text-xs text-muted-foreground">{label}</Label>
          {isModified && <Badge variant="outline" className="text-[10px] px-1 py-0 bg-yellow-100 text-yellow-800 border-yellow-300">Edited ⚠</Badge>}
        </div>
        <div className="flex items-center gap-1">
          {prefix && <span className="text-xs text-muted-foreground font-medium">{prefix}</span>}
          <Input
            type={type}
            value={value ?? ""}
            onChange={(e) => updateField(field, type === "number" ? parseFloat(e.target.value) || 0 : e.target.value)}
            className={`h-8 text-sm ${isModified ? "border-yellow-400 bg-yellow-50" : ""}`}
          />
        </div>
      </div>
    );
  };

  // ===== UPLOAD STEP =====
  if (step === "upload") {
    return (
      <Card className="p-6">
        <div
          className="border-2 border-dashed border-blue-300 rounded-xl p-8 text-center cursor-pointer hover:bg-blue-50/50 transition-all"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="flex flex-col items-center gap-3">
            <div className="rounded-full bg-blue-100 p-4">
              <Camera className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <p className="text-lg font-semibold text-blue-900">📸 Upload Receipt Photo</p>
              <p className="text-sm text-blue-600 mt-1">Drag & drop or click to select</p>
              <p className="text-xs text-muted-foreground mt-2">
                JPG, PNG, WebP • Auto-enhanced for better accuracy
              </p>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
        </div>

        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-xs text-amber-800 font-medium">💡 Tips for best results:</p>
          <ul className="text-xs text-amber-700 mt-1 space-y-0.5 list-disc list-inside">
            <li>Good lighting — avoid shadows on receipt</li>
            <li>Keep receipt flat, fully visible</li>
            <li>Printed receipts work better than handwritten</li>
            <li>System runs 2 OCR passes for maximum accuracy</li>
          </ul>
        </div>

        <div className="mt-3 flex justify-end">
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        </div>
      </Card>
    );
  }

  // ===== SCANNING STEP =====
  if (step === "scanning") {
    return (
      <Card className="p-6">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            {imageUrl && <img src={imageUrl} alt="Receipt" className="w-48 h-auto rounded-lg opacity-50" />}
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
            </div>
          </div>
          <div className="w-full max-w-xs space-y-2">
            <Progress value={ocrProgress} className="h-2" />
            <div className="flex items-center justify-center gap-2">
              <Zap className="h-3.5 w-3.5 text-blue-500" />
              <p className="text-xs text-muted-foreground">{ocrStatus}</p>
            </div>
            <p className="text-[10px] text-center text-muted-foreground">
              Running 2 OCR passes (original + enhanced) for best accuracy
            </p>
          </div>
        </div>
      </Card>
    );
  }

  // ===== PREVIEW STEP =====
  if (!extractedData) return null;

  const confidenceColor = extractedData.confidence > 60 ? "text-green-600" : extractedData.confidence > 30 ? "text-yellow-600" : "text-red-600";

  return (
    <Card className="p-4">
      <div className="grid grid-cols-2 gap-4">
        {/* LEFT: Receipt Image */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">📄 Receipt Image</h4>
          <div className="rounded-lg border overflow-hidden bg-gray-50" style={{ maxHeight: "420px" }}>
            <img src={imageUrl} alt="Receipt" className="w-full h-auto object-contain" />
          </div>
          <div className="flex items-center justify-between">
            <p className={`text-xs font-medium ${confidenceColor}`}>
              🔍 Confidence: {Math.round(extractedData.confidence)}%
            </p>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => setShowRawText(!showRawText)}>
                <Eye className="h-3 w-3 mr-1" /> Raw
              </Button>
              <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={handleRetry}>
                <RefreshCw className="h-3 w-3 mr-1" /> Retry
              </Button>
            </div>
          </div>
          {showRawText && (
            <pre className="text-[10px] bg-gray-100 p-2 rounded max-h-40 overflow-y-auto whitespace-pre-wrap font-mono text-gray-600">
              {extractedData.rawText}
            </pre>
          )}
        </div>

        {/* RIGHT: Extracted Data */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">📊 Extracted Data</h4>
            {modifiedFields.size > 0 && (
              <Badge variant="outline" className="text-xs bg-yellow-50 border-yellow-300">
                ✏️ {modifiedFields.size} field{modifiedFields.size > 1 ? "s" : ""} edited
              </Badge>
            )}
          </div>

          {/* Category */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Detected Category</Label>
            <Select value={extractedData.category} onValueChange={(val) => updateField("category", val)}>
              <SelectTrigger className={`h-8 text-sm ${modifiedFields.has("category") ? "border-yellow-400 bg-yellow-50" : ""}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fuel">⛽ Fuel/Diesel</SelectItem>
                <SelectItem value="food">🍽 Food/Meals</SelectItem>
                <SelectItem value="repairs">🔧 Repairs</SelectItem>
                <SelectItem value="tyre">🛞 Tyre/Tube</SelectItem>
                <SelectItem value="highway">🛣 Highway Charges</SelectItem>
                <SelectItem value="parking">🅿 Parking</SelectItem>
                <SelectItem value="body_wash">🧼 Body Wash</SelectItem>
                <SelectItem value="other">📦 Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <EditableField label="Vendor Name" field="vendorName" value={extractedData.vendorName} />

          <div className="grid grid-cols-2 gap-2">
            <EditableField label="Date" field="date" value={extractedData.date} type="date" />
            <EditableField label="Total Amount (LKR)" field="totalAmount" value={extractedData.totalAmount} type="number" prefix="Rs" />
          </div>

          {/* Fuel Details */}
          {extractedData.category === "fuel" && (
            <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
              <p className="text-xs font-semibold text-blue-700">⛽ Fuel Details</p>
              <div className="grid grid-cols-3 gap-2">
                <EditableField label="Liters" field="fuelLiters" value={extractedData.fuelLiters} type="number" />
                <EditableField label="Price/Liter" field="fuelPricePerLiter" value={extractedData.fuelPricePerLiter} type="number" />
                <EditableField label="Station" field="fuelStation" value={extractedData.fuelStation} />
              </div>
              {extractedData.fuelLiters > 0 && extractedData.fuelPricePerLiter > 0 && (
                <p className="text-[10px] text-blue-600">
                  ✓ {extractedData.fuelLiters}L × Rs.{extractedData.fuelPricePerLiter} = Rs.{(extractedData.fuelLiters * extractedData.fuelPricePerLiter).toLocaleString()}
                </p>
              )}
            </div>
          )}

          {/* Line Items */}
          {extractedData.items.length > 0 && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Line Items ({extractedData.items.length})</Label>
              <div className="text-xs bg-gray-50 rounded p-2 max-h-20 overflow-y-auto space-y-0.5">
                {extractedData.items.map((item, i) => (
                  <div key={i} className="flex justify-between">
                    <span>{item.name} ×{item.qty}</span>
                    <span className="font-medium">Rs {item.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Low confidence warning */}
          {extractedData.confidence < 40 && (
            <div className="flex items-start gap-2 p-2 bg-red-50 border border-red-200 rounded text-xs">
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-800">Low confidence — please review all fields</p>
                <p className="text-red-600">Try a clearer, well-lit photo</p>
              </div>
            </div>
          )}

          {modifiedFields.size > 0 && (
            <div className="flex items-start gap-1.5 p-2 bg-yellow-50 border border-yellow-200 rounded text-[11px]">
              <AlertTriangle className="w-3.5 h-3.5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <p className="text-yellow-700">
                Modified fields flagged for Finance review: <strong>{Array.from(modifiedFields).join(", ")}</strong>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 mt-4 pt-3 border-t">
        <Button variant="ghost" onClick={onCancel}>✕ Cancel</Button>
        <Button variant="outline" onClick={handleRetry}>
          <RefreshCw className="h-3.5 w-3.5 mr-1" /> Re-scan
        </Button>
        <Button onClick={handleConfirm} className="bg-green-600 hover:bg-green-700">
          <Check className="h-3.5 w-3.5 mr-1" /> Use Extracted Data
        </Button>
      </div>
    </Card>
  );
};
