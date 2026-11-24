import { initials } from '../lib/format'

interface Props {
  name: string
  color?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const sizes = {
  sm: 'h-9 w-9 text-xs',
  md: 'h-12 w-12 text-sm',
  lg: 'h-16 w-16 text-lg',
  xl: 'h-24 w-24 text-2xl',
}

export function Avatar({ name, color = '#8b7cff', size = 'md' }: Props) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-bold text-white shadow-inner ${sizes[size]}`}
      style={{ backgroundColor: color }}
      aria-hidden="true"
    >
      {initials(name) || '?'}
    </div>
  )
}
