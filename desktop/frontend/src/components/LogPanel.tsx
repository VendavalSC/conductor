import React, { useEffect, useRef, useState, useMemo } from "react";
import type { LogEntry } from "../types/wails";
import { TerminalIcon, SearchIcon, ClearIcon } from "./Icons";

const serviceColors: Record<string, string> = {
  cyan: "text-cyan-400",
  green: "text-emerald-400",
  yellow: "text-amber-400",
  magenta: "text-pink-400",
  blue: "text-blue-400",
  red: "text-red-400",
  orange: "text-orange-400",
  purple: "text-violet-400",
};

const serviceColorsBg: Record<string, string> = {
  cyan: "bg-cyan-400",
  green: "bg-emerald-400",
  yellow: "bg-amber-400",
  magenta: "bg-pink-400",
  blue: "bg-blue-400",
  red: "bg-red-400",
  orange: "bg-orange-400",
  purple: "bg-violet-400",
};

interface LogPanelProps {
  logs: LogEntry[];
  filter: string | null;
  serviceColorMap: Record<string, string>;
}

export function LogPanel({ logs, filter, serviceColorMap }: LogPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(true);
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const filtered = useMemo(() => {
    let result = filter ? logs.filter((l) => l.service === filter) : logs;
    if (search) {
      const lower = search.toLowerCase();
      result = result.filter(
        (l) => l.text.toLowerCase().includes(lower) || l.service.toLowerCase().includes(lower)
      );
    }
    return result;
  }, [logs, filter, search]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    autoScrollRef.current = scrollHeight - scrollTop - clientHeight < 48;
  };

  useEffect(() => {
    if (autoScrollRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [filtered.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        e.preventDefault();
        setShowSearch(true);
      }
      if (e.key === "Escape") {
        setShowSearch(false);
        setSearch("");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="flex-1 flex flex-col min-h-0 relative">
      {/* Search bar */}
      {showSearch && (
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-conductor-border-subtle bg-conductor-surface/60 animate-slide-up">
          <SearchIcon size={12} className="text-conductor-muted shrink-0" />
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter logs..."
            className="flex-1 bg-transparent text-[11px] text-conductor-text placeholder:text-conductor-muted/50 outline-none font-mono"
          />
          {search && (
            <span className="text-[10px] text-conductor-muted tabular-nums shrink-0">
              {filtered.length} match{filtered.length !== 1 ? "es" : ""}
            </span>
          )}
          <button
            onClick={() => { setShowSearch(false); setSearch(""); }}
            className="p-1 rounded hover:bg-white/[0.04] text-conductor-muted hover:text-conductor-dim transition-colors"
          >
            <ClearIcon size={12} />
          </button>
        </div>
      )}

      {/* Log content */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto font-mono text-[11px] leading-[1.65]"
      >
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 select-none">
            <div className="w-12 h-12 rounded-2xl bg-conductor-surface-2 border border-conductor-border flex items-center justify-center">
              <TerminalIcon size={20} className="text-conductor-muted" />
            </div>
            <div className="text-center">
              <p className="text-[13px] text-conductor-dim font-medium font-sans">
                {search
                  ? "No matching logs"
                  : filter
                  ? `No output from ${filter}`
                  : "Waiting for output"}
              </p>
              <p className="text-[11px] text-conductor-muted font-sans mt-1">
                {search
                  ? "Try a different search term"
                  : filter
                  ? "Select a different service or check if it's running"
                  : "Start services to see logs here"}
              </p>
            </div>
          </div>
        ) : (
          <div className="py-1">
            {filtered.map((log, i) => {
              const colorName = serviceColorMap[log.service] || "";
              const textClass = serviceColors[colorName] || "text-conductor-dim";
              const dotClass = serviceColorsBg[colorName] || "bg-conductor-dim";

              return (
                <div
                  key={i}
                  className="flex items-start gap-0 px-1 py-[1px] hover:bg-white/[0.015] group transition-colors duration-75"
                >
                  {/* Line number */}
                  <span className="log-gutter w-[38px] shrink-0 text-[10px] pr-2 pt-[1px]">
                    {i + 1}
                  </span>

                  {/* Timestamp */}
                  <span className="text-conductor-muted/25 w-[52px] shrink-0 text-[10px] tabular-nums select-none group-hover:text-conductor-muted/40 transition-colors pt-[1px]">
                    {log.timestamp}
                  </span>

                  {/* Service indicator dot + name */}
                  <span className="flex items-center gap-1.5 w-[80px] shrink-0 pt-[3px]">
                    <span className={`w-[5px] h-[5px] rounded-full ${dotClass} opacity-60 shrink-0`} />
                    <span className={`text-[10px] font-semibold truncate ${textClass}`}>
                      {log.service}
                    </span>
                  </span>

                  {/* Log text */}
                  <span
                    className={`min-w-0 break-all ${
                      log.isStderr
                        ? "text-red-400/70 group-hover:text-red-400/90"
                        : "text-conductor-text/50 group-hover:text-conductor-text/70"
                    } transition-colors`}
                  >
                    {log.text}
                  </span>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>
    </div>
  );
}
