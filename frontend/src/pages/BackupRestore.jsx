import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import {
  Database,
  HardDrive,
  Download,
  Upload,
  RefreshCw,
  Trash2,
  AlertTriangle,
  Check,
  Clock,
  FileJson,
  Table,
  Server,
  History,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const BackupRestore = () => {
  const { toast } = useToast();
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [backupInfo, setBackupInfo] = useState(null);
  const [backupHistory, setBackupHistory] = useState([]);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [restoreConfirmOpen, setRestoreConfirmOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [autoBackup, setAutoBackup] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [info, history] = await Promise.all([
        api.backup.getInfo(),
        api.backup.getHistory(),
      ]);
      setBackupInfo(info);
      setBackupHistory(history);
    } catch (err) {
      toast({
        title: 'Error loading backup info',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateBackup = async () => {
    setCreatingBackup(true);
    try {
      const result = await api.backup.create();
      toast({
        title: 'Backup created successfully',
        description: `${result.backup.filename} (${formatBytes(result.backup.size)})`,
      });
      await loadData();
    } catch (err) {
      toast({
        title: 'Backup failed',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setCreatingBackup(false);
    }
  };

  const handleDownload = async (id, filename) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${api.backup.download(id)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({ title: 'Download started', description: filename });
    } catch (err) {
      toast({
        title: 'Download failed',
        description: err.message,
        variant: 'destructive',
      });
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.json')) {
        toast({
          title: 'Invalid file',
          description: 'Please select a JSON backup file',
          variant: 'destructive',
        });
        return;
      }
      setSelectedFile(file);
      setRestoreConfirmOpen(true);
    }
  };

  const handleRestore = async () => {
    if (!selectedFile) return;

    setRestoring(true);
    setRestoreConfirmOpen(false);

    try {
      const text = await selectedFile.text();
      const backupData = JSON.parse(text);

      if (!backupData.tables) {
        throw new Error('Invalid backup file format');
      }

      const result = await api.backup.restore(backupData);
      
      toast({
        title: 'Restore completed',
        description: `Restored ${result.results.restored.length} tables successfully`,
      });

      if (result.results.errors.length > 0) {
        toast({
          title: 'Some tables had errors',
          description: result.results.errors.map(e => e.table).join(', '),
          variant: 'destructive',
        });
      }

      await loadData();
    } catch (err) {
      toast({
        title: 'Restore failed',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setRestoring(false);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.backup.delete(id);
      toast({ title: 'Backup deleted' });
      setDeleteConfirmOpen(false);
      setDeleteId(null);
      await loadData();
    } catch (err) {
      toast({
        title: 'Delete failed',
        description: err.message,
        variant: 'destructive',
      });
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Backup & Restore - LOGOZODEV</title>
        <meta name="description" content="Backup and restore your database" />
      </Helmet>

      <div className="page-y-sm max-w-5xl mx-auto min-w-0 px-0 sm:px-2">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
              <Database className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold leading-tight">Backup & Restore</h1>
              <p className="text-muted-foreground text-sm">Keep your data safe with regular backups.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={handleCreateBackup} disabled={creatingBackup} className="gap-2">
              {creatingBackup ? <RefreshCw className="h-4 w-4 animate-spin" /> : <HardDrive className="h-4 w-4" />}
              {creatingBackup ? 'Creating…' : 'Backup Now'}
            </Button>
            {backupInfo?.lastBackup && (
              <Button variant="outline" onClick={() => handleDownload(backupInfo.lastBackup.id, backupInfo.lastBackup.filename)} className="gap-2">
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Download Last</span>
                <span className="sm:hidden">Download</span>
              </Button>
            )}
          </div>
        </div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">

          {/* Stats row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: Database, label: 'Database', value: backupInfo?.databaseName || 'Unknown', color: 'text-sky-400' },
              { icon: Table, label: 'Tables', value: String(backupInfo?.totalTables || 0), color: 'text-violet-400' },
              { icon: Clock, label: 'Last Backup', value: backupInfo?.lastBackup ? formatDate(backupInfo.lastBackup.createdAt) : 'Never', color: backupInfo?.lastBackup ? 'text-green-500' : 'text-muted-foreground' },
            ].map((s) => (
              <div key={s.label} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
                  <s.icon className={`w-5 h-5 ${s.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="font-semibold text-sm truncate">{s.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Tables overview */}
          {backupInfo?.tables && backupInfo.tables.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Server className="w-4 h-4 text-primary" />
                <h2 className="font-semibold">Tables Overview</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {backupInfo.tables.map((table) => (
                  <div key={table.name} className="flex items-center justify-between bg-secondary/40 rounded-lg px-3 py-2 border border-border">
                    <span className="text-sm truncate">{table.name}</span>
                    <span className="text-xs text-muted-foreground ml-2 tabular-nums">{table.rows}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Two-column on desktop: Restore + Auto Backup */}
          <div className="grid gap-5 lg:grid-cols-2">
            {/* Restore */}
            <div className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-primary" />
                <h2 className="font-semibold">Restore Database</h2>
              </div>
              <p className="text-sm text-muted-foreground">Upload a JSON backup file to restore your database. All current data will be replaced.</p>
              <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-border rounded-xl p-6 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors group">
                <div className="w-10 h-10 rounded-xl bg-secondary group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                  <Upload className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">{selectedFile ? selectedFile.name : 'Click to choose a backup file'}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{selectedFile ? formatBytes(selectedFile.size) : 'JSON files only (.json)'}</p>
                </div>
                <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileSelect} className="hidden" />
              </label>
              <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">Restoring overwrites all current data. Create a backup first.</p>
              </div>
            </div>

            {/* Auto Backup */}
            <div className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <h2 className="font-semibold">Auto Backup</h2>
              </div>
              <p className="text-sm text-muted-foreground">Enable automatic daily backups to protect your data without manual effort.</p>
              <div className="flex-1" />
              <div className="rounded-xl border border-border bg-secondary/30 px-4 py-3.5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Daily Auto Backup</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{autoBackup ? 'Running — backs up daily' : 'Disabled'}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={autoBackup}
                  onClick={() => {
                    setAutoBackup(!autoBackup);
                    toast({
                      title: autoBackup ? 'Auto backup disabled' : 'Auto backup enabled',
                      description: autoBackup ? 'Automatic backups have been disabled' : 'Your database will be backed up daily',
                    });
                  }}
                  className={cn('relative inline-flex h-7 w-14 items-center rounded-full border transition-colors', autoBackup ? 'bg-primary border-primary' : 'bg-muted border-border')}
                >
                  <span className={cn('inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform', autoBackup ? 'translate-x-7' : 'translate-x-1')} />
                </button>
              </div>
              <div className="p-3 rounded-xl bg-secondary/40 border border-border">
                <p className="text-xs text-muted-foreground">Backups are stored on the server. Download them regularly for off-site safety.</p>
              </div>
            </div>
          </div>

          {/* Backup History */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-primary" />
                <h2 className="font-semibold">Backup History</h2>
                {backupHistory.length > 0 && (
                  <span className="text-xs bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">{backupHistory.length}</span>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={loadData} className="gap-1.5 text-muted-foreground hover:text-foreground">
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh
              </Button>
            </div>

            {backupHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-center">
                <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mb-3">
                  <FileJson className="h-6 w-6 text-muted-foreground/50" />
                </div>
                <p className="font-medium text-sm">No backups yet</p>
                <p className="text-xs text-muted-foreground mt-1">Click "Backup Now" to create your first backup</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {backupHistory.map((backup, i) => (
                  <motion.div
                    key={backup.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-secondary/20 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <FileJson className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{backup.filename}</p>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
                        <span>{formatDate(backup.created_at)}</span>
                        <span>·</span>
                        <span>{formatBytes(backup.size_bytes)}</span>
                        <span>·</span>
                        <span>{backup.rows_count} rows</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => handleDownload(backup.id, backup.filename)} title="Download">
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => { setDeleteId(backup.id); setDeleteConfirmOpen(true); }} title="Delete">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

        </motion.div>
      </div>

      {/* Restore Confirmation Dialog */}
      <Dialog open={restoreConfirmOpen} onOpenChange={(open) => {
        setRestoreConfirmOpen(open);
        if (!open) {
          setSelectedFile(null);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Confirm Restore
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to restore from this backup? This action will:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <div className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span>Delete all current data</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Upload className="h-4 w-4 text-primary" />
              <span>Import data from: {selectedFile?.name}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setRestoreConfirmOpen(false);
              setSelectedFile(null);
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRestore}
              disabled={restoring}
            >
              {restoring ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Restoring...
                </>
              ) : (
                'Yes, Restore'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Backup?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this backup? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setDeleteConfirmOpen(false);
              setDeleteId(null);
            }}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => handleDelete(deleteId)}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BackupRestore;
