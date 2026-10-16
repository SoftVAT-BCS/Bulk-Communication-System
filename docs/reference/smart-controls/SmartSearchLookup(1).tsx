"use client";

import type { CSSProperties, KeyboardEvent, ReactNode } from "react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";


export type SmartLookupColumn<T> = {
    key: string;
    header: string;
    render: (row: T) => ReactNode;
    className?: string;
    width?: number;
    text?: (row: T) => string;
};

export type SmartSearchLookupProps<T extends { id: string }> = {
    label: string;
    hideLabel?: boolean;
    clearable?: boolean;
    id?: string;
    name?: string;
    required?: boolean;
    invalid?: boolean;
    className?: string;
    isOptionDisabled?: (row: T) => boolean;
    searchDebounceMs?: number;
    valueLabel: string;
    placeholder?: string;
    searchPlaceholder?: string;
    helperText?: string;
    disabled?: boolean;
    minChars?: number;
    multi?: boolean;
    rows: T[];
    columns?: SmartLookupColumn<T>[];
    selectedRows?: T[];
    isLoading?: boolean;
    errorMessage?: string;
    emptyMessage?: string;
    maxVisibleRows?: number;
    getSearchText?: (row: T) => string;
    getOptionLabel?: (row: T) => ReactNode;
    onSearch?: (query: string) => void;
    onSelect: (row: T) => void;
    onClear: () => void;
    onFormReset?: () => void;
};

type PopupPlacement = "bottom" | "top";

type PopupPosition = {
    left: number;
    top: number;
    width: number;
    maxHeight: number;
    placement: PopupPlacement;
};

const EMPTY_ROWS: never[] = [];
const VIEWPORT_GAP = 12;
const POPUP_GAP = 8;
const MIN_POPUP_WIDTH = 280;
const MIN_POPUP_HEIGHT = 190;
const MAX_POPUP_HEIGHT = 430;
const PAGE_JUMP_SIZE = 6;

