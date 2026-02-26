import { RefreshCw, Download } from "lucide-react";

/**
 * Shared layout for report pages (Overview, P&L, Cash Flow, Tax, Balance Sheet).
 * Renders title, subtitle, toolbar (Refresh, Export CSV, Download PDF), and children.
 * Download PDF should open the existing ReportPreviewModal (call onDownloadPdf from parent).
 */
export default function ReportLayout({
  title,
  subtitle,
  children,
  onRefresh,
  onExportCsv,
  onDownloadPdf,
}) {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
        {/* Page title & subtitle */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>

        {/* Toolbar: Refresh, Export CSV, Download PDF */}
        <div className="flex justify-end">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onRefresh ?? (() => window.location.reload())}
              className="inline-flex items-center gap-2 rounded-lg border border-[hsl(var(--border))] bg-card px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-accent/50 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            <button
              type="button"
              onClick={onExportCsv ?? (() => {})}
              className="inline-flex items-center gap-2 rounded-lg border border-[hsl(var(--border))] bg-card px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-accent/50 transition-colors"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
            <button
              type="button"
              onClick={onDownloadPdf}
              className="inline-flex items-center gap-2 rounded-lg border border-[hsl(var(--border))] bg-card px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-accent/50 transition-colors"
            >
              <Download className="h-4 w-4" />
              Download PDF
            </button>
          </div>
        </div>

        {children}
      </div>
    </div>
  );
}
