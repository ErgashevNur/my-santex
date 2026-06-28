import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | string) {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return new Intl.NumberFormat('uz-UZ').format(num) + ' so\'m'
}

export function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString('uz-UZ', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatShortDate(date: string | Date) {
  return new Date(date).toLocaleDateString('uz-UZ', {
    month: 'short',
    day: 'numeric',
  })
}
