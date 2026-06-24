import { Star, MessageCircle, UserPlus, User } from "lucide-react"

type ProfileCardProps = {
  name: string
  role: string
  status: "online" | "offline" | "away"
  avatar?: string
  tags?: string[]
  isVerified?: boolean
  followers?: number
  email?: string
  onMessageClick?: () => void
  onAddClick?: () => void
}

export default function ProfileCard({ 
  name, 
  role, 
  status, 
  avatar, 
  tags = [], 
  isVerified, 
  followers,
  email,
  onMessageClick,
  onAddClick 
}: ProfileCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-3xl p-6 w-72 backdrop-blur-xl bg-gradient-to-br from-yellow-50/60 via-white/50 to-amber-50/60 border border-yellow-200/50 shadow-[0_8px_32px_rgba(245,158,11,0.12),0_2px_0_rgba(255,255,255,0.4) inset] transition-all duration-500 hover:shadow-[0_16px 48px_rgba(245,158,11,0.18),0_4px_0_rgba(255,255,255,0.5) inset] hover:scale-[1.02] hover:-translate-y-1 hover:z-10">
      {/* Status indicator with pulse animation */}
      <div className="absolute right-4 top-4 z-10">
        <div className="relative">
          <div
            className={`h-3 w-3 rounded-full border-2 border-white dark:border-gray-800 transition-all duration-300 group-hover:scale-125 ${
              status === "online"
                ? "bg-green-500 group-hover:shadow-[0_0_20px_rgba(34,197,94,0.6)]"
                : status === "away"
                  ? "bg-amber-500"
                  : "bg-gray-400"
            }`}
          ></div>
          {status === "online" && (
            <div className="absolute inset-0 h-3 w-3 rounded-full bg-green-500 animate-ping opacity-30"></div>
          )}
        </div>
      </div>

      {/* Verified badge with bounce animation */}
      {isVerified && (
        <div className="absolute right-4 top-10 z-10">
          <div className="rounded-full bg-yellow-400 p-1 shadow-[2px_2px_4px_rgba(245,158,11,0.2)] transition-all duration-300 group-hover:scale-110 group-hover:rotate-12 group-hover:shadow-[0_0_15px_rgba(245,158,11,0.4)]">
            <Star className="h-3 w-3 fill-white text-white" />
          </div>
        </div>
      )}

      {/* Profile Photo with enhanced hover effects */}
      <div className="mb-4 flex justify-center relative z-10">
        <div className="relative group-hover:animate-pulse">
          {avatar ? (
            <div className="h-28 w-28 overflow-hidden rounded-full bg-white/80 backdrop-blur-sm p-1 shadow-[inset_4px_4px_8px_rgba(245,158,11,0.1),inset_-4px_-4px_8px_rgba(255,255,255,0.8)] transition-all duration-500 group-hover:shadow-[inset_6px_6px_12px_rgba(245,158,11,0.15),inset_-6px_-6px_12px_rgba(255,255,255,0.9)] group-hover:scale-110">
              <img
                src={avatar}
                alt={name}
                className="h-full w-full rounded-full object-contain transition-transform duration-500 group-hover:scale-105"
              />
            </div>
          ) : (
            <div className="h-28 w-28 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-[inset_4px_4px_8px_rgba(0,0,0,0.1),inset_-4px_-4px_8px_rgba(255,255,255,0.4)] transition-all duration-500 group-hover:scale-110">
              <User className="h-14 w-14 text-white" />
            </div>
          )}
          {/* Glowing ring on hover */}
          <div className="absolute inset-0 rounded-full border-2 border-yellow-400/50 opacity-0 group-hover:opacity-100 transition-all duration-500 animate-pulse"></div>
        </div>
      </div>

      {/* Profile Info with slide-up animation */}
      <div className="text-center relative z-10 transition-transform duration-300 group-hover:-translate-y-1">
        <h3 className="text-lg font-semibold text-gray-900 transition-colors duration-300 group-hover:text-amber-600">
          {name}
        </h3>
        <p className="mt-1 text-sm text-gray-600 transition-colors duration-300 group-hover:text-gray-800">
          {role}
        </p>
        {email && (
          <p className="mt-1 text-xs text-gray-500">
            {email}
          </p>
        )}

        {followers && (
          <p className="mt-2 text-xs text-gray-500 transition-all duration-300 group-hover:text-amber-600 group-hover:font-medium">
            {followers.toLocaleString()} followers
          </p>
        )}
      </div>

      {/* Tags with bounce animation */}
      {tags.length > 0 && (
        <div className="mt-4 flex justify-center gap-2 relative z-10">
          {tags.map((tag, i) => (
            <span
              key={i}
              className={`inline-block rounded-full bg-white/80 backdrop-blur-sm px-3 py-1 text-xs font-medium shadow-[2px_2px_4px_rgba(245,158,11,0.08),-2px_-2px_4px_rgba(255,255,255,0.8)] transition-all duration-300 ${
                tag === "Premium"
                  ? "text-amber-600 group-hover:bg-amber-50 group-hover:scale-105 group-hover:shadow-[0_0_10px_rgba(245,158,11,0.2)]"
                  : "text-gray-600 group-hover:scale-105"
              }`}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Action Buttons with enhanced hover effects and increased height */}
      <div className="mt-6 flex gap-2 relative z-10">
        <button
          onClick={onAddClick}
          className="flex-1 rounded-full bg-white/80 backdrop-blur-sm py-4 text-sm font-medium text-amber-600 shadow-[4px_4px_8px_rgba(245,158,11,0.1),-4px_-4px_8px_rgba(255,255,255,0.8)] transition-all duration-300 hover:shadow-[2px_2px_4px_rgba(245,158,11,0.15),-2px_-2px_4px_rgba(255,255,255,0.9)] hover:scale-95 active:scale-90 group-hover:bg-amber-50">
          <UserPlus className="mx-auto h-4 w-4 transition-transform duration-300 hover:scale-110" />
        </button>
        <button
          onClick={onMessageClick}
          className="flex-1 rounded-full bg-white/80 backdrop-blur-sm py-4 text-sm font-medium text-gray-700 shadow-[4px_4px_8px_rgba(245,158,11,0.1),-4px_-4px_8px_rgba(255,255,255,0.8)] transition-all duration-300 hover:shadow-[2px_2px_4px_rgba(245,158,11,0.15),-2px_-2px_4px_rgba(255,255,255,0.9)] hover:scale-95 active:scale-90 group-hover:bg-amber-50">
          <MessageCircle className="mx-auto h-4 w-4 transition-transform duration-300 hover:scale-110" />
        </button>
      </div>

      {/* Animated border on hover */}
      <div className="absolute inset-0 rounded-3xl border border-yellow-300/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
    </div>
  )
}
