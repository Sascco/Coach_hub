import React, { useState, useEffect, useRef } from 'react';
import { Student, MessageHistoryItem } from '../types';
import { GoogleGenAI } from '@google/genai';
import { Copy, Check, Edit2, RefreshCw, Send } from 'lucide-react';

interface MainPanelProps {
  student: Student | null;
  onShowToast: (msg: string) => void;
}

export function MainPanel({ student, onShowToast }: MainPanelProps) {
  const [category, setCategory] = useState<'auto' | 'regular' | 'engagement' | 'deadline' | 'missed' | 'sprint'>('auto');
  const [generatedMessage, setGeneratedMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'lc' | 'my' | 'history'>('lc');
  const [myNote, setMyNote] = useState('');
  const [history, setHistory] = useState<MessageHistoryItem[]>([]);
  const [showSaved, setShowSaved] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (student) {
      setCategory('auto');
      setIsEditing(false);
      
      // Load notes and history
      const notes = JSON.parse(localStorage.getItem('coachNotes') || '{}');
      setMyNote(notes[student.id] || '');
      
      const hist = JSON.parse(localStorage.getItem('coachHistory') || '{}');
      setHistory(hist[student.id] || []);

      generateMessage('auto', student);
    }
  }, [student]);

  const autoCategory = (s: Student) => {
    const dl = s.daysSinceLesson < 0 ? 0 : s.daysSinceLesson;
    if (dl >= 3 || s.daysSinceProject >= 7) return 'engagement';
    if (s.daysSinceProject >= 4) return 'deadline';
    return 'regular';
  };

  const generateMessage = async (cat: string, s: Student) => {
    setIsGenerating(true);
    setGeneratedMessage('');
    setIsEditing(false);

    const actualCat = cat === 'auto' ? autoCategory(s) : cat;
    const dl = s.daysSinceLesson < 0 ? 0 : s.daysSinceLesson;

    const systemPrompt = `You are a Learning Coach at TripleTen, a tech bootcamp. You send personalized SMS messages to students to check in on their progress. 
Your tone is warm, friendly, supportive, and encouraging — like a real person who genuinely cares.
Write in English. Keep messages concise (under 320 characters ideally, though longer is fine for sprint resources). Use emojis sparingly but naturally.
Never sound robotic or generic. Always address the student by their first name.
Output ONLY the message text, no quotes, no labels, no explanation.`;

    const catGuide: Record<string, string> = {
      regular: "Write a warm weekly check-in message. Ask how they're doing, whether they've hit any obstacles, and remind them you're there to help.",
      engagement: `The student has been inactive for ${dl} days without completing a lesson and ${s.daysSinceProject} days without submitting a project. Write a re-engagement message that is empathetic and curious — ask if everything is okay, acknowledge that life happens, and gently invite them back.`,
      deadline: `The student is close to their sprint deadline. They are ${s.daysSinceProject} days since their last project submission and at ${s.progress}% progress. Write a motivating deadline reminder.`,
      missed: "The student missed their deadline. Write a caring, non-judgmental check-in that acknowledges it, asks how they're doing, and offers support to get back on track. Mention MBG eligibility briefly.",
      sprint: `Write a supportive message pointing the student to sprint resources for their current sprint: ${s.sprint}. Include encouragement and mention you're available for help.`,
    };

    const userPrompt = `Student first name: ${s.firstName}
Current sprint: ${s.sprint}
Sprint progress: ${s.progress}%
Days since last lesson completed: ${dl}
Days since last project submitted: ${s.daysSinceProject}
Cohort start: ${s.cohortStart}

Task: ${catGuide[actualCat] || catGuide.regular}`;

    try {
      if (!process.env.GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY is not set. Please configure it in the AI Studio settings.");
      }
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: userPrompt,
        config: {
          systemInstruction: systemPrompt,
        }
      });
      
      setGeneratedMessage(response.text || 'Could not generate message.');
    } catch (e: any) {
      console.error(e);
      setGeneratedMessage(`Error generating message: ${e?.message || String(e)}\n\nAPI Key available: ${!!process.env.GEMINI_API_KEY}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCategoryChange = (cat: any) => {
    setCategory(cat);
    if (student) {
      generateMessage(cat, student);
    }
  };

  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setMyNote(val);
    
    if (student) {
      const notes = JSON.parse(localStorage.getItem('coachNotes') || '{}');
      notes[student.id] = val;
      localStorage.setItem('coachNotes', JSON.stringify(notes));
      
      setShowSaved(true);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => setShowSaved(false), 1500);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedMessage).then(() => {
      onShowToast('📋 Copied! Paste it in Aircall');
    });
  };

  const handleMarkSent = () => {
    if (!student) return;
    
    const actualCat = category === 'auto' ? autoCategory(student) : category;
    const newItem: MessageHistoryItem = {
      date: new Date().toISOString(),
      message: generatedMessage,
      category: actualCat
    };
    
    const newHistory = [newItem, ...history];
    setHistory(newHistory);
    
    const allHistory = JSON.parse(localStorage.getItem('coachHistory') || '{}');
    allHistory[student.id] = newHistory;
    localStorage.setItem('coachHistory', JSON.stringify(allHistory));
    
    onShowToast('✓ Marked as sent!');
  };

  if (!student) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-[var(--color-muted)] gap-3 bg-[var(--color-bg)]">
        <div className="text-5xl opacity-30">👋</div>
        <div className="font-[var(--font-syne)] text-lg">Select a student</div>
        <div className="text-[13px] max-w-[280px] text-center leading-relaxed">
          Choose a student from the list to generate and send a personalized message.
        </div>
      </div>
    );
  }

  const dl = student.daysSinceLesson < 0 ? 0 : student.daysSinceLesson;
  const fullName = student.lastName ? `${student.firstName} ${student.lastName}` : student.firstName;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[var(--color-bg)]">
      <div className="p-6 px-8 pb-5 border-b border-[var(--color-border)] bg-[var(--color-surface)] flex items-start justify-between">
        <div>
          <div className="font-[var(--font-syne)] text-2xl font-extrabold tracking-tight">{fullName}</div>
          <div className="text-[13px] text-[var(--color-muted)] mt-1 font-[var(--font-mono)]">{student.email}</div>
          <div className="text-[13px] text-[var(--color-accent)] mt-1 font-[var(--font-mono)]">{student.phone}</div>
        </div>
        <div className="flex gap-2.5 items-start">
          <a 
            href={student.lmsLink} 
            target="_blank" 
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-[12px] font-[var(--font-mono)] text-[var(--color-blue)] no-underline px-2.5 py-1 border border-blue-400/20 rounded-md bg-blue-400/5 hover:bg-blue-400/10 hover:border-[var(--color-blue)] transition-colors"
          >
            📊 LMS Progress ↗
          </a>
        </div>
      </div>

      <div className="flex border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="flex-1 p-3.5 px-6 border-r border-[var(--color-border)]">
          <div className="text-[10px] uppercase tracking-widest text-[var(--color-muted)] font-[var(--font-mono)] mb-1.5">Current Sprint</div>
          <div className="font-[var(--font-syne)] text-lg font-bold text-[var(--color-green)]">{student.sprint}</div>
          <div className="text-[11px] text-[var(--color-muted)] mt-0.5 font-[var(--font-mono)]">Since {student.cohortStart}</div>
        </div>
        <div className="flex-1 p-3.5 px-6 border-r border-[var(--color-border)]">
          <div className="text-[10px] uppercase tracking-widest text-[var(--color-muted)] font-[var(--font-mono)] mb-1.5">Sprint Progress</div>
          <div className={`font-[var(--font-syne)] text-xl font-bold ${student.progress >= 70 ? 'text-[var(--color-green)]' : student.progress >= 40 ? 'text-[var(--color-yellow)]' : 'text-[var(--color-red)]'}`}>
            {student.progress}%
          </div>
          <div className="text-[11px] text-[var(--color-muted)] mt-0.5 font-[var(--font-mono)]">of sprint completed</div>
        </div>
        <div className="flex-1 p-3.5 px-6 border-r border-[var(--color-border)]">
          <div className="text-[10px] uppercase tracking-widest text-[var(--color-muted)] font-[var(--font-mono)] mb-1.5">Last Seen</div>
          <div className="font-[var(--font-syne)] text-lg font-bold text-[var(--color-text)]">
            {student.lastSeen ? new Date(student.lastSeen).toLocaleDateString() : '—'}
          </div>
          <div className="text-[11px] text-[var(--color-muted)] mt-0.5 font-[var(--font-mono)]">
            {student.lastSeen ? new Date(student.lastSeen).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
          </div>
        </div>
        <div className="flex-1 p-3.5 px-6 border-r border-[var(--color-border)]">
          <div className="text-[10px] uppercase tracking-widest text-[var(--color-muted)] font-[var(--font-mono)] mb-1.5">Days since Lesson</div>
          <div className={`font-[var(--font-syne)] text-xl font-bold ${dl >= 3 ? 'text-[var(--color-red)]' : dl >= 1 ? 'text-[var(--color-yellow)]' : 'text-[var(--color-green)]'}`}>
            {dl}d
          </div>
          <div className="text-[11px] text-[var(--color-muted)] mt-0.5 font-[var(--font-mono)]">Last: {student.lastLesson || '—'}</div>
        </div>
        <div className="flex-1 p-3.5 px-6">
          <div className="text-[10px] uppercase tracking-widest text-[var(--color-muted)] font-[var(--font-mono)] mb-1.5">Days since Project</div>
          <div className={`font-[var(--font-syne)] text-xl font-bold ${student.daysSinceProject >= 7 ? 'text-[var(--color-red)]' : student.daysSinceProject >= 4 ? 'text-[var(--color-yellow)]' : 'text-[var(--color-green)]'}`}>
            {student.daysSinceProject}d
          </div>
          <div className="text-[11px] text-[var(--color-muted)] mt-0.5 font-[var(--font-mono)]">Last: {student.lastProject || '—'}</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 px-8 flex flex-col gap-5">
        <div>
          <div className="font-[var(--font-syne)] text-[11px] uppercase tracking-[1.5px] text-[var(--color-muted)] mb-2">Message Category</div>
          <div className="flex gap-2 flex-wrap">
            {[
              { id: 'auto', label: '✨ Auto-suggest' },
              { id: 'regular', label: 'Weekly Check-in' },
              { id: 'engagement', label: 'Re-engagement' },
              { id: 'deadline', label: 'Close to Deadline' },
              { id: 'missed', label: 'Missed Deadline' },
              { id: 'sprint', label: 'Sprint Resources' },
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => handleCategoryChange(cat.id)}
                className={`px-3.5 py-1.5 rounded-lg border text-xs font-[var(--font-mono)] transition-colors ${
                  category === cat.id 
                    ? 'bg-[#6ee7b7]/10 text-[var(--color-accent)] border-[var(--color-accent)]' 
                    : 'bg-transparent text-[var(--color-muted)] border-[var(--color-border)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] hover:bg-[#6ee7b7]/5'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="font-[var(--font-syne)] text-[11px] uppercase tracking-[1.5px] text-[var(--color-muted)] mb-2.5 flex items-center gap-2">
            Generated Message 
            <span className="text-[10px] bg-[#6ee7b7]/10 text-[var(--color-accent)] border border-[#6ee7b7]/20 rounded-full px-2 py-0.5 font-[var(--font-mono)] normal-case tracking-normal">
              ✦ AI
            </span>
          </div>
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden">
            <div className="flex items-center justify-between p-2.5 px-4 border-b border-[var(--color-border)] bg-[var(--color-surface2)]">
              <div className="flex gap-2 items-center">
                <span className="text-[11px] font-[var(--font-mono)] text-[var(--color-muted)]">To: {student.phone}</span>
                <span className="text-[10px] bg-[#6ee7b7]/10 text-[var(--color-accent)] border border-[#6ee7b7]/20 rounded-full px-2 py-0.5 font-[var(--font-mono)]">Gemini 3.0 Flash</span>
              </div>
              <button 
                onClick={() => generateMessage(category, student)}
                disabled={isGenerating}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-surface2)] text-[var(--color-text)] border border-[var(--color-border)] hover:border-[var(--color-blue)] hover:text-[var(--color-blue)] font-[var(--font-syne)] font-semibold text-[11px] transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isGenerating ? 'animate-spin' : ''}`} />
                Regenerate
              </button>
            </div>
            
            <div className="p-4 min-h-[160px] text-sm leading-relaxed text-[var(--color-text)]">
              {isGenerating ? (
                <div className="flex items-center gap-2 text-[var(--color-accent)] text-[13px] font-[var(--font-mono)]">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] animate-pulse"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] animate-pulse" style={{ animationDelay: '0.2s' }}></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] animate-pulse" style={{ animationDelay: '0.4s' }}></span>
                  </div>
                  Generating message...
                </div>
              ) : isEditing ? (
                <textarea
                  value={generatedMessage}
                  onChange={(e) => setGeneratedMessage(e.target.value)}
                  className="w-full h-full min-h-[160px] bg-transparent border-none outline-none resize-y font-[var(--font-sans)] text-sm text-[var(--color-text)] leading-relaxed"
                  autoFocus
                />
              ) : (
                <div className="whitespace-pre-wrap">{generatedMessage}</div>
              )}
            </div>

            <div className="flex items-center justify-between p-2.5 px-4 border-t border-[var(--color-border)] bg-[var(--color-surface2)]">
              <span className="font-[var(--font-mono)] text-[11px] text-[var(--color-muted)]">
                {generatedMessage.length} characters
              </span>
              <div className="flex gap-2">
                {!isGenerating && (
                  <>
                    <button 
                      onClick={() => setIsEditing(!isEditing)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-transparent border border-[var(--color-border)] text-[var(--color-text)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] font-[var(--font-syne)] font-semibold text-[13px] transition-colors"
                    >
                      {isEditing ? <Check className="w-3.5 h-3.5" /> : <Edit2 className="w-3.5 h-3.5" />}
                      {isEditing ? 'Done' : 'Edit'}
                    </button>
                    <button 
                      onClick={handleCopy}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-surface2)] border border-[var(--color-border)] text-[var(--color-text)] hover:border-[var(--color-blue)] hover:text-[var(--color-blue)] font-[var(--font-syne)] font-semibold text-[13px] transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Copy
                    </button>
                    <button 
                      onClick={handleMarkSent}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-accent)] text-[#0d0f14] border-none hover:bg-[#4ade80] font-[var(--font-syne)] font-semibold text-[13px] transition-colors"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Mark as Sent
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-1">
          <div className="font-[var(--font-syne)] text-[11px] uppercase tracking-[1.5px] text-[var(--color-muted)] mb-2.5">Notes & History</div>
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden">
            <div className="flex border-b border-[var(--color-border)]">
              <button 
                onClick={() => setActiveTab('lc')}
                className={`flex-1 p-2.5 text-center text-xs font-[var(--font-mono)] transition-colors border-b-2 ${activeTab === 'lc' ? 'text-[var(--color-accent)] border-[var(--color-accent)]' : 'text-[var(--color-muted)] border-transparent hover:text-[var(--color-text)]'}`}
              >
                📋 LC Notes
              </button>
              <button 
                onClick={() => setActiveTab('my')}
                className={`flex-1 p-2.5 text-center text-xs font-[var(--font-mono)] transition-colors border-b-2 ${activeTab === 'my' ? 'text-[var(--color-accent)] border-[var(--color-accent)]' : 'text-[var(--color-muted)] border-transparent hover:text-[var(--color-text)]'}`}
              >
                ✏️ My Notes
              </button>
              <button 
                onClick={() => setActiveTab('history')}
                className={`flex-1 p-2.5 text-center text-xs font-[var(--font-mono)] transition-colors border-b-2 ${activeTab === 'history' ? 'text-[var(--color-accent)] border-[var(--color-accent)]' : 'text-[var(--color-muted)] border-transparent hover:text-[var(--color-text)]'}`}
              >
                📨 History
              </button>
            </div>
            
            <div className="p-3.5 px-4 min-h-[150px] max-h-[300px] overflow-y-auto">
              {activeTab === 'lc' && (
                <div className="text-[13px] text-[var(--color-text)] leading-relaxed whitespace-pre-wrap break-words">
                  {student.lcNotes || 'No LC notes available for this student.'}
                </div>
              )}
              
              {activeTab === 'my' && (
                <textarea
                  value={myNote}
                  onChange={handleNoteChange}
                  placeholder="Write your personal notes about this student here..."
                  className="w-full min-h-[120px] bg-transparent border-none outline-none resize-y font-[var(--font-sans)] text-[13px] text-[var(--color-text)] leading-relaxed"
                />
              )}
              
              {activeTab === 'history' && (
                <div>
                  {history.length === 0 ? (
                    <div className="text-[var(--color-muted)] text-[13px] font-[var(--font-mono)] text-center p-4">
                      No messages sent yet
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {history.map((h, i) => (
                        <div key={i} className="p-3 px-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg flex gap-3 items-start">
                          <div className="w-2 h-2 rounded-full bg-[var(--color-green)] mt-1.5 shrink-0"></div>
                          <div className="flex-1 min-w-0">
                            <div className="font-[var(--font-mono)] text-[11px] text-[var(--color-muted)] mb-1">
                              {new Date(h.date).toLocaleString()}
                            </div>
                            <div className="text-[13px] text-[var(--color-text)] leading-relaxed whitespace-pre-wrap break-words">
                              {h.message}
                            </div>
                            <div className="text-[10px] font-[var(--font-mono)] text-[var(--color-accent)] mt-1">
                              {h.category}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {activeTab === 'my' && (
              <div className="flex justify-between items-center p-2 px-4 border-t border-[var(--color-border)] bg-[var(--color-surface2)]">
                <span className={`text-[11px] font-[var(--font-mono)] text-[var(--color-green)] transition-opacity duration-300 ${showSaved ? 'opacity-100' : 'opacity-0'}`}>
                  ✓ Saved
                </span>
                <span className="font-[var(--font-mono)] text-[11px] text-[var(--color-muted)]">
                  {myNote.length} chars
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
