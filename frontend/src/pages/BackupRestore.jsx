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
        <title>Backup & Restore - MyAccounts</title>
        <meta name="description" content="Backup and restore your database" />
      </Helmet>

      <div className="space-y-4 sm:space-y-6 max-w-5xl mx-auto min-w-0 px-0 sm:px-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Backup & Restore</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Manage database backups and restore data
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Database Information */}
          <div className="bg-card rounded-lg p-6 border border-border">
            <div className="flex items-center gap-2 mb-4">
              <Server className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Database Information</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-secondary/30 rounded-lg p-4 border border-border">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Database className="w-4 h-4" />
                  <span className="text-sm">Database Name</span>
                </div>
                <p className="text-lg font-semibold">{backupInfo?.databaseName || 'Unknown'}</p>
              </div>

              <div className="bg-secondary/30 rounded-lg p-4 border border-border">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Table className="w-4 h-4" />
                  <span className="text-sm">Total Tables</span>
                </div>
                <p className="text-lg font-semibold">{backupInfo?.totalTables || 0}</p>
              </div>

              <div className="bg-secondary/30 rounded-lg p-4 border border-border">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">Last Backup</span>
                </div>
                <p className="text-lg font-semibold">
                  {backupInfo?.lastBackup
                    ? formatDate(backupInfo.lastBackup.createdAt)
                    : 'Never'}
                </p>
              </div>
            </div>

            {/* Tables Info */}
            {backupInfo?.tables && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Tables Overview</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {backupInfo.tables.map((table) => (
                    <div
                      key={table.name}
                      className="flex items-center justify-between bg-background rounded-lg px-3 py-2 border border-border"
                    >
                      <span className="text-sm truncate">{table.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">{table.rows}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={handleCreateBackup}
                disabled={creatingBackup}
                className="gap-2"
              >
                {creatingBackup ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <HardDrive className="h-4 w-4" />
                )}
                {creatingBackup ? 'Creating Backup...' : 'Backup Now'}
              </Button>

              {backupInfo?.lastBackup && (
                <Button
                  variant="outline"
                  onClick={() => handleDownload(backupInfo.lastBackup.id, backupInfo.lastBackup.filename)}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download Last Backup
                </Button>
              )}
            </div>
          </div>

          {/* Restore Database */}
          <div className="bg-card rounded-lg p-6 border border-border">
            <div className="flex items-center gap-2 mb-4">
              <Upload className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Restore Database</h2>
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              Select a backup file to restore your database. This will overwrite current data.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="flex-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  className="block w-full text-sm text-muted-foreground
                    file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0
                    file:text-sm file:font-semibold file:bg-primary file:text-white 
                    hover:file:bg-primary/90 file:cursor-pointer"
                />
              </div>
            </div>

            <div className="mt-4 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-500">Warning</p>
                <p className="text-sm text-muted-foreground">
                  Restoring a backup will overwrite all current data. Make sure to create a backup of your current data before restoring.
                </p>
              </div>
            </div>
          </div>

          {/* Auto Backup Settings */}
          <div className="bg-card rounded-lg p-6 border border-border">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Auto Backup Settings</h2>
            </div>

            <div className="rounded-lg border border-border bg-secondary/30 px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Auto Backup</p>
                <p className="text-xs text-muted-foreground">Automatically backup database daily</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={autoBackup}
                onClick={() => {
                  setAutoBackup(!autoBackup);
                  toast({
                    title: autoBackup ? 'Auto backup disabled' : 'Auto backup enabled',
                    description: autoBackup 
                      ? 'Automatic backups have been disabled' 
                      : 'Your database will be backed up daily',
                  });
                }}
                className={cn(
                  'relative inline-flex h-7 w-14 items-center rounded-full border transition-colors',
                  autoBackup ? 'bg-primary border-primary' : 'bg-muted border-border',
                )}
              >
                <span className={cn(
                  'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform',
                  autoBackup ? 'translate-x-7' : 'translate-x-1',
                )} />
              </button>
            </div>
          </div>

          {/* Backup History */}
          <div className="bg-card rounded-lg p-6 border border-border">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">Backup History</h2>
              </div>
              <Button variant="ghost" size="sm" onClick={loadData} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            </div>

            {backupHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileJson className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No backups found</p>
                <p className="text-sm">Create your first backup to get started</p>
              </div>
            ) : (
              <div className="space-y-2">
                {backupHistory.map((backup) => (
                  <div
                    key={backup.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 border border-border hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <FileJson className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{backup.filename}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          <span>{formatDate(backup.created_at)}</span>
                          <span>•</span>
                          <span>{formatBytes(backup.size_bytes)}</span>
                          <span>•</span>
                          <span>{backup.rows_count} rows</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownload(backup.id, backup.filename)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setDeleteId(backup.id);
                          setDeleteConfirmOpen(true);
                        }}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
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
