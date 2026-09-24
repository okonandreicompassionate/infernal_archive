import React, { useState, useEffect } from "react";
import {
  FileText,
  Plus,
  FileCheck,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Send,
  ChevronLeft,
  ChevronRight,
  Copy,
  Search,
  Maximize2,
  ChevronDown,
  ChevronUp,
  ArrowUp,
  ArrowDown,
  Save,
  Download,
  GripVertical,
  LayoutGrid,
  MessageSquare,
} from "lucide-react";

const PAGE_TEMPLATES: Record<string, { label: string; panels: string[] }> = {
  action: {
    label: "Action page",
    panels: ["Establishing", "Wide", "Standard", "Close-up"],
  },
  dialogue: {
    label: "Dialogue page",
    panels: ["Standard", "Close-up", "Standard", "Standard"],
  },
  splash: { label: "Splash page", panels: ["Splash"] },
  transition: {
    label: "Transition page",
    panels: ["Establishing", "Insert", "Standard"],
  },
};

export const WriterWorkspace: React.FC = () => {
  const [scripts, setScripts] = useState<any[]>([]);
  const [artwork, setArtwork] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSetting, setNewSetting] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [canonCheckResult, setCanonCheckResult] = useState<any>(null);
  const [checkingCanon, setCheckingCanon] = useState(false);
  const [creatingIssue, setCreatingIssue] = useState(false);
  const [issues, setIssues] = useState<any[]>([]);
  const [characters, setCharacters] = useState<any[]>([]);
  const [selectedCastIds, setSelectedCastIds] = useState<string[]>([]);
  const [castSearch, setCastSearch] = useState("");
  const [customCastNames, setCustomCastNames] = useState<string[]>([]);
  const [customCastDraft, setCustomCastDraft] = useState("");
  const [selectedIssueId, setSelectedIssueId] = useState("");
  const [issueDraft, setIssueDraft] = useState({
    issueNumber: "",
    title: "",
    synopsis: "",
    releaseStatus: "WRITING",
  });
  const [pageNumber, setPageNumber] = useState(1);
  const [panelNumber, setPanelNumber] = useState(1);
  const [pageNotes, setPageNotes] = useState("");
  const [pageStatus, setPageStatus] = useState("IN_PROGRESS");
  const [dialogueLines, setDialogueLines] = useState([
    { character: "", text: "" },
  ]);
  const [panelType, setPanelType] = useState("Standard");
  const [cameraAngle, setCameraAngle] = useState("Eye-level");
  const [shotNotes, setShotNotes] = useState("");
  const [caption, setCaption] = useState("");
  const [sfx, setSfx] = useState("");
  const [panelStatus, setPanelStatus] = useState("DRAFT");
  const [lineSearch, setLineSearch] = useState("");
  const [focusMode, setFocusMode] = useState(false);
  const [collapsedPanels, setCollapsedPanels] = useState<string[]>([]);
  const [savingPanelId, setSavingPanelId] = useState<string | null>(null);
  const [pageTemplate, setPageTemplate] = useState("dialogue");
  const [storyboardMode, setStoryboardMode] = useState(false);
  const [draggedPanelId, setDraggedPanelId] = useState<string | null>(null);
  const [draggedPageNumber, setDraggedPageNumber] = useState<number | null>(
    null,
  );
  const [comments, setComments] = useState<any[]>([]);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>(
    {},
  );
  const [scriptImportText, setScriptImportText] = useState("");
  const [scriptImportPreview, setScriptImportPreview] = useState<any>(null);
  const [importingScript, setImportingScript] = useState(false);

  const loadScripts = () => {
    setLoading(true);
    fetch("/api/scripts")
      .then((res) => res.json())
      .then((data) => {
        setScripts(data);
        if (!selectedIssueId && data[0]?.issueId)
          setSelectedIssueId(data[0].issueId);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  const loadArtwork = () =>
    fetch("/api/artwork")
      .then((res) => res.json())
      .then((data) => setArtwork(Array.isArray(data) ? data : []))
      .catch(console.error);

  const loadIssues = () =>
    fetch("/api/issues")
      .then((res) => res.json())
      .then((data) => {
        setIssues(data);
        if (!selectedIssueId && data[0]?.id) setSelectedIssueId(data[0].id);
      })
      .catch(console.error);

  const loadCharacters = () =>
    fetch("/api/characters")
      .then((res) => res.json())
      .then((data) => setCharacters(Array.isArray(data) ? data : []))
      .catch(console.error);

  const loadComments = () =>
    fetch("/api/comments")
      .then((res) => res.json())
      .then((data) => setComments(Array.isArray(data) ? data : []))
      .catch(console.error);

  useEffect(() => {
    loadScripts();
    loadArtwork();
    loadIssues();
    loadCharacters();
    loadComments();
  }, []);

  useEffect(() => {
    setPageNumber(1);
    setPanelNumber(1);
    setLineSearch("");
  }, [selectedIssueId]);

  useEffect(() => {
    const issue = issues.find((item) => item.id === selectedIssueId);
    if (issue)
      setIssueDraft({
        issueNumber: String(issue.issueNumber || ""),
        title: issue.title || "",
        synopsis: issue.synopsis || "",
        releaseStatus: issue.releaseStatus || "WRITING",
      });

    if (!issue) {
      setSelectedCastIds([]);
      setCustomCastNames([]);
      return;
    }

    const castIds = Array.isArray(issue.selectedCastIds)
      ? issue.selectedCastIds
      : Array.isArray(issue.castIds)
        ? issue.castIds
        : [];

    const issueCustomNames = Array.isArray(issue.customCastNames)
      ? issue.customCastNames
      : Array.isArray(issue.castNames)
        ? issue.castNames
        : [];

    if (castIds.length > 0 || issueCustomNames.length > 0) {
      setSelectedCastIds(castIds);
      setCustomCastNames(issueCustomNames);
      return;
    }

    const defaultCast = characters.map((character) => character.id);
    setSelectedCastIds(defaultCast);
    setCustomCastNames(["Anonymous", "Crowd"]);
  }, [selectedIssueId, issues, characters]);

  const issueScripts = scripts.filter(
    (script) => script.issueId === selectedIssueId,
  );
  const builtInIssueNames = ["Anonymous", "Crowd"];
  const issueCharacters = characters.filter(
    (character) =>
      selectedCastIds.length === 0 || selectedCastIds.includes(character.id),
  );
  const issueSpeakerOptions = [
    ...issueCharacters.map((character) => buildCharacterLabel(character)),
    ...customCastNames,
    ...builtInIssueNames,
  ].filter((value, index, array) => value && array.indexOf(value) === index);
  const pages = Array.from(
    new Set(issueScripts.map((script) => Number(script.pageNumber) || 1)),
  ).sort((a, b) => a - b);
  const pageScripts = issueScripts.filter(
    (script) => Number(script.pageNumber) === pageNumber,
  );
  const currentPageNotes = pageScripts[0]?.pageNotes || pageNotes;
  const currentPageStatus = pageScripts[0]?.pageStatus || pageStatus;
  const visiblePageScripts = pageScripts.filter(
    (script) =>
      !lineSearch ||
      JSON.stringify(script).toLowerCase().includes(lineSearch.toLowerCase()),
  );
  const completedPanels = issueScripts.filter((script) =>
    ["LOCKED", "READY_FOR_REVIEW"].includes(script.panelStatus),
  ).length;
  const issueProgress = issueScripts.length
    ? Math.round((completedPanels / issueScripts.length) * 100)
    : 0;

  const handleCreateIssue = async () => {
    if (creatingIssue) return;
    setCreatingIssue(true);
    try {
      const response = await fetch("/api/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          issueNumber:
            Math.max(
              0,
              ...issues.map((issue) => Number(issue.issueNumber) || 0),
            ) + 1,
          title: "Untitled issue",
          synopsis: "",
          releaseStatus: "WRITING",
          canonStatus: "DRAFT",
        }),
      });
      if (response.ok) {
        const issue = await response.json();
        setIssues((current) => [...current, issue]);
        setSelectedIssueId(issue.id);
      }
    } finally {
      setCreatingIssue(false);
    }
  };

  const saveIssue = async () => {
    if (!selectedIssueId) return;
    const castCharacters = characters.filter((character) =>
      selectedCastIds.includes(character.id),
    );
    await fetch(`/api/issues/${selectedIssueId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        issueNumber: Number(issueDraft.issueNumber) || null,
        title: issueDraft.title,
        synopsis: issueDraft.synopsis,
        releaseStatus: issueDraft.releaseStatus,
        selectedCastIds,
        castIds: selectedCastIds,
        customCastNames,
        castNames: customCastNames,
        characters: castCharacters.map((character) =>
          character.codeName
            ? `${character.name} (${character.codeName})`
            : character.name,
        ),
      }),
    });
    loadIssues();
  };

  const normalizeCharacterKey = (value: string) =>
    String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();

  const parseImportedScript = (rawText: string) => {
    const text = String(rawText || "")
      .replace(/\r/g, "")
      .trim();
    if (!text) return null;

    const lines = text
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean);

    const issueTitle =
      lines.find(
        (line) =>
          line &&
          !/^page\s*\d+/i.test(line) &&
          !/^panel\s*\d+/i.test(line) &&
          !/^(setting|location|description|summary|script|issue)\s*:/i.test(
            line,
          ),
      ) || "Imported issue";

    const summaryLines: string[] = [];
    const pages: any[] = [];
    const knownMap = new Map(
      characters.map((character) => [
        normalizeCharacterKey(character.codeName || character.name),
        buildCharacterLabel(character),
      ]),
    );

    let currentPage: any = null;
    let currentPanel: any = null;
    let currentPageNumber = 1;
    let currentPanelNumber = 1;

    const pushCurrentPanel = () => {
      if (!currentPanel) return;
      if (
        !currentPanel.setting &&
        !currentPanel.description &&
        !currentPanel.dialogue.length
      ) {
        return;
      }
      pages.push({
        ...currentPanel,
        pageNumber: currentPageNumber,
        panelNumber: currentPanelNumber,
      });
      currentPanel = null;
      currentPanelNumber += 1;
    };

    const pushCurrentPage = () => {
      if (currentPage) {
        if (currentPanel) pushCurrentPanel();
        currentPage = null;
      }
    };

    const addDialogueLine = (speaker: string, content: string) => {
      const candidateName = speaker.trim();
      const resolvedName =
        [...knownMap.entries()].find(
          ([key]) => normalizeCharacterKey(candidateName) === key,
        )?.[1] ?? candidateName;

      if (!currentPanel) {
        currentPanel = {
          setting: "",
          description: "",
          dialogue: [],
          panelType: "Standard",
          panelStatus: "DRAFT",
          caption: "",
          shotNotes: "",
        };
      }

      currentPanel.dialogue.push({
        character: resolvedName,
        text: content.trim(),
      });
    };

    for (const line of lines) {
      const pageMatch = line.match(/^page\s+(\d+)/i);
      if (pageMatch) {
        pushCurrentPanel();
        currentPageNumber = Number(pageMatch[1]) || currentPageNumber;
        currentPage = { pageNumber: currentPageNumber };
        continue;
      }

      const panelMatch = line.match(/^panel\s+(\d+)/i);
      if (panelMatch) {
        pushCurrentPanel();
        currentPanelNumber = Number(panelMatch[1]) || currentPanelNumber;
        continue;
      }

      const settingMatch = line.match(/^(?:setting|location)\s*[:\-]\s*(.+)$/i);
      if (settingMatch) {
        if (!currentPanel) {
          currentPanel = {
            setting: "",
            description: "",
            dialogue: [],
            panelType: "Standard",
            panelStatus: "DRAFT",
            caption: "",
            shotNotes: "",
          };
        }
        currentPanel.setting = settingMatch[1].trim();
        continue;
      }

      const descriptionMatch = line.match(
        /^(?:description|visual|summary)\s*[:\-]\s*(.+)$/i,
      );
      if (descriptionMatch) {
        if (!currentPanel) {
          currentPanel = {
            setting: "",
            description: "",
            dialogue: [],
            panelType: "Standard",
            panelStatus: "DRAFT",
            caption: "",
            shotNotes: "",
          };
        }
        currentPanel.description = descriptionMatch[1].trim();
        if (!summaryLines.length) summaryLines.push(descriptionMatch[1].trim());
        continue;
      }

      const dialogueMatch = line.match(
        /^([A-Z][A-Z0-9 .'-]{1,40})\s*:\s*(.+)$/,
      );
      if (dialogueMatch) {
        const speaker = dialogueMatch[1].trim();
        const text = dialogueMatch[2].trim();
        if (speaker && text) {
          addDialogueLine(speaker, text);
          continue;
        }
      }

      if (!summaryLines.length && line.length > 20) {
        summaryLines.push(line);
      }

      if (!currentPanel) {
        currentPanel = {
          setting: "",
          description: "",
          dialogue: [],
          panelType: "Standard",
          panelStatus: "DRAFT",
          caption: "",
          shotNotes: "",
        };
      }
      if (!currentPanel.description) {
        currentPanel.description = line;
      }
    }

    pushCurrentPanel();
    pushCurrentPage();

    const recognized = new Set(
      characters.map((character) =>
        normalizeCharacterKey(character.codeName || character.name),
      ),
    );

    const unresolved = new Set<string>();
    pages.forEach((page) => {
      (page.dialogue || []).forEach((line: any) => {
        const normalized = normalizeCharacterKey(line.character || "");
        if (!normalized) return;
        if (!recognized.has(normalized)) {
          unresolved.add(line.character.trim());
        }
      });
    });

    const summary =
      summaryLines.slice(0, 3).join(" ").replace(/\s+/g, " ").trim() ||
      `Imported issue summary for ${issueTitle}.`;

    return {
      title: String(issueTitle).trim() || "Imported issue",
      summary,
      pages,
      unknownCharacters: [...unresolved].filter(Boolean),
    };
  };

  const handlePreviewImportedScript = () => {
    if (!selectedIssueId || !scriptImportText.trim()) return;
    const preview = parseImportedScript(scriptImportText);
    if (!preview) return;
    setScriptImportPreview(preview);
    setIssueDraft((current) => ({
      ...current,
      title: preview.title,
      synopsis: preview.summary,
    }));
  };

  const applyImportedScript = async () => {
    if (!selectedIssueId || !scriptImportPreview) return;
    setImportingScript(true);
    try {
      await Promise.all(
        scriptImportPreview.pages.map((page: any, index: number) =>
          fetch("/api/scripts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              issueId: selectedIssueId,
              pageNumber: Number(page.pageNumber || index + 1),
              panelNumber: Number(page.panelNumber || index + 1),
              setting: page.setting || "",
              description: page.description || "",
              dialogue: Array.isArray(page.dialogue) ? page.dialogue : [],
              caption: page.caption || "",
              sfx: "",
              artistNote: page.shotNotes || "",
              shotNotes: page.shotNotes || "",
              panelType: page.panelType || "Standard",
              cameraAngle: "Eye-level",
              panelStatus: page.panelStatus || "DRAFT",
              pageNotes: "Imported from external script",
              pageStatus: "IN_PROGRESS",
            }),
          }),
        ),
      );

      setIssueDraft((current) => ({
        ...current,
        title: scriptImportPreview.title,
        synopsis: scriptImportPreview.summary,
      }));
      setScriptImportText("");
      setScriptImportPreview(null);
      loadScripts();
    } finally {
      setImportingScript(false);
    }
  };

  const addPage = () => {
    const nextPage = Math.max(0, ...pages) + 1;
    setPageNumber(nextPage);
    setPanelNumber(1);
    setPageNotes("");
    setPageStatus("IN_PROGRESS");
    setDialogueLines([{ character: "", text: "" }]);
  };

  const applyPageTemplate = async () => {
    const template = PAGE_TEMPLATES[pageTemplate];
    if (!template || !selectedIssueId) return;
    const nextPage = Math.max(0, ...pages) + 1;
    await Promise.all(
      template.panels.map((templatePanel, index) =>
        fetch("/api/scripts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            issueId: selectedIssueId,
            pageNumber: nextPage,
            panelNumber: index + 1,
            setting: `${template.label.toUpperCase()} - LOCATION / TIME`,
            description: "",
            dialogue: [],
            panelType: templatePanel,
            cameraAngle: "Eye-level",
            panelStatus: "DRAFT",
            pageTemplate,
            pageNotes: `${template.label}: `,
            pageStatus: "IN_PROGRESS",
          }),
        }),
      ),
    );
    setPageNumber(nextPage);
    setPanelNumber(1);
    setPanelType(template.panels[0]);
    setPageNotes(`${template.label}: `);
    loadScripts();
  };

  const exportScript = () => {
    const issueTitle =
      issueDraft.title || `Issue ${issueDraft.issueNumber || "Draft"}`;
    const text = issueScripts
      .slice()
      .sort(
        (a, b) =>
          Number(a.pageNumber) - Number(b.pageNumber) ||
          Number(a.panelNumber) - Number(b.panelNumber),
      )
      .map((script) => {
        const dialogue = (script.dialogue || [])
          .map(
            (line: any) => `${line.character || "SPEAKER"}: ${line.text || ""}`,
          )
          .join("\n");
        return `PAGE ${script.pageNumber} / PANEL ${script.panelNumber}\n${script.setting || ""}\n${script.description || ""}\n${script.caption || ""}\n${dialogue}`;
      })
      .join("\n\n");
    const blob = new Blob([`${issueTitle}\n\n${text}`], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${issueTitle.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const continuityWarnings = issueScripts.flatMap((script) => {
    const warnings: string[] = [];
    if (!script.setting)
      warnings.push(`Panel ${script.panelNumber} has no location.`);
    if (
      (script.dialogue || []).some((line: any) => !line.character && line.text)
    )
      warnings.push(
        `Panel ${script.panelNumber} has dialogue without a character.`,
      );
    return warnings;
  });

  const saveComment = async (scriptId: string) => {
    const text = commentDrafts[scriptId]?.trim();
    if (!text) return;
    await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetId: scriptId,
        targetType: "script",
        text,
        author: "Creative Team",
      }),
    });
    setCommentDrafts((current) => ({ ...current, [scriptId]: "" }));
    loadComments();
  };

  const savePageMeta = async () => {
    if (!pageScripts.length) return;
    await Promise.all(
      pageScripts.map((script) =>
        fetch(`/api/scripts/${script.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pageNotes: pageNotes || currentPageNotes,
            pageStatus: pageStatus || currentPageStatus,
          }),
        }),
      ),
    );
    loadScripts();
  };

  const deletePage = async () => {
    if (
      !pageScripts.length ||
      !confirm(
        `Delete page ${pageNumber} and its ${pageScripts.length} panel(s)?`,
      )
    )
      return;
    await Promise.all(
      pageScripts.map((script) =>
        fetch(`/api/scripts/${script.id}`, { method: "DELETE" }),
      ),
    );
    setPageNumber(Math.max(1, pageNumber - 1));
    loadScripts();
  };

  const handleAddPanel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIssueId || !newSetting.trim()) return;

    try {
      await fetch("/api/scripts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          issueId: selectedIssueId,
          pageNumber,
          panelNumber,
          setting: newSetting,
          description: newDesc,
          dialogue: dialogueLines.filter(
            (line) => line.character.trim() || line.text.trim(),
          ),
          narration: "",
          caption,
          sfx,
          artistNote: shotNotes,
          shotNotes,
          panelType,
          cameraAngle,
          panelStatus,
          pageNotes,
          pageStatus,
          editorNote: "Pending review",
        }),
      });
      setNewSetting("");
      setNewDesc("");
      setDialogueLines([{ character: "", text: "" }]);
      setCaption("");
      setSfx("");
      setPanelNumber(
        Math.max(
          0,
          ...pageScripts.map((script) => Number(script.panelNumber) || 0),
          Number(panelNumber) || 0,
        ) + 1,
      );
      setShotNotes("");
      setPageNotes("");
      loadScripts();
    } catch (err) {
      console.error(err);
    }
  };

  const updatePanel = async (
    scriptId: string,
    patch: Record<string, unknown>,
  ) => {
    await fetch(`/api/scripts/${scriptId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    loadScripts();
  };

  const updatePanelDraft = (
    scriptId: string,
    patch: Record<string, unknown>,
  ) => {
    setScripts((current) =>
      current.map((script) =>
        script.id === scriptId ? { ...script, ...patch } : script,
      ),
    );
  };

  const savePanel = async (script: any) => {
    setSavingPanelId(script.id);
    try {
      await fetch(`/api/scripts/${script.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageNumber: Number(script.pageNumber) || 1,
          panelNumber: Number(script.panelNumber) || 1,
          setting: script.setting || "",
          description: script.description || "",
          dialogue: Array.isArray(script.dialogue) ? script.dialogue : [],
          caption: script.caption || "",
          sfx: script.sfx || "",
          artistNote: script.artistNote || script.shotNotes || "",
          shotNotes: script.shotNotes || script.artistNote || "",
          panelType: script.panelType || "Standard",
          cameraAngle: script.cameraAngle || "Eye-level",
          panelStatus: script.panelStatus || "DRAFT",
        }),
      });
      loadScripts();
      loadArtwork();
    } finally {
      setSavingPanelId(null);
    }
  };

  const deletePanel = async (scriptId: string) => {
    if (!confirm("Delete this panel?")) return;
    await fetch(`/api/scripts/${scriptId}`, { method: "DELETE" });
    loadScripts();
  };

  const duplicatePanel = async (script: any) => {
    const duplicate = {
      ...script,
      id: undefined,
      panelNumber:
        Math.max(
          0,
          ...pageScripts.map((item) => Number(item.panelNumber) || 0),
        ) + 1,
    };
    delete duplicate.id;
    await fetch("/api/scripts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(duplicate),
    });
    loadScripts();
  };

  const movePanel = async (script: any, direction: -1 | 1) => {
    const ordered = [...pageScripts].sort(
      (left, right) => Number(left.panelNumber) - Number(right.panelNumber),
    );
    const currentIndex = ordered.findIndex((item) => item.id === script.id);
    const swapIndex = currentIndex + direction;
    if (currentIndex < 0 || !ordered[swapIndex]) return;
    await Promise.all([
      updatePanel(script.id, { panelNumber: ordered[swapIndex].panelNumber }),
      updatePanel(ordered[swapIndex].id, { panelNumber: script.panelNumber }),
    ]);
  };

  const reorderPanel = async (targetScript: any) => {
    if (!draggedPanelId || draggedPanelId === targetScript.id) return;
    const ordered = [...pageScripts].sort(
      (a, b) => Number(a.panelNumber) - Number(b.panelNumber),
    );
    const fromIndex = ordered.findIndex((item) => item.id === draggedPanelId);
    const toIndex = ordered.findIndex((item) => item.id === targetScript.id);
    if (fromIndex < 0 || toIndex < 0) return;
    const [moved] = ordered.splice(fromIndex, 1);
    ordered.splice(toIndex, 0, moved);
    await Promise.all(
      ordered.map((item, index) =>
        fetch(`/api/scripts/${item.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ panelNumber: index + 1 }),
        }),
      ),
    );
    setDraggedPanelId(null);
    loadScripts();
  };

  const reorderPage = async (targetPage: number) => {
    if (draggedPageNumber === null || draggedPageNumber === targetPage) return;
    const orderedPages = [...pages].sort((left, right) => left - right);
    const fromIndex = orderedPages.indexOf(draggedPageNumber);
    const toIndex = orderedPages.indexOf(targetPage);
    if (fromIndex < 0 || toIndex < 0) return;
    const [movedPage] = orderedPages.splice(fromIndex, 1);
    orderedPages.splice(toIndex, 0, movedPage);
    await Promise.all(
      orderedPages.flatMap((page, index) =>
        issueScripts
          .filter((script) => Number(script.pageNumber) === page)
          .map((script) =>
            fetch(`/api/scripts/${script.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ pageNumber: index + 1 }),
            }),
          ),
      ),
    );
    setDraggedPageNumber(null);
    setPageNumber(toIndex + 1);
    loadScripts();
  };

  const linkedArtwork = (script: any) =>
    artwork.filter(
      (asset) =>
        (Array.isArray(script.artworkIds) &&
          script.artworkIds.includes(asset.id)) ||
        (asset.issueId === selectedIssueId &&
          Number(asset.pageNumber) === Number(script.pageNumber) &&
          Number(asset.panelNumber) === Number(script.panelNumber)),
    );

  const buildCharacterLabel = (character: any) =>
    character.codeName
      ? `${character.name} (${character.codeName})`
      : character.name;

  const CharacterPicker: React.FC<{
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
  }> = ({ value, onChange, placeholder, className }) => {
    const [query, setQuery] = useState(value || "");
    const [open, setOpen] = useState(false);

    useEffect(() => {
      setQuery(value || "");
    }, [value]);

    const relevant = [...issueSpeakerOptions].filter((speaker) => {
      const normalizedQuery = query.trim().toLowerCase();
      return (
        !normalizedQuery || speaker.toLowerCase().includes(normalizedQuery)
      );
    });

    return (
      <div className="relative">
        <input
          value={query}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onChange={(event) => {
            const next = event.target.value;
            setQuery(next);
            setOpen(true);
            onChange(next);
          }}
          placeholder={placeholder || "Character"}
          className={className}
        />
        {open && query.trim() && relevant.length > 0 && (
          <div className="absolute z-20 mt-1 w-full rounded-xl border border-white/10 bg-zinc-950/95 p-1 shadow-2xl">
            {relevant.slice(0, 8).map((character) => (
              <button
                key={character.id}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  const label = buildCharacterLabel(character);
                  setQuery(label);
                  setOpen(false);
                  onChange(label);
                }}
                className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-[11px] text-zinc-200 transition hover:bg-white/5"
              >
                <span>{buildCharacterLabel(character)}</span>
                <span className="text-[9px] uppercase tracking-wider text-zinc-500">
                  Cast
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const handleRunCanonCheck = async () => {
    setCheckingCanon(true);
    const combinedText = scripts
      .map(
        (s) =>
          `${s.setting} ${s.description} ${s.dialogue.map((d: any) => d.text).join(" ")}`,
      )
      .join(" ");
    try {
      const res = await fetch("/api/ai/canon-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: combinedText }),
      });
      const data = await res.json();
      setCanonCheckResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setCheckingCanon(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 tracking-tight font-sans">
            Writer Studio & Comic Script Editor
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Author page breakdowns, panel descriptions, dialogue, and real-time
            AI canon verification.
          </p>
        </div>

        <button
          onClick={handleRunCanonCheck}
          disabled={checkingCanon}
          className="flex items-center space-x-2 bg-yellow-400 hover:bg-yellow-300 text-zinc-950 text-xs font-semibold px-4 py-2.5 rounded-2xl shadow-sm transition-all cursor-pointer disabled:opacity-50"
        >
          <FileCheck className="w-4 h-4 text-zinc-950" />
          <span>
            {checkingCanon ? "Checking Canon..." : "Run AI Canon Checker"}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setFocusMode((current) => !current)}
          className="border border-white/10 text-zinc-300 px-3 py-2.5 rounded-2xl text-xs"
        >
          <Maximize2 className="inline w-3.5 h-3.5 mr-1" />{" "}
          {focusMode ? "Exit focus" : "Focus mode"}
        </button>
      </div>

      {!focusMode && (
        <section className="writer-issue-controls bg-zinc-900/70 border border-white/5 p-4 rounded-2xl space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedIssueId}
              onChange={(event) => setSelectedIssueId(event.target.value)}
              className="bg-zinc-900 border border-white/10 rounded-2xl px-3 py-2 text-xs text-zinc-200"
            >
              <option value="">Select issue</option>
              {issues.map((issue) => (
                <option key={issue.id} value={issue.id}>
                  Issue #{issue.issueNumber || "?"} — {issue.title}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleCreateIssue}
              disabled={creatingIssue}
              className="bg-yellow-400 text-zinc-950 px-3 py-2 rounded-2xl text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="inline w-3.5 h-3.5 mr-1" /> New issue
            </button>
            <input
              value={issueDraft.issueNumber}
              onChange={(event) =>
                setIssueDraft((current) => ({
                  ...current,
                  issueNumber: event.target.value,
                }))
              }
              placeholder="Issue #"
              className="w-20 bg-zinc-900 border border-white/10 rounded-2xl px-3 py-2 text-xs text-zinc-200"
            />
            <input
              value={issueDraft.title}
              onChange={(event) =>
                setIssueDraft((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
              placeholder="Issue title"
              className="flex-1 min-w-40 bg-zinc-900 border border-white/10 rounded-2xl px-3 py-2 text-xs text-zinc-200"
            />
            <select
              value={issueDraft.releaseStatus}
              onChange={(event) =>
                setIssueDraft((current) => ({
                  ...current,
                  releaseStatus: event.target.value,
                }))
              }
              className="bg-zinc-900 border border-white/10 rounded-2xl px-3 py-2 text-xs text-zinc-200"
            >
              <option>WRITING</option>
              <option>READY_FOR_ART</option>
              <option>FINAL</option>
            </select>
            <button
              type="button"
              onClick={saveIssue}
              disabled={!selectedIssueId}
              className="border border-white/10 text-zinc-200 px-3 py-2 rounded-2xl text-xs"
            >
              Save issue
            </button>
          </div>
          <textarea
            value={issueDraft.synopsis}
            onChange={(event) =>
              setIssueDraft((current) => ({
                ...current,
                synopsis: event.target.value,
              }))
            }
            placeholder="Issue summary and arc notes"
            rows={2}
            className="w-full bg-zinc-900 border border-white/10 rounded-2xl p-3 text-xs text-zinc-200"
          />
          <div className="rounded-2xl border border-white/10 bg-zinc-950/40 p-3 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                  Comic cast
                </p>
                <p className="text-[11px] text-zinc-400">
                  Choose who is in this issue and use them in panel dialogue.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setSelectedCastIds(
                      characters.map((character) => character.id),
                    )
                  }
                  className="rounded-xl border border-white/10 px-2 py-1 text-[10px] text-zinc-200"
                >
                  Select all
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCastIds([])}
                  className="rounded-xl border border-white/10 px-2 py-1 text-[10px] text-zinc-200"
                >
                  Clear
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {builtInIssueNames.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() =>
                    setCustomCastNames((current) =>
                      current.includes(name)
                        ? current.filter((entry) => entry !== name)
                        : [...current, name],
                    )
                  }
                  className={
                    customCastNames.includes(name)
                      ? "rounded-full bg-amber-400 px-2 py-1 text-[10px] font-semibold text-zinc-950"
                      : "rounded-full border border-white/10 bg-zinc-900 px-2 py-1 text-[10px] text-zinc-300"
                  }
                >
                  {name}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={customCastDraft}
                onChange={(event) => setCustomCastDraft(event.target.value)}
                placeholder="Add comic-unique speaker"
                className="min-w-0 flex-1 bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-[11px] text-zinc-200"
              />
              <button
                type="button"
                onClick={() => {
                  const nextName = customCastDraft.trim();
                  if (!nextName) return;
                  setCustomCastNames((current) =>
                    current.includes(nextName)
                      ? current
                      : [...current, nextName],
                  );
                  setCustomCastDraft("");
                }}
                className="rounded-xl border border-white/10 px-3 py-2 text-[10px] text-zinc-200"
              >
                Add
              </button>
            </div>
            <input
              value={castSearch}
              onChange={(event) => setCastSearch(event.target.value)}
              placeholder="Search cast..."
              className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-[11px] text-zinc-200"
            />
            <div className="flex flex-wrap gap-2">
              {characters
                .filter((character) => {
                  const label = buildCharacterLabel(character);
                  const haystack = [
                    character.name,
                    character.codeName,
                    ...(Array.isArray(character.aliases)
                      ? character.aliases
                      : []),
                  ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();
                  return (
                    !castSearch.trim() ||
                    haystack.includes(castSearch.toLowerCase()) ||
                    label.toLowerCase().includes(castSearch.toLowerCase())
                  );
                })
                .map((character) => {
                  const active = selectedCastIds.includes(character.id);
                  return (
                    <button
                      key={character.id}
                      type="button"
                      onClick={() =>
                        setSelectedCastIds((current) =>
                          current.includes(character.id)
                            ? current.filter((id) => id !== character.id)
                            : [...current, character.id],
                        )
                      }
                      className={
                        active
                          ? "rounded-full bg-yellow-400 px-3 py-1.5 text-[10px] font-semibold text-zinc-950"
                          : "rounded-full border border-white/10 bg-zinc-900 px-3 py-1.5 text-[10px] text-zinc-300"
                      }
                    >
                      {buildCharacterLabel(character)}
                    </button>
                  );
                })}
              {customCastNames
                .filter(
                  (name) =>
                    !castSearch.trim() ||
                    name.toLowerCase().includes(castSearch.toLowerCase()),
                )
                .map((customName) => (
                  <button
                    key={customName}
                    type="button"
                    onClick={() =>
                      setCustomCastNames((current) =>
                        current.includes(customName)
                          ? current.filter((entry) => entry !== customName)
                          : [...current, customName],
                      )
                    }
                    className={
                      customCastNames.includes(customName)
                        ? "rounded-full bg-amber-400 px-3 py-1.5 text-[10px] font-semibold text-zinc-950"
                        : "rounded-full border border-white/10 bg-zinc-900 px-3 py-1.5 text-[10px] text-zinc-300"
                    }
                  >
                    {customName}
                  </button>
                ))}
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-zinc-950/40 p-3 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                  External script import
                </p>
                <p className="text-[11px] text-zinc-400">
                  Paste a script and the app will parse pages, dialogue,
                  summary, and any new names that need review.
                </p>
              </div>
            </div>
            <textarea
              value={scriptImportText}
              onChange={(event) => setScriptImportText(event.target.value)}
              placeholder="PAGE 1\nPANEL 1\nSETTING: EXT. ...\nARCHER: The city is awake.\nNOVA: Then let's move."
              rows={5}
              className="w-full bg-zinc-900 border border-white/10 rounded-2xl p-3 text-xs text-zinc-200"
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handlePreviewImportedScript}
                disabled={!scriptImportText.trim() || !selectedIssueId}
                className="rounded-xl border border-white/10 px-3 py-2 text-[10px] text-zinc-200 disabled:opacity-40"
              >
                Preview import
              </button>
              <button
                type="button"
                onClick={applyImportedScript}
                disabled={!scriptImportPreview || importingScript}
                className="rounded-xl bg-yellow-400 px-3 py-2 text-[10px] font-semibold text-zinc-950 disabled:opacity-40"
              >
                {importingScript ? "Importing..." : "Import script"}
              </button>
            </div>
            {scriptImportPreview && (
              <div className="rounded-xl border border-white/10 bg-zinc-900/70 p-3 space-y-2">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                    Issue summary
                  </p>
                  <p className="text-xs text-zinc-200">
                    {scriptImportPreview.summary}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                    Detected pages
                  </p>
                  <p className="text-xs text-zinc-200">
                    {scriptImportPreview.pages.length} panel blocks parsed
                  </p>
                </div>
                {scriptImportPreview.unknownCharacters.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-amber-300">
                      New names not in archive
                    </p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {scriptImportPreview.unknownCharacters.map(
                        (name: string) => (
                          <span
                            key={name}
                            className="rounded-full border border-amber-300/30 bg-amber-500/10 px-2 py-1 text-[10px] text-amber-200"
                          >
                            {name}
                          </span>
                        ),
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={pageTemplate}
              onChange={(event) => setPageTemplate(event.target.value)}
              className="bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-200"
            >
              {Object.entries(PAGE_TEMPLATES).map(([key, template]) => (
                <option key={key} value={key}>
                  {template.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={applyPageTemplate}
              className="border border-white/10 text-zinc-200 px-3 py-2 rounded-xl text-xs"
            >
              Use page template
            </button>
            <button
              type="button"
              onClick={exportScript}
              className="border border-white/10 text-zinc-200 px-3 py-2 rounded-xl text-xs"
            >
              <Download className="inline w-3.5 h-3.5 mr-1" /> Export script
            </button>
          </div>
        </section>
      )}

      {/* Canon Check Results Box */}
      {canonCheckResult && (
        <div
          className={`p-5 rounded-2xl border text-xs space-y-3 ${
            canonCheckResult.hasConflicts
              ? "bg-amber-500/10 border-amber-500/30 text-amber-200"
              : "bg-emerald-500/10 border-emerald-500/30 text-emerald-200"
          }`}
        >
          <div className="flex items-center space-x-2 font-bold text-sm">
            {canonCheckResult.hasConflicts ? (
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            )}
            <span>
              {canonCheckResult.hasConflicts
                ? "Potential Canon Conflicts Detected"
                : "All Script Panels Verified Canon Clean"}
            </span>
          </div>
          {canonCheckResult.conflicts?.length > 0 && (
            <ul className="list-disc pl-5 space-y-1">
              {canonCheckResult.conflicts.map((conf: any, i: number) => (
                <li key={i}>
                  {conf.description} (Severity: {conf.severity})
                </li>
              ))}
            </ul>
          )}
          {canonCheckResult.suggestions?.length > 0 && (
            <div className="text-[11px] text-zinc-300 pt-1">
              <strong>AI Suggestion:</strong>{" "}
              {canonCheckResult.suggestions.join(" ")}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Scripts List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-zinc-200 uppercase tracking-wider font-mono">
              {selectedIssueId
                ? `Issue #${issueDraft.issueNumber || "?"} — ${issueDraft.title || "Page & Panel Breakdown"}`
                : "Select an issue to begin"}
            </h2>
            <span className="text-xs text-zinc-400 font-mono">
              {issueScripts.length} Panels ·{" "}
              {issueScripts.reduce(
                (count, script) => count + (script.dialogue?.length || 0),
                0,
              )}{" "}
              lines
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/5 bg-zinc-900/50 px-3 py-2 text-[10px] font-mono text-zinc-400">
            <span>
              Issue progress:{" "}
              <strong className="text-yellow-300">{issueProgress}%</strong>
            </span>
            <span>
              {completedPanels}/{issueScripts.length || 0} panels ready
            </span>
            <button
              type="button"
              onClick={() => setStoryboardMode((current) => !current)}
              className="ml-auto text-yellow-300"
            >
              <LayoutGrid className="inline w-3.5 h-3.5 mr-1" />
              {storyboardMode ? "List view" : "Storyboard"}
            </button>
          </div>
          {continuityWarnings.length > 0 && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
              <strong>Continuity checks:</strong> {continuityWarnings.join(" ")}
            </div>
          )}

          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-zinc-500" />
            <input
              value={lineSearch}
              onChange={(event) => setLineSearch(event.target.value)}
              placeholder="Find a character or line..."
              className="w-full bg-zinc-900 border border-white/10 rounded-2xl pl-9 pr-3 py-2 text-xs text-zinc-200"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto">
            {pages.map((page) => (
              <button
                type="button"
                key={page}
                draggable
                onDragStart={() => setDraggedPageNumber(page)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => reorderPage(page)}
                onClick={() => setPageNumber(page)}
                className={
                  pageNumber === page
                    ? "bg-yellow-400 text-zinc-950 px-3 py-1.5 rounded-lg text-xs"
                    : "bg-zinc-900 text-zinc-400 px-3 py-1.5 rounded-lg text-xs"
                }
              >
                Page {page}
              </button>
            ))}
            <button
              type="button"
              onClick={addPage}
              className="border border-white/10 text-zinc-300 px-3 py-1.5 rounded-lg text-xs"
            >
              <Plus className="inline w-3 h-3 mr-1" /> Page
            </button>
            <button
              type="button"
              onClick={deletePage}
              className="text-red-300 px-3 py-1.5 rounded-lg text-xs"
            >
              <Trash2 className="inline w-3 h-3 mr-1" /> Delete page
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-[7rem_1fr_auto] gap-2 items-end">
            <label className="text-xs text-zinc-400">
              Page number
              <input
                type="number"
                min={1}
                value={pageNumber}
                onChange={(event) =>
                  setPageNumber(Math.max(1, Number(event.target.value) || 1))
                }
                className="mt-1 w-full bg-zinc-900 border border-white/10 rounded-2xl px-3 py-2 text-xs text-zinc-200"
              />
            </label>
            <label className="text-xs text-zinc-400">
              Page status
              <select
                value={currentPageStatus}
                onChange={(event) => setPageStatus(event.target.value)}
                className="mt-1 w-full bg-zinc-900 border border-white/10 rounded-2xl px-3 py-2 text-xs text-zinc-200"
              >
                <option>IN_PROGRESS</option>
                <option>DONE</option>
                <option>NEEDS_ART</option>
              </select>
            </label>
            <button
              type="button"
              onClick={savePageMeta}
              disabled={!pageScripts.length}
              className="border border-white/10 text-zinc-200 px-3 py-2 rounded-2xl text-xs disabled:opacity-40"
            >
              <Save className="inline w-3.5 h-3.5 mr-1" /> Save page
            </button>
          </div>
          <textarea
            value={pageNotes || currentPageNotes}
            onChange={(event) => setPageNotes(event.target.value)}
            placeholder={`Page ${pageNumber} notes: pacing, splash page, visual rhythm...`}
            rows={2}
            className="w-full bg-zinc-900 border border-white/10 rounded-2xl p-3 text-xs text-zinc-200"
          />

          <div className="space-y-4">
            {visiblePageScripts.map((script, idx) => (
              <div
                key={script.id || idx}
                draggable
                onDragStart={() => setDraggedPanelId(script.id)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => reorderPanel(script)}
                className={
                  storyboardMode
                    ? "writer-storyboard-panel bg-white/[0.03] border border-white/5 rounded-2xl p-4 space-y-3 shadow-lg"
                    : "bg-white/[0.03] border border-white/5 rounded-2xl p-6 space-y-4 shadow-lg"
                }
              >
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <div className="flex items-center space-x-2">
                    <GripVertical
                      className="w-4 h-4 text-zinc-600 cursor-grab"
                      aria-label="Drag to reorder panel"
                    />
                    <span className="text-xs font-bold bg-yellow-400 text-zinc-950 px-2.5 py-0.5 rounded font-mono">
                      PAGE {script.pageNumber}
                    </span>
                    <input
                      type="number"
                      min={1}
                      value={script.panelNumber}
                      onChange={(event) =>
                        setScripts((current) =>
                          current.map((item) =>
                            item.id === script.id
                              ? {
                                  ...item,
                                  panelNumber: Number(event.target.value) || 1,
                                }
                              : item,
                          ),
                        )
                      }
                      onBlur={(event) =>
                        updatePanel(script.id, {
                          panelNumber: Number(event.target.value) || 1,
                        })
                      }
                      className="w-16 bg-zinc-900 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-zinc-200 font-mono"
                      aria-label="Panel number"
                    />
                    <span className="text-xs font-semibold text-zinc-300 font-mono">
                      · {script.panelType || "Standard"} ·{" "}
                      {script.panelStatus || "DRAFT"}
                    </span>
                    <button
                      type="button"
                      onClick={() => savePanel(script)}
                      disabled={savingPanelId === script.id}
                      className="ml-2 inline-flex items-center gap-1 rounded-lg border border-yellow-400/30 bg-yellow-400/10 px-2 py-1 text-[10px] font-semibold text-yellow-200 disabled:opacity-50"
                    >
                      <Save className="w-3 h-3" />
                      {savingPanelId === script.id ? "Saving" : "Save panel"}
                    </button>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => movePanel(script, -1)}
                      title="Move panel up"
                      className="p-1 text-zinc-500 hover:text-yellow-300"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => movePanel(script, 1)}
                      title="Move panel down"
                      className="p-1 text-zinc-500 hover:text-yellow-300"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => duplicatePanel(script)}
                      title="Duplicate panel"
                      className="p-1 text-zinc-500 hover:text-yellow-300"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deletePanel(script.id)}
                      title="Delete panel"
                      className="p-1 text-zinc-500 hover:text-red-300"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setCollapsedPanels((current) =>
                          current.includes(script.id)
                            ? current.filter((id) => id !== script.id)
                            : [...current, script.id],
                        )
                      }
                      title="Collapse panel"
                      className="p-1 text-zinc-500 hover:text-zinc-200"
                    >
                      {collapsedPanels.includes(script.id) ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronUp className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {!collapsedPanels.includes(script.id) && (
                  <div className="space-y-2">
                    <input
                      value={script.setting || ""}
                      onChange={(event) =>
                        updatePanelDraft(script.id, {
                          setting: event.target.value,
                        })
                      }
                      placeholder="EXT. LOCATION - TIME"
                      className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-yellow-300 font-mono"
                    />
                    <textarea
                      rows={3}
                      value={script.description || ""}
                      onChange={(event) =>
                        updatePanelDraft(script.id, {
                          description: event.target.value,
                        })
                      }
                      placeholder="Describe what the reader sees in this panel..."
                      className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-200 font-serif italic"
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <textarea
                        rows={2}
                        value={script.caption || ""}
                        onChange={(event) =>
                          updatePanelDraft(script.id, {
                            caption: event.target.value,
                          })
                        }
                        placeholder="Caption / narration"
                        className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-300"
                      />
                      <textarea
                        rows={2}
                        value={script.shotNotes || script.artistNote || ""}
                        onChange={(event) =>
                          updatePanelDraft(script.id, {
                            shotNotes: event.target.value,
                            artistNote: event.target.value,
                          })
                        }
                        placeholder="Shot notes for artist"
                        className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-300"
                      />
                    </div>
                  </div>
                )}

                {!collapsedPanels.includes(script.id) && (
                  <div className="space-y-2 bg-zinc-950/60 p-4 rounded-2xl border border-white/5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                        Characters & dialogue
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          updatePanelDraft(script.id, {
                            dialogue: [
                              ...(script.dialogue || []),
                              { character: "", text: "" },
                            ],
                          })
                        }
                        className="text-[10px] text-yellow-300"
                      >
                        <Plus className="inline w-3 h-3 mr-1" /> Add line
                      </button>
                    </div>
                    {(script.dialogue || []).map((dlg: any, dIdx: number) => (
                      <div
                        key={dIdx}
                        className="grid grid-cols-[0.7fr_1.3fr_auto] gap-2"
                      >
                        <CharacterPicker
                          value={dlg.character || ""}
                          onChange={(nextValue) =>
                            updatePanelDraft(script.id, {
                              dialogue: script.dialogue.map(
                                (line: any, lineIndex: number) =>
                                  lineIndex === dIdx
                                    ? { ...line, character: nextValue }
                                    : line,
                              ),
                            })
                          }
                          placeholder="Character"
                          className="bg-zinc-900 border border-white/10 rounded-xl px-2 py-2 text-xs font-semibold text-yellow-200"
                        />
                        <input
                          value={dlg.text || ""}
                          onChange={(event) =>
                            updatePanelDraft(script.id, {
                              dialogue: script.dialogue.map(
                                (line: any, lineIndex: number) =>
                                  lineIndex === dIdx
                                    ? { ...line, text: event.target.value }
                                    : line,
                              ),
                            })
                          }
                          placeholder="Dialogue line"
                          className="bg-zinc-900 border border-white/10 rounded-xl px-2 py-2 text-xs text-zinc-100"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            updatePanelDraft(script.id, {
                              dialogue: script.dialogue.filter(
                                (_: any, lineIndex: number) =>
                                  lineIndex !== dIdx,
                              ),
                            })
                          }
                          className="px-1 text-zinc-500 hover:text-red-300"
                          aria-label={`Remove dialogue line ${dIdx + 1}`}
                          title="Remove dialogue line"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    {!script.dialogue?.length && (
                      <p className="text-[11px] text-zinc-500">
                        No dialogue yet. Add a line when a character speaks in
                        this panel.
                      </p>
                    )}
                  </div>
                )}

                {!collapsedPanels.includes(script.id) && (
                  <div className="space-y-2 rounded-xl border border-white/5 bg-zinc-950/50 p-3">
                    <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-zinc-500 font-mono">
                      <MessageSquare className="w-3 h-3" /> Writer / artist
                      notes
                    </div>
                    {comments
                      .filter((comment) => comment.targetId === script.id)
                      .map((comment) => (
                        <p key={comment.id} className="text-xs text-zinc-300">
                          <strong className="text-yellow-200">
                            {comment.author || "Team"}:
                          </strong>{" "}
                          {comment.text}
                        </p>
                      ))}
                    <div className="flex gap-2">
                      <input
                        value={commentDrafts[script.id] || ""}
                        onChange={(event) =>
                          setCommentDrafts((current) => ({
                            ...current,
                            [script.id]: event.target.value,
                          }))
                        }
                        placeholder="Leave a note for the other team..."
                        className="min-w-0 flex-1 bg-zinc-900 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-zinc-200"
                      />
                      <button
                        type="button"
                        onClick={() => saveComment(script.id)}
                        className="rounded-lg border border-white/10 px-2 text-[10px] text-yellow-200"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                )}

                {!collapsedPanels.includes(script.id) && (
                  <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-2 border-t border-white/5">
                    <label className="flex items-center gap-2">
                      <span>SFX</span>
                      <input
                        value={script.sfx || ""}
                        onChange={(event) =>
                          updatePanelDraft(script.id, {
                            sfx: event.target.value,
                          })
                        }
                        placeholder="BAM!"
                        className="w-28 bg-zinc-900 border border-white/10 rounded-lg px-2 py-1 text-[11px] text-zinc-300"
                      />
                    </label>
                    <span>
                      {script.dialogue?.length || 0} dialogue line
                      {script.dialogue?.length === 1 ? "" : "s"}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Add Panel Form */}
        <div className="bg-zinc-900/70 backdrop-blur-xl border border-white/5 rounded-2xl p-6 space-y-4 h-fit">
          <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider font-mono border-b border-white/5 pb-3">
            Add New Script Panel
          </h3>

          <form onSubmit={handleAddPanel} className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs text-zinc-400">
                Panel number
                <input
                  type="number"
                  min={1}
                  value={panelNumber}
                  onChange={(event) =>
                    setPanelNumber(Math.max(1, Number(event.target.value) || 1))
                  }
                  className="mt-1 w-full bg-zinc-900 border border-white/10 rounded-2xl px-2 py-2 text-xs text-zinc-200"
                />
              </label>
              <label className="text-xs text-zinc-400">
                Panel type
                <select
                  value={panelType}
                  onChange={(event) => setPanelType(event.target.value)}
                  className="mt-1 w-full bg-zinc-900 border border-white/10 rounded-2xl px-2 py-2 text-xs text-zinc-200"
                >
                  <option>Standard</option>
                  <option>Wide</option>
                  <option>Close-up</option>
                  <option>Splash</option>
                  <option>Establishing</option>
                  <option>Insert</option>
                </select>
              </label>
              <label className="text-xs text-zinc-400">
                Camera angle
                <select
                  value={cameraAngle}
                  onChange={(event) => setCameraAngle(event.target.value)}
                  className="mt-1 w-full bg-zinc-900 border border-white/10 rounded-2xl px-2 py-2 text-xs text-zinc-200"
                >
                  <option>Eye-level</option>
                  <option>Low</option>
                  <option>High</option>
                  <option>Bird's-eye</option>
                  <option>Dutch</option>
                </select>
              </label>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-zinc-400 font-medium">
                Setting / Location
              </label>
              <input
                type="text"
                placeholder="EXT. NEW LAGOS — NIGHT"
                value={newSetting}
                onChange={(e) => setNewSetting(e.target.value)}
                className="w-full bg-zinc-900 border border-white/10 rounded-2xl px-3 py-2 text-xs text-zinc-200"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs text-zinc-400">
                Caption / narration
                <textarea
                  rows={2}
                  value={caption}
                  onChange={(event) => setCaption(event.target.value)}
                  className="mt-1 w-full bg-zinc-900 border border-white/10 rounded-2xl p-2 text-xs text-zinc-200"
                />
              </label>
              <label className="text-xs text-zinc-400">
                Shot notes for artist
                <textarea
                  rows={2}
                  value={shotNotes}
                  onChange={(event) => setShotNotes(event.target.value)}
                  className="mt-1 w-full bg-zinc-900 border border-white/10 rounded-2xl p-2 text-xs text-zinc-200"
                />
              </label>
            </div>

            <label className="text-xs text-zinc-400">
              SFX
              <input
                value={sfx}
                onChange={(event) => setSfx(event.target.value)}
                placeholder="BAM! KRAKOOM!"
                className="mt-1 w-full bg-zinc-900 border border-white/10 rounded-2xl px-3 py-2 text-xs text-zinc-200"
              />
            </label>

            <div className="space-y-1.5">
              <label className="text-xs text-zinc-400 font-medium">
                Visual Description
              </label>
              <textarea
                rows={3}
                placeholder="Rain pours over neon towers..."
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="w-full bg-zinc-900 border border-white/10 rounded-2xl p-3 text-xs text-zinc-200"
              />
            </div>

            <label className="text-xs text-zinc-400">
              Panel status
              <select
                value={panelStatus}
                onChange={(event) => setPanelStatus(event.target.value)}
                className="mt-1 w-full bg-zinc-900 border border-white/10 rounded-2xl px-3 py-2 text-xs text-zinc-200"
              >
                <option>DRAFT</option>
                <option>REVISED</option>
                <option>LOCKED</option>
              </select>
            </label>

            <div className="writer-dialogue-editor">
              <div className="writer-dialogue-heading">
                <div>
                  <label className="writer-dialogue-title">
                    Characters & dialogue
                  </label>
                  <p className="writer-dialogue-hint">
                    Build the panel conversation one speaker at a time.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setDialogueLines((current) => [
                      ...current,
                      { character: "", text: "" },
                    ])
                  }
                  className="writer-add-character"
                >
                  <Plus className="w-3.5 h-3.5" /> Add character
                </button>
              </div>
              {dialogueLines.map((line, index) => (
                <div className="writer-dialogue-row" key={index}>
                  <span className="writer-dialogue-index" aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <CharacterPicker
                    value={line.character}
                    onChange={(nextValue) =>
                      setDialogueLines((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, character: nextValue }
                            : item,
                        ),
                      )
                    }
                    placeholder="Character"
                    className="writer-character-input"
                  />
                  <input
                    value={line.text}
                    onChange={(event) =>
                      setDialogueLines((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, text: event.target.value }
                            : item,
                        ),
                      )
                    }
                    placeholder="Dialogue line"
                    className="writer-dialogue-input"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setDialogueLines((current) =>
                        current.length === 1
                          ? [{ character: "", text: "" }]
                          : current.filter(
                              (_, itemIndex) => itemIndex !== index,
                            ),
                      )
                    }
                    className="writer-remove-character"
                    aria-label={`Remove character ${index + 1}`}
                    title="Remove character"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <div className="writer-dialogue-footer">
                <span>
                  {dialogueLines.length} speaker row
                  {dialogueLines.length === 1 ? "" : "s"}
                </span>
                <span>Saved with this panel</span>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-yellow-400 hover:bg-yellow-300 text-zinc-950 text-xs font-semibold py-2.5 rounded-2xl transition-all cursor-pointer"
            >
              Add Panel to Issue
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
