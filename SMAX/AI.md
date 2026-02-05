# SMAX Triage Userscript - AI Context Document

> **Last Updated:** 2026-02-05  
> **Main File:** `TRIAGEM - SMAX SGS221-0.1.user.js` (~5077 lines)

## Project Overview

This is a **Tampermonkey/Greasemonkey userscript** that enhances the SMAX (Service Management Automation X) ticketing system used by TJSP (Tribunal de Justiça de São Paulo). The script provides:

- **Triage HUD**: A full-screen overlay for processing tickets efficiently
- **Name Badges**: Color-coded badges in the ticket grid showing assigned workers
- **Team Configuration**: Rules-based routing of tickets to teams and workers
- **Activity Logging**: Persistent logging of triage actions with CSV export
- **Quick Reply Editor**: CKEditor integration for solution responses
- **Attachment Previewer**: In-modal image viewing and PDF handling

---

## Architecture Overview

### Core Modules

| Module | Lines | Purpose |
|--------|-------|---------|
| `PrefStore` | ~50-100 | User preferences storage via `GM_getValue`/`GM_setValue` |
| `ActivityLog` | ~100-200 | Persistent activity logging with CSV export |
| `Utils` | ~200-400 | Utility functions (parsing, escaping, debounce) |
| `ApiClient` | ~741-916 | REST API client for SMAX interactions |
| `TeamsConfig` | ~918-1059 | Team/worker configuration and suggestion logic |
| `ColorRegistry` | ~1064-1102 | **Color generation for badges (currently hash-based)** |
| `DataRepository` | ~1104-1769 | Caching layer for requests, people, support groups |
| `Network` | ~1771+ | XHR/fetch patching to intercept API responses |
| `TriageHUD` | ~3194-5058 | Main triage interface and commit logic |
| `NameBadges` | ~2369-2500 | Grid UI color coding |
| `SettingsPanel` | ~2508-2971 | Configuration UI |

### Key Data Flows

```
User Grid → Network.patch() → DataRepository.ingestRequestListPayload()
                                        ↓
                              TeamsConfig.suggestTeam()
                                        ↓
                              TeamsConfig.suggestWorker()
                                        ↓
                              ColorRegistry.get(workerName)
                                        ↓
                              NameBadges.apply() → Grid UI colored
```

```
TriageHUD.commit() → Api.postUpdateRequest() → SMAX API
                   → Api.postCreateRequestCausesRequest() (for Global linking)
                   → ActivityLog.log()
```

---

## Current State & Recent Work

### Fixed Issues (Recent Sessions)
- ✅ HUD manual Team/Worker dropdown selections are now respected
- ✅ "Ausente" toggle visibility fixed
- ✅ Removed "Modo Real" UI (functionality kept, always enabled)
- ✅ Removed "Self-Assign" UI section
- ✅ Activity logging with CSV export working
- ✅ "Script utilizado?" checkbox functional

### Known Issues / Pending Work

#### 1. **Chrome Extension Compatibility** (ENVIRONMENT ISSUE)
- Browser control failing due to: `$HOME environment variable is not set`
- **Fix**: Set HOME as a **permanent system environment variable** (not just PowerShell session)
- Steps: System Properties → Environment Variables → Add User Variable: `HOME` = `C:\Users\YourName`
- Then restart IDE/Gemini extension

#### 2. **Global Assignment - Triador** ✅ IMPLEMENTED
- Added "Triador" dropdown in Settings panel
- User can search and select themselves from the people list
- When linking to a Global, the ticket is now assigned to the triador (not the calculated owner)
- **Location**: `SettingsPanel.wirePanelEvents()` for UI, `TriageHUD.commit()` for logic

#### 3. **Process Number in HUD** ✅ IMPLEMENTED
- Added extraction of `NumerodoProcesso_c` from `UserOptions.complexTypeProperties[0].properties`
- Displayed in HUD as "Nº do Processo" with monospace styling
- Only shown when the field is present
- **Location**: `upsertTriageEntryFromProps()` and `TriageHUD.render()`

