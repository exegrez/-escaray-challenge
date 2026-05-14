import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Escaray Winter Challenge 🥶',
  description: 'Challenge de invierno 2026 — Sexe, Conrat, Wizla, Yingo, Caeza',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full">
      <body className="min-h-full bg-[#0a0a0a] text-white">{children}</body>
    </html>
  )
}
