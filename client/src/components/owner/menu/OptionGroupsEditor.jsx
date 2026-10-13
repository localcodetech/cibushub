import { Plus, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { emptyGroup, emptyOption } from "@/utils/menuForm";

// The same look as FormField's box, for the small boxes in a row here
const INPUT =
  "h-11 w-full rounded-lg border border-input bg-white px-3 text-base dark:bg-card " +
  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none";

const MAX_GROUPS = 10;
const MAX_OPTIONS = 20;

// A dish's choices [AC-MENU-06]: "Protein: Chicken / Fish / Beef, must choose 1",
// "Extras: Egg, Shito, Plantain, up to 3". Each choice may cost extra.
//   groups:   the form's option groups (see utils/menuForm.js)
//   problems: checkItemForm's groups (a message under each box that's wrong), or []
//   onChange: gets the new list of groups
const OptionGroupsEditor = ({ groups, problems, onChange }) => {
  const changeGroup = (index, changes) => {
    onChange(groups.map((group, i) => (i === index ? { ...group, ...changes } : group)));
  };

  const changeOption = (groupIndex, optionIndex, changes) => {
    const options = groups[groupIndex].options.map((option, i) =>
      i === optionIndex ? { ...option, ...changes } : option,
    );
    changeGroup(groupIndex, { options });
  };

  return (
    <div className="space-y-4">
      {groups.map((group, groupIndex) => {
        const groupProblems = problems[groupIndex] || { options: [] };
        const idStart = "group-" + group.key;
        return (
          <fieldset key={group.key} className="min-w-0 rounded-lg border border-border p-4">
            <legend className="sr-only">Option group {groupIndex + 1}</legend>

            <div className="flex items-end gap-2">
              <div className="min-w-0 flex-1">
                <label htmlFor={idStart + "-name"} className="text-[15px] font-bold">
                  Group name
                </label>
                <input
                  id={idStart + "-name"}
                  value={group.name}
                  placeholder="e.g. Protein"
                  maxLength={80}
                  onChange={(event) => changeGroup(groupIndex, { name: event.target.value })}
                  aria-invalid={Boolean(groupProblems.name)}
                  className={cn(INPUT, "mt-2", groupProblems.name && "border-destructive")}
                />
              </div>
              <button
                type="button"
                onClick={() => onChange(groups.filter((_, i) => i !== groupIndex))}
                aria-label={"Remove the group " + (group.name || groupIndex + 1)}
                className="flex size-11 shrink-0 items-center justify-center rounded-lg text-destructive hover:bg-destructive/10"
              >
                <Trash2 size={18} aria-hidden="true" />
              </button>
            </div>
            {groupProblems.name && (
              <p className="mt-1 text-[13px] text-destructive">{groupProblems.name}</p>
            )}

            {/* How many the customer picks: required or not, and the most they can pick */}
            <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2">
              <label className="flex min-h-11 items-center gap-2 text-[15px]">
                <input
                  type="checkbox"
                  checked={group.minSelect > 0}
                  onChange={(event) =>
                    changeGroup(groupIndex, { minSelect: event.target.checked ? 1 : 0 })
                  }
                  className="size-5 accent-primary"
                />
                Customer must choose
              </label>
              <label className="flex items-center gap-2 text-[15px]">
                Up to
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={group.options.length}
                  value={group.maxSelect}
                  onChange={(event) =>
                    changeGroup(groupIndex, { maxSelect: Number(event.target.value) })
                  }
                  aria-invalid={Boolean(groupProblems.maxSelect)}
                  className={cn(INPUT, "w-20", groupProblems.maxSelect && "border-destructive")}
                />
                {group.maxSelect === 1 ? "choice" : "choices"}
              </label>
            </div>
            {groupProblems.maxSelect && (
              <p className="text-[13px] text-destructive">{groupProblems.maxSelect}</p>
            )}

            {/* The choices: a name and an extra price each */}
            <div className="mt-3 flex gap-2 text-[13px] font-bold text-muted-foreground">
              <span className="flex-1">Choice</span>
              <span className="w-28">Extra (GHS)</span>
              <span className="w-11" />
            </div>
            <ul className="mt-1 space-y-2">
              {group.options.map((option, optionIndex) => {
                const optionProblems = groupProblems.options[optionIndex] || {};
                const label = "Choice " + (optionIndex + 1);
                return (
                  <li key={option.key}>
                    <div className="flex gap-2">
                      <input
                        value={option.name}
                        placeholder={optionIndex === 0 ? "e.g. Chicken" : ""}
                        maxLength={80}
                        aria-label={label + " name"}
                        aria-invalid={Boolean(optionProblems.name)}
                        onChange={(event) =>
                          changeOption(groupIndex, optionIndex, { name: event.target.value })
                        }
                        className={cn(
                          INPUT,
                          "min-w-0 flex-1",
                          optionProblems.name && "border-destructive",
                        )}
                      />
                      <input
                        value={option.extraGhs}
                        inputMode="decimal"
                        aria-label={label + " extra price in GHS"}
                        aria-invalid={Boolean(optionProblems.extraGhs)}
                        onChange={(event) =>
                          changeOption(groupIndex, optionIndex, { extraGhs: event.target.value })
                        }
                        className={cn(
                          INPUT,
                          "w-28",
                          optionProblems.extraGhs && "border-destructive",
                        )}
                      />
                      <button
                        type="button"
                        disabled={group.options.length === 1}
                        onClick={() =>
                          changeGroup(groupIndex, {
                            options: group.options.filter((_, i) => i !== optionIndex),
                          })
                        }
                        aria-label={"Remove " + (option.name || label)}
                        className="flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted disabled:opacity-30"
                      >
                        <X size={18} aria-hidden="true" />
                      </button>
                    </div>
                    {(optionProblems.name || optionProblems.extraGhs) && (
                      <p className="mt-1 text-[13px] text-destructive">
                        {[optionProblems.name, optionProblems.extraGhs].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
            {group.options.length < MAX_OPTIONS && (
              <button
                type="button"
                onClick={() =>
                  changeGroup(groupIndex, { options: [...group.options, emptyOption()] })
                }
                className="mt-2 inline-flex min-h-11 items-center gap-2 font-bold text-primary"
              >
                <Plus size={16} aria-hidden="true" />
                Add a choice
              </button>
            )}
          </fieldset>
        );
      })}

      {groups.length < MAX_GROUPS && (
        <button
          type="button"
          onClick={() => onChange([...groups, emptyGroup()])}
          className="inline-flex min-h-11 items-center gap-2 rounded-md border border-border px-4 font-bold"
        >
          <Plus size={18} aria-hidden="true" />
          Add choices (e.g. protein, extras)
        </button>
      )}
    </div>
  );
};

export default OptionGroupsEditor;
