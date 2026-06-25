import { NavLink } from 'react-router-dom'

interface NavItemProps {
  to:          string
  icon:        React.ReactNode
  label:       string
  comingSoon?: boolean
}

export function NavItem({ to, icon, label, comingSoon }: NavItemProps) {
  if (comingSoon) {
    return (
      <div className="flex items-center gap-3 px-3 py-2 rounded-6 text-gray-300 dark:text-gray-600 cursor-not-allowed select-none">
        <span className="w-4 h-4 flex-shrink-0">{icon}</span>
        <span className="text-sm font-medium">{label}</span>
        <span className="ml-auto text-[10px] bg-gray-100 dark:bg-dark-600 text-gray-400 dark:text-gray-500 px-1.5 py-0.5 rounded-3 font-mono leading-none">
          soon
        </span>
      </div>
    )
  }

  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-6 text-sm font-medium transition-colors duration-100 ${
          isActive
            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-hover hover:text-gray-900 dark:hover:text-gray-100'
        }`
      }
    >
      <span className="w-4 h-4 flex-shrink-0">{icon}</span>
      {label}
    </NavLink>
  )
}
