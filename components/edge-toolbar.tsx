"use client"

import { Trash2, Tag, Check, Lock, LockOpen, Plus, X } from "lucide-react"
import { EdgeToolbar as XYEdgeToolbar } from "@xyflow/react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu"
import { EDGE_ACTION_TYPES, type EdgeActionType } from "@/lib/types"
import { replaceEdgeActionTypeAtIndex } from "@/lib/edge-action-types"
import { cn } from "@/lib/utils"

interface EdgeToolbarProps {
  id: string
  labelX: number
  labelY: number
  isVisible: boolean
  currentActionTypes: EdgeActionType[]
  allowsMultipleActionTypes?: boolean
  unlocked?: boolean
  onSetActionTypes: (actionTypes: EdgeActionType[]) => void
  onToggleUnlocked: () => void
  onDelete: () => void
  onMouseEnter?: () => void
  onMouseLeave?: () => void
  onMenuOpenChange?: (open: boolean) => void
}

/**
 * Quick-action toolbar for an edge, built on React Flow v12's official
 * `EdgeToolbar` (positioning/visibility handled by the library). Actions are
 * routed through app handlers (props) so they persist in the controlled state.
 */
export default function EdgeToolbar({
  id,
  labelX,
  labelY,
  isVisible,
  currentActionTypes,
  allowsMultipleActionTypes = false,
  unlocked,
  onSetActionTypes,
  onToggleUnlocked,
  onDelete,
  onMouseEnter,
  onMouseLeave,
  onMenuOpenChange,
}: EdgeToolbarProps) {
  const availableActionTypes = EDGE_ACTION_TYPES.filter(
    (actionType) => !currentActionTypes.includes(actionType),
  )

  return (
    <XYEdgeToolbar
      edgeId={id}
      x={labelX}
      y={labelY - 60}
      isVisible={isVisible}
      alignY="bottom"
      className={cn(
        "nodrag nopan flex items-center gap-1 rounded-lg",
        "border border-gray-700 bg-gray-800 p-1 shadow-lg",
      )}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className={cn(
          "h-7 w-7 hover:bg-gray-700",
          unlocked ? "text-amber-400 hover:text-amber-300" : "text-gray-300 hover:text-white",
        )}
        title={unlocked ? "Lock edge (stop moving)" : "Unlock edge to move it"}
        aria-label={unlocked ? "Lock edge" : "Unlock edge to move it"}
        aria-pressed={unlocked}
        onClick={() => onToggleUnlocked()}
      >
        {unlocked ? <LockOpen className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
      </Button>
      <DropdownMenu modal={false} onOpenChange={onMenuOpenChange}>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-gray-200 hover:bg-gray-700 hover:text-white"
            title="Change action type"
            aria-label="Change action type"
          >
            <Tag className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="w-56 border-gray-700 bg-gray-800 text-gray-200"
        >
          <DropdownMenuLabel className="text-xs text-gray-400">
            {allowsMultipleActionTypes ? "Action types" : "Action type"}
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-gray-700" />
          {allowsMultipleActionTypes ? (
            <>
              <div className="space-y-1 px-1">
                {currentActionTypes.map((actionType, index) => (
                  <div
                    key={actionType}
                    className="flex items-center gap-1"
                  >
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger
                        aria-label={`Change ${actionType}`}
                        className="min-w-0 flex-1 text-xs focus:bg-gray-700 focus:text-white data-[state=open]:bg-gray-700"
                      >
                        <span className="truncate">{actionType}</span>
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="max-h-72 w-56 overflow-y-auto border-gray-700 bg-gray-800 text-gray-200">
                        {EDGE_ACTION_TYPES.map((candidate) => (
                          <DropdownMenuItem
                            key={candidate}
                            disabled={
                              candidate !== actionType &&
                              currentActionTypes.includes(candidate)
                            }
                            onSelect={() =>
                              onSetActionTypes(
                                replaceEdgeActionTypeAtIndex(
                                  currentActionTypes,
                                  index,
                                  candidate,
                                ),
                              )
                            }
                            className="flex items-center justify-between gap-2 text-xs focus:bg-gray-700 focus:text-white"
                          >
                            <span>{candidate}</span>
                            {candidate === actionType && (
                              <Check className="h-3.5 w-3.5 text-blue-400" />
                            )}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                    {currentActionTypes.length > 1 && (
                      <button
                        type="button"
                        aria-label={`Remove ${actionType}`}
                        title={`Remove ${actionType}`}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm text-gray-500 hover:bg-gray-700 hover:text-white"
                        onClick={(event) => {
                          event.preventDefault()
                          event.stopPropagation()
                          onSetActionTypes(
                            currentActionTypes.filter(
                              (_, actionTypeIndex) =>
                                actionTypeIndex !== index,
                            ),
                          )
                        }}
                      >
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <DropdownMenuSeparator className="bg-gray-700" />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger
                  disabled={availableActionTypes.length === 0}
                  className="text-xs focus:bg-gray-700 focus:text-white data-[state=open]:bg-gray-700"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  Add action type
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="max-h-72 w-56 overflow-y-auto border-gray-700 bg-gray-800 text-gray-200">
                  {availableActionTypes.map((actionType) => (
                    <DropdownMenuItem
                      key={actionType}
                      onSelect={() =>
                        onSetActionTypes([
                          ...currentActionTypes,
                          actionType,
                        ])
                      }
                      className="text-xs focus:bg-gray-700 focus:text-white"
                    >
                      {actionType}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </>
          ) : (
            <div className="max-h-72 overflow-y-auto">
              {EDGE_ACTION_TYPES.map((type) => (
                <DropdownMenuItem
                  key={type}
                  onSelect={() => onSetActionTypes([type])}
                  className="flex items-center justify-between gap-2 text-xs focus:bg-gray-700 focus:text-white"
                >
                  <span>{type}</span>
                  {type === currentActionTypes[0] && (
                    <Check className="h-3.5 w-3.5 text-blue-400" />
                  )}
                </DropdownMenuItem>
              ))}
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-7 w-7 text-red-400 hover:bg-gray-700 hover:text-red-300"
        title="Delete edge"
        aria-label="Delete edge"
        onClick={() => onDelete()}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </XYEdgeToolbar>
  )
}
