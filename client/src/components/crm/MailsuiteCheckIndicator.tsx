import React, { useEffect, useId, useRef, useState } from "react";
import { AlertCircle, Clock, FileText, MousePointerClick } from "lucide-react";
import {
  MAILSUITE_COLOR_GRAY,
  MAILSUITE_COLOR_GREEN,
  MAILSUITE_COLOR_RED,
  resolveMailsuiteVisualStatus,
  type MailsuiteStatusInput,
} from "@shared/mailsuiteStatus";

export interface MailsuiteCheckIndicatorProps extends MailsuiteStatusInput {
  compact?: boolean;
  className?: string;
}

export default function MailsuiteCheckIndicator({
  status,
  openCount,
  clickCount,
  firstOpenedAt,
  lastOpenedAt,
  sentAt,
  scheduledFor,
  errorMessage,
  compact = false,
  className = "",
}: MailsuiteCheckIndicatorProps) {
  const tooltipId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<number | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const resolved = resolveMailsuiteVisualStatus({
    status,
    openCount,
    clickCount,
    firstOpenedAt,
    lastOpenedAt,
    sentAt,
    scheduledFor,
    errorMessage,
  });

  const clearHideTimer = () => {
    if (hideTimerRef.current !== null && typeof window !== "undefined") {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  };

  const applyFallbackPosition = () => {
    const trigger = triggerRef.current;
    const popover = popoverRef.current;
    if (!trigger || !popover || typeof window === "undefined") return;
    if (typeof CSS !== "undefined" && CSS.supports("position-area: block-start")) {
      return;
    }
    const rect = trigger.getBoundingClientRect();
    const maxWidth = 288;
    const clampedLeft = Math.max(
      12,
      Math.min(rect.left, window.innerWidth - maxWidth - 12),
    );
    const estimatedTop = rect.top > 130 ? rect.top - 8 : rect.bottom + 8;
    popover.style.setProperty("--tooltip-fallback-left", `${Math.round(clampedLeft)}px`);
    popover.style.setProperty("--tooltip-fallback-top", `${Math.round(estimatedTop)}px`);
    popover.dataset.fallbackSide = rect.top > 130 ? "above" : "below";
  };

  const openPopover = () => {
    clearHideTimer();
    const popover = popoverRef.current;
    if (!popover) return;
    applyFallbackPosition();
    if ("showPopover" in popover && typeof (popover as any).showPopover === "function") {
      try {
        if (!popover.matches(":popover-open")) {
          (popover as any).showPopover({ source: triggerRef.current });
        }
        setIsOpen(true);
      } catch {
        try {
          if (!popover.matches(":popover-open")) {
            (popover as any).showPopover();
          }
          setIsOpen(true);
        } catch {
          setIsOpen(true);
        }
      }
    } else {
      setIsOpen(true);
    }
  };

  const scheduleClosePopover = () => {
    clearHideTimer();
    if (typeof window === "undefined") return;
    hideTimerRef.current = window.setTimeout(() => {
      const popover = popoverRef.current;
      if (!popover) return;
      if ("hidePopover" in popover && typeof (popover as any).hidePopover === "function") {
        try {
          if (popover.matches(":popover-open")) {
            (popover as any).hidePopover();
          }
        } catch {
          // noop
        }
      }
      setIsOpen(false);
    }, 140);
  };

  useEffect(() => {
    const popover = popoverRef.current;
    if (!popover || typeof document === "undefined") return;

    const probe = document.createElement("div");
    let supportsHint = false;
    try {
      (probe as any).popover = "hint";
      supportsHint = (probe as any).popover === "hint";
    } catch {
      supportsHint = false;
    }

    const handleBeforeToggle = (event: any) => {
      if (!supportsHint && event?.newState === "open" && popover.getAttribute("popover") === "hint") {
        popover.setAttribute("popover", "auto");
      }
      if (event?.newState === "open") {
        applyFallbackPosition();
      }
    };

    const handleToggle = (event: any) => {
      setIsOpen(event?.newState === "open");
    };

    popover.addEventListener("beforetoggle", handleBeforeToggle);
    popover.addEventListener("toggle", handleToggle);

    return () => {
      clearHideTimer();
      popover.removeEventListener("beforetoggle", handleBeforeToggle);
      popover.removeEventListener("toggle", handleToggle);
    };
  }, []);

  const badgeToneClass =
    resolved.state === "opened_read"
      ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
      : resolved.state === "sent_unread"
        ? "bg-zinc-900/80 border-zinc-700/80 text-zinc-200"
        : resolved.state === "error"
          ? "bg-rose-500/15 border-rose-500/40 text-rose-300"
          : "bg-secondary/80 border-border text-zinc-300";

  return (
    <span className={`inline-flex items-center gap-1.5 flex-wrap ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={isOpen}
        aria-label={resolved.tooltipText}
        {...({
          interestfor: tooltipId,
          popovertarget: tooltipId,
          popovertargetaction: "show",
        } as any)}
        onMouseEnter={openPopover}
        onMouseLeave={scheduleClosePopover}
        onFocus={openPopover}
        onBlur={scheduleClosePopover}
        onClick={(e) => {
          e.stopPropagation();
          if (isOpen) {
            scheduleClosePopover();
          } else {
            openPopover();
          }
        }}
        data-mailsuite-state={resolved.state}
        className={`inline-flex items-center gap-1.5 rounded-lg border font-bold transition-colors cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-primary ${
          compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]"
        } ${badgeToneClass}`}
      >
        {resolved.checkCount === 2 ? (
          <svg
            viewBox="0 0 22 14"
            width="20"
            height="13"
            fill="none"
            aria-hidden="true"
            className="shrink-0"
          >
            <path
              d="M1.5 7.5L5.5 11.5L13 3"
              stroke={resolved.firstCheckColor || MAILSUITE_COLOR_GREEN}
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M8.5 7.5L12.5 11.5L20 3"
              stroke={resolved.secondCheckColor || MAILSUITE_COLOR_GRAY}
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : resolved.iconType === "clock" ? (
          <Clock
            className="w-3.5 h-3.5 shrink-0"
            style={{ color: MAILSUITE_COLOR_GRAY }}
            aria-hidden="true"
          />
        ) : resolved.iconType === "draft" ? (
          <FileText
            className="w-3.5 h-3.5 shrink-0"
            style={{ color: MAILSUITE_COLOR_GRAY }}
            aria-hidden="true"
          />
        ) : (
          <AlertCircle
            className="w-3.5 h-3.5 shrink-0"
            style={{ color: MAILSUITE_COLOR_RED }}
            aria-hidden="true"
          />
        )}
        <span>{resolved.shortLabel}</span>
      </button>

      <div
        ref={popoverRef}
        id={tooltipId}
        role="tooltip"
        {...({ popover: "hint" } as any)}
        onMouseEnter={clearHideTimer}
        onMouseLeave={scheduleClosePopover}
        className="vecy-mailsuite-tooltip"
      >
        <div className="flex items-center gap-1.5 font-black text-[11px] text-white mb-1">
          <span
            className="inline-block w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: resolved.iconColor }}
            aria-hidden="true"
          />
          <span>{resolved.tooltipTitle}</span>
        </div>
        <div className="space-y-0.5 text-[11px] leading-snug text-zinc-300">
          {resolved.tooltipLines.map((line, idx) => (
            <div key={idx}>{line}</div>
          ))}
        </div>
      </div>

      {resolved.clickCount > 0 && (
        <span
          className={`inline-flex items-center gap-1 rounded-lg bg-cyan-500/15 border border-cyan-500/35 text-cyan-300 font-bold whitespace-nowrap ${
            compact ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-[10px]"
          }`}
          title={`${resolved.clickCount} ${
            resolved.clickCount === 1 ? "clic" : "clics"
          } registrados en enlaces`}
        >
          <MousePointerClick className="w-3 h-3" aria-hidden="true" />
          {resolved.clickCount}
        </span>
      )}
    </span>
  );
}
