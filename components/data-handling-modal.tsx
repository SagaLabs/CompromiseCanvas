"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Shield,
  Lock,
  Eye,
  Database,
  Cloud,
  HardDrive,
  UserCheck,
  AlertTriangle,
  CheckCircle,
  Info,
  Server,
  Download,
  Upload,
  Trash2,
} from "lucide-react"

interface DataHandlingModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function DataHandlingModal({ isOpen, onClose }: DataHandlingModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] bg-gray-900 text-white border-gray-700">
        <DialogHeader className="border-b border-gray-700 pb-4">
          <DialogTitle>Data Handling</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-6">
            {/* Overview Section */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Info className="h-5 w-5 text-blue-400" />
                <h3 className="text-lg font-semibold">Overview</h3>
              </div>
              <p className="text-gray-300 leading-relaxed">
                This application is designed to help security professionals visualize and analyze compromise paths. 
                All data processing occurs locally in your browser, ensuring privacy and security for 
                sensitive information.
              </p>
              <div className="mt-3 p-3 bg-yellow-900/30 border border-yellow-700 rounded">
                <p className="text-yellow-200 text-sm">
                  <strong>⚠️ AI Development Disclaimer:</strong> This tool was developed with AI assistance. 
                  While thoroughly tested, there may be bugs or unexpected behavior. Always verify critical 
                  security analysis results and use appropriate caution when working with sensitive data.
                </p>
              </div>
            </section>

            <Separator className="bg-gray-700" />

            {/* Local Processing Section */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <HardDrive className="h-5 w-5 text-green-400" />
                <h3 className="text-lg font-semibold">Local Data Processing</h3>
                <Badge variant="secondary" className="bg-green-900 text-green-200 border-green-700">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Client-Side Only
                </Badge>
              </div>
              <div className="space-y-3">
                <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                  <h4 className="font-semibold text-green-400 mb-2">✓ What happens locally:</h4>
                  <ul className="space-y-1 text-gray-300 text-sm">
                    <li>• All diagram creation and editing</li>
                    <li>• Attack path visualization and analysis</li>
                    <li>• Template creation and management</li>
                    <li>• Timeline generation and filtering</li>
                    <li>• Export functionality (JSON, compromised hosts)</li>
                    <li>• Undo/redo operations and clipboard management</li>
                  </ul>
                </div>
              </div>
            </section>

            <Separator className="bg-gray-700" />

            {/* Import/Export Section */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Download className="h-5 w-5 text-cyan-400" />
                <h3 className="text-lg font-semibold">Import & Export</h3>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                  <div className="flex items-center gap-2 mb-2">
                    <Upload className="h-4 w-4 text-green-400" />
                    <h4 className="font-semibold">Import Capabilities</h4>
                  </div>
                  <ul className="space-y-1 text-gray-300 text-sm">
                    <li>• JSON diagram files only</li>
                    <li>• All processing happens locally</li>
                    <li>• No data sent to external services</li>
                    <li>• Files are parsed entirely in your browser</li>
                  </ul>
                </div>
                <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                  <div className="flex items-center gap-2 mb-2">
                    <Download className="h-4 w-4 text-blue-400" />
                    <h4 className="font-semibold">Export Options</h4>
                  </div>
                  <ul className="space-y-1 text-gray-300 text-sm">
                    <li>• Complete diagrams as JSON</li>
                    <li>• Compromised hosts list (CSV format)</li>
                    <li>• All files generated locally in browser</li>
                    <li>• No server-side processing involved</li>
                  </ul>
                </div>
              </div>
            </section>


          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
