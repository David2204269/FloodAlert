'use client'

import { FloodDashboard } from "@/components/flood-dashboard"
import { useEffect } from "react"
import { registerServiceWorker } from "@/lib/register-service-worker"

export default function Home() {
  useEffect(() => {
    registerServiceWorker()
  }, [])

  return <FloodDashboard />
}
