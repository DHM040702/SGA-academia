import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: 'SGA · CEPREUNASAM',
  description: 'Sistema de Gestión Académica — Centro Preuniversitario UNASAM',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full">
      <body className="h-full bg-bg font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
