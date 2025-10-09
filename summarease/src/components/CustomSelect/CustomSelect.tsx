import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import './CustomSelect.css';

export interface SelectOption<T = string> {
  value: T;
  label: string;
  disabled?: boolean;
}

interface CustomSelectProps<T = string> {
  value: T;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  disabled?: boolean;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
  error?: boolean;
}

function CustomSelect<T = string>({
  value,
  onChange,
  options,
  disabled = false,
  placeholder = 'Select an option',
  ariaLabel = 'Select',
  className = '',
  error = false,
}: CustomSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const [focusIndex, setFocusIndex] = useState<number>(() => 
    options.findIndex(o => o.value === value)
  );
  const containerRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const listId = useRef('custom-select-' + Math.random().toString(36).slice(2)).current;

  useEffect(() => {
    setFocusIndex(options.findIndex(o => o.value === value));
  }, [value, options]);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleOutside);
    }
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  // Determine if menu should open upward to avoid clipping
  useEffect(() => {
    if (open && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const menuHeight = 280; // max-height from CSS
      
      // Check space relative to viewport
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      
      // Also check if we're in a scrollable container
      let parent = containerRef.current.parentElement;
      let scrollableParent: HTMLElement | null = null;
      
      // Find scrollable parent
      while (parent && parent !== document.body) {
        const overflow = window.getComputedStyle(parent).overflowY;
        if (overflow === 'auto' || overflow === 'scroll') {
          scrollableParent = parent;
          break;
        }
        parent = parent.parentElement;
      }
      
      // If there's a scrollable parent, check space within it
      if (scrollableParent) {
        const parentRect = scrollableParent.getBoundingClientRect();
        const spaceBelowInParent = parentRect.bottom - rect.bottom;
        const spaceAboveInParent = rect.top - parentRect.top;
        
        // Use the smaller of viewport or parent container space
        const effectiveSpaceBelow = Math.min(spaceBelow, spaceBelowInParent);
        const effectiveSpaceAbove = Math.min(spaceAbove, spaceAboveInParent);
        
        setOpenUpward(effectiveSpaceBelow < menuHeight && effectiveSpaceAbove > effectiveSpaceBelow);
      } else {
        // No scrollable parent, use viewport space
        setOpenUpward(spaceBelow < menuHeight && spaceAbove > spaceBelow);
      }
    }
  }, [open]);

  // Auto-scroll focused option into view
  useEffect(() => {
    if (open && menuRef.current && focusIndex >= 0) {
      const focusedElement = menuRef.current.children[focusIndex] as HTMLElement;
      if (focusedElement) {
        focusedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [open, focusIndex]);

  const selectIndex = (idx: number) => {
    const opt = options[idx];
    if (!opt || opt.disabled) return;
    onChange(opt.value);
    setOpen(false);
  };

  const onTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      setOpen(o => !o);
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setFocusIndex(i => {
        let next = (i < 0 ? 0 : i + 1);
        // Skip disabled options
        while (next < options.length && options[next]?.disabled) {
          next++;
        }
        return Math.min(options.length - 1, next);
      });
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setOpen(true);
      setFocusIndex(i => {
        let prev = (i < 0 ? options.length - 1 : i - 1);
        // Skip disabled options
        while (prev >= 0 && options[prev]?.disabled) {
          prev--;
        }
        return Math.max(0, prev);
      });
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    }
  };

  const onMenuKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      selectIndex(focusIndex < 0 ? 0 : focusIndex);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusIndex(i => {
        let next = (i < 0 ? 0 : i + 1);
        while (next < options.length && options[next]?.disabled) {
          next++;
        }
        return Math.min(options.length - 1, next);
      });
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusIndex(i => {
        let prev = (i < 0 ? options.length - 1 : i - 1);
        while (prev >= 0 && options[prev]?.disabled) {
          prev--;
        }
        return Math.max(0, prev);
      });
    }
  };

  const current = options.find(o => o.value === value);

  return (
    <div 
      className={`custom-select ${className} ${error ? 'custom-select-error' : ''}`} 
      ref={containerRef}
    >
      <button
        type="button"
        className={`custom-select-trigger ${disabled ? 'custom-select-disabled' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        onClick={() => !disabled && setOpen(o => !o)}
        onKeyDown={onTriggerKeyDown}
        disabled={disabled}
      >
        <span className="custom-select-value">
          {current ? current.label : placeholder}
        </span>
        <ChevronDown 
          className={`custom-select-chevron ${open ? 'custom-select-chevron-open' : ''}`} 
          size={16} 
        />
      </button>

      {open && (
        <div
          id={listId}
          role="listbox"
          className={`custom-select-menu ${openUpward ? 'custom-select-menu-upward' : ''}`}
          ref={menuRef}
          tabIndex={-1}
          onKeyDown={onMenuKeyDown}
        >
          {options.map((opt, idx) => {
            const selected = opt.value === value;
            const focused = idx === focusIndex;
            return (
              <div
                key={String(opt.value)}
                role="option"
                aria-selected={selected}
                aria-disabled={opt.disabled}
                className={`custom-select-option ${selected ? 'custom-select-option-selected' : ''} ${focused ? 'custom-select-option-focused' : ''} ${opt.disabled ? 'custom-select-option-disabled' : ''}`}
                tabIndex={focused ? 0 : -1}
                onMouseEnter={() => !opt.disabled && setFocusIndex(idx)}
                onClick={() => selectIndex(idx)}
              >
                <span className="custom-select-option-label">{opt.label}</span>
                {selected && <Check className="custom-select-checkmark" size={16} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default CustomSelect;
