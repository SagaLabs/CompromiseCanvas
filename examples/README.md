# Examples

## `on-host-attack-path-example.json`

A canvas showing the ordered asset attack path feature, generated from **real endpoint
telemetry** rather than written by hand: 206 Elastic Defend process events from a
malware detonation in a home lab, folded down to the 8 steps that matter.

Import it with **Import JSON**, then **double-click the `secdis` host**.

What it exercises:

- an asset whose `actions` are an ordered chain, with `actionMode` set to
  `ordered-path`, so the node shows the compact step ribbon;
- per-step `timestamp` and `mitreAttackId` / `mitreAttackName`;
- the drill-down, with real command lines as the evidence for each step;
- 27 `incidentLog` entries from the detection rules that fired.

The chain runs rundll32 → payload → disable Defender → scheduled task → registry
run key → discovery → `vssadmin delete shadows`. The command lines are otherwise
verbatim, so it doubles as a check that long, awkward strings render sensibly.

The only edit: the Windows account name in one path was replaced with
`analyst`. Nothing else — hashes, arguments, timestamps and ordering are as
collected.
