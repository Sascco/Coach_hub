import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { MainPanel } from './components/MainPanel';
import { FileUpload } from './components/FileUpload';
import { Student } from './types';
import { Upload } from 'lucide-react';

export default function App() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [dateStr, setDateStr] = useState('');
  const [currentScreen, setCurrentScreen] = useState<'upload' | 'dashboard'>('upload');

  useEffect(() => {
    setDateStr(new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }));

    // Load students from localStorage
    const savedStudents = localStorage.getItem('tt_students');
    if (savedStudents) {
      try {
        const parsed = JSON.parse(savedStudents);
        if (parsed && parsed.length > 0) {
          setStudents(parsed);
          setCurrentScreen('dashboard');
        }
      } catch (e) {
        console.error('Failed to parse saved students', e);
      }
    }
  }, []);

  const handleShowToast = (msg: string) => {
    setToastMsg(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2800);
  };

  const handleDataLoaded = (newStudents: Student[]) => {
    setStudents(newStudents);
    localStorage.setItem('tt_students', JSON.stringify(newStudents));
    setCurrentScreen('dashboard');
    setSelectedStudentId(null);
    handleShowToast(`Successfully loaded ${newStudents.length} students`);
  };

  const selectedStudent = students.find(s => s.id === selectedStudentId) || null;

  if (currentScreen === 'upload') {
    return (
      <FileUpload 
        onDataLoaded={handleDataLoaded} 
        onCancel={students.length > 0 ? () => setCurrentScreen('dashboard') : undefined} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] font-[var(--font-sans)] overflow-x-hidden flex flex-col">
      <header className="flex items-center justify-between px-8 py-4.5 border-b border-[var(--color-border)] bg-[var(--color-surface)] sticky top-0 z-50">
        <div className="flex items-center gap-2.5">
          <div className="w-[34px] h-[34px] rounded-lg bg-gradient-to-br from-[#6ee7b7] to-[#3b82f6] flex items-center justify-center text-[16px] font-extrabold text-[#0d0f14] font-[var(--font-syne)]">
            TT
          </div>
          <div className="font-[var(--font-syne)] font-bold text-[17px] tracking-[-0.5px]">
            Coach <span className="text-[var(--color-accent)]">Hub</span>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="font-[var(--font-mono)] text-[12px] text-[var(--color-muted)]">
            {dateStr}
          </div>
          <button 
            onClick={() => setCurrentScreen('upload')}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-bg)] hover:bg-[var(--color-border)] border border-[var(--color-border)] rounded-lg text-sm font-[var(--font-syne)] font-bold transition-colors"
          >
            <Upload className="w-4 h-4" />
            Upload New Data
          </button>
        </div>
      </header>

      <div className="flex flex-1 h-[calc(100vh-65px)] overflow-hidden">
        <Sidebar 
          students={students} 
          selectedStudentId={selectedStudentId} 
          onSelectStudent={setSelectedStudentId} 
        />
        <MainPanel 
          student={selectedStudent} 
          onShowToast={handleShowToast} 
        />
      </div>

      <div className={`fixed bottom-7 right-7 z-[1000] bg-[var(--color-accent)] text-[#0d0f14] px-5 py-3 rounded-xl font-[var(--font-syne)] font-semibold text-[14px] shadow-[0_8px_32px_rgba(110,231,183,0.25)] transition-all duration-300 cubic-bezier(0.34, 1.56, 0.64, 1) ${showToast ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'}`}>
        {toastMsg}
      </div>
    </div>
  );
}
