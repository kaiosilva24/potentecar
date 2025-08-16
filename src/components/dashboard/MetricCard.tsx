import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  DollarSign,
  Package,
  ShoppingCart,
  Users,
  AlertTriangle,
  CreditCard,
  Percent
} from 'lucide-react'
import { MetricCard as MetricCardType } from '../../types/metrics'

interface MetricCardProps {
  metric: MetricCardType
  isLoading?: boolean
}

const iconMap = {
  'dollar-sign': DollarSign,
  'package': Package,
  'shopping-cart': ShoppingCart,
  'users': Users,
  'alert-triangle': AlertTriangle,
  'credit-card': CreditCard,
  'percent': Percent,
}

const colorMap = {
  blue: 'text-blue-600 bg-blue-100',
  green: 'text-green-600 bg-green-100',
  red: 'text-red-600 bg-red-100',
  yellow: 'text-yellow-600 bg-yellow-100',
  purple: 'text-purple-600 bg-purple-100',
  indigo: 'text-indigo-600 bg-indigo-100',
}

const formatValue = (value: number, format: MetricCardType['format']) => {
  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(value)
    case 'percentage':
      return `${value.toFixed(1)}%`
    case 'number':
    default:
      return new Intl.NumberFormat('pt-BR').format(value)
  }
}

const getTrendIcon = (trend?: MetricCardType['trend']) => {
  switch (trend) {
    case 'up':
      return <TrendingUp className="h-4 w-4 text-green-600" />
    case 'down':
      return <TrendingDown className="h-4 w-4 text-red-600" />
    case 'stable':
    default:
      return <Minus className="h-4 w-4 text-gray-600" />
  }
}

const calculateTrendPercentage = (current: number, previous?: number) => {
  if (!previous || previous === 0) return null
  
  const change = ((current - previous) / previous) * 100
  return change.toFixed(1)
}

export const MetricCard: React.FC<MetricCardProps> = ({ metric, isLoading }) => {
  const Icon = iconMap[metric.icon as keyof typeof iconMap] || DollarSign
  const trendPercentage = calculateTrendPercentage(metric.value, metric.previousValue)

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            <div className="h-4 bg-gray-200 rounded w-24"></div>
          </CardTitle>
          <div className="h-8 w-8 bg-gray-200 rounded"></div>
        </CardHeader>
        <CardContent>
          <div className="h-8 bg-gray-200 rounded w-32 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-20"></div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="transition-all duration-200 hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">
          {metric.title}
        </CardTitle>
        <div className={`p-2 rounded-full ${colorMap[metric.color]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900 mb-1">
          {formatValue(metric.value, metric.format)}
        </div>
        {trendPercentage && (
          <div className="flex items-center text-sm text-gray-600">
            {getTrendIcon(metric.trend)}
            <span className="ml-1">
              {trendPercentage}% em relação ao período anterior
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
