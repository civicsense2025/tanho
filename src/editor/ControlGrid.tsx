import { Field } from "@/components/forms/Field";
import { Select } from "@/components/forms/Select";
import shell from "./editor-shell.module.css";

/** A responsive grid of enum <Select>s for one control group. Value "" = inherit. */
export function ControlGrid({
  controls,
  layer,
  onSet,
}: {
  controls: { field: string; label: string; options: readonly string[] }[];
  layer: Record<string, string>;
  onSet: (field: string, value: string | undefined) => void;
}) {
  return (
    <div className={shell.controlGrid}>
      {controls.map((c) => {
        const value = layer[c.field];
        return (
          <Field key={c.field} label={c.label}>
            <Select value={value === undefined ? "" : String(value)} onChange={(e) => onSet(c.field, e.target.value || undefined)}>
              <option value="">—</option>
              {c.options.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </Select>
          </Field>
        );
      })}
    </div>
  );
}
