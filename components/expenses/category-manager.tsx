"use client";

import { useState } from "react";
import { toast } from "sonner";
import { PlusIcon, TrashIcon, Loader2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  type CategoryDto,
  createCategoryRequest,
  deleteCategoryRequest,
  FetchError,
} from "@/lib/api-client";

const PRESET_COLORS = [
  "#F97316", // orange
  "#3B82F6", // blue
  "#EC4899", // pink
  "#EAB308", // yellow
  "#8B5CF6", // purple
  "#22C55E", // green
  "#EF4444", // red
  "#06B6D4", // cyan
  "#F59E0B", // amber
  "#6366F1", // indigo
];

export type CategoryManagerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: CategoryDto[];
  onCategoriesChange: (categories: CategoryDto[]) => void;
  suggestedName?: string;
};

export function CategoryManager({
  open,
  onOpenChange,
  categories,
  onCategoriesChange,
  suggestedName,
}: Readonly<CategoryManagerProps>) {
  const [newName, setNewName] = useState(() => suggestedName?.trim() ?? "");
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!newName.trim()) {
      toast.error("Please enter a category name");
      return;
    }

    setIsCreating(true);
    try {
      const created = await createCategoryRequest({
        name: newName.trim(),
        color: newColor,
      });
      onCategoriesChange([...categories, created]);
      setNewName("");
      setNewColor(
        PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)],
      );
      toast.success(`Category "${created.name}" created`);
    } catch (err) {
      const message =
        err instanceof FetchError
          ? (err.body?.error?.message ?? err.message)
          : "Could not create category";
      toast.error(message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (category: CategoryDto) => {
    setDeletingId(category.id);
    try {
      await deleteCategoryRequest(category.id);
      onCategoriesChange(categories.filter((c) => c.id !== category.id));
      toast.success(`Category "${category.name}" deleted`);
    } catch (err) {
      const message =
        err instanceof FetchError
          ? (err.body?.error?.message ?? err.message)
          : "Could not delete category";
      toast.error(message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Categories</DialogTitle>
          <DialogDescription>
            Add custom categories or remove ones you don&apos;t need
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Add new category */}
          <div className="space-y-3 rounded-lg border p-4">
            <Label className="text-sm font-medium">Add New Category</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Category name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCreate();
                  }
                }}
                className="flex-1"
              />
              <input
                type="color"
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
                className="h-9 w-12 cursor-pointer rounded-md border p-1"
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setNewColor(color)}
                  className={`size-6 rounded-full border-2 transition-transform hover:scale-110 ${
                    newColor === color
                      ? "border-foreground"
                      : "border-transparent"
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <Button
              onClick={handleCreate}
              disabled={isCreating || !newName.trim()}
              className="w-full gap-2"
            >
              {isCreating ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <PlusIcon className="size-4" />
              )}
              Add Category
            </Button>
          </div>

          {/* Existing categories */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Categories ({categories.length})
            </Label>
            <div className="max-h-64 space-y-1 overflow-y-auto">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-muted/50"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="size-3 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="text-sm">{category.name}</span>
                    {category.isDefault && (
                      <Badge variant="secondary" className="text-xs">
                        Default
                      </Badge>
                    )}
                  </div>
                  {!category.isDefault && (
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => handleDelete(category)}
                      disabled={deletingId === category.id}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      {deletingId === category.id ? (
                        <Loader2Icon className="size-3.5 animate-spin" />
                      ) : (
                        <TrashIcon className="size-3.5" />
                      )}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
