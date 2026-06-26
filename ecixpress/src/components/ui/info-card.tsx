import { User, Shield, Clock } from "lucide-react"

type UserCardProps = {
  name: string
  email: string
  roles: string[]
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED"
  avatar?: string
  onManageClick?: () => void
}

const STATUS_CONFIG = {
  ACTIVE: {
    label: "Activo",
    color: "bg-green-100 text-green-700 border-green-200",
    icon: Shield
  },
  INACTIVE: {
    label: "Inactivo",
    color: "bg-gray-100 text-gray-600 border-gray-200",
    icon: Clock
  },
  SUSPENDED: {
    label: "Suspendido",
    color: "bg-orange-100 text-orange-700 border-orange-200",
    icon: Clock
  }
}

export default function UserCard({ 
  name, 
  email, 
  roles, 
  status, 
  avatar,
  onManageClick 
}: UserCardProps) {
  const config = STATUS_CONFIG[status]
  const StatusIcon = config.icon

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:border-yellow-300 hover:shadow-md transition-all duration-200">
      <div className="flex items-start gap-4 mb-4">
        <div className="flex-shrink-0">
          {avatar ? (
            <img src={avatar} alt={name} className="w-12 h-12 rounded-full object-cover bg-gray-100" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
              <User className="w-6 h-6 text-gray-400" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{name}</h3>
          <p className="text-sm text-gray-500 truncate">{email}</p>
        </div>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.color}`}>
          <StatusIcon className="w-3.5 h-3.5" />
          {config.label}
        </div>
      </div>

      {roles.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-medium text-gray-500 mb-2">Roles</p>
          <div className="flex flex-wrap gap-1.5">
            {roles.map((role, i) => (
              <span key={i} className="px-2 py-0.5 rounded-md bg-yellow-50 text-yellow-700 text-xs font-medium border border-yellow-200">
                {role}
              </span>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={onManageClick}
        className="w-full py-2 px-4 rounded-lg bg-gray-50 text-gray-700 text-sm font-medium hover:bg-yellow-50 hover:text-yellow-700 transition-colors border border-gray-200 hover:border-yellow-300"
      >
        Gestionar usuario
      </button>
    </div>
  )
}
