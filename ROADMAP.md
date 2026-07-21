# Roadmap

## Context-aware edge display settings

Make optional edge fields and their display settings work together consistently.

- Automatically enable the corresponding display option when a user adds a value.
- Render nothing when the field is empty, regardless of the saved display setting.
- Decide whether clearing a field should also disable its display option or preserve the user's preference.
- Apply the same behavior to MITRE ATT&CK, tool, user, timestamp, description, C2 channel, and C2 framework fields.
- Keep imported and existing canvases backward compatible.

This should be implemented separately from the searchable MITRE ATT&CK feature.
