"use client"

import { Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { EDGE_ACTION_TYPES, type EdgeActionType } from "@/lib/types"
import { replaceEdgeActionTypeAtIndex } from "@/lib/edge-action-types"

interface EdgeActionTypePickerProps {
  actionTypes: EdgeActionType[]
  onChange: (actionTypes: EdgeActionType[]) => void
}

export function EdgeActionTypePicker({
  actionTypes,
  onChange,
}: EdgeActionTypePickerProps) {
  const availableActionTypes = EDGE_ACTION_TYPES.filter(
    (actionType) => !actionTypes.includes(actionType),
  )

  return (
    <div className="mt-1 space-y-2">
      <div className="space-y-1.5">
        {actionTypes.map((actionType, index) => (
          <div
            key={actionType}
            className="flex items-center gap-1.5"
          >
            <Select
              value={actionType}
              onValueChange={(nextActionType: EdgeActionType) =>
                onChange(
                  replaceEdgeActionTypeAtIndex(
                    actionTypes,
                    index,
                    nextActionType,
                  ),
                )
              }
            >
              <SelectTrigger
                aria-label={`Action type ${index + 1}`}
                className="min-w-0 flex-1 border-gray-700 bg-gray-800 text-white"
              >
                <SelectValue placeholder="Select action type" />
              </SelectTrigger>
              <SelectContent className="border-gray-700 bg-gray-800 text-white">
                {EDGE_ACTION_TYPES.map((candidate) => (
                  <SelectItem
                    key={candidate}
                    value={candidate}
                    disabled={
                      candidate !== actionType &&
                      actionTypes.includes(candidate)
                    }
                  >
                    {candidate}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {actionTypes.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={`Remove ${actionType}`}
                className="h-9 w-9 shrink-0 p-0 text-gray-500 hover:bg-gray-700 hover:text-white"
                onClick={() =>
                  onChange(
                    actionTypes.filter(
                      (_, actionTypeIndex) => actionTypeIndex !== index,
                    ),
                  )
                }
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            )}
          </div>
        ))}
      </div>

      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="h-8 border-gray-700 bg-gray-800 px-3 text-xs font-normal text-gray-300 hover:bg-gray-700 hover:text-white"
            disabled={availableActionTypes.length === 0}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Add action type
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="max-h-72 w-64 overflow-y-auto border-gray-700 bg-gray-800 text-gray-200"
        >
          <DropdownMenuLabel className="text-xs text-gray-400">
            Self-connection action types
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-gray-700" />
          {availableActionTypes.map((actionType) => (
            <DropdownMenuItem
              key={actionType}
              onSelect={() => onChange([...actionTypes, actionType])}
              className="text-xs focus:bg-gray-700 focus:text-white"
            >
              {actionType}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
