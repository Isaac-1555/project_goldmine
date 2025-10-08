import React, { useEffect, useRef, useState } from 'react';
import type { InfographicType } from '../../lib/viz/types';
import { ChevronDown, Check } from 'lucide-react';

type Option = { value: InfographicType; label: string };

interface TypeDropdownProps {
  value: InfographicType;
  onChange: (value: InfographicType) => void;
  options: Option[];
  disabled?: boolean;
  ariaLabel?: string;
}

const TypeDropdown: React.FC<TypeDropdownProps> = ({ value, onChange, options, disabled = false, ariaLabel = 'Select type' }) => {
  const [open, setOpen] = useState(false);
  const [focusIndex, setFocusIndex] = useState<number>(() => options.findIndex(o => o.value === value));
  const containerRef = useRef<HTMLDivElement | null>(null);
  const listId = 'themed-select-menu-' + Math.random().toString(36).slice(2);

  useEffect(() => {
    setFocusIndex(options.findIndex(o => o.value === value));
  }, [value, options]);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  const selectIndex = (idx: number) => {
    const opt = options[idx];
    if (!opt) return;
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
      setFocusIndex(i => Math.min(options.length - 1, (i < 0 ? 0 : i) + 1));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setOpen(true);
      setFocusIndex(i => Math.max(0, (i < 0 ? options.length - 1 : i) - 1));
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
      setFocusIndex(i => Math.min(options.length - 1, (i < 0 ? 0 : i) + 1));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusIndex(i => Math.max(0, (i < 0 ? options.length - 1 : i) - 1));
    }
  };

  const current = options.find(o => o.value === value);

  return (
    <div className="themed-select" ref={containerRef}>
      <button
        type="button"
        className="themed-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => !disabled && setOpen(o => !o)}
        onKeyDown={onTriggerKeyDown}
        disabled={disabled}
      >
        <span>{current ? current.label : 'Select'}</span>
        <ChevronDown className="themed-select-chevron" size={16} />
      </button>

      {open && (
        <div
          id={listId}
          role="listbox"
          className="themed-select-menu"
          tabIndex={-1}
          onKeyDown={onMenuKeyDown}
        >
          {options.map((opt, idx) => {
            const selected = opt.value === value;
            const focused = idx === focusIndex;
            return (
              <div
                key={opt.value}
                role="option"
                aria-selected={selected}
                className="themed-select-option"
                tabIndex={focused ? 0 : -1}
                onMouseEnter={() => setFocusIndex(idx)}
                onClick={() => selectIndex(idx)}
              >
                <span>{opt.label}</span>
                <Check className="checkmark" size={16} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TypeDropdown;
