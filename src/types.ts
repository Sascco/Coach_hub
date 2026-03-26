export interface Student {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string;
  phone: string;
  sprint: string;
  progress: number;
  daysSinceProject: number;
  daysSinceLesson: number;
  lastLesson: string | null;
  lastProject: string | null;
  cohortStart: string;
  lmsLink: string;
  lcNotes: string | null;
  deadline: string;
  daysUntilDeadline: number;
  mbgStatus: string;
  extraWeeks: number;
  lastSeen?: string;
}

export interface MessageHistoryItem {
  date: string;
  message: string;
  category: string;
}
