import { useState } from "react";
import Sheet from "@/components/common/Sheet";
import Alert from "@/components/common/Alert";
import FormField from "@/components/form/FormField";
import { Button } from "@/components/ui/button";
import {
  createCategoryRequest,
  deleteCategoryRequest,
  updateCategoryRequest,
} from "@/api/ownerMenu";

// Add, rename or delete a menu category [AC-MENU-01, AC-MENU-02].
//   category: the one being edited, or null to add a new one (it goes to the end)
//   onSaved(): the menu changed; the page loads it again
//   onClose(): closes the sheet
// Only an empty category can be deleted: the owner moves or deletes its dishes first.
const CategorySheet = ({ restaurantId, category, onSaved, onClose }) => {
  const [name, setName] = useState(category ? category.name : "");
  const [nameError, setNameError] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const itemCount = category ? category.items.length : 0;

  // Both buttons work the same way: send, reload the menu, close; or show the problem
  const send = async (request) => {
    setErrorMessage("");
    setIsSaving(true);
    try {
      await request();
      await onSaved();
      onClose();
    } catch (error) {
      const nameDetail = (error.details || []).find((detail) => detail.field === "name");
      if (nameDetail) setNameError(nameDetail.message);
      else setErrorMessage(error.message);
      setIsSaving(false);
    }
  };

  const handleSave = (event) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setNameError("Category name is too short");
      return;
    }
    setNameError("");
    send(() =>
      category
        ? updateCategoryRequest(restaurantId, category.id, { name: trimmed })
        : createCategoryRequest(restaurantId, trimmed),
    );
  };

  return (
    <Sheet
      title={category ? "Edit category" : "Add a category"}
      description="Categories group your dishes, e.g. Rice dishes, Soups, Drinks."
      onClose={onClose}
    >
      <form onSubmit={handleSave} noValidate className="space-y-5 p-4">
        {errorMessage && <Alert>{errorMessage}</Alert>}
        <FormField
          id="category-name"
          label="Name"
          value={name}
          maxLength={80}
          placeholder="e.g. Rice dishes"
          onChange={(event) => setName(event.target.value)}
          error={nameError}
        />
        <Button
          type="submit"
          disabled={isSaving}
          className="h-12 w-full font-bold sm:w-auto sm:px-8"
        >
          {isSaving ? "Saving…" : category ? "Save" : "Add category"}
        </Button>

        {category && (
          <div className="border-t border-border pt-4">
            {itemCount > 0 ? (
              // Never silently leaves dishes without a category [AC-MENU-02]
              <p className="text-[15px] text-muted-foreground">
                To delete this category, first move its {itemCount} dish
                {itemCount === 1 ? "" : "es"} to another category, or delete{" "}
                {itemCount === 1 ? "it" : "them"}.
              </p>
            ) : (
              <Button
                type="button"
                variant="destructive"
                disabled={isSaving}
                onClick={() => send(() => deleteCategoryRequest(restaurantId, category.id))}
                className="h-12 font-bold"
              >
                Delete this category
              </Button>
            )}
          </div>
        )}
      </form>
    </Sheet>
  );
};

export default CategorySheet;
