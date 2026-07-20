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
  const listId = useId();

  const matches = suggestTags(input, suggestions, value);
  const isOpen = matches.length > 0;

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
  }

  function removeTag(index: number) {
    onChange(value.filter((_, position) => position !== index));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
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
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={value.length === 0 ? placeholder : undefined}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={isOpen}
            aria-controls={listId}
            className="min-w-[8rem] flex-1 bg-transparent px-1 py-1 text-sm font-normal text-ink outline-none placeholder:text-moss/55"
          />
        </div>
        {isOpen && (
          <ul
            id={listId}
            className="absolute z-10 mt-1 w-full overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-card"
          >
            {matches.map((suggestion) => (
              <li key={suggestion}>
                <button
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    addTag(suggestion);
                    setInput("");
                  }}
                  className="block w-full px-3 py-2 text-left text-sm font-normal text-ink transition hover:bg-cream"
                >
                  {suggestion}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
