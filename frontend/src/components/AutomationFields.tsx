import { useRef, useState } from "react";
import type { ConfigValue, FieldDef, VariableDef } from "../lib/types";
import { Input, Select, Textarea } from "./ui";

// Chips that insert {{field}} placeholders at the cursor — the "no code"
// way to put a customer's name or an amount into a message.
function VariableChips({ variables, onInsert }: { variables: VariableDef[]; onInsert: (key: string) => void }) {
  if (!variables.length) return null;
  return (
    <div className="mt-2">
      <p className="mb-1.5 text-xs text-dim">Tap to insert. These are filled in automatically each time it runs.</p>
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {variables.map((v) => (
          <button
            key={v.key}
            type="button"
            onPointerDown={(e) => e.preventDefault()} // keep the cursor where it was
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onInsert(v.key)}
            className="shrink-0 rounded-full border border-white/12 px-3 py-1.5 text-xs font-semibold text-mute transition hover:border-lilac hover:text-fog"
          >
            + {v.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function FieldInput({
  field,
  value,
  onChange,
  variables,
  invalid,
  freeTextVariable,
}: {
  field: FieldDef;
  value: ConfigValue | undefined;
  onChange: (v: ConfigValue) => void;
  variables: VariableDef[];
  invalid?: boolean;
  freeTextVariable?: boolean;
}) {
  const ref = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const [focused, setFocused] = useState(false);
  const str = value === undefined || value === null ? "" : String(value);
  const error = invalid ? `Fill in “${field.label}”` : undefined;

  function insert(key: string) {
    const token = `{{${key}}}`;
    const el = ref.current;
    if (!el) return onChange(str + token);
    const start = el.selectionStart ?? str.length;
    const end = el.selectionEnd ?? str.length;
    const next = str.slice(0, start) + token + str.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    });
  }

  if (field.type === "select") {
    return <Select label={field.label} value={str} onChange={(e) => onChange(e.target.value)} options={field.options || []} help={field.help} error={error} placeholder={str ? undefined : "Choose…"} />;
  }

  if (field.type === "variable") {
    if (freeTextVariable) {
      return <Input label={field.label} value={str} onChange={(e) => onChange(e.target.value.replace(/[^\w.]/g, ""))} placeholder="Field name from the incoming data, e.g. amount" error={error} />;
    }
    return (
      <Select
        label={field.label}
        value={str}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Choose a detail"
        error={error}
        options={variables.map((v) => ({ value: v.key, label: v.label }))}
      />
    );
  }

  if (field.type === "number") {
    return (
      <Input
        label={field.label}
        type="number"
        inputMode="numeric"
        min={field.min}
        max={field.max}
        value={str}
        onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
        help={field.help}
        error={error}
        className="tabular"
      />
    );
  }

  const common = {
    label: field.label,
    value: str,
    placeholder: field.placeholder,
    error,
    help: field.allowVariables ? undefined : field.help,
  };

  return (
    <div
      className="min-w-0"
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setFocused(false);
      }}
    >
      {field.type === "textarea" ? (
        <Textarea ref={ref} {...common} rows={4} onChange={(e) => onChange(e.target.value)} maxLength={5000} />
      ) : (
        <Input ref={ref} {...common} type={field.type === "url" ? "url" : "text"} inputMode={field.type === "url" ? "url" : undefined} onChange={(e) => onChange(e.target.value)} maxLength={5000} />
      )}
      {field.allowVariables &&
        variables.length > 0 &&
        (focused ? (
          <VariableChips variables={variables} onInsert={insert} />
        ) : (
          <button type="button" onClick={() => ref.current?.focus()} className="mt-1.5 text-xs font-semibold text-lilac hover:underline">
            + Insert details
          </button>
        ))}
    </div>
  );
}

export function visibleFields(fields: FieldDef[], config: Record<string, ConfigValue>) {
  return fields.filter((f) => !f.showIf || f.showIf.values.includes(String(config[f.showIf.key] ?? "")));
}

export function defaultsFor(fields: FieldDef[]): Record<string, ConfigValue> {
  const out: Record<string, ConfigValue> = {};
  for (const f of fields) if (f.defaultValue !== undefined) out[f.key] = f.defaultValue;
  return out;
}

export const isBlank = (v: unknown) => v === undefined || v === null || String(v).trim() === "";
