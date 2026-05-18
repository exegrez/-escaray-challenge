'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Dumbbell, ClipboardList, User } from 'lucide-react'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Ranking' },
  { href: '/train', icon: Dumbbell, label: 'Entreno' },
  { href: '/report', icon: ClipboardList, label: 'Reporte' },
  { href: '/profile', icon: User, label: 'Perfil' },
]

export default function BottomNav({ myNickname }: { myNickname: string }) {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#111] border-t border-zinc-800 z-50">
      <div className="flex max-w-lg mx-auto">
        {navItems.map(({ href, icon: Icon, label }) => {
          const actualHref = href === '/profile' ? `/profile/${myNickname}` : href
          const isActive = href === '/profile'
            ? pathname.startsWith('/profile')
            : pathname === href
          return (
            <Link
              key={href}
              href={actualHref}
              className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors ${
                isActive ? 'text-orange-500' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
