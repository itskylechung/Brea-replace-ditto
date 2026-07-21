import { useId, useState, type KeyboardEvent, type ReactNode } from "react";
import { normalizeTag, suggestTags } from "../lib/tagSuggestions";

export function TagInput({
  id,
  label,
  hint,
  value,
  onChange,
  suggestions,
  placeholder,
  maxTags = 20,
  labelChip,
}: {
  id: string;
  label: string;
  hint?: string;
  value: string[];
  onChange: (next: string[]) => void;
  suggestions: readonly string[];
  placeholder?: string;
  maxTags?: number;
  labelChip?: ReactNode;
}) {
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const listId = useId();

  const matches = suggestTags(input, suggestions, value);
  const showList = open && matches.length > 0;
  const hasActive = showList && activeIndex >= 0 && activeIndex < matches.length;
  const activeOptionId = hasActive ? `${id}-option-${activeIndex}` : undefined;

  function addTag(raw: string) {
    const tag = normalizeTag(raw);
    if (!tag) return;
    if (value.length >= maxTags) return;
    if (value.some((existing) => existing.toLowerCase() === tag.toLowerCase())) return;
    onChange([...value, tag]);
  }

  function commitInput() {
    addTag(input);
    setInput("");
    setActiveIndex(-1);
  }

  function selectSuggestion(suggestion: string) {
    addTag(suggestion);
    setInput("");
    setActiveIndex(-1);
  }

  function removeTag(index: number) {
    onChange(value.filter((_, position) => position !== index));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      if (matches.length === 0) return;
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) =>
        current < 0 || current >= matches.length
          ? 0
          : current === matches.length - 1
            ? 0
            : current + 1,
      );
    } else if (event.key === "ArrowUp") {
      if (matches.length === 0) return;
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) =>
        current <= 0 || current >= matches.length ? matches.length - 1 : current - 1,
      );
    } else if (event.key === "Escape") {
      if (showList) {
        event.preventDefault();
        setOpen(false);
        setActiveIndex(-1);
      }
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (hasActive) {
        selectSuggestion(matches[activeIndex]);
      } else {
        commitInput();
      }
    } else if (event.key === ",") {
      event.preventDefault();
      commitInput();
    } else if (event.key === "Backspace" && input === "" && value.length > 0) {
      event.preventDefault();
      removeTag(value.length - 1);
    }
  }

  return (
    <div className="text-sm font-bold">
      <label htmlFor={id}>
        {label}
        {hint && <span className="font-normal text-moss"> {hint}</span>}
        {labelChip}
      </label>
      <div className="relative">
        <div className="mt-2 flex flex-wrap items-center gap-2 rounded-2xl border border-ink/10 bg-white/80 px-3 py-2 transition focus-within:border-forest/45 focus-within:ring-2 focus-within:ring-forest/10">
          {value.map((tag, index) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-white/80 border border-forest/15 px-2.5 py-1 text-xs font-bold text-ink"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(index)}
                aria-label={`Remove ${tag}`}
                className="leading-none text-moss transition hover:text-ink"
              >
                &times;
              </button>
            </span>
          ))}
          <input
            id={id}
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
              setActiveIndex(-1);
              setOpen(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder={value.length === 0 ? placeholder : undefined}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={showList}
            aria-controls={showList ? listId : undefined}
            aria-activedescendant={activeOptionId}
            className="min-w-[8rem] flex-1 bg-transparent px-1 py-1 text-sm font-normal text-ink outline-none placeholder:text-moss/55"
          />
        </div>
        {showList && (
          <ul
            id={listId}
            role="listbox"
            className="absolute z-10 mt-1 w-full overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-card"
          >
            {matches.map((suggestion, index) => (
              <li
                key={suggestion}
                id={`${id}-option-${index}`}
                role="option"
                aria-selected={index === activeIndex}
                onMouseDown={(event) => {
                  event.preventDefault();
                  selectSuggestion(suggestion);
                }}
                onMouseEnter={() => setActiveIndex(index)}
                className={`block w-full px-3 py-2 text-left text-sm font-normal text-ink transition${
                  index === activeIndex ? " bg-cream/70" : ""
                }`}
              >
                {suggestion}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
