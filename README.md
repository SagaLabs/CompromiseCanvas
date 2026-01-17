# Compromise Canvas

An interactive visual editor for building and documenting cyber attack paths, intrusion scenarios, and incident response timelines.

![License](https://img.shields.io/badge/license-GPL--3.0-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-15-black)
![React](https://img.shields.io/badge/React-19-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6)

## Why Compromise Canvas?

As incident responders, we found ourselves constantly struggling to visualize and communicate attack paths effectively. Existing tools were either too complex, too expensive, or simply not designed for the fast-paced nature of incident response work.

We needed something that would let us quickly map out how an attacker moved through an environment, document our findings as we investigated, and produce clear visuals for reports and stakeholder briefings - all without fighting against the tool itself.

Compromise Canvas was built to solve that problem. It's the tool we wished we had during countless incident response engagements.

## Overview

Compromise Canvas helps cybersecurity professionals visualize attack paths, document incidents, and create reports. Built for incident responders, red teamers, and security trainers who need to map out complex intrusion scenarios.

**Key Features:**

- **Visual Attack Path Editor** - Drag-and-drop interface for building compromise diagrams
- **27+ Asset Types** - Cloud infrastructure, on-premises systems, identities, and threat actors
- **MITRE ATT&CK Integration** - Edge labels with tactics like Lateral Movement, Privilege Escalation, Exfiltration
- **Incident Response Log** - Document response actions alongside your diagram
- **Timeline View** - Chronological view of attack progression
- **PDF Reports** - Generate professional incident reports
- **PNG Export** - Export diagrams as images
- **Templates** - Pre-built scenarios to get started quickly
- **100% Client-Side** - All data stays in your browser

## Screenshots

*Coming soon*

## Getting Started

### Prerequisites

- Node.js 18+
- npm, yarn, or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/SagaLabs/CompromiseCanvas.git
cd CompromiseCanvas

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
npm run start
```

## Usage

### Creating a Diagram

1. **Add Assets** - Drag assets from the left panel onto the canvas
2. **Connect Nodes** - Click and drag from one node's handle to another to create connections
3. **Edit Properties** - Click any node or edge to edit its properties in the right panel
4. **Set Criticality** - Mark assets as Low, Medium, High, or Critical
5. **Mark Compromised** - Toggle the compromised status on affected assets

### Asset Categories

| Category | Assets |
|----------|--------|
| **On-Premises** | Web Server, Database, Workstation, Domain Controller, Firewall, Router, Email Server, File Server |
| **Cloud** | Cloud Instance, Cloud Database, Load Balancer, Container, Function, Kubernetes, Tenant, Email, Storage, Collaboration |
| **Identity** | User accounts, Service accounts with MFA status and privilege levels |
| **Threat Actors** | Attacker, Command & Control (C2), Exfiltration endpoints |

### Edge Action Types

Connections between nodes can be labeled with MITRE ATT&CK-aligned actions:

- Initial Access, Execution, Persistence, Privilege Escalation
- Defense Evasion, Credential Access, Discovery, Lateral Movement
- Collection, Command & Control, Exfiltration, Impact
- And more...

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + Z` | Undo |
| `Ctrl/Cmd + Y` | Redo |
| `Ctrl/Cmd + C` | Copy selected |
| `Ctrl/Cmd + V` | Paste |
| `Delete` | Delete selected |

### Exporting

- **PDF Report** - Comprehensive incident report with executive summary, timeline, and asset details
- **PNG Image** - High-resolution diagram export
- **JSON** - Save/load diagrams for backup or sharing

## Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) with App Router
- **UI Library**: [React 19](https://react.dev/)
- **Language**: [TypeScript 5](https://www.typescriptlang.org/)
- **Graph Visualization**: [ReactFlow](https://reactflow.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Components**: [shadcn/ui](https://ui.shadcn.com/) (Radix UI)
- **PDF Generation**: [jsPDF](https://github.com/parallax/jsPDF)
- **Icons**: [Lucide React](https://lucide.dev/)

## Project Structure

```
├── app/                    # Next.js app directory
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Main page
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── asset-library.tsx # Draggable asset panel
│   ├── custom-node.tsx   # Node renderer
│   ├── custom-edge.tsx   # Edge renderer
│   ├── properties-panel.tsx
│   ├── timeline-modal.tsx
│   └── ...
├── hooks/                 # Custom React hooks
├── lib/                   # Utilities and types
│   ├── types.ts          # TypeScript definitions
│   ├── templates.ts      # Built-in templates
│   └── utils.ts
└── public/               # Static assets
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Created by [Christian Henriksen](https://github.com/Guzzy711) at [SagaLabs](https://sagalabs.dk)
- Graph visualization powered by [ReactFlow](https://reactflow.dev/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)

---

**Train as you fight.**
