import React, { useState, useRef } from 'react';
import { UploadCloud, CheckCircle, AlertTriangle, FileText, RefreshCw, HelpCircle, FileSpreadsheet } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';

interface CSVHandlerProps {
  onDataLoaded: (csvText: string) => void;
  onResetToDefault: () => void;
  rowCount: number;
}

export default function CSVHandler({ onDataLoaded, onResetToDefault, rowCount }: CSVHandlerProps) {
  const [dragActive, setDragActive] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = (file: File) => {
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    const isCSV = file.name.endsWith('.csv');

    if (!isExcel && !isCSV) {
      setStatus('error');
      setErrorMessage('Invalid file type. Please upload an Excel (.xlsx, .xls) or standard CSV (.csv) file.');
      return;
    }

    const reader = new FileReader();
    
    if (isExcel) {
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          
          // Convert sheet to json (array of arrays)
          const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
          if (rows.length === 0) {
            setStatus('error');
            setErrorMessage('The uploaded Excel spreadsheet is empty.');
            return;
          }
          
          // Build a CSV-formatted string from rows
          const csvLines = rows.map(row => {
            return row.map(cell => {
              if (cell === null || cell === undefined) return '';
              const valStr = String(cell).replace(/\r?\n/g, ' ');
              if (valStr.includes(',') || valStr.includes('"')) {
                return `"${valStr.replace(/"/g, '""')}"`;
              }
              return valStr;
            }).join(',');
          }).filter(line => line.trim().length > 0);
          
          const csvText = csvLines.join('\n');
          
          // Quick validation for headers / content
          const hasRequiredHeaders = (csvText.toLowerCase().includes('amount') || csvText.toLowerCase().includes('value')) && 
                                     (csvText.toLowerCase().includes('type') || csvText.toLowerCase().includes('category'));
                                     
          if (!hasRequiredHeaders) {
            setStatus('error');
            setErrorMessage('Validation failed: Excel sheet must contain headers like "Type", "Category", and "Amount".');
            return;
          }
          
          onDataLoaded(csvText);
          setStatus('success');
          setTimeout(() => setStatus('idle'), 4000);
        } catch (err) {
          setStatus('error');
          setErrorMessage('Failed to read or parse Excel file. Ensure it is a valid, uncorrupted file.');
        }
      };
      reader.onerror = () => {
        setStatus('error');
        setErrorMessage('FileReader encountered a fatal error reading this Excel file.');
      };
      reader.readAsArrayBuffer(file);
    } else {
      // Standard CSV Parsing
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          if (!text || !text.includes('Amount') || !text.includes('Type')) {
            setStatus('error');
            setErrorMessage('Validation failed: Missing required columns (Date, Type, Category, Amount) in CSV header.');
            return;
          }
          onDataLoaded(text);
          setStatus('success');
          setTimeout(() => setStatus('idle'), 4000);
        } catch (err) {
          setStatus('error');
          setErrorMessage('Failed to read or parse file. Ensure it is a valid encoded text file.');
        }
      };
      reader.onerror = () => {
        setStatus('error');
        setErrorMessage('FileReader encountered a fatal error reading this CSV file.');
      };
      reader.readAsText(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="bg-[#111111] border border-[#222] p-6 rounded-lg space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-serif italic text-[#e4e3e0]">Society Ledger Sync Center</h4>
          <p className="text-xs text-[#e4e3e0]/40 mt-1">Import updated society excel records or download templates</p>
        </div>
        <button
          onClick={onResetToDefault}
          className="flex items-center gap-1.5 text-xs font-semibold text-[#c5a059] bg-[#1a1a1a] hover:bg-[#252525] border border-[#222] px-3 py-1.5 rounded uppercase tracking-wider transition cursor-pointer"
        >
          <RefreshCw className="w-3 h-3" />
          Reset Default Data
        </button>
      </div>

      {/* Drag & Drop Stage */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={onButtonClick}
        className={`border border-dashed rounded-lg p-6 text-center cursor-pointer transition relative ${
          dragActive 
            ? 'border-[#c5a059] bg-[#1a150e] scale-[0.99]' 
            : 'border-[#222] bg-[#0c0c0c] hover:border-[#333] hover:bg-[#111111]'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv, .xlsx, .xls"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center space-y-2">
          <UploadCloud className={`w-8 h-8 ${dragActive ? 'text-[#c5a059]' : 'text-[#e4e3e0]/30'}`} />
          <div className="text-xs text-[#e4e3e0]/60">
            <span className="font-semibold text-[#c5a059]">Click to import Excel / CSV</span> or drag and drop spreadsheet here
          </div>
          <p className="text-[9px] text-[#e4e3e0]/30 font-mono uppercase tracking-wider">
            Supports Excel (.xlsx, .xls) & CSV containing standard Orchid Heights format (Date, Type, Head ID, Category, Amount, Mode, Reference, Description)
          </p>
        </div>
      </div>

      {/* Status Notifications */}
      <AnimatePresence mode="wait">
        {status === 'success' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-emerald-950/20 border border-emerald-900/40 p-4 rounded text-xs text-emerald-300 flex items-center gap-3"
          >
            <CheckCircle className="w-4.5 h-4.5 text-[#66bb6a] shrink-0" />
            <div>
              <p className="font-semibold">Ledger Sync Successful!</p>
              <p className="text-[10px] text-[#66bb6a]/80 mt-0.5 font-mono">Parsed and synchronized {rowCount} financial rows. UI data metrics updated in real-time.</p>
            </div>
          </motion.div>
        )}

        {status === 'error' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-[#221215] border border-rose-900/30 p-4 rounded text-xs text-rose-300 flex items-center gap-3"
          >
            <AlertTriangle className="w-4.5 h-4.5 text-[#ff5555] shrink-0" />
            <div>
              <p className="font-semibold">Import Refused</p>
              <p className="text-[10px] text-rose-300/80 mt-0.5">{errorMessage}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Template assistance */}
      <div className="bg-[#0c0c0c] border border-[#222] p-4 rounded flex items-start gap-3 text-[11px] text-[#e4e3e0]/60 leading-relaxed">
        <HelpCircle className="w-4 h-4 text-[#c5a059]/60 mt-0.5 shrink-0" />
        <p>
          Currently executing with <b className="text-[#c5a059] font-mono">{rowCount}</b> accounting records. Adding/editing entries is stored dynamically in client-side state memory. Export your work via the transaction ledger tab anytime to save.
        </p>
      </div>
    </div>
  );
}
