import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;

type Category = 'regular' | 'engagement' | 'deadline' | 'missed' | 'sprint';

interface GenerateMessageBody {
  firstName: string;
  sprint: string;
  progress: number;
  daysSinceLesson: number;
  daysSinceProject: number;
  cohortStart: string;
  category: Category;
}

const SYSTEM_PROMPT = `You are a Learning Coach at TripleTen, a tech bootcamp. You send personalized SMS messages to students to check in on their progress.
Your tone is warm, friendly, supportive, and encouraging — like a real person who genuinely cares.
Write in English. Keep messages concise (under 320 characters ideally, though longer is fine for sprint resources). Use emojis sparingly but naturally.
Never sound robotic or generic. Always address the student by their first name.
Output ONLY the message text, no quotes, no labels, no explanation.`;

function categoryGuide(s: GenerateMessageBody): Record<Category, string> {
  return {
    regular: "Write a warm weekly check-in message. Ask how they're doing, whether they've hit any obstacles, and remind them you're there to help.",
    engagement: `The student has been inactive for ${s.daysSinceLesson} days without completing a lesson and ${s.daysSinceProject} days without submitting a project. Write a re-engagement message that is empathetic and curious — ask if everything is okay, acknowledge that life happens, and gently invite them back.`,
    deadline: `The student is close to their sprint deadline. They are ${s.daysSinceProject} days since their last project submission and at ${s.progress}% progress. Write a motivating deadline reminder.`,
    missed: "The student missed their deadline. Write a caring, non-judgmental check-in that acknowledges it, asks how they're doing, and offers support to get back on track. Mention MBG eligibility briefly.",
    sprint: `Write a supportive message pointing the student to sprint resources for their current sprint: ${s.sprint}. Include encouragement and mention you're available for help.`,
  };
}

app.post('/api/generate-message', async (req, res) => {
  if (!process.env.GEMINI_API_KEY) {
    res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
    return;
  }

  const body = req.body as Partial<GenerateMessageBody>;
  if (!body.firstName || !body.category) {
    res.status(400).json({ error: 'Missing required fields.' });
    return;
  }

  const s: GenerateMessageBody = {
    firstName: body.firstName,
    sprint: body.sprint || '',
    progress: body.progress ?? 0,
    daysSinceLesson: body.daysSinceLesson ?? 0,
    daysSinceProject: body.daysSinceProject ?? 0,
    cohortStart: body.cohortStart || '',
    category: body.category,
  };

  const guide = categoryGuide(s)[s.category] || categoryGuide(s).regular;

  const userPrompt = `Student first name: ${s.firstName}
Current sprint: ${s.sprint}
Sprint progress: ${s.progress}%
Days since last lesson completed: ${s.daysSinceLesson}
Days since last project submitted: ${s.daysSinceProject}
Cohort start: ${s.cohortStart}

Task: ${guide}`;

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: userPrompt,
      config: {
        systemInstruction: SYSTEM_PROMPT,
      },
    });
    res.json({ message: response.text || 'Could not generate message.' });
  } catch (e: any) {
    console.error(e);
    res.status(502).json({ error: e?.message || 'Failed to generate message.' });
  }
});

// In production, serve the built frontend from dist/
const distPath = path.resolve(__dirname, 'dist');
app.use(express.static(distPath));
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Coach Hub API server listening on http://localhost:${PORT}`);
});
