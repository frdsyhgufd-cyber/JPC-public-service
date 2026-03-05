export interface Physician {
  id: string;
  name: string;
}

export interface Evaluator {
  id: string;
  name: string;
  role: 'specialist' | 'director';
  assignedItems?: string[]; // Array of item IDs
}

export interface EvaluationItem {
  id: string;
  name: string;
  points: number;
  unit: string;
  order?: number;
}

export interface SystemConfig {
  currentYear: number;
  currentMonth: number;
  deadlineStart: string; // YYYY-MM-DD
  deadlineEnd: string;   // YYYY-MM-DD
  adminPassword: string;
}

export interface Submission {
  id?: string;
  evaluatorId: string;
  year: number;
  month: number;
  data: Record<string, Record<string, number>>; // physicianId -> itemId -> count
  submittedAt: any;
}

export interface SpecialBonus {
  id?: string;
  year: number;
  month: number;
  physicianId: string;
  points: number;
}

export const strokeSort = (a: string, b: string) => {
  return new Intl.Collator('zh-Hant-u-co-stroke').compare(a, b);
};
