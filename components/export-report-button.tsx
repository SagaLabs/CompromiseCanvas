
import { useCallback } from 'react';
import { useReactFlow } from '@xyflow/react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FileText } from 'lucide-react';
import { Button } from "@/components/ui/button";
import type { CustomEdge, CustomNode, NodeData, EdgeData, IncidentLogEntry } from "@/lib/types";
import { getMitreTechniqueLabel, normalizeMitreTechniqueReferences } from "@/lib/mitre-attack";
import { getEdgeActionTypes } from "@/lib/edge-action-types";
import { buildTimelineEvents } from "@/lib/timeline-events";

interface ExportReportButtonProps {
  label?: string
  className?: string
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
}

export default function ExportReportButton({
  label,
  className,
  variant = "ghost",
  size = label ? "sm" : "icon",
}: ExportReportButtonProps) {
  const { getNodes, getEdges } = useReactFlow();

  const generateReport = useCallback(async () => {
    const nodes = getNodes();
    const edges = getEdges();
    const canvasNodes = nodes as CustomNode[];
    const canvasEdges = edges as CustomEdge[];

    if (nodes.length === 0) {
      alert("No diagram to export! Please add some nodes first.");
      return;
    }

    // 1. Initialize PDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 14;
    let currentY = 20;

    // --- Title Page ---
    doc.setFontSize(22);
    doc.text("Compromise Canvas Report", marginX, currentY);
    currentY += 8;

    doc.setFontSize(10);
    doc.setTextColor(0, 102, 204);
    doc.textWithLink(
      "Created by Compromise Canvas by SagaLabs",
      marginX,
      currentY,
      { url: "https://sagalabs.dk" }
    );
    doc.setTextColor(0, 0, 0);
    currentY += 12;

    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, marginX, currentY);
    currentY += 15;

    // --- Executive Summary ---
    doc.setFontSize(16);
    doc.text("Executive Summary", marginX, currentY);
    currentY += 10;

    doc.setFontSize(11);
    const compromisedCount = nodes.filter(n => (n.data as NodeData).isCompromised).length;
    const criticalCount = nodes.filter(n => (n.data as NodeData).criticality === 'Critical').length;
    const highCount = nodes.filter(n => (n.data as NodeData).criticality === 'High').length;

    doc.text(`Total Assets: ${nodes.length}`, marginX, currentY);
    currentY += 6;
    doc.text(`Compromised Assets: ${compromisedCount}`, marginX, currentY);
    currentY += 6;
    doc.text(`Critical Assets: ${criticalCount}`, marginX, currentY);
    currentY += 6;
    doc.text(`High Assets: ${highCount}`, marginX, currentY);
    currentY += 15;


    // --- Compromised Assets Table ---
    if (compromisedCount > 0) {
      doc.setFontSize(14);
      doc.text("Compromised Assets", marginX, currentY);
      currentY += 5;

      const compromisedData = nodes
        .filter(n => (n.data as NodeData).isCompromised)
        .map(n => {
          const d = n.data as NodeData;
          return [d.label, d.ipAddress || 'N/A', d.type];
        });

      autoTable(doc, {
        startY: currentY,
        head: [['Asset Name', 'IP Address', 'Type']],
        body: compromisedData,
        theme: 'grid',
        headStyles: { fillColor: [220, 53, 69] }, // Red header for compromised
      });

      currentY = (doc as any).lastAutoTable.finalY + 15;
    }

    // --- Attack Timeline (chronological routes and ordered asset steps) ---
    doc.setFontSize(14);
    if (currentY > pageHeight - 40) {
      doc.addPage();
      currentY = 20;
    }
    doc.text("Attack Timeline", marginX, currentY);
    currentY += 5;

    const timelineData = buildTimelineEvents({ nodes: canvasNodes, edges: canvasEdges })
      .filter(event => event.kind !== "incident")
      .map(event => ({
        ...event,
        scope: event.kind === "edge" ? "Route" : "Asset step",
        source: event.kind === "edge"
          ? canvasNodes.find(node => node.id === event.sourceId)?.data.label || event.sourceId || ""
          : canvasNodes.find(node => node.id === event.nodeId)?.data.label || event.nodeId || "",
        target: event.kind === "edge"
          ? canvasNodes.find(node => node.id === event.targetId)?.data.label || event.targetId || ""
          : "Asset-local",
        action: event.actionTypes?.join("\n") || event.actionType || "",
        mitre: (event.mitreAttackTechniques || [])
          .map(technique => getMitreTechniqueLabel(technique.id, technique.name))
          .join("\n"),
      }));

    const formatIsoSeconds = (value: Date) => value.toISOString().replace(/\.\d{3}Z$/, "Z");

    if (timelineData.length === 0) {
      doc.setFontSize(11);
      doc.text("No timeline events available. Add timestamps to routes or ordered asset steps.", marginX, currentY + 5);
      currentY += 15;
    } else {
      const timelineRows = timelineData.map(item => [
        formatIsoSeconds(item.parsedDate),
        item.scope,
        item.source,
        item.target,
        item.action,
        item.mitre,
        item.description
      ]);

      autoTable(doc, {
        startY: currentY,
        head: [['Timestamp (ISO)', 'Scope', 'Source / Asset', 'Target', 'Action', 'MITRE ATT&CK', 'Description']],
        body: timelineRows,
        theme: 'striped',
        headStyles: { fillColor: [75, 85, 99] },
        columnStyles: {
          6: { cellWidth: 45 }
        },
        styles: { fontSize: 7 }
      });
      currentY = (doc as any).lastAutoTable.finalY + 15;
    }

    // --- Asset Details Table ---
    doc.setFontSize(14);
    // basic check for page break
    if (currentY > pageHeight - 40) {
      doc.addPage();
      currentY = 20;
    }

    doc.text("Asset Details & Notes", marginX, currentY);
    currentY += 5;

    const assetData = nodes.map(n => {
      const d = n.data as NodeData;
      return [
        d.label,
        d.type,
        d.criticality,
        d.investigationStatus || 'Not Investigated',
        d.description || '' // This is the "Notes" field
      ];
    });

    autoTable(doc, {
      startY: currentY,
      head: [['Name', 'Type', 'Criticality', 'Investigation', 'Notes']],
      body: assetData,
      theme: 'striped',
      columnStyles: {
        4: { cellWidth: 60 } // Make Notes column wider
      }
    });

    currentY = (doc as any).lastAutoTable.finalY + 15;

    // --- Compromise Canvas Steps (Edges) ---
    doc.setFontSize(14);
    if (currentY > pageHeight - 40) {
      doc.addPage();
      currentY = 20;
    }
    doc.text("Compromise Canvas Steps", marginX, currentY);
    currentY += 5;

    const edgeData = edges.map(e => {
      const sourceNode = nodes.find(n => n.id === e.source);
      const targetNode = nodes.find(n => n.id === e.target);
      const d = e.data as EdgeData;
      const mitreTechniques = normalizeMitreTechniqueReferences(
        d.mitreAttackTechniques,
        d.mitreAttackId,
        d.mitreAttackName,
      );

      return [
        sourceNode?.data.label || e.source,
        targetNode?.data.label || e.target,
        getEdgeActionTypes(d).join("\n"),
        mitreTechniques.map(technique => getMitreTechniqueLabel(technique.id, technique.name)).join("\n") || '-',
        d.toolUsed || '-',
        d.description || ''
      ];
    });

    autoTable(doc, {
      startY: currentY,
      head: [['Source', 'Target', 'Action', 'MITRE ATT&CK', 'Tool', 'Description']],
      body: edgeData,
      theme: 'striped',
      headStyles: { fillColor: [75, 85, 99] }
    });

    currentY = (doc as any).lastAutoTable.finalY + 15;

    // --- Ordered Asset Attack Paths ---
    const assetPathRows = canvasNodes.flatMap(node => {
      if (node.type === "labeledGroupNode" || node.data.actionMode !== "ordered-path") return [];
      return node.data.actions.map((action, index) => {
        const parsedTimestamp = action.timestamp ? new Date(action.timestamp) : null;
        const timestamp = parsedTimestamp && !Number.isNaN(parsedTimestamp.getTime())
          ? formatIsoSeconds(parsedTimestamp)
          : action.timestamp || '-';
        const mitre = normalizeMitreTechniqueReferences(
          undefined,
          action.mitreAttackId,
          action.mitreAttackName,
        ).map(technique => getMitreTechniqueLabel(technique.id, technique.name)).join("\n");

        return [
          node.data.label,
          String(index + 1),
          timestamp,
          action.type,
          action.technique || '-',
          mitre || '-',
          action.details || '-',
        ];
      });
    });

    if (assetPathRows.length > 0) {
      doc.setFontSize(14);
      if (currentY > pageHeight - 40) {
        doc.addPage();
        currentY = 20;
      }
      doc.text("Asset Attack Paths", marginX, currentY);
      currentY += 5;

      autoTable(doc, {
        startY: currentY,
        head: [['Asset', 'Step', 'Timestamp', 'Tactic', 'Technique', 'MITRE ATT&CK', 'Evidence']],
        body: assetPathRows,
        theme: 'striped',
        headStyles: { fillColor: [37, 99, 235] },
        styles: { fontSize: 7, overflow: 'linebreak' },
        columnStyles: {
          1: { cellWidth: 10 },
          6: { cellWidth: 55 },
        },
      });
      currentY = (doc as any).lastAutoTable.finalY + 15;
    }

    // --- Incident Response Log ---
    const incidentLogRaw = typeof window !== "undefined"
      ? localStorage.getItem("compromise-canvas-incident-log")
      : null;
    const incidentLog: IncidentLogEntry[] = incidentLogRaw ? JSON.parse(incidentLogRaw) : [];

    if (incidentLog.length > 0) {
      doc.setFontSize(14);
      if (currentY > pageHeight - 40) {
        doc.addPage();
        currentY = 20;
      }
      doc.text("Incident Response Log", marginX, currentY);
      currentY += 5;

      // Sort logs by timestamp
      const sortedLogs = [...incidentLog].sort((a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      const logData = sortedLogs.map(log => [
        new Date(log.timestamp).toISOString(),
        log.category,
        log.description
      ]);

      autoTable(doc, {
        startY: currentY,
        head: [['Timestamp', 'Category', 'Description']],
        body: logData,
        theme: 'striped',
        headStyles: { fillColor: [37, 99, 235] }, // Blue header
        columnStyles: {
          2: { cellWidth: 'auto' } // Auto width for description
        }
      });
    }

    // Save
    doc.save(`compromise-canvas-report-${new Date().toISOString().split('T')[0]}.pdf`);

  }, [getNodes, getEdges]);

  return (
    <Button
      variant={variant}
      size={size}
      onClick={generateReport}
      className={className ?? "text-gray-300 hover:bg-gray-700"}
      title="Export PDF Report"
    >
      <FileText className="h-5 w-5" aria-hidden="true" />
      {label ? <span className="ml-2">{label}</span> : <span className="sr-only">Export PDF Report</span>}
    </Button>
  );
}
