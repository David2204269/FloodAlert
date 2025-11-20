import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Analytics } from '@vercel/analytics/next'
import { NotificationContainer } from '@/components/notification-container'
import { NotificationPermissionBanner } from '@/components/notification-permission-banner'
import './globals.css'

export const metadata: Metadata = {
  title: 'Sistema de Alerta de Inundaciones - Rivex',
  description: 'Monitoreo en tiempo real de niveles de agua y alertas de inundación',
  generator: 'v0.app',
  icons: {
    icon: '/icon.svg',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body className={`font-sans antialiased ${GeistSans.variable} ${GeistMono.variable}`}>
        {children}
        <NotificationPermissionBanner />
        <NotificationContainer />
        <Analytics />
      </body>
    </html>
  )
}
