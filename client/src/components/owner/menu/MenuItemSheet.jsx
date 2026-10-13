import { useState } from "react";
import Sheet from "@/components/common/Sheet";
import Alert from "@/components/common/Alert";
import { Chip } from "@/components/common/Chips";
import FileUploadRow from "@/components/common/FileUploadRow";
import FormField from "@/components/form/FormField";
import DishImage from "@/components/restaurant/DishImage";
import { Button } from "@/components/ui/button";
import OptionGroupsEditor from "./OptionGroupsEditor";
import {
  createItemRequest,
  deleteItemRequest,
  updateItemRequest,
  uploadItemImageRequest,
} from "@/api/ownerMenu";
import { MENU_TAGS } from "@/data/menuTags";
import { checkItemForm, formToItem, itemToForm } from "@/utils/menuForm";

// The server's field names -> the form's boxes, for problems the server finds
const SERVER_FIELDS = { name: "name", pricePesewas: "priceGhs", dailyStock: "dailyStock" };

const NO_PROBLEMS = { fields: {}, groups: [] };

// Add or edit one dish [AC-MENU-03, AC-MENU-04, AC-MENU-06, AC-MENU-07, AC-MENU-09].
//   item:       the dish being edited, or null to add a new one
//   categoryId: where a new dish goes (the category whose "Add a dish" was tapped)
//   categories: every category, so a dish can move to another one
//   onSaved():  the menu changed; the page loads it again
//   onClose():  closes the sheet
// A new dish stays open after saving, so the owner can add its photo straight away.
const MenuItemSheet = ({ restaurantId, item, categoryId, categories, onSaved, onClose }) => {
  // The dish as saved on the server (null until a new one is first saved)
  const [savedItem, setSavedItem] = useState(item);
  const [form, setForm] = useState(() => itemToForm(item, categoryId));
  const [problems, setProblems] = useState(NO_PROBLEMS);
  const [message, setMessage] = useState({ tone: "", text: "" });
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const change = (changes) => setForm({ ...form, ...changes });

  const toggleTag = (tag) => {
    change({
      tags: form.tags.includes(tag) ? form.tags.filter((t) => t !== tag) : [...form.tags, tag],
    });
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setMessage({ tone: "", text: "" });
    const checked = checkItemForm(form);
    setProblems(checked);
    if (!checked.isFine) {
      setMessage({ tone: "danger", text: "Please fix the boxes marked in red." });
      return;
    }

    setIsSaving(true);
    try {
      const details = formToItem(form);
      if (savedItem) {
        // Only what changed: a new daily stock refills today's portions, and new choices
        // replace the old ones, so neither is sent unless the owner changed it
        const before = formToItem(itemToForm(savedItem));
        const changes = Object.fromEntries(
          Object.entries(details).filter(
            ([field, value]) => JSON.stringify(value) !== JSON.stringify(before[field]),
          ),
        );
        if (Object.keys(changes).length > 0) {
          await updateItemRequest(restaurantId, savedItem.id, changes);
        }
        await onSaved();
        onClose();
        return;
      }
      const created = await createItemRequest(restaurantId, details);
      setSavedItem(created);
      await onSaved();
      setMessage({ tone: "success", text: "Dish added. Add a photo now, or close this." });
    } catch (error) {
      // Problems with a box go under it; anything else at the top
      const fields = {};
      (error.details || []).forEach((detail) => {
        if (SERVER_FIELDS[detail.field]) fields[SERVER_FIELDS[detail.field]] = detail.message;
      });
      setProblems({ fields, groups: [] });
      const others = (error.details || []).filter((detail) => !SERVER_FIELDS[detail.field]);
      setMessage({
        tone: "danger",
        text: others.length ? others.map((detail) => detail.message).join(". ") : error.message,
      });
    }
    setIsSaving(false);
  };

  const handleDelete = async () => {
    setIsSaving(true);
    try {
      await deleteItemRequest(restaurantId, savedItem.id);
      await onSaved();
      onClose();
    } catch (error) {
      setMessage({ tone: "danger", text: error.message });
      setIsSaving(false);
    }
  };

  const handlePhoto = async (file) => {
    const updated = await uploadItemImageRequest(restaurantId, savedItem.id, file);
    // The answer is the dish without its choices: only take the new photo from it
    setSavedItem({ ...savedItem, imageUrl: updated.imageUrl });
    await onSaved();
  };

  return (
    <Sheet
      title={savedItem ? savedItem.name : "Add a dish"}
      description={
        savedItem
          ? "Changes show on your menu as soon as you save."
          : "It goes on your menu at once."
      }
      onClose={onClose}
    >
      <form onSubmit={handleSave} noValidate className="space-y-5 p-4">
        {message.text && <Alert tone={message.tone}>{message.text}</Alert>}

        {/* The photo needs the dish to exist first */}
        {savedItem ? (
          <div className="flex items-center gap-4">
            <DishImage item={savedItem} />
            <div className="min-w-0 flex-1">
              <FileUploadRow
                title="Photo"
                hint="JPG, PNG or WebP, up to 5 MB"
                accept="image/jpeg,image/png,image/webp"
                isDone={Boolean(savedItem.imageUrl)}
                onUpload={handlePhoto}
              />
            </div>
          </div>
        ) : (
          <p className="text-[15px] text-muted-foreground">
            You can add a photo once the dish is saved.
          </p>
        )}

        <FormField
          id="dish-name"
          label="Name"
          value={form.name}
          maxLength={120}
          placeholder="e.g. Jollof with chicken"
          onChange={(event) => change({ name: event.target.value })}
          error={problems.fields.name}
        />

        <div className="flex flex-col gap-2">
          <label htmlFor="dish-description" className="text-[15px] font-bold">
            Description (optional)
          </label>
          <textarea
            id="dish-description"
            rows={2}
            maxLength={1000}
            value={form.description}
            placeholder="What's in it, how big it is"
            onChange={(event) => change({ description: event.target.value })}
            className="w-full rounded-lg border border-input bg-white px-3.5 py-2 text-base dark:bg-card"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            id="dish-price"
            label="Price (GHS)"
            inputMode="decimal"
            placeholder="e.g. 45.00"
            value={form.priceGhs}
            onChange={(event) => change({ priceGhs: event.target.value })}
            error={problems.fields.priceGhs}
          />
          <div className="flex flex-col gap-2">
            <label htmlFor="dish-category" className="text-[15px] font-bold">
              Category
            </label>
            <select
              id="dish-category"
              value={form.categoryId}
              onChange={(event) => change({ categoryId: event.target.value })}
              className="h-12 w-full rounded-lg border border-input bg-white px-3 text-base dark:bg-card"
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <fieldset className="min-w-0">
          <legend className="text-[15px] font-bold">Tags (optional)</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {Object.entries(MENU_TAGS).map(([tag, label]) => (
              <Chip key={tag} selected={form.tags.includes(tag)} onClick={() => toggleTag(tag)}>
                {label}
              </Chip>
            ))}
          </div>
        </fieldset>

        {/* Daily stock [AC-MENU-07]: sells out by itself when the day's portions are gone */}
        <div>
          <label className="flex min-h-11 items-center gap-2 text-[15px] font-bold">
            <input
              type="checkbox"
              checked={form.hasDailyStock}
              onChange={(event) => change({ hasDailyStock: event.target.checked })}
              className="size-5 accent-primary"
            />
            Only a set number each day
          </label>
          {form.hasDailyStock && (
            <FormField
              id="dish-stock"
              label="Portions per day"
              hint="It shows as sold out when these are gone, and comes back the next day."
              type="number"
              inputMode="numeric"
              min={1}
              value={form.dailyStock}
              onChange={(event) => change({ dailyStock: event.target.value })}
              error={problems.fields.dailyStock}
              className="mt-2"
            />
          )}
        </div>

        <fieldset className="min-w-0">
          <legend className="text-[15px] font-bold">Choices (optional)</legend>
          <p className="mt-1 mb-3 text-[13px] text-muted-foreground">
            What the customer picks, e.g. the protein, or extras like egg and shito.
          </p>
          <OptionGroupsEditor
            groups={form.optionGroups}
            problems={problems.groups}
            onChange={(optionGroups) => change({ optionGroups })}
          />
        </fieldset>

        <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center">
          <Button type="submit" disabled={isSaving} className="h-12 font-bold sm:px-8">
            {isSaving ? "Saving…" : savedItem ? "Save changes" : "Add dish"}
          </Button>

          {/* Two taps to delete: the first asks, the second does it [AC-MENU-09] */}
          {savedItem && !isConfirmingDelete && (
            <Button
              type="button"
              variant="destructive"
              disabled={isSaving}
              onClick={() => setIsConfirmingDelete(true)}
              className="h-12 font-bold sm:ml-auto"
            >
              Delete dish
            </Button>
          )}
          {savedItem && isConfirmingDelete && (
            <div className="flex items-center gap-2 sm:ml-auto">
              <span className="text-[15px]">Delete it from the menu?</span>
              <Button
                type="button"
                variant="destructive"
                disabled={isSaving}
                onClick={handleDelete}
                className="h-12 font-bold"
              >
                Yes, delete
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsConfirmingDelete(false)}
                className="h-12 font-bold"
              >
                Keep
              </Button>
            </div>
          )}
        </div>
      </form>
    </Sheet>
  );
};

export default MenuItemSheet;
