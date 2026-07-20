import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getEffectiveStreak(currentStreak: number, lastActivityDate: string | null | undefined, timezone?: string | null) {
  if (currentStreak === 0 || !lastActivityDate) return 0;
  
  const tz = timezone || 'UTC';
  const now = new Date();
  const localString = now.toLocaleString("en-US", { timeZone: tz });
  const localDate = new Date(localString);
  localDate.setHours(0, 0, 0, 0);
  
  const [y, m, d] = lastActivityDate.split('-').map(Number);
  const lastAct = new Date(y, m - 1, d);
  
  const diffDays = Math.round((localDate.getTime() - lastAct.getTime()) / (1000 * 60 * 60 * 24));
  
  return diffDays > 1 ? 0 : currentStreak;
}
