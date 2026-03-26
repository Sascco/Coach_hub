import React, { useState, useRef } from 'react';
import { UploadCloud, FileSpreadsheet, AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Student } from '../types';

interface FileUploadProps {
  onDataLoaded: (students: Student[]) => void;
  onCancel?: () => void;
}

export function FileUpload({ onDataLoaded, onCancel }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length) {
      processFile(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length) {
      processFile(files[0]);
    }
  };

  const processFile = (file: File) => {
    setError(null);
    setIsLoading(true);

    const isCsv = file.name.endsWith('.csv');
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

    if (!isCsv && !isExcel) {
      setError('Please upload a .csv or .xlsx file.');
      setIsLoading(false);
      return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) throw new Error('Failed to read file');

        let parsedRows: any[] = [];

        if (isCsv) {
          const result = Papa.parse(data as string, {
            header: true,
            skipEmptyLines: true,
          });
          parsedRows = result.data;
        } else if (isExcel) {
          const workbook = XLSX.read(data, { type: 'binary' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          parsedRows = XLSX.utils.sheet_to_json(worksheet);
        }

        const students = mapRowsToStudents(parsedRows);
        if (students.length === 0) {
          throw new Error('No valid student data found in the file. Please check the column headers.');
        }
        onDataLoaded(students);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'An error occurred while parsing the file.');
      } finally {
        setIsLoading(false);
      }
    };

    reader.onerror = () => {
      setError('Failed to read the file.');
      setIsLoading(false);
    };

    if (isCsv) {
      reader.readAsText(file);
    } else {
      reader.readAsBinaryString(file);
    }
  };

  const mapRowsToStudents = (rows: any[]): Student[] => {
    const today = new Date('2026-03-24T00:00:00Z');

    return rows.map((row, index) => {
      const getValue = (possibleKeys: string[]) => {
        const key = Object.keys(row).find(k => 
          possibleKeys.some(pk => k.toLowerCase().trim().includes(pk.toLowerCase()))
        );
        return key ? row[key] : '';
      };

      const firstName = getValue(['First name']);
      const lastName = getValue(['Last name']);
      const email = getValue(['Platform email', 'email']);
      const lastSeen = getValue(['Last Seen']);
      const lastLesson = getValue(['Last lesson completed']);
      const cohortStart = getValue(['Cohort start']);
      const phone = getValue(['Phone Primary', 'phone']);
      const sprint = getValue(['Current sprint']);
      const progressStr = getValue(['Progress in the current sprint', 'progress']);
      const lastProject = getValue(['Last project submitted']);
      const daysSinceProjectStr = getValue(['Days since project submitted']);
      const lmsLink = getValue(['LMS admission link', 'lms link']);

      if (!firstName || !email) return null;

      let daysSinceLesson = 0;
      if (lastLesson) {
        const lessonDate = new Date(lastLesson);
        if (!isNaN(lessonDate.getTime())) {
          const diffTime = Math.abs(today.getTime() - lessonDate.getTime());
          daysSinceLesson = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        }
      }

      return {
        id: email || String(index),
        firstName: String(firstName),
        lastName: lastName ? String(lastName) : null,
        email: String(email),
        phone: String(phone),
        sprint: String(sprint),
        progress: parseInt(progressStr) || 0,
        daysSinceProject: parseInt(daysSinceProjectStr) || 0,
        daysSinceLesson,
        lastLesson: lastLesson ? String(lastLesson) : null,
        lastProject: lastProject ? String(lastProject) : null,
        cohortStart: String(cohortStart),
        lmsLink: String(lmsLink),
        lcNotes: null,
        deadline: "N/A",
        daysUntilDeadline: 0,
        mbgStatus: "Unknown",
        extraWeeks: 0,
        lastSeen: lastSeen ? String(lastSeen) : undefined
      };
    }).filter(Boolean) as Student[];
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-3xl">
        {onCancel && (
          <button 
            onClick={onCancel}
            className="mb-6 flex items-center gap-2 text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors font-[var(--font-syne)] font-bold"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
        )}
        
        <div className="mb-10 text-center">
          <div className="w-[64px] h-[64px] mx-auto mb-6 rounded-2xl bg-gradient-to-br from-[#6ee7b7] to-[#3b82f6] flex items-center justify-center text-[28px] font-extrabold text-[#0d0f14] font-[var(--font-syne)] shadow-lg shadow-blue-500/20">
            TT
          </div>
          <h1 className="font-[var(--font-syne)] font-bold text-4xl text-[var(--color-text)] mb-4 tracking-tight">Coach Hub</h1>
          <p className="text-[var(--color-muted)] text-lg max-w-lg mx-auto">Upload your student roster to generate personalized check-in messages and track progress.</p>
        </div>

        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl shadow-2xl overflow-hidden flex flex-col">
          <div className="p-10">
            <div 
              className={`border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center text-center transition-all duration-200 cursor-pointer
                ${isDragging ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/5 scale-[0.99]' : 'border-[var(--color-border)] hover:border-[var(--color-muted)] hover:bg-[var(--color-bg)]'}
              `}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                onChange={handleFileSelect}
              />
              
              <div className="w-20 h-20 rounded-full bg-[var(--color-bg)] flex items-center justify-center mb-6 text-[var(--color-accent)] shadow-sm border border-[var(--color-border)]">
                {isLoading ? <RefreshCw className="w-10 h-10 animate-spin" /> : <UploadCloud className="w-10 h-10" />}
              </div>
              
              <h3 className="font-[var(--font-syne)] font-bold text-xl mb-3 text-[var(--color-text)]">
                {isLoading ? 'Processing file...' : 'Click or drag file to this area to upload'}
              </h3>
              <p className="text-[var(--color-muted)] text-base max-w-sm mx-auto">
                Support for a single .csv or .xlsx file. The file should contain standard TripleTen student export headers.
              </p>
            </div>

            {error && (
              <div className="mt-6 p-4 rounded-xl bg-[var(--color-red)]/10 border border-[var(--color-red)]/20 flex items-start gap-3 text-[var(--color-red)]">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="text-sm font-medium">{error}</div>
              </div>
            )}

            <div className="mt-10">
              <h4 className="text-sm font-bold text-[var(--color-text)] mb-4 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-[var(--color-muted)]" />
                Expected Columns
              </h4>
              <div className="flex flex-wrap gap-2">
                {['First name', 'Last name', 'Platform email', 'Last Seen', 'Last lesson completed', 'Current sprint', 'Progress', 'Days since project'].map(col => (
                  <span key={col} className="text-[11px] uppercase tracking-wider font-[var(--font-mono)] px-3 py-1.5 rounded-md bg-[var(--color-bg)] text-[var(--color-muted)] border border-[var(--color-border)]">
                    {col}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
