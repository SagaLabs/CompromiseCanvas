"use client"

import { Fragment } from "react"
import { Trash2, Tag, Check, Lock, LockOpen, Plus, X } from "lucide-react"
import { EdgeToolbar as XYEdgeToolbar } from "@xyflow/react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
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

const ACTION_MENU_MAX_HEIGHT =
  "min(24rem, var(--radix-dropdown-menu-content-available-height))"
const ACTION_SUBMENU_MAX_HEIGHT =
  "min(18rem, var(--radix-dropdown-menu-content-available-height))"

interface EdgeToolbarProps {
  id: string
  x: number
  y: number
  alignX?: "left" | "center" | "right"
  alignY?: "top" | "center" | "bottom"
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
  x,
  y,
  alignX = "center",
  alignY = "bottom",
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
      x={x}
      y={y}
      isVisible={isVisible}
      alignX={alignX}
      alignY={alignY}
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
          collisionPadding={8}
          className="w-56 overflow-y-auto overscroll-contain border-gray-700 bg-gray-800 text-gray-200"
          style={{ maxHeight: ACTION_MENU_MAX_HEIGHT }}
        >
          <DropdownMenuLabel className="text-xs text-gray-400">
            <span>
              {allowsMultipleActionTypes ? "Action types" : "Action type"}
            </span>
            {allowsMultipleActionTypes && (
              <span className="mt-1 block text-[11px] font-normal leading-4 text-gray-400">
                Multiple actions share this connection&apos;s timestamp,
                metadata, MITRE mappings, and description.
              </span>
            )}
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-gray-700" />
          {allowsMultipleActionTypes ? (
            <>
              <DropdownMenuGroup className="grid grid-cols-[minmax(0,1fr)_1.75rem] gap-1 px-1">
                {currentActionTypes.map((actionType, index) => (
                  <Fragment key={actionType}>
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger
                        aria-label={`Change ${actionType}`}
                        className="min-w-0 flex-1 text-xs focus:bg-gray-700 focus:text-white data-[state=open]:bg-gray-700"
                      >
                        <span className="truncate">{actionType}</span>
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent
                        collisionPadding={8}
                        className="w-56 overflow-y-auto overscroll-contain border-gray-700 bg-gray-800 text-gray-200"
                        style={{ maxHeight: ACTION_SUBMENU_MAX_HEIGHT }}
                      >
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
                    <DropdownMenuItem
                      aria-label={
                        currentActionTypes.length === 1
                          ? `Remove ${actionType} and delete self-connection`
                          : `Remove ${actionType}`
                      }
                      title={
                        currentActionTypes.length === 1
                          ? "Remove action and delete self-connection"
                          : `Remove ${actionType}`
                      }
                      className="h-7 w-7 shrink-0 justify-center p-0 text-gray-500 focus:bg-gray-700 focus:text-white"
                      onSelect={(event) => {
                        event.preventDefault()

                        if (currentActionTypes.length === 1) {
                          onDelete()
                          return
                        }

                        onSetActionTypes(
                          currentActionTypes.filter(
                            (_, actionTypeIndex) =>
                              actionTypeIndex !== index,
                          ),
                        )
                      }}
                    >
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                    </DropdownMenuItem>
                  </Fragment>
                ))}
              </DropdownMenuGroup>
              <DropdownMenuSeparator className="bg-gray-700" />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger
                  disabled={availableActionTypes.length === 0}
                  className="text-xs focus:bg-gray-700 focus:text-white data-[state=open]:bg-gray-700"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  Add action type
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent
                  collisionPadding={8}
                  className="w-56 overflow-y-auto overscroll-contain border-gray-700 bg-gray-800 text-gray-200"
                  style={{ maxHeight: ACTION_SUBMENU_MAX_HEIGHT }}
                >
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
