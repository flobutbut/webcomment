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
      <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-300 cursor-not-allowed select-none">
        <span className="w-4 h-4 flex-shrink-0">{icon}</span>
        <span className="text-sm font-medium">{label}</span>
        <span className="ml-auto text-[10px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded font-mono leading-none">
          soon
        </span>
      </div>
    )
  }

  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-100 ${
          isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
        }`
      }
    >
      <span className="w-4 h-4 flex-shrink-0">{icon}</span>
      {label}
    </NavLink>
  )
}
