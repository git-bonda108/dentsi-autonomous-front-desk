import Link from 'next/link'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatsCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  description?: string
  trend?: {
    value: number
    label: string
  }
  variant?: 'default' | 'success' | 'warning' | 'danger'
  href?: string
}

export function StatsCard({ 
  title, 
  value, 
  icon: Icon, 
  description, 
  trend,
  variant = 'default',
  href
}: StatsCardProps) {
  const variantStyles = {
    default: 'bg-white border-gray-200',
    success: 'bg-green-50 border-green-200',
    warning: 'bg-yellow-50 border-yellow-200',
    danger: 'bg-red-50 border-red-200',
  }

  const iconStyles = {
    default: 'bg-primary/10 text-primary',
    success: 'bg-green-100 text-green-600',
    warning: 'bg-yellow-100 text-yellow-600',
    danger: 'bg-red-100 text-red-600',
  }

  const cardContent = (
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <p className="text-3xl font-bold mt-2">{value}</p>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
        {trend && (
          <p className="text-sm font-medium text-green-600 mt-2">
            ↑ {trend.value.toFixed(1)}% {trend.label}
          </p>
        )}
      </div>
      <div className={cn(
        'rounded-full p-3',
        iconStyles[variant]
      )}>
        <Icon className="h-6 w-6" />
      </div>
    </div>
  )

  if (href) {
    return (
      <Link 
        href={href}
        className={cn(
          'rounded-lg border p-6 shadow-sm transition-all hover:shadow-md hover:scale-105 block cursor-pointer',
          variantStyles[variant]
        )}
      >
        {cardContent}
      </Link>
    )
  }

  return (
    <div className={cn(
      'rounded-lg border p-6 shadow-sm transition-shadow hover:shadow-md',
      variantStyles[variant]
    )}>
      {cardContent}
    </div>
  )
}
