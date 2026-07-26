'use client';

import { ClipboardList, Plus, Trash2, Clock, CheckCircle } from 'lucide-react';
import { useState, useMemo, useRef, useEffect } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { useCompromiseCanvasState } from '@/hooks/use-compromise-canvas-state';
import type { IncidentLogEntry } from '@/lib/types';

interface IncidentLogPanelProps {
  isOpen: boolean;
  onClose: () => void;
  incidentLog?: IncidentLogEntry[];
  setIncidentLog?: React.Dispatch<React.SetStateAction<IncidentLogEntry[]>>;
}

export default function IncidentLogPanel({
  isOpen,
  onClose,
  incidentLog,
  setIncidentLog,
}: IncidentLogPanelProps) {
  const { toast } = useToast();
  const fallback = useCompromiseCanvasState();
  const resolvedIncidentLog = incidentLog ?? fallback.incidentLog;
  const resolvedSetIncidentLog = setIncidentLog ?? fallback.setIncidentLog;

  const [newEntryDescription, setNewEntryDescription] = useState('');
  const [newEntryCategory, setNewEntryCategory] = useState<
    | 'Response'
    | 'Observation'
    | 'Meeting'
    | 'Containment'
    | 'Eradication'
    | 'Recovery'
    | 'Acquisition'
    | 'Other'
  >('Response');
  const [newEntryTimestamp, setNewEntryTimestamp] = useState('');
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState<
    | 'Response'
    | 'Observation'
    | 'Meeting'
    | 'Containment'
    | 'Eradication'
    | 'Recovery'
    | 'Acquisition'
    | 'Other'
  >('Response');
  const [editTimestamp, setEditTimestamp] = useState('');

  // Sort logs by timestamp descending (newest first)
  const sortedLogs = useMemo(() => {
    return [...(resolvedIncidentLog || [])].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }, [resolvedIncidentLog]);

  const scrollViewportRef = useRef<HTMLDivElement | null>(null);

  const toLocalInputValue = (isoString: string) => {
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return '';
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
      date.getHours(),
    )}:${pad(date.getMinutes())}`;
  };

  const nowLocalInputValue = () => {
    const date = new Date();
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
      date.getHours(),
    )}:${pad(date.getMinutes())}`;
  };

  const parseLocalTimestamp = (value: string) => {
    if (!value) return null;
    const normalized = value.length === 16 ? `${value}:00` : value;
    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) return null;
    return date;
  };

  useEffect(() => {
    if (!scrollViewportRef.current) return;
    scrollViewportRef.current.scrollTop = 0;
  }, [sortedLogs.length]);

  const handleAddEntry = () => {
    if (!newEntryDescription.trim()) return;

    const parsedTimestamp = parseLocalTimestamp(newEntryTimestamp);
    if (newEntryTimestamp && !parsedTimestamp) {
      toast({
        title: 'Invalid timestamp',
        description: 'Use a valid date and time before saving the entry.',
      });
      return;
    }

    const newEntry: IncidentLogEntry = {
      id: crypto.randomUUID(),
      timestamp: parsedTimestamp ? parsedTimestamp.toISOString() : new Date().toISOString(),
      description: newEntryDescription,
      category: newEntryCategory,
    };

    resolvedSetIncidentLog((prev: IncidentLogEntry[]) => [newEntry, ...(prev || [])]);

    setNewEntryDescription('');
    setNewEntryCategory('Response');
    setNewEntryTimestamp('');

    toast({
      title: 'Log Entry Added',
      description: 'New incident log entry recorded.',
    });
  };

  const handleDeleteEntry = (id: string) => {
    resolvedSetIncidentLog((prev: IncidentLogEntry[]) => prev.filter((entry) => entry.id !== id));
    toast({
      title: 'Log Entry Deleted',
      description: 'Incident log entry removed.',
    });
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toISOString();
  };

  const startEditEntry = (entry: IncidentLogEntry) => {
    setEditingEntryId(entry.id);
    setEditDescription(entry.description);
    setEditCategory(entry.category);
    setEditTimestamp(toLocalInputValue(entry.timestamp));
  };

  const cancelEditEntry = () => {
    setEditingEntryId(null);
    setEditDescription('');
    setEditCategory('Response');
    setEditTimestamp('');
  };

  const saveEditEntry = (id: string) => {
    if (!editDescription.trim()) return;
    const parsedTimestamp = parseLocalTimestamp(editTimestamp);
    if (editTimestamp && !parsedTimestamp) {
      toast({
        title: 'Invalid timestamp',
        description: 'Use a valid date and time before saving the entry.',
      });
      return;
    }
    resolvedSetIncidentLog((prev: IncidentLogEntry[]) =>
      prev.map((entry) =>
        entry.id === id
          ? {
              ...entry,
              description: editDescription,
              category: editCategory,
              timestamp: parsedTimestamp ? parsedTimestamp.toISOString() : entry.timestamp,
            }
          : entry,
      ),
    );
    setEditingEntryId(null);
    toast({
      title: 'Log Entry Updated',
      description: 'Incident log entry updated.',
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="ip-panel ip-text ip-border max-w-6xl border p-0">
        <DialogHeader className="ip-panel-muted ip-border border-b px-6 py-4">
          <DialogTitle className="ip-text flex items-center gap-2">
            <ClipboardList className="ip-accent h-5 w-5" />
            Incident Response Log
          </DialogTitle>
          <DialogDescription className="ip-text-muted">
            Record response actions, observations, and key events.
          </DialogDescription>
        </DialogHeader>

        <div className="grid max-h-[80vh] flex-1 gap-0 overflow-hidden md:grid-cols-[480px_1fr]">
          {/* Add New Entry Form */}
          <div className="ip-panel-muted ip-border space-y-4 border-b p-6 md:border-b-0 md:border-r">
            <div className="space-y-2">
              <Label htmlFor="category" className="ip-text-muted text-xs font-semibold uppercase">
                Category
              </Label>
              <Select
                value={newEntryCategory}
                onValueChange={(value: any) => setNewEntryCategory(value)}
              >
                <SelectTrigger className="ip-panel ip-border ip-text">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="ip-panel ip-border ip-text">
                  <SelectItem value="Response">Response Action</SelectItem>
                  <SelectItem value="Observation">Observation</SelectItem>
                  <SelectItem value="Meeting">Meeting</SelectItem>
                  <SelectItem value="Containment">Containment</SelectItem>
                  <SelectItem value="Eradication">Eradication</SelectItem>
                  <SelectItem value="Recovery">Recovery</SelectItem>
                  <SelectItem value="Acquisition">Acquisition</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timestamp" className="ip-text-muted text-xs font-semibold uppercase">
                Timestamp
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="timestamp"
                  type="datetime-local"
                  value={newEntryTimestamp}
                  onChange={(e) => setNewEntryTimestamp(e.target.value)}
                  className="ip-panel ip-border ip-text"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-gray-300 hover:bg-gray-700"
                  onClick={() => setNewEntryTimestamp(nowLocalInputValue())}
                >
                  Now
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-gray-300 hover:bg-gray-700"
                  onClick={() => setNewEntryTimestamp('')}
                >
                  Clear
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="description"
                className="ip-text-muted text-xs font-semibold uppercase"
              >
                Log Entry
              </Label>
              <Textarea
                id="description"
                value={newEntryDescription}
                onChange={(e) => setNewEntryDescription(e.target.value)}
                placeholder="e.g., Contained host WORKSTATION-01 via EDR…"
                className="ip-panel ip-border ip-text min-h-[120px]"
              />
            </div>

            <Button
              type="button"
              onClick={handleAddEntry}
              className="w-full bg-blue-600 text-white hover:bg-blue-700"
              disabled={!newEntryDescription.trim()}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Entry
            </Button>
          </div>

          {/* Log List */}
          <ScrollArea className="p-6" viewportRef={scrollViewportRef}>
            <div className="space-y-6">
              {sortedLogs.length === 0 ? (
                <div className="ip-text-muted py-10 text-center">
                  <CheckCircle className="mx-auto mb-3 h-12 w-12 opacity-20" />
                  <p>No log entry recorded yet.</p>
                </div>
              ) : (
                sortedLogs.map((entry) => (
                  <div
                    key={entry.id}
                    className="ip-border relative border-l pb-6 pl-6 last:border-0 last:pb-0"
                  >
                    <div className="ip-panel-muted ip-border absolute left-0 top-0 h-3 w-3 -translate-x-1/2 rounded-full border-2" />

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span
                          className={`rounded-full border px-2 py-0.5 text-xs ${
                            entry.category === 'Response' ||
                            entry.category === 'Containment' ||
                            entry.category === 'Eradication' ||
                            entry.category === 'Recovery'
                              ? 'ip-badge-success'
                              : entry.category === 'Observation'
                                ? 'ip-badge-warning'
                                : entry.category === 'Meeting' || entry.category === 'Acquisition'
                                  ? 'ip-badge-info'
                                  : 'ip-badge-neutral'
                          }`}
                        >
                          {entry.category}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="ip-text-muted flex items-center gap-1 text-xs">
                            <Clock className="h-3 w-3" />
                            {formatDate(entry.timestamp)}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="ip-text-muted h-6 w-6 hover:text-red-400"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteEntry(entry.id);
                            }}
                            aria-label="Delete log entry"
                          >
                            <Trash2 className="h-3 w-3" aria-hidden="true" />
                          </Button>
                        </div>
                      </div>
                      {editingEntryId === entry.id ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <Select
                              value={editCategory}
                              onValueChange={(value: any) => setEditCategory(value)}
                            >
                              <SelectTrigger className="ip-panel ip-border ip-text">
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                              <SelectContent className="ip-panel ip-border ip-text">
                                <SelectItem value="Response">Response Action</SelectItem>
                                <SelectItem value="Observation">Observation</SelectItem>
                                <SelectItem value="Meeting">Meeting</SelectItem>
                                <SelectItem value="Containment">Containment</SelectItem>
                                <SelectItem value="Eradication">Eradication</SelectItem>
                                <SelectItem value="Recovery">Recovery</SelectItem>
                                <SelectItem value="Acquisition">Acquisition</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                            <Input
                              type="datetime-local"
                              value={editTimestamp}
                              onChange={(e) => setEditTimestamp(e.target.value)}
                              className="ip-panel ip-border ip-text"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-gray-300 hover:bg-gray-700"
                              onClick={() => setEditTimestamp(nowLocalInputValue())}
                            >
                              Now
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-gray-300 hover:bg-gray-700"
                              onClick={() => setEditTimestamp('')}
                            >
                              Clear
                            </Button>
                          </div>
                          <Textarea
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            className="ip-panel ip-border ip-text min-h-[80px]"
                          />
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              onClick={() => saveEditEntry(entry.id)}
                              className="bg-blue-600 text-white hover:bg-blue-700"
                            >
                              Save
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={cancelEditEntry}
                              className="text-gray-300 hover:bg-gray-700"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <p className="ip-text whitespace-pre-wrap text-sm leading-relaxed">
                            {entry.description}
                          </p>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="px-2 text-blue-400 hover:bg-gray-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditEntry(entry);
                            }}
                          >
                            Edit
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
