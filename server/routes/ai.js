// server/routes/ai.js - AI Pedagogical & Admin Assistant
import { Hono } from 'hono';
import { getDatabase } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const aiRoutes = new Hono();

// Helper to call AI model with graceful heuristic fallback
async function callAI(prompt, systemPrompt) {
  const geminiKey = process.env.GEMINI_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;

  if (geminiKey) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${systemPrompt}\n\n${prompt}` }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 800 }
        })
      });
      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return { text, provider: 'gemini-1.5-flash' };
      }
    } catch (err) {
      console.warn('[AI] Gemini call failed:', err.message);
    }
  }

  if (groqKey) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${groqKey}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 800
        })
      });
      if (res.ok) {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content;
        if (text) return { text, provider: 'groq-llama-3.3' };
      }
    } catch (err) {
      console.warn('[AI] Groq call failed:', err.message);
    }
  }

  return null;
}

// 1. Generate Lesson Plan & Quiz Questions
aiRoutes.post('/lesson-plan', requireAuth(), requireRole(['centre_owner', 'centre_admin', 'teacher']), async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { subject, topic, gradeLevel, durationMinutes = 60 } = body;

  if (!topic) {
    return c.json({ error: 'Topic is required', code: 'INVALID_INPUT' }, 400);
  }

  const prompt = `Generate a structured ${durationMinutes}-minute lesson plan and 3 conceptual quiz questions for:
Subject: ${subject || 'General Science / Mathematics'}
Topic: ${topic}
Grade: ${gradeLevel || 'Grade 10'}

Format clearly with sections:
1. Learning Objectives (3 bullet points)
2. Time Breakdown (${durationMinutes} mins)
3. Key Concepts & Common Misconceptions
4. 3 Formative Quiz Questions with brief answer keys.`;

  const system = "You are a master pedagogical coach helping tutors structure engaging, interactive classroom sessions.";
  const aiResult = await callAI(prompt, system);

  if (aiResult) {
    return c.json({ plan: aiResult.text, provider: aiResult.provider });
  }

  // Deterministic Heuristic Fallback
  const fallbackPlan = `### 📋 Lesson Plan: ${topic} (${gradeLevel || 'Grade 10'})
**Duration:** ${durationMinutes} Minutes | **Subject:** ${subject || 'Curriculum Subject'}

#### 🎯 Learning Objectives:
1. Understand the core definitions and foundational theorems of ${topic}.
2. Solve standard 2-mark and 4-mark application problems with systematic step-by-step reasoning.
3. Identify and prevent common algebraic and conceptual calculation errors.

#### ⏱️ Classroom Schedule (${durationMinutes} min):
- **00–10 min:** Diagnostic warm-up & review of prerequisite concepts.
- **10–30 min:** Interactive board demonstration of ${topic} with 2 contrasting examples.
- **30–45 min:** Paired problem-solving drill with active teacher monitoring.
- **45–55 min:** Rapid formative checkpoint & addressing student doubts.
- **55–60 min:** Homework assignment briefing and wrap-up.

#### ❓ Formative Checkpoint Questions:
1. Explain in your own words the fundamental condition required for ${topic}.
2. What is the most common error students make when simplifying this equation?
3. Solve a standard practice case and verify your solution.`;

  return c.json({ plan: fallbackPlan, provider: 'built-in-heuristic' });
});

// 2. Generate Grounded Parent Progress Summary
aiRoutes.post('/progress-summary', requireAuth(), async (c) => {
  const centre = c.get('centre');
  const body = await c.req.json().catch(() => ({}));
  const { studentId } = body;

  if (!studentId) {
    return c.json({ error: 'studentId is required', code: 'INVALID_INPUT' }, 400);
  }

  const db = getDatabase();
  const student = db.get("SELECT * FROM students WHERE id = ? AND centre_id = ?", [studentId, centre.id]);
  if (!student) {
    return c.json({ error: 'Student not found', code: 'NOT_FOUND' }, 404);
  }

  // Fetch actual metrics from database
  const attStats = db.get(
    `SELECT COUNT(*) AS total,
            SUM(CASE WHEN status IN ('present', 'late') THEN 1 ELSE 0 END) AS attended
     FROM attendance_records ar
     JOIN attendance_sessions s ON s.id = ar.session_id
     WHERE ar.student_id = ?`,
    [studentId]
  );

  const scores = db.all(
    `SELECT sc.marks_obtained, a.max_marks, a.title, sub.name AS subject_name
     FROM assessment_scores sc
     JOIN assessments a ON a.id = sc.assessment_id
     JOIN subjects sub ON sub.id = a.subject_id
     WHERE sc.student_id = ? AND sc.marks_obtained IS NOT NULL
     ORDER BY a.assessment_date DESC LIMIT 5`,
    [studentId]
  );

  const hwStats = db.get(
    `SELECT COUNT(*) AS total_submitted,
            AVG(score) AS avg_score
     FROM submissions WHERE student_id = ?`,
    [studentId]
  );

  const totalSessions = Number(attStats?.total || 0);
  const attended = Number(attStats?.attended || 0);
  const attRate = totalSessions > 0 ? Math.round((attended / totalSessions) * 100) : 100;

  const scoreSummary = scores.map(s => `${s.title} (${s.subject_name}): ${s.marks_obtained}/${s.max_marks}`).join(', ') || 'No assessments recorded yet';

  const prompt = `Generate a polite, encouraging, and constructive 3-paragraph learning progress summary for parents of student ${student.first_name} ${student.last_name} (${student.grade_level}).
Attendance Rate: ${attRate}% (${attended}/${totalSessions} sessions attended)
Recent Assessment Results: ${scoreSummary}
Homework Submissions: ${hwStats?.total_submitted || 0} assignments completed (Avg score: ${Math.round(hwStats?.avg_score || 0)}/100).
Centre: ${centre.name}

Guidelines:
1. Praise consistent effort and attendance.
2. Highlight strengths based on real scores.
3. Offer 1 specific constructive tip for improvement.
Keep tone professional and encouraging.`;

  const system = "You are a thoughtful educational director writing authentic, grounded parent progress letters.";
  const aiResult = await callAI(prompt, system);

  if (aiResult) {
    return c.json({ summary: aiResult.text, provider: aiResult.provider });
  }

  // Fallback
  const fallback = `Dear Parent/Guardian,

We are pleased to share an update on **${student.first_name}'s** academic journey at ${centre.name}. ${student.first_name} has maintained a commendable attendance rate of **${attRate}%**, demonstrating positive consistency and dedication in the classroom.

In recent evaluations (${scoreSummary}), ${student.first_name} has demonstrated solid grasp of core fundamentals and active participation during problem-solving sessions. With ${hwStats?.total_submitted || 0} homework assignments submitted, task diligence remains strong.

To take learning to the next level, we encourage continued focus on time management during multi-step problem solving and active participation in our weekend doubt-clearing sessions. Thank you for your continued partnership.`;

  return c.json({ summary: fallback, provider: 'built-in-heuristic' });
});

// 3. Generate Fee Reminder Notice
aiRoutes.post('/fee-reminder', requireAuth(), requireRole(['centre_owner', 'centre_admin', 'accountant']), async (c) => {
  const centre = c.get('centre');
  const body = await c.req.json().catch(() => ({}));
  const { invoiceId } = body;

  const db = getDatabase();
  const inv = db.get(
    `SELECT inv.*, s.first_name, s.last_name, g.name AS guardian_name, g.phone AS guardian_phone
     FROM invoices inv
     JOIN students s ON s.id = inv.student_id
     LEFT JOIN student_guardians sg ON sg.student_id = s.id AND sg.is_primary = 1
     LEFT JOIN guardians g ON g.id = sg.guardian_id
     WHERE inv.id = ? AND inv.centre_id = ?`,
    [invoiceId, centre.id]
  );

  if (!inv) {
    return c.json({ error: 'Invoice not found', code: 'NOT_FOUND' }, 404);
  }

  const balance = (inv.total_cents - inv.paid_cents) / 100;
  const currencySymbol = centre.currency === 'INR' ? '₹' : '$';

  const message = `Dear ${inv.guardian_name || 'Parent'}, greetings from ${centre.name}. This is a gentle reminder that invoice ${inv.invoice_number} for ${inv.first_name} ${inv.last_name} has a pending balance of ${currencySymbol}${balance.toLocaleString('en-IN')}, due on ${inv.due_date}. Kindly complete the transfer via UPI/Cash/Bank transfer at your earliest convenience. Thank you!`;

  return c.json({ message, balance, invoiceNumber: inv.invoice_number });
});
