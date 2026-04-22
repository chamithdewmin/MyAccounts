import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import {
  Search,
  Upload,
  Folder,
  FolderPlus,
  LayoutGrid,
  List,
  MoreVertical,
  Eye,
  Download,
  Pencil,
  Trash2,
  Trash,
  Link2,
  FileText,
  Image as ImageIcon,
  File,
  Loader2,
  X,
  FolderOpen,
  Users,
  Receipt,
  Unlink,
  HardDrive,
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  Lock,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { api } from '@/lib/api';

const TYPE_OPTIONS = [
  { value: 'all', label: 'All types' },
  { value: 'images', label: 'Images' },
  { value: 'pdfs', label: 'PDFs' },
  { value: 'docs', label: 'Docs' },
  { value: 'others', label: 'Others' },
];

const formatBytes = (n) => {
  const v = Number(n) || 0;
  if (v < 1024) return `${v} B`;
  if (v < 1024 * 1024) return `${(v / 1024).toFixed(1)} KB`;
  if (v < 1024 * 1024 * 1024) return `${(v / (1024 * 1024)).toFixed(1)} MB`;
  return `${(v / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

const isImageType = (t) => String(t || '').toLowerCase().startsWith('image/');
const isPdfType = (t) => String(t || '').toLowerCase() === 'application/pdf';

const fileKindLabel = (t) => {
  if (isImageType(t)) return 'Image';
  if (isPdfType(t)) return 'PDF';
  const s = String(t || '');
  if (s.includes('word') || s.includes('document')) return 'Document';
  if (s.includes('sheet') || s.includes('excel') || s === 'text/csv') return 'Spreadsheet';
  if (s.startsWith('text/')) return 'Text';
  return 'File';
};

const isDocsType = (t) => {
  const s = String(t || '').toLowerCase();
  return (
    s.includes('word') ||
    s.includes('document') ||
    s.includes('excel') ||
    s.includes('sheet') ||
    s.includes('spreadsheet') ||
    s === 'text/plain' ||
    s === 'text/csv' ||
    s.includes('csv') ||
    s.includes('powerpoint') ||
    s.includes('opendocument')
  );
};

const storageBand = (t) => {
  if (isImageType(t)) return 'images';
  if (isPdfType(t)) return 'pdfs';
  if (isDocsType(t)) return 'docs';
  return 'others';
};

const FileManager = () => {
  const { toast } = useToast();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [scope, setScope] = useState('all');
  const [viewMode, setViewMode] = useState('table');
  const [selected, setSelected] = useState(null);
  const [previewBlob, setPreviewBlob] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const previewUrlRef = useRef(null);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadTags, setUploadTags] = useState('');
  const [uploadLinkType, setUploadLinkType] = useState('');
  const [uploadLinkClient, setUploadLinkClient] = useState('');
  const [uploadLinkInvoice, setUploadLinkInvoice] = useState('');
  const [uploadFolderId, setUploadFolderId] = useState('');
  const [uploadPct, setUploadPct] = useState(0);
  const [uploadName, setUploadName] = useState('');
  const [uploading, setUploading] = useState(false);
  const uploadAbortRef = useRef(null);

  const [clients, setClients] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [folders, setFolders] = useState([]);
  const [selectedFolderId, setSelectedFolderId] = useState('');
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [dragFileId, setDragFileId] = useState(null);
  const [folderDeleteTarget, setFolderDeleteTarget] = useState(null);
  const [folderDeleteInput, setFolderDeleteInput] = useState('');
  const [folderDeleteSubmitting, setFolderDeleteSubmitting] = useState(false);
  const [folderRenameOpen, setFolderRenameOpen] = useState(false);
  const [folderRenameTarget, setFolderRenameTarget] = useState(null);
  const [folderRenameValue, setFolderRenameValue] = useState('');
  const [folderRenameSubmitting, setFolderRenameSubmitting] = useState(false);
  const [folderPasswordOpen, setFolderPasswordOpen] = useState(false);
  const [folderPasswordTarget, setFolderPasswordTarget] = useState(null);
  const [folderPasswordUseLogin, setFolderPasswordUseLogin] = useState(true);
  const [folderPasswordValue, setFolderPasswordValue] = useState('');
  const [folderPasswordSubmitting, setFolderPasswordSubmitting] = useState(false);
  const [folderUnlockOpen, setFolderUnlockOpen] = useState(false);
  const [folderUnlockTarget, setFolderUnlockTarget] = useState(null);
  const [folderUnlockValue, setFolderUnlockValue] = useState('');
  const [folderUnlockSubmitting, setFolderUnlockSubmitting] = useState(false);
  const [unlockedFolderIds, setUnlockedFolderIds] = useState(() => new Set());

  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [renameTarget, setRenameTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const [checkedIds, setCheckedIds] = useState(() => new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleteConfirmInput, setBulkDeleteConfirmInput] = useState('');
  const [bulkDeleteSubmitting, setBulkDeleteSubmitting] = useState(false);

  const [sizeSort, setSizeSort] = useState('none');
  const [uploadFlash, setUploadFlash] = useState(null);
  const pendingUploadAddedRef = useRef(null);

  const [linkOpen, setLinkOpen] = useState(false);
  const [linkTarget, setLinkTarget] = useState(null);
  const [linkKind, setLinkKind] = useState('client');
  const [linkClientId, setLinkClientId] = useState('');
  const [linkInvoiceId, setLinkInvoiceId] = useState('');

  const revokePreview = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setPreviewBlob(null);
  }, []);

  const loadFiles = useCallback(async () => {
    setLoading(true);
    try {
      const list = await api.files.list({
        q: debouncedSearch.trim() || undefined,
        type: typeFilter,
        scope,
        folderId: selectedFolderId || undefined,
      });
      setFiles(Array.isArray(list) ? list : []);
    } catch (e) {
      toast({
        title: 'Could not load files',
        description: e.message || 'Request failed',
        variant: 'destructive',
      });
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, typeFilter, scope, selectedFolderId, toast]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  useEffect(() => {
    setCheckedIds(new Set());
  }, [selectedFolderId, scope, debouncedSearch, typeFilter, sizeSort]);

  const storageTotals = useMemo(() => {
    let images = 0;
    let pdfs = 0;
    let docs = 0;
    let others = 0;
    let ni = 0;
    let np = 0;
    let nd = 0;
    let no = 0;
    for (let i = 0; i < files.length; i += 1) {
      const f = files[i];
      const sz = Number(f.fileSize) || 0;
      const b = storageBand(f.fileType);
      if (b === 'images') {
        images += sz;
        ni += 1;
      } else if (b === 'pdfs') {
        pdfs += sz;
        np += 1;
      } else if (b === 'docs') {
        docs += sz;
        nd += 1;
      } else {
        others += sz;
        no += 1;
      }
    }
    const totalBytes = images + pdfs + docs + others;
    return { images, pdfs, docs, others, totalBytes, ni, np, nd, no, count: files.length };
  }, [files]);

  const displayedFiles = useMemo(() => {
    const list = files.slice();
    if (sizeSort === 'desc') list.sort((a, b) => (Number(b.fileSize) || 0) - (Number(a.fileSize) || 0));
    else if (sizeSort === 'asc') list.sort((a, b) => (Number(a.fileSize) || 0) - (Number(b.fileSize) || 0));
    return list;
  }, [files, sizeSort]);

  const tableListTotals = useMemo(() => {
    let t = 0;
    for (let i = 0; i < displayedFiles.length; i += 1) t += Number(displayedFiles[i].fileSize) || 0;
    return { bytes: t, count: displayedFiles.length };
  }, [displayedFiles]);

  useEffect(() => {
    const add = pendingUploadAddedRef.current;
    if (add == null) return;
    pendingUploadAddedRef.current = null;
    const total = files.reduce((s, f) => s + (Number(f.fileSize) || 0), 0);
    setUploadFlash({ added: add, total });
  }, [files]);

  useEffect(() => {
    if (!uploadFlash) return undefined;
    const t = setTimeout(() => setUploadFlash(null), 6000);
    return () => clearTimeout(t);
  }, [uploadFlash]);

  useEffect(() => {
    const loadRefs = async () => {
      try {
        const [c, inv, fs] = await Promise.all([api.clients.list(), api.invoices.list(), api.files.listFolders()]);
        setClients(Array.isArray(c) ? c : []);
        setInvoices(Array.isArray(inv) ? inv : []);
        setFolders(Array.isArray(fs) ? fs : []);
      } catch {
        setClients([]);
        setInvoices([]);
        setFolders([]);
      }
    };
    loadRefs();
  }, []);

  useEffect(() => {
    if (!selected) {
      revokePreview();
      return;
    }
    let cancelled = false;
    (async () => {
      setPreviewLoading(true);
      revokePreview();
      try {
        if (isImageType(selected.fileType) || isPdfType(selected.fileType)) {
          const blob = await api.files.fetchBlob(selected.id, { inline: true });
          if (cancelled) return;
          const url = URL.createObjectURL(blob);
          previewUrlRef.current = url;
          setPreviewBlob(url);
        }
      } catch (e) {
        if (!cancelled) {
          const msg = String(e?.message || 'Unknown error');
          let desc = msg;
          if (/missing on disk|file missing/i.test(msg)) {
            desc = `${msg} The listing is from the database, but the file bytes are not on the server disk (often after a deploy without a persistent upload folder). Ask your host to set UPLOADS_DIR to a volume-backed path.`;
          } else if (/502|bad gateway/i.test(msg)) {
            desc = `${msg} The API may have crashed while reading the file or the gateway timed out. Retry; check server logs if it persists.`;
          }
          toast({ title: 'Preview failed', description: desc, variant: 'destructive' });
        }
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selected, revokePreview, toast]);

  useEffect(() => () => revokePreview(), [revokePreview]);

  const openUpload = () => {
    setUploadTags('');
    setUploadLinkType('');
    setUploadLinkClient('');
    setUploadLinkInvoice('');
    setUploadFolderId(selectedFolderId || '');
    setUploadPct(0);
    setUploadName('');
    setUploadOpen(true);
  };

  const createFolder = async () => {
    const name = newFolderName.trim();
    if (!name) {
      toast({ title: 'Folder name required', variant: 'destructive' });
      return;
    }
    setCreatingFolder(true);
    try {
      const f = await api.files.createFolder(name);
      setFolders((prev) => [...prev, f].sort((a, b) => String(a.name).localeCompare(String(b.name))));
      setSelectedFolderId(String(f.id));
      setNewFolderOpen(false);
      setNewFolderName('');
      toast({ title: 'Folder created', description: name });
      await loadFiles();
    } catch (e) {
      toast({ title: 'Could not create folder', description: e.message, variant: 'destructive' });
    } finally {
      setCreatingFolder(false);
    }
  };

  const openFolderDeleteDialog = (folder) => {
    setFolderDeleteTarget(folder);
    setFolderDeleteInput('');
  };

  const closeFolderDeleteDialog = () => {
    setFolderDeleteTarget(null);
    setFolderDeleteInput('');
  };

  const handleFolderClick = (folder) => {
    if (!folder?.hasPassword || unlockedFolderIds.has(folder.id)) {
      setSelectedFolderId(String(folder.id));
      return;
    }
    setFolderUnlockTarget(folder);
    setFolderUnlockValue('');
    setFolderUnlockOpen(true);
  };

  const openFolderRenameDialog = (folder) => {
    setFolderRenameTarget(folder);
    setFolderRenameValue(folder?.name || '');
    setFolderRenameOpen(true);
  };

  const saveFolderRename = async () => {
    const folder = folderRenameTarget;
    const name = folderRenameValue.trim();
    if (!folder || !name) return;
    setFolderRenameSubmitting(true);
    try {
      const updated = await api.files.renameFolder(folder.id, name);
      setFolders((prev) =>
        prev
          .map((f) => (f.id === folder.id ? updated : f))
          .sort((a, b) => String(a.name).localeCompare(String(b.name))),
      );
      setFolderRenameOpen(false);
      setFolderRenameTarget(null);
      setFolderRenameValue('');
      toast({ title: 'Folder renamed', description: `${folder.name} → ${updated.name}` });
      await loadFiles();
      setSelected((s) =>
        s && String(s.folderId) === String(updated.id)
          ? {
              ...s,
              folderName: updated.name,
            }
          : s,
      );
    } catch (e) {
      toast({ title: 'Could not rename folder', description: e.message, variant: 'destructive' });
    } finally {
      setFolderRenameSubmitting(false);
    }
  };

  const openFolderPasswordDialog = (folder) => {
    setFolderPasswordTarget(folder);
    setFolderPasswordUseLogin(true);
    setFolderPasswordValue('');
    setFolderPasswordOpen(true);
  };

  const saveFolderPassword = async () => {
    const folder = folderPasswordTarget;
    if (!folder) return;
    if (!folderPasswordUseLogin && folderPasswordValue.trim().length < 4) {
      toast({ title: 'Password too short', description: 'Use at least 4 characters.', variant: 'destructive' });
      return;
    }
    setFolderPasswordSubmitting(true);
    try {
      const payload = folderPasswordUseLogin
        ? { enabled: true, useLoginPassword: true }
        : { enabled: true, useLoginPassword: false, password: folderPasswordValue.trim() };
      const updated = await api.files.setFolderPassword(folder.id, payload);
      setFolders((prev) =>
        prev
          .map((f) => (f.id === folder.id ? updated : f))
          .sort((a, b) => String(a.name).localeCompare(String(b.name))),
      );
      setUnlockedFolderIds((prev) => {
        const next = new Set(prev);
        next.add(folder.id);
        return next;
      });
      setFolderPasswordOpen(false);
      setFolderPasswordTarget(null);
      setFolderPasswordValue('');
      toast({ title: 'Folder password set', description: `Protection enabled for ${updated.name}` });
      await loadFiles();
    } catch (e) {
      toast({ title: 'Could not set password', description: e.message, variant: 'destructive' });
    } finally {
      setFolderPasswordSubmitting(false);
    }
  };

  const clearFolderPassword = async (folder) => {
    try {
      const updated = await api.files.setFolderPassword(folder.id, { enabled: false });
      setFolders((prev) =>
        prev
          .map((f) => (f.id === folder.id ? updated : f))
          .sort((a, b) => String(a.name).localeCompare(String(b.name))),
      );
      setUnlockedFolderIds((prev) => {
        const next = new Set(prev);
        next.delete(folder.id);
        return next;
      });
      toast({ title: 'Folder password removed', description: updated.name });
      await loadFiles();
    } catch (e) {
      toast({ title: 'Could not remove password', description: e.message, variant: 'destructive' });
    }
  };

  const unlockFolderAndOpen = async () => {
    const folder = folderUnlockTarget;
    const password = folderUnlockValue;
    if (!folder || !password) return;
    setFolderUnlockSubmitting(true);
    try {
      await api.files.unlockFolder(folder.id, password);
      setUnlockedFolderIds((prev) => {
        const next = new Set(prev);
        next.add(folder.id);
        return next;
      });
      setSelectedFolderId(String(folder.id));
      setFolderUnlockOpen(false);
      setFolderUnlockTarget(null);
      setFolderUnlockValue('');
    } catch (e) {
      toast({ title: 'Incorrect password', description: e.message, variant: 'destructive' });
    } finally {
      setFolderUnlockSubmitting(false);
    }
  };

  const deleteFolder = async () => {
    const folder = folderDeleteTarget;
    if (!folder || folderDeleteInput.trim() !== 'DELETE') return;
    setFolderDeleteSubmitting(true);
    try {
      await api.files.deleteFolder(folder.id);
      setFolders((prev) => prev.filter((f) => f.id !== folder.id));
      if (String(selectedFolderId) === String(folder.id)) setSelectedFolderId('');
      toast({
        title: 'Folder deleted',
        description: `${folder.name} removed. Files were moved to Root.`,
      });
      await loadFiles();
    } catch (e) {
      toast({ title: 'Could not delete folder', description: e.message, variant: 'destructive' });
    } finally {
      setFolderDeleteSubmitting(false);
      closeFolderDeleteDialog();
    }
  };

  const runUpload = (fileList) => {
    const file = fileList?.[0];
    if (!file || uploading) return;
    uploadAbortRef.current = new AbortController();
    setUploading(true);
    setUploadPct(0);
    setUploadName(file.name);
    const fields = { tags: uploadTags.trim() };
    if (uploadFolderId) fields.folder_id = uploadFolderId;
    if (uploadLinkType === 'client' && uploadLinkClient) {
      fields.linked_type = 'client';
      fields.linked_id = uploadLinkClient;
    } else if (uploadLinkType === 'invoice' && uploadLinkInvoice) {
      fields.linked_type = 'invoice';
      fields.linked_id = uploadLinkInvoice;
    }
    api.files
      .upload(file, fields, {
        signal: uploadAbortRef.current.signal,
        onProgress: (p) => setUploadPct(p),
      })
      .then(async () => {
        pendingUploadAddedRef.current = file.size;
        setUploadOpen(false);
        await loadFiles();
        toast({
          title: 'Upload complete',
          description: `+${formatBytes(file.size)} added`,
        });
      })
      .catch((e) => {
        if (e.message !== 'Upload cancelled') {
          toast({ title: 'Upload failed', description: e.message, variant: 'destructive' });
        }
      })
      .finally(() => {
        setUploading(false);
        setUploadPct(0);
        setUploadName('');
      });
  };

  const cancelUpload = () => {
    uploadAbortRef.current?.abort();
  };

  const moveFileToFolder = async (fileId, folderId) => {
    try {
      await api.files.update(fileId, { folderId: folderId || null });
      toast({
        title: folderId ? 'File moved' : 'Moved to root',
        description: folderId
          ? `Moved to ${folders.find((f) => String(f.id) === String(folderId))?.name || 'folder'}`
          : 'File is now in root',
      });
      if (selected?.id === fileId) {
        const nextName = folderId ? folders.find((f) => String(f.id) === String(folderId))?.name || null : null;
        setSelected((s) => (s ? { ...s, folderId: folderId ? Number(folderId) : null, folderName: nextName } : s));
      }
      await loadFiles();
    } catch (e) {
      toast({ title: 'Move failed', description: e.message, variant: 'destructive' });
    }
  };

  const downloadFile = async (f) => {
    try {
      const blob = await api.files.fetchBlob(f.id, { inline: false });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = f.originalName || 'download';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast({ title: 'Download failed', description: e.message, variant: 'destructive' });
    }
  };

  const openDeleteDialog = (f) => {
    setDeleteTarget(f);
    setDeleteConfirmInput('');
  };

  const closeDeleteDialog = () => {
    setDeleteTarget(null);
    setDeleteConfirmInput('');
  };

  const deleteFile = async () => {
    const f = deleteTarget;
    if (!f || deleteConfirmInput.trim() !== 'DELETE') return;
    setDeleteSubmitting(true);
    try {
      await api.files.delete(f.id);
      toast({ title: 'File deleted' });
      if (selected?.id === f.id) setSelected(null);
      setCheckedIds((prev) => {
        const next = new Set(prev);
        next.delete(f.id);
        return next;
      });
      closeDeleteDialog();
      await loadFiles();
    } catch (e) {
      toast({ title: 'Delete failed', description: e.message, variant: 'destructive' });
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const saveRename = async () => {
    if (!renameTarget || !renameValue.trim()) return;
    try {
      await api.files.update(renameTarget.id, { originalName: renameValue.trim() });
      toast({ title: 'Renamed' });
      setRenameOpen(false);
      setRenameTarget(null);
      loadFiles();
      setSelected((s) => (s && s.id === renameTarget.id ? { ...s, originalName: renameValue.trim() } : s));
    } catch (e) {
      toast({ title: 'Rename failed', description: e.message, variant: 'destructive' });
    }
  };

  const saveLink = async () => {
    if (!linkTarget) return;
    try {
      if (linkKind === 'client') {
        if (!linkClientId) {
          toast({ title: 'Pick a client', variant: 'destructive' });
          return;
        }
        await api.files.update(linkTarget.id, { linkedType: 'client', linkedId: linkClientId });
      } else {
        if (!linkInvoiceId) {
          toast({ title: 'Pick an invoice', variant: 'destructive' });
          return;
        }
        await api.files.update(linkTarget.id, { linkedType: 'invoice', linkedId: linkInvoiceId });
      }
      toast({ title: 'Link saved' });
      setLinkOpen(false);
      setLinkTarget(null);
      loadFiles();
    } catch (e) {
      toast({ title: 'Link failed', description: e.message, variant: 'destructive' });
    }
  };

  const clearLink = async (f) => {
    try {
      await api.files.update(f.id, { linkedType: null, linkedId: null });
      toast({ title: 'Link removed' });
      loadFiles();
    } catch (e) {
      toast({ title: 'Could not unlink', description: e.message, variant: 'destructive' });
    }
  };

  const scopeNav = useMemo(
    () => [
      { id: 'all', label: 'All files', icon: FolderOpen },
      { id: 'unlinked', label: 'Unlinked', icon: Unlink },
      { id: 'client', label: 'Clients', icon: Users },
      { id: 'invoice', label: 'Invoices', icon: Receipt },
    ],
    [],
  );

  const linkedCell = (f) => {
    if (!f.linkedType || !f.linkedId) return '—';
    if (f.linkedType === 'client') return f.linkedLabel ? `Client · ${f.linkedLabel}` : 'Client';
    if (f.linkedType === 'invoice') return f.linkedLabel ? `Invoice · ${f.linkedLabel}` : 'Invoice';
    return '—';
  };

  const checkedCount = checkedIds.size;

  const tableHeaderCheckboxState = useMemo(() => {
    if (!displayedFiles.length) return false;
    let n = 0;
    for (let i = 0; i < displayedFiles.length; i += 1) {
      if (checkedIds.has(displayedFiles[i].id)) n += 1;
    }
    if (n === displayedFiles.length) return true;
    if (n > 0) return 'indeterminate';
    return false;
  }, [displayedFiles, checkedIds]);

  const toggleFileChecked = (id, nextChecked) => {
    setCheckedIds((prev) => {
      const s = new Set(prev);
      if (nextChecked) s.add(id);
      else s.delete(id);
      return s;
    });
  };

  const onTableHeaderCheckChange = (checked) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (checked === true) {
        displayedFiles.forEach((f) => next.add(f.id));
      } else {
        displayedFiles.forEach((f) => next.delete(f.id));
      }
      return next;
    });
  };

  const cycleSizeSort = () => {
    setSizeSort((s) => (s === 'none' ? 'desc' : s === 'desc' ? 'asc' : 'none'));
  };

  const openBulkDeleteDialog = () => {
    if (checkedIds.size === 0) return;
    setBulkDeleteConfirmInput('');
    setBulkDeleteOpen(true);
  };

  const closeBulkDeleteDialog = () => {
    if (bulkDeleteSubmitting) return;
    setBulkDeleteOpen(false);
    setBulkDeleteConfirmInput('');
  };

  const deleteCheckedFiles = async () => {
    if (bulkDeleteConfirmInput.trim() !== 'DELETE' || checkedIds.size === 0) return;
    const ids = [...checkedIds];
    setBulkDeleteSubmitting(true);
    let ok = 0;
    const errors = [];
    const failedIds = new Set(ids);
    try {
      for (let i = 0; i < ids.length; i += 1) {
        const id = ids[i];
        try {
          await api.files.delete(id);
          ok += 1;
          failedIds.delete(id);
        } catch (e) {
          errors.push(String(e?.message || 'Request failed'));
        }
      }
      if (ok > 0) {
        toast({
          title: ok === ids.length ? 'Files deleted' : 'Some files deleted',
          description:
            errors.length > 0
              ? `${ok} removed, ${errors.length} failed${errors[0] ? ` (${errors[0]})` : ''}`
              : `${ok} file${ok === 1 ? '' : 's'} removed.`,
        });
      } else {
        toast({
          title: 'Delete failed',
          description: errors[0] || 'Could not delete selected files.',
          variant: 'destructive',
        });
      }
      if (selected && ids.includes(selected.id) && !failedIds.has(selected.id)) setSelected(null);
      setCheckedIds(failedIds);
      setBulkDeleteOpen(false);
      setBulkDeleteConfirmInput('');
      await loadFiles();
    } finally {
      setBulkDeleteSubmitting(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>File Manager - LogozoPOS</title>
        <meta name="description" content="Upload, search, and link files to clients and invoices" />
      </Helmet>

      <div className="page-y flex flex-col gap-5 min-h-0">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">File Manager</h1>
            <p className="text-muted-foreground text-sm sm:text-base mt-1 max-w-2xl leading-relaxed">
              Upload files, search by name or tags, and link documents to clients or invoices.
            </p>
          </div>
          <Button variant="outline" size="sm" className="shrink-0 gap-2 self-start" asChild>
            <Link to="/reports/storage-overview">View Storage Overview →</Link>
          </Button>
        </div>

        <div className="rounded-2xl border border-border bg-card/80 p-3 sm:p-4 flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center shadow-sm">
          <div className="relative flex-1 min-w-[200px] max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search file name, type, or tags…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-10 bg-input border-border"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={openUpload} className="gap-2">
              <Upload className="w-4 h-4" />
              Upload
            </Button>
            {checkedCount > 0 ? (
              <>
                <Button type="button" variant="outline" size="sm" onClick={() => setCheckedIds(new Set())}>
                  Clear selection ({checkedCount})
                </Button>
                <Button type="button" variant="destructive" size="sm" className="gap-2" onClick={openBulkDeleteDialog}>
                  <Trash2 className="w-4 h-4" />
                  Delete selected ({checkedCount})
                </Button>
              </>
            ) : null}
            <Button type="button" variant="outline" className="gap-2" onClick={() => setNewFolderOpen(true)}>
              <FolderPlus className="w-4 h-4" />
              New folder
            </Button>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-10 rounded-lg border border-border bg-input px-3 text-sm text-foreground min-w-[140px]"
            >
              {TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <div className="flex rounded-lg border border-border overflow-hidden">
              <Button
                type="button"
                variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                size="sm"
                className="rounded-none gap-1"
                onClick={() => setViewMode('table')}
              >
                <List className="w-4 h-4" />
                Table
              </Button>
              <Button
                type="button"
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="sm"
                className="rounded-none gap-1"
                onClick={() => setViewMode('grid')}
              >
                <LayoutGrid className="w-4 h-4" />
                Grid
              </Button>
            </div>
            <Button variant="outline" size="sm" onClick={loadFiles} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Refresh'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
          {[
            {
              icon: Folder,
              label: 'Total files',
              value: String(storageTotals.count),
              sub: 'In current list',
              tone: 'text-sky-400',
            },
            {
              icon: HardDrive,
              label: 'Total size',
              value: formatBytes(storageTotals.totalBytes),
              sub: 'All types combined',
              tone: 'text-cyan-400',
            },
            {
              icon: ImageIcon,
              label: 'Images',
              value: `${storageTotals.ni} file${storageTotals.ni === 1 ? '' : 's'}`,
              sub: formatBytes(storageTotals.images),
              tone: 'text-sky-400',
            },
            {
              icon: FileText,
              label: 'PDFs',
              value: `${storageTotals.np} file${storageTotals.np === 1 ? '' : 's'}`,
              sub: formatBytes(storageTotals.pdfs),
              tone: 'text-rose-400',
            },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className="rounded-xl border border-border bg-card/90 px-3 py-3 sm:px-4 sm:py-3.5 shadow-sm flex flex-col gap-1 min-h-[88px] justify-center"
              >
                <div className="flex items-center gap-2 text-muted-foreground text-[11px] uppercase tracking-wide font-medium">
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${card.tone}`} />
                  {card.label}
                </div>
                <p className="text-lg sm:text-xl font-semibold text-foreground tabular-nums leading-tight">{card.value}</p>
                <p className="text-[11px] text-muted-foreground leading-snug">{card.sub}</p>
              </div>
            );
          })}
        </div>

        {uploadFlash ? (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-cyan-500/35 bg-cyan-500/10 px-4 py-3 text-sm text-foreground flex flex-wrap items-center gap-2 shadow-sm"
          >
            <span className="font-semibold text-cyan-300 tabular-nums">+{formatBytes(uploadFlash.added)} added</span>
            <span className="text-muted-foreground">→</span>
            <span className="text-muted-foreground">
              Total: <span className="font-semibold text-foreground tabular-nums">{formatBytes(uploadFlash.total)}</span>
            </span>
          </motion.div>
        ) : null}

        <div className="flex flex-col lg:flex-row gap-4 min-h-[480px] flex-1 min-w-0">
          <aside className="lg:w-52 shrink-0 rounded-2xl border border-border bg-card p-2 h-fit">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-2 py-1.5">Browse</p>
            <nav className="flex flex-row flex-wrap gap-1 lg:flex-col">
              {scopeNav.map((item) => {
                const Icon = item.icon;
                const active = scope === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setScope(item.id)}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors w-full text-left ${
                      active ? 'bg-primary/15 text-primary border border-primary/30' : 'hover:bg-secondary text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {item.label}
                  </button>
                );
              })}
            </nav>
            <div className="mt-3 border-t border-border pt-3">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide px-2 pb-1">Folders</p>
              <button
                type="button"
                onClick={() => setSelectedFolderId('')}
                onDragOver={(e) => {
                  e.preventDefault();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragFileId != null) moveFileToFolder(dragFileId, null);
                }}
                className={`w-full text-left rounded-lg px-3 py-2 text-sm flex items-center gap-2 ${
                  selectedFolderId === '' ? 'bg-primary/15 text-primary border border-primary/30' : 'hover:bg-secondary text-muted-foreground'
                }`}
              >
                <FolderOpen className="w-4 h-4" />
                Root
              </button>
              <div className="mt-1 max-h-56 overflow-auto space-y-1">
                {folders.map((f) => (
                  <div
                    key={f.id}
                    onDragOver={(e) => {
                      e.preventDefault();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (dragFileId != null) moveFileToFolder(dragFileId, f.id);
                    }}
                    className={`w-full rounded-lg text-sm flex items-center gap-1 ${
                      String(selectedFolderId) === String(f.id)
                        ? 'bg-primary/15 text-primary border border-primary/30'
                        : 'hover:bg-secondary text-muted-foreground'
                    }`}
                  >
                    <button type="button" onClick={() => handleFolderClick(f)} className="flex-1 min-w-0 text-left px-3 py-2 flex items-center gap-2">
                      <Folder className="w-4 h-4 shrink-0" />
                      <span className="truncate">{f.name}</span>
                      {f.hasPassword ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded border border-border/80 text-muted-foreground inline-flex items-center">
                          <Lock className="w-3 h-3" />
                        </span>
                      ) : null}
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 mr-1"
                          disabled={folderDeleteSubmitting || folderRenameSubmitting || folderPasswordSubmitting}
                          aria-label="Folder actions"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onClick={() => openFolderRenameDialog(f)}>
                          <Pencil className="w-4 h-4 mr-2" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openFolderPasswordDialog(f)}>
                          <Pencil className="w-4 h-4 mr-2" />
                          {f.hasPassword ? 'Change password' : 'Set password'}
                        </DropdownMenuItem>
                        {f.hasPassword ? (
                          <DropdownMenuItem onClick={() => clearFolderPassword(f)}>
                            <Unlink className="w-4 h-4 mr-2" />
                            Remove password
                          </DropdownMenuItem>
                        ) : null}
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => openFolderDeleteDialog(f)}>
                          <Trash className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
                {folders.length === 0 ? <p className="text-xs text-muted-foreground px-3 py-2">No folders yet</p> : null}
              </div>
            </div>
          </aside>

          <div className="flex-1 min-w-0 flex flex-col lg:flex-row gap-4">
            <div className="flex-1 min-w-0 rounded-2xl border border-border bg-card overflow-hidden flex flex-col">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-2">
                <span className="font-semibold text-foreground">Files</span>
                <span className="text-xs text-muted-foreground tabular-nums text-right">
                  {files.length === 0
                    ? '0 items'
                    : tableListTotals.count === files.length
                      ? `${files.length} item${files.length === 1 ? '' : 's'}`
                      : `${tableListTotals.count} shown · ${files.length} total`}
                </span>
              </div>
              {loading ? (
                <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Loading…
                </div>
              ) : viewMode === 'table' ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground text-xs uppercase tracking-wide">
                        <th className="w-12 px-3 py-3 text-left font-medium align-middle">
                          <Checkbox
                            checked={tableHeaderCheckboxState}
                            onCheckedChange={onTableHeaderCheckChange}
                            disabled={!displayedFiles.length}
                            aria-label="Select all visible files"
                            className="translate-y-0.5"
                          />
                        </th>
                        <th className="px-4 py-3 text-left font-medium">File name</th>
                        <th className="px-4 py-3 text-left font-medium">Type</th>
                        <th className="px-4 py-3 text-left font-medium">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              cycleSizeSort();
                            }}
                            className="inline-flex items-center gap-1.5 rounded-md -mx-1 px-1 py-0.5 hover:bg-secondary/80 hover:text-foreground transition-colors"
                            title="Sort by size (click to cycle: default, largest first, smallest first)"
                          >
                            Size
                            {sizeSort === 'desc' ? (
                              <ArrowDownWideNarrow className="w-3.5 h-3.5 text-sky-400 shrink-0" aria-hidden />
                            ) : sizeSort === 'asc' ? (
                              <ArrowUpNarrowWide className="w-3.5 h-3.5 text-sky-400 shrink-0" aria-hidden />
                            ) : null}
                          </button>
                        </th>
                        <th className="px-4 py-3 text-left font-medium">Linked to</th>
                        <th className="px-4 py-3 text-left font-medium">Date</th>
                        <th className="px-4 py-3 w-12" />
                      </tr>
                    </thead>
                    <tbody>
                      {files.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                            No files yet. Upload a document to get started.
                          </td>
                        </tr>
                      ) : (
                        displayedFiles.map((f, i) => (
                          <motion.tr
                            key={f.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: i * 0.02 }}
                            onClick={() => setSelected(f)}
                            draggable
                            onDragStart={() => setDragFileId(f.id)}
                            onDragEnd={() => setDragFileId(null)}
                            className={`border-b border-border cursor-pointer transition-colors hover:bg-secondary/40 ${
                              selected?.id === f.id ? 'bg-primary/10' : ''
                            } ${checkedIds.has(f.id) ? 'bg-accent/25' : ''}`}
                          >
                            <td
                              className="w-12 px-3 py-3 align-middle"
                              onClick={(e) => e.stopPropagation()}
                              onPointerDown={(e) => e.stopPropagation()}
                            >
                              <Checkbox
                                checked={checkedIds.has(f.id)}
                                onCheckedChange={(c) => toggleFileChecked(f.id, c === true)}
                                aria-label={`Select ${f.originalName || 'file'}`}
                                className="translate-y-0.5"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2 min-w-0">
                                {isImageType(f.fileType) ? (
                                  <ImageIcon className="w-4 h-4 text-sky-400 shrink-0" />
                                ) : isPdfType(f.fileType) ? (
                                  <FileText className="w-4 h-4 text-red-400 shrink-0" />
                                ) : (
                                  <File className="w-4 h-4 text-muted-foreground shrink-0" />
                                )}
                                <span className="font-medium text-foreground truncate">{f.originalName}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">{fileKindLabel(f.fileType)}</td>
                            <td className="px-4 py-3 text-muted-foreground tabular-nums">{formatBytes(f.fileSize)}</td>
                            <td className="px-4 py-3 text-muted-foreground text-xs max-w-[200px] truncate">
                              <div>{linkedCell(f)}</div>
                              <div className="text-[11px] mt-0.5">{f.folderName ? `Folder · ${f.folderName}` : 'Root'}</div>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                              {f.createdAt ? new Date(f.createdAt).toLocaleDateString() : '—'}
                            </td>
                            <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Actions">
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelected(f);
                                    }}
                                  >
                                    <Eye className="w-4 h-4 mr-2" />
                                    View
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => downloadFile(f)}>
                                    <Download className="w-4 h-4 mr-2" />
                                    Download
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setRenameTarget(f);
                                      setRenameValue(f.originalName);
                                      setRenameOpen(true);
                                    }}
                                  >
                                    <Pencil className="w-4 h-4 mr-2" />
                                    Rename
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setLinkTarget(f);
                                      setLinkKind('client');
                                      setLinkClientId(f.linkedType === 'client' ? f.linkedId : '');
                                      setLinkInvoiceId(f.linkedType === 'invoice' ? f.linkedId : '');
                                      setLinkOpen(true);
                                    }}
                                  >
                                    <Link2 className="w-4 h-4 mr-2" />
                                    Link to…
                                  </DropdownMenuItem>
                                  {f.linkedType ? (
                                    <DropdownMenuItem onClick={() => clearLink(f)}>
                                      <Unlink className="w-4 h-4 mr-2" />
                                      Remove link
                                    </DropdownMenuItem>
                                  ) : null}
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={() => openDeleteDialog(f)}
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </motion.tr>
                        ))
                      )}
                    </tbody>
                    {files.length > 0 && displayedFiles.length > 0 ? (
                      <tfoot>
                        <tr className="border-t-2 border-border bg-secondary/25">
                          <td colSpan={3} className="px-4 py-3 text-xs text-muted-foreground">
                            {tableListTotals.count === files.length ? (
                              <>
                                Total files:{' '}
                                <span className="font-semibold text-foreground tabular-nums">{tableListTotals.count}</span>
                              </>
                            ) : (
                              <>
                                Visible:{' '}
                                <span className="font-semibold text-foreground tabular-nums">{tableListTotals.count}</span>
                                <span> of </span>
                                <span className="font-semibold text-foreground tabular-nums">{files.length}</span>
                              </>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs font-semibold text-foreground tabular-nums whitespace-nowrap">
                            {formatBytes(tableListTotals.bytes)}
                          </td>
                          <td colSpan={3} className="px-4 py-3 text-xs text-muted-foreground text-right">
                            Total size (visible rows)
                          </td>
                        </tr>
                      </tfoot>
                    ) : null}
                  </table>
                </div>
              ) : (
                <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {files.length === 0 ? (
                    <div className="col-span-full text-center text-muted-foreground py-12">No files yet.</div>
                  ) : (
                    displayedFiles.map((f, i) => (
                      <motion.div
                        key={f.id}
                        role="button"
                        tabIndex={0}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.02 }}
                        onClick={() => setSelected(f)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelected(f);
                          }
                        }}
                        draggable
                        onDragStart={() => setDragFileId(f.id)}
                        onDragEnd={() => setDragFileId(null)}
                        className={`relative rounded-xl border p-3 text-left flex flex-col gap-2 transition-colors hover:bg-secondary/50 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                          selected?.id === f.id ? 'border-primary ring-1 ring-primary/40 bg-primary/5' : 'border-border bg-secondary/20'
                        } ${checkedIds.has(f.id) ? 'ring-1 ring-accent/50 bg-accent/10' : ''}`}
                      >
                        <div
                          className="absolute top-2 left-2 z-10"
                          onClick={(e) => e.stopPropagation()}
                          onPointerDown={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                        >
                          <Checkbox
                            checked={checkedIds.has(f.id)}
                            onCheckedChange={(c) => toggleFileChecked(f.id, c === true)}
                            aria-label={`Select ${f.originalName || 'file'}`}
                          />
                        </div>
                        <div className="flex justify-center py-4 mt-5">
                          {isImageType(f.fileType) ? (
                            <ImageIcon className="w-10 h-10 text-sky-400" />
                          ) : isPdfType(f.fileType) ? (
                            <FileText className="w-10 h-10 text-red-400" />
                          ) : (
                            <File className="w-10 h-10 text-muted-foreground" />
                          )}
                        </div>
                        <div className="text-xs font-medium text-foreground line-clamp-2 min-h-[2.5rem]">{f.originalName}</div>
                        <div className="text-[10px] text-muted-foreground flex justify-between gap-1">
                          <span>{formatBytes(f.fileSize)}</span>
                          <span className="truncate">{f.linkedLabel || '—'}</span>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              )}
            </div>

            {selected ? (
              <aside className="w-full lg:w-[380px] shrink-0 rounded-2xl border border-border bg-card flex flex-col max-h-[70vh] lg:max-h-[calc(100vh-220px)] overflow-hidden">
                <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-2">
                  <span className="font-semibold text-sm">Preview</span>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setSelected(null)} aria-label="Close panel">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <div className="p-4 space-y-3 overflow-y-auto flex-1">
                  <div>
                    <p className="text-sm font-medium text-foreground break-words">{selected.originalName}</p>
                    <p className="text-xs text-muted-foreground mt-1">{fileKindLabel(selected.fileType)} · {formatBytes(selected.fileSize)}</p>
                  </div>
                  <dl className="text-xs space-y-2 border-t border-border pt-3">
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">Uploaded by</dt>
                      <dd className="text-foreground text-right">{selected.uploadedByName || '—'}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">Uploaded</dt>
                      <dd className="text-foreground text-right">{selected.createdAt ? new Date(selected.createdAt).toLocaleString() : '—'}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">Linked</dt>
                      <dd className="text-foreground text-right break-words max-w-[200px]">{linkedCell(selected)}</dd>
                    </div>
                    {selected.tags ? (
                      <div className="flex justify-between gap-2">
                        <dt className="text-muted-foreground">Tags</dt>
                        <dd className="text-foreground text-right break-words max-w-[200px]">{selected.tags}</dd>
                      </div>
                    ) : null}
                  </dl>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => downloadFile(selected)}>
                      <Download className="w-3.5 h-3.5" />
                      Download
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      onClick={() => {
                        if (previewBlob) window.open(previewBlob, '_blank', 'noopener,noreferrer');
                        else downloadFile(selected);
                      }}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Open
                    </Button>
                  </div>
                  <div className="rounded-xl border border-border bg-background/50 min-h-[200px] flex items-center justify-center overflow-hidden">
                    {previewLoading ? (
                      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    ) : isImageType(selected.fileType) && previewBlob ? (
                      <img src={previewBlob} alt="" className="max-h-64 w-full object-contain" />
                    ) : isPdfType(selected.fileType) && previewBlob ? (
                      <iframe title="PDF preview" src={previewBlob} className="w-full h-72 border-0 bg-background" />
                    ) : (
                      <p className="text-xs text-muted-foreground px-4 text-center">No in-app preview for this type. Use Download.</p>
                    )}
                  </div>
                </div>
              </aside>
            ) : null}
          </div>
        </div>
      </div>

      <Dialog open={uploadOpen} onOpenChange={(o) => !uploading && setUploadOpen(o)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload files</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (uploading) return;
                runUpload(e.dataTransfer.files);
              }}
              className="rounded-xl border-2 border-dashed border-border bg-secondary/30 px-6 py-10 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => document.getElementById('fm-file-input')?.click()}
            >
              <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm font-medium text-foreground">Drop files here or click to upload</p>
              <p className="text-xs text-muted-foreground mt-1">Single file per upload · up to ~52 MB</p>
              <input
                id="fm-file-input"
                type="file"
                className="hidden"
                onChange={(e) => {
                  runUpload(e.target.files);
                  e.target.value = '';
                }}
              />
            </div>
            {uploading ? (
              <div className="space-y-2 rounded-lg border border-border p-3 bg-card">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span className="truncate pr-2">Uploading {uploadName}…</span>
                  <span>{uploadPct}%</span>
                </div>
                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full bg-primary transition-all duration-150" style={{ width: `${uploadPct}%` }} />
                </div>
                <Button type="button" variant="outline" size="sm" onClick={cancelUpload}>
                  Cancel upload
                </Button>
              </div>
            ) : null}
            <div className="space-y-2">
              <Label>Upload to folder</Label>
              <select
                value={uploadFolderId}
                onChange={(e) => setUploadFolderId(e.target.value)}
                disabled={uploading}
                className="h-10 w-full rounded-lg border border-border bg-input px-3 text-sm"
              >
                <option value="">Root</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fm-tags">Tags (optional)</Label>
              <Input
                id="fm-tags"
                placeholder="e.g. contract, 2026, signed"
                value={uploadTags}
                onChange={(e) => setUploadTags(e.target.value)}
                disabled={uploading}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Link while uploading (optional)</Label>
                <select
                  value={uploadLinkType}
                  onChange={(e) => setUploadLinkType(e.target.value)}
                  disabled={uploading}
                  className="h-10 w-full rounded-lg border border-border bg-input px-3 text-sm"
                >
                  <option value="">No link</option>
                  <option value="client">Client</option>
                  <option value="invoice">Invoice</option>
                </select>
              </div>
              {uploadLinkType === 'client' ? (
                <div className="space-y-2">
                  <Label>Client</Label>
                  <select
                    value={uploadLinkClient}
                    onChange={(e) => setUploadLinkClient(e.target.value)}
                    disabled={uploading}
                    className="h-10 w-full rounded-lg border border-border bg-input px-3 text-sm"
                  >
                    <option value="">Select…</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : uploadLinkType === 'invoice' ? (
                <div className="space-y-2">
                  <Label>Invoice</Label>
                  <select
                    value={uploadLinkInvoice}
                    onChange={(e) => setUploadLinkInvoice(e.target.value)}
                    disabled={uploading}
                    className="h-10 w-full rounded-lg border border-border bg-input px-3 text-sm"
                  >
                    <option value="">Select…</option>
                    {invoices.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoiceNumber || inv.id}
                        {inv.clientName ? ` · ${inv.clientName}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div />
              )}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setUploadOpen(false)} disabled={uploading}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename file</DialogTitle>
          </DialogHeader>
          <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} placeholder="Display name" />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRenameOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveRename}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open && !deleteSubmitting) closeDeleteDialog();
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete file?</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-lg font-semibold text-foreground">Are you sure?</p>
            <p className="text-base text-muted-foreground">
              This will permanently remove {deleteTarget?.originalName || 'this file'}. This cannot be undone.
            </p>
          </div>
          <div className="space-y-2 pt-1">
            <Label htmlFor="delete-file-confirm" className="text-base font-semibold text-foreground">
              Type DELETE to confirm
            </Label>
            <Input
              id="delete-file-confirm"
              value={deleteConfirmInput}
              onChange={(e) => setDeleteConfirmInput(e.target.value)}
              placeholder="DELETE"
              autoComplete="off"
              autoCapitalize="characters"
              disabled={deleteSubmitting}
              className="h-12 bg-input border-border font-mono tracking-wide"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeDeleteDialog} disabled={deleteSubmitting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={deleteFile}
              disabled={deleteSubmitting || deleteConfirmInput.trim() !== 'DELETE'}
            >
              {deleteSubmitting ? 'Deleting…' : 'Delete file'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={bulkDeleteOpen}
        onOpenChange={(open) => {
          if (!open && !bulkDeleteSubmitting) closeBulkDeleteDialog();
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete selected files?</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-lg font-semibold text-foreground">Are you sure?</p>
            <p className="text-base text-muted-foreground">
              This will permanently remove {checkedCount} file{checkedCount === 1 ? '' : 's'}. This cannot be undone.
            </p>
          </div>
          <div className="space-y-2 pt-1">
            <Label htmlFor="bulk-delete-file-confirm" className="text-base font-semibold text-foreground">
              Type DELETE to confirm
            </Label>
            <Input
              id="bulk-delete-file-confirm"
              value={bulkDeleteConfirmInput}
              onChange={(e) => setBulkDeleteConfirmInput(e.target.value)}
              placeholder="DELETE"
              autoComplete="off"
              autoCapitalize="characters"
              disabled={bulkDeleteSubmitting}
              className="h-12 bg-input border-border font-mono tracking-wide"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeBulkDeleteDialog} disabled={bulkDeleteSubmitting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={deleteCheckedFiles}
              disabled={bulkDeleteSubmitting || bulkDeleteConfirmInput.trim() !== 'DELETE'}
            >
              {bulkDeleteSubmitting ? 'Deleting…' : `Delete ${checkedCount} file${checkedCount === 1 ? '' : 's'}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={folderRenameOpen}
        onOpenChange={(open) => {
          if (!open && !folderRenameSubmitting) {
            setFolderRenameOpen(false);
            setFolderRenameTarget(null);
            setFolderRenameValue('');
          } else if (open) {
            setFolderRenameOpen(true);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="rename-folder-name">Folder name</Label>
            <Input
              id="rename-folder-name"
              value={folderRenameValue}
              onChange={(e) => setFolderRenameValue(e.target.value)}
              placeholder="Folder name"
              disabled={folderRenameSubmitting}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveFolderRename();
              }}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setFolderRenameOpen(false);
                setFolderRenameTarget(null);
                setFolderRenameValue('');
              }}
              disabled={folderRenameSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={saveFolderRename} disabled={folderRenameSubmitting || !folderRenameValue.trim()}>
              {folderRenameSubmitting ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={folderPasswordOpen}
        onOpenChange={(open) => {
          if (!open && !folderPasswordSubmitting) {
            setFolderPasswordOpen(false);
            setFolderPasswordTarget(null);
            setFolderPasswordValue('');
          } else if (open) {
            setFolderPasswordOpen(true);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set folder password</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label className="text-sm text-muted-foreground">Default uses your login password</Label>
            <div className="flex items-center gap-2">
              <Checkbox checked={folderPasswordUseLogin} onCheckedChange={(v) => setFolderPasswordUseLogin(v === true)} />
              <span className="text-sm">Use login password</span>
            </div>
            {!folderPasswordUseLogin ? (
              <div className="space-y-2">
                <Label htmlFor="folder-custom-password">Custom password</Label>
                <Input
                  id="folder-custom-password"
                  type="password"
                  value={folderPasswordValue}
                  onChange={(e) => setFolderPasswordValue(e.target.value)}
                  placeholder="At least 4 characters"
                  disabled={folderPasswordSubmitting}
                />
              </div>
            ) : null}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setFolderPasswordOpen(false)} disabled={folderPasswordSubmitting}>
              Cancel
            </Button>
            <Button onClick={saveFolderPassword} disabled={folderPasswordSubmitting || (!folderPasswordUseLogin && folderPasswordValue.trim().length < 4)}>
              {folderPasswordSubmitting ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={folderUnlockOpen}
        onOpenChange={(open) => {
          if (!open && !folderUnlockSubmitting) {
            setFolderUnlockOpen(false);
            setFolderUnlockTarget(null);
            setFolderUnlockValue('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter folder password</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Enter password to open {folderUnlockTarget?.name || 'this folder'}.</p>
            <Input
              type="password"
              value={folderUnlockValue}
              onChange={(e) => setFolderUnlockValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') unlockFolderAndOpen();
              }}
              placeholder="Password"
              disabled={folderUnlockSubmitting}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setFolderUnlockOpen(false)} disabled={folderUnlockSubmitting}>
              Cancel
            </Button>
            <Button onClick={unlockFolderAndOpen} disabled={folderUnlockSubmitting || !folderUnlockValue}>
              {folderUnlockSubmitting ? 'Opening…' : 'Open folder'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!folderDeleteTarget}
        onOpenChange={(open) => {
          if (!open && !folderDeleteSubmitting) closeFolderDeleteDialog();
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete folder?</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-lg font-semibold text-foreground">Are you sure?</p>
            <p className="text-base text-muted-foreground">
              Delete folder {folderDeleteTarget?.name || 'this folder'}? Files in this folder will be moved to Root.
            </p>
          </div>
          <div className="space-y-2 pt-1">
            <Label htmlFor="delete-folder-confirm" className="text-base font-semibold text-foreground">
              Type DELETE to confirm
            </Label>
            <Input
              id="delete-folder-confirm"
              value={folderDeleteInput}
              onChange={(e) => setFolderDeleteInput(e.target.value)}
              placeholder="DELETE"
              autoComplete="off"
              autoCapitalize="characters"
              disabled={folderDeleteSubmitting}
              className="h-12 bg-input border-border font-mono tracking-wide"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeFolderDeleteDialog} disabled={folderDeleteSubmitting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={deleteFolder}
              disabled={folderDeleteSubmitting || folderDeleteInput.trim() !== 'DELETE'}
            >
              {folderDeleteSubmitting ? 'Deleting…' : 'Delete folder'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={newFolderOpen} onOpenChange={(o) => !creatingFolder && setNewFolderOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="folder-name">Folder name</Label>
            <Input
              id="folder-name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="e.g. Contracts"
              disabled={creatingFolder}
              onKeyDown={(e) => {
                if (e.key === 'Enter') createFolder();
              }}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setNewFolderOpen(false)} disabled={creatingFolder}>
              Cancel
            </Button>
            <Button onClick={createFolder} disabled={creatingFolder || !newFolderName.trim()}>
              {creatingFolder ? 'Creating…' : 'Create folder'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link file</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Button type="button" size="sm" variant={linkKind === 'client' ? 'secondary' : 'outline'} onClick={() => setLinkKind('client')}>
                Client
              </Button>
              <Button type="button" size="sm" variant={linkKind === 'invoice' ? 'secondary' : 'outline'} onClick={() => setLinkKind('invoice')}>
                Invoice
              </Button>
            </div>
            {linkKind === 'client' ? (
              <select
                className="h-10 w-full rounded-lg border border-border bg-input px-3 text-sm"
                value={linkClientId}
                onChange={(e) => setLinkClientId(e.target.value)}
              >
                <option value="">Select client…</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            ) : (
              <select
                className="h-10 w-full rounded-lg border border-border bg-input px-3 text-sm"
                value={linkInvoiceId}
                onChange={(e) => setLinkInvoiceId(e.target.value)}
              >
                <option value="">Select invoice…</option>
                {invoices.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoiceNumber || inv.id}
                  </option>
                ))}
              </select>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setLinkOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveLink}>Save link</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FileManager;