function normalizeSearch(value: string) {
    return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function clampNumber(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
}

function getDropdownButtonTitle(isOpen: boolean) {
    return isOpen ? "Close dropdown" : "Open dropdown";
}

export default function SmartSearchLookup<T extends { id: string }>({
    label,
    hideLabel = false,
    clearable = true,
    id,
    name,
    required = false,
    invalid = false,
    className = "",
    isOptionDisabled,
    searchDebounceMs = 250,
    valueLabel,
    placeholder = "Select",
    searchPlaceholder = "Type to filter loaded rows...",
    helperText,
    disabled = false,
    minChars = 0,
    multi = false,
    rows,
    columns: suppliedColumns = EMPTY_ROWS,
    selectedRows = EMPTY_ROWS,
    isLoading = false,
    errorMessage = "",
    emptyMessage = "No records found.",
    maxVisibleRows = 100,
    getSearchText,
    getOptionLabel,
    onSearch,
    onSelect,
    onClear,
    onFormReset,
}: SmartSearchLookupProps<T>) {
    const labelId = useId();
    const generatedInputId = useId();
    const inputId = id || generatedInputId;
    const listboxId = useId();

    const wrapperRef = useRef<HTMLDivElement | null>(null);
    const popupRef = useRef<HTMLDivElement | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);
    const mobileInputRef = useRef<HTMLInputElement | null>(null);
    const listRef = useRef<HTMLDivElement | null>(null);
    const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
    const lastInteractionRef = useRef<"keyboard" | "pointer">("keyboard");

    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [activeIndex, setActiveIndex] = useState(-1);
    const [popupPosition, setPopupPosition] = useState<PopupPosition | null>(null);
    const [isMobileSheet, setIsMobileSheet] = useState(false);

    useEffect(() => {
        const form = wrapperRef.current?.closest("form");
        const reset = () => { closeDropdown(); onFormReset?.(); };
        form?.addEventListener("reset", reset);
        return () => form?.removeEventListener("reset", reset);
    }, [onFormReset]);

    const sourceRows = useMemo(() => rows || [], [rows]);

    const selectedIdSet = useMemo(() => {
        return new Set(selectedRows.map((row) => row.id));
    }, [selectedRows]);
    const columns = suppliedColumns;
    const selectedText = useMemo(() => {
        if (multi && selectedRows.length > 0) return `${selectedRows.length} selected`;
        return valueLabel || "";
    }, [multi, selectedRows, valueLabel]);

    const getRowSearchText = useCallback(
        (row: T) => {
            if (getSearchText) return getSearchText(row);
            return row.id;
        },
        [getSearchText],
    );

    const getFilteredRowsForQuery = useCallback(
        (nextQuery: string) => {
            const cleanQuery = normalizeSearch(nextQuery);

            if (!cleanQuery || (minChars > 0 && cleanQuery.length < minChars)) {
                return sourceRows.slice(0, maxVisibleRows);
            }

            return sourceRows
                .filter((row) => normalizeSearch(getRowSearchText(row)).includes(cleanQuery))
                .slice(0, maxVisibleRows);
        },
        [getRowSearchText, maxVisibleRows, minChars, sourceRows],
    );

    const filteredRows = useMemo(() => getFilteredRowsForQuery(query), [getFilteredRowsForQuery, query]);

    const visibleValue = isOpen && !isMobileSheet ? query : selectedText;
    const hasSelection = Boolean(selectedText);
    const hasTableLayout = columns.length > 1;
    const safeActiveIndex =
        filteredRows.length === 0 ? -1 : clampNumber(activeIndex, 0, filteredRows.length - 1);
    const activeRow = safeActiveIndex >= 0 ? filteredRows[safeActiveIndex] : null;
    const activeOptionId = isOpen && !isLoading && activeRow ? `${listboxId}-option-${safeActiveIndex}` : undefined;

    const gridTemplateColumns = useMemo(() => {
        if (!hasTableLayout) return undefined;
        return columns.map((column, index) => `minmax(0, ${column.width || (index === 0 ? 200 : 150)}fr)`).join(" ");
    }, [columns, hasTableLayout]);

    const estimatePopupWidth = useCallback((triggerWidth: number) => {
        // Column widths describe scannable cells, not concatenated search text.
        const contentWidth = hasTableLayout
            ? columns.reduce((sum, column, index) => sum + (column.width || (index === 0 ? 200 : 150)), 0) + 40
            : 320;
        return Math.max(triggerWidth, MIN_POPUP_WIDTH, contentWidth);
    }, [columns, hasTableLayout]);

    const updatePopupPosition = useCallback(() => {
        if (!wrapperRef.current || typeof window === "undefined") return;

        const triggerRect = inputRef.current?.parentElement?.getBoundingClientRect() || wrapperRef.current.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const maxAllowedWidth = Math.max(0, viewportWidth - VIEWPORT_GAP * 2);
        const estimatedWidth = estimatePopupWidth(triggerRect.width);
        const popupWidth = Math.round(Math.min(Math.max(triggerRect.width, Math.min(estimatedWidth, hasTableLayout ? 840 : 420)), maxAllowedWidth));

        let left = triggerRect.left;
        if (left + popupWidth > viewportWidth - VIEWPORT_GAP) left = viewportWidth - VIEWPORT_GAP - popupWidth;
        left = Math.max(VIEWPORT_GAP, left);

        const spaceBelow = viewportHeight - triggerRect.bottom - VIEWPORT_GAP;
        const spaceAbove = triggerRect.top - VIEWPORT_GAP;
        const shouldOpenTop = spaceBelow < 260 && spaceAbove > spaceBelow;
        const availableHeight = shouldOpenTop ? spaceAbove - POPUP_GAP : spaceBelow - POPUP_GAP;
        const maxHeight = Math.round(clampNumber(availableHeight, MIN_POPUP_HEIGHT, MAX_POPUP_HEIGHT));
        const top = shouldOpenTop
            ? Math.max(VIEWPORT_GAP, triggerRect.top - POPUP_GAP - maxHeight)
            : Math.min(triggerRect.bottom + POPUP_GAP, viewportHeight - VIEWPORT_GAP - MIN_POPUP_HEIGHT);

        const nextPosition: PopupPosition = {
            left: Math.round(left),
            top: Math.round(top),
            width: popupWidth,
            maxHeight,
            placement: shouldOpenTop ? "top" : "bottom",
        };
        setPopupPosition(current => current && current.left === nextPosition.left && current.top === nextPosition.top && current.width === nextPosition.width && current.maxHeight === nextPosition.maxHeight && current.placement === nextPosition.placement ? current : nextPosition);
    }, [estimatePopupWidth, hasTableLayout]);

    useEffect(() => {
        if (!onSearch) return;
        const timer = window.setTimeout(() => onSearch(query), searchDebounceMs);
        return () => window.clearTimeout(timer);
    }, [onSearch, query, searchDebounceMs]);

    useEffect(() => {
        inputRef.current?.setCustomValidity(required && selectedRows.length === 0 ? `Please select ${label}.` : "");
    }, [required, selectedRows.length, label]);

    useEffect(() => {
        if (typeof window === "undefined") return;

        const mediaQuery = window.matchMedia("(max-width: 640px)");
        const syncMobileMode = () => setIsMobileSheet(mediaQuery.matches);
        syncMobileMode();

        mediaQuery.addEventListener("change", syncMobileMode);
        return () => mediaQuery.removeEventListener("change", syncMobileMode);
    }, []);

    useEffect(() => {
        function handleOutsidePointer(event: MouseEvent | TouchEvent) {
            const target = event.target as Node;
            const clickedInsideTrigger = Boolean(wrapperRef.current?.contains(target));
            const clickedInsidePopup = Boolean(popupRef.current?.contains(target));

            if (!clickedInsideTrigger && !clickedInsidePopup) closeDropdown();
        }

        document.addEventListener("mousedown", handleOutsidePointer);
        document.addEventListener("touchstart", handleOutsidePointer, { passive: true });

        return () => {
            document.removeEventListener("mousedown", handleOutsidePointer);
            document.removeEventListener("touchstart", handleOutsidePointer);
        };
    }, []);

    useEffect(() => {
        if (!isOpen) return;
        if (isMobileSheet) {
            return;
        }
        updatePopupPosition();

        const handleWindowChange = () => updatePopupPosition();
        window.addEventListener("resize", handleWindowChange);
        window.addEventListener("scroll", handleWindowChange, true);

        return () => {
            window.removeEventListener("resize", handleWindowChange);
            window.removeEventListener("scroll", handleWindowChange, true);
        };
    }, [isMobileSheet, isOpen, updatePopupPosition]);

    useEffect(() => {
        if (!isOpen) return;
        if (isMobileSheet) return;
        updatePopupPosition();
    }, [filteredRows.length, isMobileSheet, isOpen, query, selectedText, updatePopupPosition]);

    useEffect(() => {
        if (!isOpen || safeActiveIndex < 0 || lastInteractionRef.current !== "keyboard") return;
        optionRefs.current[safeActiveIndex]?.scrollIntoView({ block: "nearest" });
    }, [isOpen, safeActiveIndex]);

    useEffect(() => {
        if (!isOpen || !isMobileSheet) return;
        const previous = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = previous; };
    }, [isOpen, isMobileSheet]);

    function getInitialActiveIndex(nextRows: T[]) {
        if (nextRows.length === 0) return -1;

        const selectedIndex = nextRows.findIndex((row) => selectedIdSet.has(row.id));
        return selectedIndex >= 0 ? selectedIndex : 0;
    }

    function openDropdown(keepQuery = false) {
        if (disabled || inputRef.current?.matches(":disabled")) return;
        lastInteractionRef.current = "keyboard";
        const nextQuery = keepQuery ? query : "";
        const nextRows = getFilteredRowsForQuery(nextQuery);
        setIsOpen(true);
        if (!keepQuery) setQuery("");
        setActiveIndex(getInitialActiveIndex(nextRows));
        window.setTimeout(() => {
            if (isMobileSheet) {
                mobileInputRef.current?.focus();
                return;
            }
            inputRef.current?.focus();
        }, 0);
    }

    function closeDropdown() {
        setIsOpen(false);
        setQuery("");
        setActiveIndex(-1);
    }

    function handleClear() {
        if (disabled || inputRef.current?.matches(":disabled")) return;
        onClear();
        closeDropdown();
        inputRef.current?.focus();
    }

    function handleSelect(row: T) {
        if (disabled || isLoading || inputRef.current?.matches(":disabled") || isOptionDisabled?.(row)) return;
        onSelect(row);
        if (!multi) {
            closeDropdown();
            inputRef.current?.focus();
            return;
        }
        setQuery("");
        window.setTimeout(() => {
            if (isMobileSheet) {
                mobileInputRef.current?.focus();
                return;
            }
            inputRef.current?.focus();
        }, 0);
    }

    function handleQueryChange(nextQuery: string) {
        const nextRows = getFilteredRowsForQuery(nextQuery);
        lastInteractionRef.current = "keyboard";
        setQuery(nextQuery);
        setIsOpen(true);
        setActiveIndex(getInitialActiveIndex(nextRows));
    }

    function renderSimpleOption(row: T) {
        if (getOptionLabel) return getOptionLabel(row);
        if (columns.length > 0) return columns[0].render(row);
        return row.id;
    }

    function moveActiveIndex(nextIndex: number) {
        if (filteredRows.length === 0) {
            setActiveIndex(-1);
            return;
        }
        lastInteractionRef.current = "keyboard";
        setActiveIndex(clampNumber(nextIndex, 0, filteredRows.length - 1));
    }

    function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
        if (disabled || inputRef.current?.matches(":disabled")) return;

        if (event.key === "ArrowDown") {
            event.preventDefault();
            if (!isOpen) {
                openDropdown(true);
                return;
            }
            moveActiveIndex(safeActiveIndex < 0 ? 0 : safeActiveIndex + 1);
            return;
        }

        if (event.key === "ArrowUp") {
            event.preventDefault();
            if (event.altKey && isOpen) {
                closeDropdown();
                return;
            }
            if (!isOpen) {
                openDropdown(true);
                return;
            }
            moveActiveIndex(safeActiveIndex < 0 ? filteredRows.length - 1 : safeActiveIndex - 1);
            return;
        }

        if (event.key === "PageDown" && isOpen) {
            event.preventDefault();
            moveActiveIndex(safeActiveIndex < 0 ? 0 : safeActiveIndex + PAGE_JUMP_SIZE);
            return;
        }

        if (event.key === "PageUp" && isOpen) {
            event.preventDefault();
            moveActiveIndex(safeActiveIndex < 0 ? 0 : safeActiveIndex - PAGE_JUMP_SIZE);
            return;
        }

        if (event.key === "Home" && isOpen) {
            event.preventDefault();
            moveActiveIndex(0);
            return;
        }

        if (event.key === "End" && isOpen) {
            event.preventDefault();
            moveActiveIndex(filteredRows.length - 1);
            return;
        }

        if (event.nativeEvent.isComposing) return;

        if (event.key === "Enter" && isOpen) {
            event.preventDefault();
            const rowToSelect = safeActiveIndex >= 0 ? filteredRows[safeActiveIndex] : filteredRows[0];
            if (rowToSelect) {
                event.preventDefault();
                handleSelect(rowToSelect);
            }
            return;
        }

        if (event.key === "Enter" && !isOpen) {
            event.preventDefault();
            openDropdown(true);
            return;
        }

        if (event.key === "Escape") {
            event.preventDefault();
            closeDropdown();
            inputRef.current?.focus();
            return;
        }

        if (event.key === "Tab") {
            if (isMobileSheet) inputRef.current?.focus();
            closeDropdown();
        }
    }

    const popupStyle: CSSProperties | undefined = isMobileSheet
        ? {
              bottom: 0,
              left: 0,
              right: 0,
              width: "100%",
              maxHeight: "min(76dvh, 620px)",
          }
        : popupPosition
            ? {
                  left: popupPosition.left,
                  top: popupPosition.top,
                  width: popupPosition.width,
                  maxHeight: popupPosition.maxHeight,
              }
            : undefined;

    const listMaxHeight: CSSProperties["maxHeight"] = isMobileSheet
        ? "min(46dvh, 390px)"
        : popupPosition
            ? Math.max(120, popupPosition.maxHeight - 58 - (errorMessage ? 38 : 0))
            : 320;

    const popup = isOpen ? (
        <>
            {isMobileSheet ? <div className="sv-lookup-backdrop" onClick={closeDropdown} /> : null}
            <div ref={popupRef} style={popupStyle} className={`sv-lookup-popup ${isMobileSheet ? "sv-lookup-sheet" : ""}`}>
                {isMobileSheet ? (
                    <div className="sv-lookup-mobile-header">
                        <div className="sv-lookup-heading"><span>{label}</span><button type="button" aria-label="Close lookup" onClick={() => { closeDropdown(); inputRef.current?.focus(); }}>×</button></div>
                        <input ref={mobileInputRef} value={query} onChange={(event) => handleQueryChange(event.target.value)} onKeyDown={handleInputKeyDown}
                            placeholder={searchPlaceholder} role="combobox" aria-label={label} aria-autocomplete="list"
                            aria-expanded={isOpen} aria-controls={listboxId} aria-activedescendant={activeOptionId} autoComplete="off" />
                    </div>
                ) : null}
                {errorMessage ? <div role="alert" className="sv-lookup-message sv-lookup-error">{errorMessage}</div> : null}
                <div className="sv-lookup-summary" aria-live="polite">{isLoading ? "Loading records…" : `${filteredRows.length} options`}{sourceRows.length > maxVisibleRows ? ` · Refine search to find more` : ""}</div>
                <div ref={listRef} id={listboxId} role="listbox" aria-label={label} aria-multiselectable={multi || undefined} aria-busy={isLoading}
                    className="sv-lookup-list" style={{ maxHeight: listMaxHeight }}>
                    {!isLoading && !filteredRows.length ? <div className="sv-lookup-message">{emptyMessage}</div> : null}
                    {hasTableLayout && !isMobileSheet ? <div className="sv-lookup-columns" style={{ gridTemplateColumns }}>{columns.map(column => <span key={column.key}>{column.header}</span>)}</div> : null}
                    {!isLoading && filteredRows.map((row, index) => {
                        const selected = selectedIdSet.has(row.id);
                        const optionDisabled = Boolean(isOptionDisabled?.(row));
                        return <button key={`${row.id}-${index}`} id={`${listboxId}-option-${index}`} ref={element => { optionRefs.current[index] = element; }}
                            type="button" role="option" tabIndex={-1} aria-selected={selected} aria-disabled={optionDisabled}
                            onMouseDown={event => event.preventDefault()} onPointerMove={() => { lastInteractionRef.current = "pointer"; setActiveIndex(index); }}
                            onClick={() => handleSelect(row)} className={`sv-lookup-option ${index === safeActiveIndex ? "is-active" : ""} ${selected ? "is-selected" : ""} ${hasTableLayout ? "has-columns" : ""}`}>
                            {hasTableLayout ? <div className="sv-lookup-cells" style={isMobileSheet ? undefined : { gridTemplateColumns }}>
                                {columns.map(column => <div key={column.key} className="sv-lookup-cell" title={column.text?.(row)}>{isMobileSheet ? <span className="sv-lookup-cell-label">{column.header}: </span> : null}{column.render(row)}</div>)}
                            </div> : <span className="sv-lookup-simple">{renderSimpleOption(row)}</span>}
                            {selected ? <span className="sv-lookup-check" aria-hidden="true">✓</span> : null}
                        </button>;
                    })}
                </div>
            </div>
        </>
    ) : null;

    return (
        <div ref={wrapperRef} className={`sv-smart-lookup ${className}`} onBlur={event => {
            if (!wrapperRef.current?.contains(event.relatedTarget) && !popupRef.current?.contains(event.relatedTarget)) closeDropdown();
        }}>
            {!hideLabel ? <label id={labelId} htmlFor={inputId} className="sv-lookup-label">{label}{required ? <span aria-hidden="true"> *</span> : null}</label> : null}
            <div className={`sv-lookup-control ${isOpen ? "is-open" : ""} ${invalid ? "is-invalid" : ""}`}>
                <input id={inputId} ref={inputRef} value={visibleValue} disabled={disabled} inputMode={isMobileSheet ? "none" : undefined}
                    onFocus={event => { if (!isOpen) event.currentTarget.select(); }}
                    onClick={() => { if (!isOpen) openDropdown(false); }}
                    onChange={event => { if (!isMobileSheet) handleQueryChange(event.target.value); }} onKeyDown={handleInputKeyDown}
                    placeholder={isOpen && !isMobileSheet ? searchPlaceholder : placeholder}
                    role="combobox" aria-label={hideLabel ? label : undefined} aria-labelledby={!hideLabel ? labelId : undefined}
                    aria-expanded={isOpen} aria-controls={isOpen ? listboxId : undefined} aria-activedescendant={activeOptionId}
                    aria-autocomplete="list" aria-required={required || undefined} aria-invalid={invalid || undefined}
                    aria-describedby={helperText ? `${inputId}-help` : undefined} autoComplete="off" spellCheck={false} />
                {hasSelection && clearable ? <button type="button" disabled={disabled} aria-label={`Clear ${label}`} title="Clear selection"
                    onMouseDown={event => event.preventDefault()} onClick={handleClear}>×</button> : null}
                <button type="button" disabled={disabled} aria-label={`${getDropdownButtonTitle(isOpen)}: ${label}`} aria-expanded={isOpen}
                    onMouseDown={event => event.preventDefault()} onClick={() => isOpen ? closeDropdown() : openDropdown(false)}>
                    <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="m5 7 5 5 5-5H5Z" /></svg>
                </button>
            </div>
            {name ? (multi ? selectedRows : selectedRows.length ? selectedRows.slice(0, 1) : [{ id: "" }]).map(row => <input key={row.id} type="hidden" name={name} value={row.id} disabled={disabled} />) : null}
            {helperText ? <p id={`${inputId}-help`} className="sv-lookup-help">{helperText}</p> : null}
            {popup && typeof document !== "undefined" ? createPortal(popup, wrapperRef.current?.closest("dialog, [role=dialog]") || document.body) : null}
        </div>
    );
}
