import React, { useState } from 'react';
import { Student } from '../types';
import { Search } from 'lucide-react';

interface SidebarProps {
  students: Student[];
  selectedStudentId: string | null;
  onSelectStudent: (id: string) => void;
}

export function Sidebar({ students, selectedStudentId, onSelectStudent }: SidebarProps) {
  const [filter, setFilter] = useState<'all' | 'red' | 'yellow' | 'green'>('all');
  const [search, setSearch] = useState('');

  const getStatus = (s: Student) => {
    const dl = s.daysSinceLesson < 0 ? 0 : s.daysSinceLesson;
    const dp = s.daysSinceProject;
    if (dl >= 3 || dp >= 7) return 'red';
    if (dl >= 1 || dp >= 4) return 'yellow';
    return 'green';
  };

  const statusLabel = (s: Student) => {
    const st = getStatus(s);
    if (st === 'red') return '🔴 Urgent';
    if (st === 'yellow') return '🟡 Attention';
    return '🟢 On Track';
  };

  const fullName = (s: Student) => s.lastName ? `${s.firstName} ${s.lastName}` : s.firstName;

  let filteredStudents = [...students].sort((a, b) => {
    const order = { red: 0, yellow: 1, green: 2 };
    const oa = order[getStatus(a)];
    const ob = order[getStatus(b)];
    if (oa !== ob) return oa - ob;
    return (b.daysSinceLesson < 0 ? 0 : b.daysSinceLesson) - (a.daysSinceLesson < 0 ? 0 : a.daysSinceLesson);
  });

  if (filter !== 'all') {
    filteredStudents = filteredStudents.filter(s => getStatus(s) === filter);
  }
  
  if (search.trim()) {
    const q = search.toLowerCase().trim();
    filteredStudents = filteredStudents.filter(s => 
      fullName(s).toLowerCase().includes(q) || s.sprint.toLowerCase().includes(q)
    );
  }

  const stats = {
    red: students.filter(s => getStatus(s) === 'red').length,
    yellow: students.filter(s => getStatus(s) === 'yellow').length,
    green: students.filter(s => getStatus(s) === 'green').length,
  };

  return (
    <div className="w-[380px] min-w-[340px] border-r border-[var(--color-border)] flex flex-col bg-[var(--color-surface)] h-full">
      <div className="p-5 pb-3 border-b border-[var(--color-border)]">
        <div className="font-[var(--font-syne)] text-[13px] font-bold text-[var(--color-muted)] uppercase tracking-widest mb-2.5">
          Students · Today
        </div>
        <div className="flex gap-2.5">
          <div className="flex-1 p-2 rounded-lg text-center font-[var(--font-mono)] bg-red-500/10 border border-red-500/20">
            <span className="text-[20px] font-medium block text-[var(--color-red)]">{stats.red}</span>
            <span className="text-[10px] text-[var(--color-muted)] uppercase tracking-wider">🔴 Urgent</span>
          </div>
          <div className="flex-1 p-2 rounded-lg text-center font-[var(--font-mono)] bg-yellow-500/10 border border-yellow-500/20">
            <span className="text-[20px] font-medium block text-[var(--color-yellow)]">{stats.yellow}</span>
            <span className="text-[10px] text-[var(--color-muted)] uppercase tracking-wider">🟡 Attention</span>
          </div>
          <div className="flex-1 p-2 rounded-lg text-center font-[var(--font-mono)] bg-[#6ee7b7]/10 border border-[#6ee7b7]/20">
            <span className="text-[20px] font-medium block text-[var(--color-green)]">{stats.green}</span>
            <span className="text-[10px] text-[var(--color-muted)] uppercase tracking-wider">🟢 On track</span>
          </div>
        </div>
      </div>

      <div className="p-3 px-5 flex gap-2 flex-wrap border-b border-[var(--color-border)]">
        <button 
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-full border text-xs transition-colors ${filter === 'all' ? 'bg-[var(--color-accent)] text-[#0d0f14] border-[var(--color-accent)] font-medium' : 'border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]'}`}
        >
          All
        </button>
        <button 
          onClick={() => setFilter('red')}
          className={`px-3 py-1.5 rounded-full border text-xs transition-colors ${filter === 'red' ? 'bg-[var(--color-red)] text-[#0d0f14] border-[var(--color-red)] font-medium' : 'border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]'}`}
        >
          🔴 Urgent
        </button>
        <button 
          onClick={() => setFilter('yellow')}
          className={`px-3 py-1.5 rounded-full border text-xs transition-colors ${filter === 'yellow' ? 'bg-[var(--color-yellow)] text-[#0d0f14] border-[var(--color-yellow)] font-medium' : 'border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]'}`}
        >
          🟡 Attention
        </button>
        <button 
          onClick={() => setFilter('green')}
          className={`px-3 py-1.5 rounded-full border text-xs transition-colors ${filter === 'green' ? 'bg-[var(--color-accent)] text-[#0d0f14] border-[var(--color-accent)] font-medium' : 'border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]'}`}
        >
          🟢 On Track
        </button>
      </div>

      <div className="p-2.5 px-5 border-b border-[var(--color-border)]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-muted)]" />
          <input 
            type="text"
            placeholder="Search student..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full py-2 pl-9 pr-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface2)] text-[13px] outline-none focus:border-[var(--color-accent)] transition-colors placeholder-[var(--color-muted)]"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredStudents.map(s => {
          const st = getStatus(s);
          const dl = s.daysSinceLesson < 0 ? 0 : s.daysSinceLesson;
          const isActive = selectedStudentId === s.id;
          
          let badgeClass = '';
          let fillClass = '';
          if (st === 'red') {
            badgeClass = 'bg-red-500/15 text-[var(--color-red)] border border-red-500/30';
            fillClass = 'bg-[var(--color-red)]';
          } else if (st === 'yellow') {
            badgeClass = 'bg-yellow-500/15 text-[var(--color-yellow)] border border-yellow-500/30';
            fillClass = 'bg-[var(--color-yellow)]';
          } else {
            badgeClass = 'bg-[#6ee7b7]/15 text-[var(--color-green)] border border-[#6ee7b7]/30';
            fillClass = 'bg-[var(--color-green)]';
          }

          return (
            <div 
              key={s.id}
              onClick={() => onSelectStudent(s.id)}
              className={`p-3.5 px-5 border-b border-[var(--color-border)] cursor-pointer transition-colors relative hover:bg-[var(--color-surface2)] ${isActive ? 'bg-[var(--color-surface2)] border-l-4 border-l-[var(--color-accent)]' : 'border-l-4 border-l-transparent'}`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="font-[var(--font-syne)] font-semibold text-[14px]">{fullName(s)}</div>
                <div className={`text-[10px] font-[var(--font-mono)] px-2 py-0.5 rounded-full font-medium ${badgeClass}`}>
                  {statusLabel(s)}
                </div>
              </div>
              <div className="text-[12px] text-[var(--color-muted)] mb-1.5 font-[var(--font-mono)] truncate">
                {s.sprint}
              </div>
              <div className="flex items-center gap-2 mb-1.5">
                <div className="flex-1 h-1 bg-[var(--color-border)] rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-300 ${fillClass}`} style={{ width: `${s.progress}%` }}></div>
                </div>
                <div className="font-[var(--font-mono)] text-[11px] text-[var(--color-muted)]">{s.progress}%</div>
              </div>
              <div className="flex gap-3 mt-1.5">
                <div className={`text-[11px] flex items-center gap-1 ${dl >= 3 ? 'text-[var(--color-red)]' : 'text-[var(--color-muted)]'}`}>
                  📖 {dl}d no lesson
                </div>
                <div className={`text-[11px] flex items-center gap-1 ${s.daysSinceProject >= 7 ? 'text-[var(--color-red)]' : 'text-[var(--color-muted)]'}`}>
                  📁 {s.daysSinceProject}d no project
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
