export type Subject = { id: string; name: string; color: string | null; icon: string | null }
export type Assignment = { id: string; title: string; description: string | null; deadline: string | null; estimated_minutes: number | null; difficulty: number | null; priority: number; status: string; subject_id: string | null }
export type Exam = { id: string; title: string; exam_at: string; location: string | null; subject_id: string | null }
