export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

export const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('pt-BR').format(value)
}

export const formatPercentage = (value: number): string => {
  return `${value.toFixed(1)}%`
}

export const formatDate = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return dateObj.toLocaleDateString('pt-BR')
}

export const formatDateTime = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return dateObj.toLocaleString('pt-BR')
}

export const formatCompactNumber = (value: number): string => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`
  }
  return value.toString()
}

export const calculateTrend = (current: number, previous: number): {
  percentage: number
  direction: 'up' | 'down' | 'stable'
} => {
  if (previous === 0) {
    return { percentage: 0, direction: 'stable' }
  }

  const percentage = ((current - previous) / previous) * 100
  
  if (Math.abs(percentage) < 0.1) {
    return { percentage: 0, direction: 'stable' }
  }

  return {
    percentage: Math.abs(percentage),
    direction: percentage > 0 ? 'up' : 'down'
  }
}
