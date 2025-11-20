'use client'

import { FloodDashboardImproved } from "@/components/flood-dashboard-improved"
import { useEffect } from "react"
import { registerServiceWorker } from "@/lib/register-service-worker"

export default function Home() {
  useEffect(() => {
    registerServiceWorker()
  }, [])

  return <FloodDashboardImproved />
}
