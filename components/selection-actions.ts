import {
  AlignHorizontalDistributeCenter,
  AlignHorizontalSpaceBetween,
  AlignVerticalDistributeCenter,
  AlignVerticalSpaceBetween,
  CheckCircle,
  Circle,
  Clock,
  HelpCircle,
} from "lucide-react"
import type { InvestigationStatus } from "@/lib/types"
import type { SelectionLayoutAction } from "@/lib/selection-layout"

export interface SelectionActionsProps {
  selectedNodeCount: number
  selectedEdgeCount: number
  arrangeableNodeCount: number
  bulkStatusNodeCount: number
  allBulkStatusNodesCompromised: boolean
  bulkInvestigationStatus: InvestigationStatus | null
  onCopy: () => void
  onDelete: () => void
  onLayout: (action: SelectionLayoutAction) => void
  onToggleCompromised: () => void
  onSetInvestigationStatus: (status: InvestigationStatus) => void
}

export const STATUS_ICONS: Record<InvestigationStatus, typeof Circle> = {
  "No Status": Circle,
  "Not Investigated": HelpCircle,
  Investigating: Clock,
  Done: CheckCircle,
}

export const SELECTION_LAYOUT_ACTIONS: Array<{
  action: SelectionLayoutAction
  label: string
  minimum: number
  icon: typeof AlignHorizontalDistributeCenter
}> = [
  {
    action: "align-horizontal",
    label: "Align horizontal centers",
    minimum: 2,
    icon: AlignHorizontalDistributeCenter,
  },
  {
    action: "align-vertical",
    label: "Align vertical centers",
    minimum: 2,
    icon: AlignVerticalDistributeCenter,
  },
  {
    action: "distribute-horizontal",
    label: "Distribute horizontally",
    minimum: 3,
    icon: AlignHorizontalSpaceBetween,
  },
  {
    action: "distribute-vertical",
    label: "Distribute vertically",
    minimum: 3,
    icon: AlignVerticalSpaceBetween,
  },
]