#### 4. **Deterministic Colors** ✅ IMPLEMENTED (v2 - Improved)
- 8 aesthetic color palettes with WIDER hue ranges (60-80 degrees) for more variety
- Lower saturation (35-45%) for softer, professional look
- Palettes: Ocean (blues), Forest (greens), Warm (peach-terracotta), Purple (lavender-plum), Aqua (mint-teal), Berry (rose-magenta), Slate (steel), Golden (sand-amber)
- Colors determined by: `team_index` + `last_two_digits_of_ticket_id`
- **Location**: `ColorRegistry.getForTicket({ teamId, ticketId })`

---

## Important Code Locations

### Color Generation (for deterministic colors)
```javascript
// Lines 1064-1102
const ColorRegistry = (() => {
    const generate = (name) => {
      let hash = 0;
      for (let i = 0; i < name.length; i += 1) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
      }
      const hue = Math.abs(hash % 360);
      // ...
    };
    // ...
})();
```

### Global Assignment Logic
```javascript
// Lines 4635-4657
if (doGlobal) {
  tasks.push(
    Api.postCreateRequestCausesRequest(stagedState.parentId, props.Id).then(...)
  );
}
```

### HUD Ticket Details Rendering
```javascript
// Lines 4345-4355 (in render())
ticketDetailsEl.innerHTML = `
  <div style="display:flex;flex-direction:column;gap:6px;font-size:14px;">
    ${warning}
    <div class="smax-triage-meta-row">
      <div><strong>ID</strong> ${idLink}${vipBadge ? ` ${vipBadge}` : ''}</div>
      <div><strong>Hora de criação</strong> ${createdDisplay}</div>
      ${requestedForHtml}
    </div>
    <div class="smax-triage-desc">${descDisplay}</div>
  </div>
`;
```

### Worker/Owner Resolution
```javascript
// Lines 4060-4067
const ownerForCurrent = () => {
  const item = currentItem();
  if (!item) return null;
  const team = TeamsConfig.suggestTeam(item);
  const worker = TeamsConfig.suggestWorker(team, item.idText || ...);
  return worker ? worker.name : null;
};
```

---

## Preferences Schema

```javascript
const defaults = {
  nameBadgesOn: true,
  collapseOn: false,
  enlargeCommentsOn: true,
  flagSkullOn: true,
  nameGroups: {},
  ausentes: [],
  nameColors: {},
  enableRealWrites: true,        // Always true now (UI removed)
  defaultGlobalChangeId: '',
  personalFinalsRaw: '',
  myPersonId: '',
  myPersonName: '',
  teamsConfigRaw: JSON.stringify([...])  // Teams configuration
};
```

---

## API Endpoints Used

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/rest/{tenantId}/ems/bulk` | POST | Create/Update entities |
| `/rest/{tenantId}/ems/Request` | GET | Fetch request details |
| `/rest/{tenantId}/ems/Person` | GET | Fetch person list |
| `/rest/{tenantId}/ems/PersonGroup` | GET | Fetch support groups |
| `entity-page/attachment` | GET | Fetch attachments |

---

## Testing Notes

- The script runs on `https://suporte.tjsp.jus.br/*`
- Key selectors: `.slick-row`, `.slick-cell`, `.slick-header-column`
- CKEditor is used for rich text editing
- Grid uses SlickGrid library

---

## Conversation History Reference

Recent relevant conversations:
- `1c499748-50cb-4ead-a499-0684136a324c`: Fixed HUD manual assignment
- `7af27f9c-f3cf-459c-99ab-92830e649c54`: Fixed Ausente toggle
- `48ead21f-1947-4994-9ce6-cf9c9acd80de`: Cleaned up settings (removed RealWrites/SelfSelect UI)
- `20bbce4f-b498-4451-ab18-d917ac96cacb`: Implemented activity logging
