"use client"

import { useState, useRef, useEffect } from "react"
import { Edit3, Save, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface CanvasTitleProps {
  title: string
  onTitleChange: (title: string) => void
}

export default function CanvasTitle({ title, onTitleChange }: CanvasTitleProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(title)
  const inputRef = useRef<HTMLInputElement>(null)

  
  useEffect(() => {
    setEditTitle(title)
  }, [title])

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleSave = () => {
    onTitleChange(editTitle.trim())
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditTitle(title)
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2 border border-gray-600">
        <input
          ref={inputRef}
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          className="bg-transparent text-white text-lg font-semibold outline-none border-none min-w-[200px] max-w-[400px]"
          placeholder="Enter operation title..."
        />
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSave}
            className="h-6 w-6 text-green-400 hover:text-green-300"
          >
            <Save className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCancel}
            className="h-6 w-6 text-gray-400 hover:text-gray-300"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    )
  }

  if (!title || title.trim() === '') {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsEditing(true)}
        className="text-gray-400 hover:text-white hover:bg-white/10"
      >
        <Edit3 className="h-4 w-4 mr-2" />
        Add Title
      </Button>
    )
  }

  return (
    <div className="flex items-center gap-2 group">
      <h1 className="text-xl font-bold text-white">{title}</h1>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsEditing(true)}
        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-white"
      >
        <Edit3 className="h-3 w-3" />
      </Button>
    </div>
  )
} 