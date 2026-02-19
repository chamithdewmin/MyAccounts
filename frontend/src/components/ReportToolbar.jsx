import React from 'react';
import { RefreshCw, Download } from 'lucide-react';

const ReportToolbar = ({ onRefresh, onExportCSV, onDownloadPDF, disabled }) => {
  const buttonStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '7px',
    background: '#13161e',
    border: '1px solid #1e2433',
    borderRadius: '10px',
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: 600,
    color: '#fff',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transition: 'all 0.2s ease',
  };

  const hoverStyle = {
    background: '#1a1d27',
    borderColor: '#2a3347',
  };

  const [hovered, setHovered] = React.useState({ refresh: false, csv: false, pdf: false });

  return (
    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
      <button
        onClick={onRefresh}
        disabled={disabled}
        onMouseEnter={() => setHovered((p) => ({ ...p, refresh: true }))}
        onMouseLeave={() => setHovered((p) => ({ ...p, refresh: false }))}
        style={{
          ...buttonStyle,
          ...(hovered.refresh && !disabled ? hoverStyle : {}),
        }}
      >
        <RefreshCw className="w-4 h-4" style={{ display: 'block', flexShrink: 0 }} />
        <span>Refresh</span>
      </button>
      <button
        onClick={onExportCSV}
        disabled={disabled}
        onMouseEnter={() => setHovered((p) => ({ ...p, csv: true }))}
        onMouseLeave={() => setHovered((p) => ({ ...p, csv: false }))}
        style={{
          ...buttonStyle,
          ...(hovered.csv && !disabled ? hoverStyle : {}),
        }}
      >
        <Download className="w-4 h-4" style={{ display: 'block', flexShrink: 0 }} />
        <span>Export CSV</span>
      </button>
      <button
        onClick={onDownloadPDF}
        disabled={disabled}
        onMouseEnter={() => setHovered((p) => ({ ...p, pdf: true }))}
        onMouseLeave={() => setHovered((p) => ({ ...p, pdf: false }))}
        style={{
          ...buttonStyle,
          ...(hovered.pdf && !disabled ? hoverStyle : {}),
        }}
      >
        <Download className="w-4 h-4" style={{ display: 'block', flexShrink: 0 }} />
        <span>Download PDF</span>
      </button>
    </div>
  );
};

export default ReportToolbar;
