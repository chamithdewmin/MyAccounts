import { useState, useEffect, useMemo } from "react";
import { Calendar, Download, ChevronDown } from "lucide-react";

const getColors = () => {
  const isDark = document.documentElement.classList.contains('dark');
  return {
    bg: isDark ? "#000000" : "#f8fafc",
    card: isDark ? "#0a0a0a" : "#ffffff",
    border: isDark ? "#171717" : "#e2e8f0",
    text: isDark ? "#fff" : "#0f172a",
    muted: isDark ? "#8b9ab0" : "#64748b",
    blue: "#0e5cff",
  };
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function MonthYearFilter({ 
  selectedMonth, 
  selectedYear, 
  onMonthChange, 
  onYearChange,
  onDownload,
  showDownloadButton = true,
  autoDownload = false,
}) {
  const [colors, setColors] = useState(getColors);
  const C = colors;

  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  const years = useMemo(() => {
    const yrs = [];
    for (let y = currentYear; y >= currentYear - 5; y--) {
      yrs.push(y);
    }
    return yrs;
  }, [currentYear]);

  useEffect(() => {
    const updateColors = () => setColors(getColors());
    window.addEventListener('theme-change', updateColors);
    return () => window.removeEventListener('theme-change', updateColors);
  }, []);

  useEffect(() => {
    if (selectedMonth === null || selectedMonth === undefined) {
      onMonthChange(currentMonth);
    }
    if (selectedYear === null || selectedYear === undefined) {
      onYearChange(currentYear);
    }
  }, []);

  const handleMonthChange = (month) => {
    onMonthChange(month);
    if (autoDownload && onDownload) {
      setTimeout(() => onDownload(), 100);
    }
  };

  const handleYearChange = (year) => {
    onYearChange(year);
  };

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
      {/* Left side - Filter controls */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Calendar size={18} color={C.muted} />
          <span style={{ color: C.muted, fontSize: 13, fontWeight: 500 }}>Filter by:</span>
        </div>

        {/* Month Select */}
        <div style={{ position: "relative" }}>
          <select
            value={selectedMonth ?? currentMonth}
            onChange={(e) => handleMonthChange(parseInt(e.target.value))}
            style={{
              appearance: "none",
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              padding: "9px 36px 9px 14px",
              color: C.text,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              minWidth: 140,
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {MONTHS.map((month, index) => (
              <option key={month} value={index}>
                {month}
              </option>
            ))}
          </select>
          <ChevronDown
            size={16}
            color={C.muted}
            style={{
              position: "absolute",
              right: 12,
              top: "50%",
              transform: "translateY(-50%)",
              pointerEvents: "none",
            }}
          />
        </div>

        {/* Year Select */}
        <div style={{ position: "relative" }}>
          <select
            value={selectedYear ?? currentYear}
            onChange={(e) => handleYearChange(parseInt(e.target.value))}
            style={{
              appearance: "none",
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              padding: "9px 36px 9px 14px",
              color: C.text,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              minWidth: 100,
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
          <ChevronDown
            size={16}
            color={C.muted}
            style={{
              position: "absolute",
              right: 12,
              top: "50%",
              transform: "translateY(-50%)",
              pointerEvents: "none",
            }}
          />
        </div>
      </div>

      {/* Right side - Current Period & Download Button */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {/* Current Period Display */}
        <div
          style={{
            background: `${C.blue}15`,
            border: `1px solid ${C.blue}30`,
            borderRadius: 8,
            padding: "8px 14px",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span style={{ color: C.blue, fontSize: 12, fontWeight: 600 }}>
            {MONTHS[selectedMonth ?? currentMonth]} {selectedYear ?? currentYear}
          </span>
        </div>

        {/* Download Button */}
        {showDownloadButton && onDownload && (
          <button
            onClick={onDownload}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: C.blue,
              border: "none",
              borderRadius: 8,
              padding: "9px 16px",
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "'Inter', sans-serif",
              transition: "opacity 0.2s",
            }}
            onMouseEnter={(e) => (e.target.style.opacity = "0.9")}
            onMouseLeave={(e) => (e.target.style.opacity = "1")}
          >
            <Download size={16} />
            <span>Download Report</span>
          </button>
        )}
      </div>
    </div>
  );
}

export function filterDataByMonth(data, month, year, dateField = "date") {
  if (month === null || month === undefined || year === null || year === undefined) {
    return data;
  }
  return data.filter((item) => {
    const itemDate = new Date(item[dateField]);
    return itemDate.getMonth() === month && itemDate.getFullYear() === year;
  });
}

export function getMonthName(month) {
  return MONTHS[month] || "";
}
