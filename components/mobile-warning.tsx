"use client"

import { Monitor, Smartphone, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface MobileWarningProps {
  onDismiss?: () => void
}

export default function MobileWarning({ onDismiss }: MobileWarningProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="mx-4 max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
              <Smartphone className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Mobile Not Supported</h2>
              <p className="text-sm text-gray-600">This application requires a desktop or laptop</p>
            </div>
          </div>
       
        </div>
        
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg bg-gray-50 p-3">
            <Monitor className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-900">Desktop Experience Required</p>
              <p className="text-xs text-gray-600">
                This attack path designer requires a larger screen and mouse/trackpad controls for optimal use.
              </p>
            </div>
          </div>
          
          <div className="text-sm text-gray-600">
            <p className="mb-2">Please access this application from:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>A desktop computer</li>
              <li>A laptop computer</li>
            </ul>
          </div>
          
       
        </div>
      </div>
    </div>
  )
} 