import { useState } from "react";
import { useParams } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, UtensilsCrossed } from "lucide-react";
import Container from "@/layouts/Container";
import PageHeader from "@/components/common/PageHeader";
import Skeleton from "@/components/common/Skeleton";
import EmptyState from "@/components/common/EmptyState";
import ErrorState from "@/components/common/ErrorState";
import Alert from "@/components/common/Alert";
import { Button } from "@/components/ui/button";
import MenuCategoryCard from "@/components/owner/menu/MenuCategoryCard";
import CategorySheet from "@/components/owner/menu/CategorySheet";
import MenuItemSheet from "@/components/owner/menu/MenuItemSheet";
import { getMyRestaurantRequest } from "@/api/ownerRestaurants";
import { getOwnerMenuRequest, updateCategoryRequest } from "@/api/ownerMenu";
import { useAuthStore } from "@/store/authStore";

// /owner/restaurants/:restaurantId/menu: build the menu [AC-MENU-01 to AC-MENU-10].
// Categories in the order customers see them, each with its dishes. Dishes and categories are
// added and edited in sheets; sold-out switches work at once, with no Save button.
// The menu opens once the owner's account is approved (the server's rule, requireActive).
const MenuBuilderPage = () => {
  const { restaurantId } = useParams();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const isApproved = user && user.status === "ACTIVE";
  // Which sheet is open: { kind: "category", category } or { kind: "item", item, categoryId }
  const [sheet, setSheet] = useState(null);
  const [moveError, setMoveError] = useState("");
  const [isMoving, setIsMoving] = useState(false);

  const restaurantQuery = useQuery({
    queryKey: ["owner-restaurant", restaurantId],
    queryFn: () => getMyRestaurantRequest(restaurantId),
  });
  const menuQuery = useQuery({
    queryKey: ["owner-menu", restaurantId],
    queryFn: () => getOwnerMenuRequest(restaurantId),
    enabled: isApproved,
  });

  const reloadMenu = () =>
    queryClient.invalidateQueries({ queryKey: ["owner-menu", restaurantId] });

  // Swap with the neighbour, then number every category 0, 1, 2... so the order is exact
  // even when old categories share a number. Only the ones whose number changed are sent.
  const moveCategory = async (index, direction) => {
    const categories = [...menuQuery.data];
    const [moved] = categories.splice(index, 1);
    categories.splice(index + direction, 0, moved);

    setMoveError("");
    setIsMoving(true);
    try {
      await Promise.all(
        categories
          .map((category, position) => ({ category, position }))
          .filter(({ category, position }) => category.displayOrder !== position)
          .map(({ category, position }) =>
            updateCategoryRequest(restaurantId, category.id, { displayOrder: position }),
          ),
      );
    } catch (error) {
      setMoveError(error.message);
    }
    await reloadMenu();
    setIsMoving(false);
  };

  const restaurant = restaurantQuery.data;
  const categories = menuQuery.data;

  return (
    <Container>
      <section className="mx-auto max-w-2xl py-8">
        <PageHeader
          back={{
            to: "/owner/restaurants/" + restaurantId,
            label: restaurant?.name || "Restaurant",
          }}
          title="Menu"
          subtitle="Customers see your categories and dishes in this order. Sold-out switches work at once."
          actions={
            categories &&
            categories.length > 0 && (
              <Button
                type="button"
                onClick={() => setSheet({ kind: "category", category: null })}
                className="h-11 font-bold"
              >
                <Plus size={18} aria-hidden="true" />
                Add a category
              </Button>
            )
          }
        />

        <div className="mt-6 space-y-4">
          {!isApproved && (
            <EmptyState
              icon={UtensilsCrossed}
              title="Your menu opens after approval"
              message="Once our team approves your restaurant, you can add your categories and dishes here."
            />
          )}
          {isApproved && menuQuery.isPending && (
            <>
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-48 w-full" />
            </>
          )}
          {menuQuery.error && (
            <ErrorState message={menuQuery.error.message} onRetry={menuQuery.refetch} />
          )}
          {moveError && <Alert>{moveError}</Alert>}

          {categories && categories.length === 0 && (
            <EmptyState
              icon={UtensilsCrossed}
              title="Start your menu"
              message="First add a category, e.g. Rice dishes or Soups. Then add dishes to it."
              action={{
                label: "Add a category",
                onClick: () => setSheet({ kind: "category", category: null }),
              }}
            />
          )}

          {categories &&
            categories.map((category, index) => (
              <MenuCategoryCard
                key={category.id}
                restaurantId={restaurantId}
                category={category}
                isFirst={index === 0 || isMoving}
                isLast={index === categories.length - 1 || isMoving}
                onMove={(direction) => moveCategory(index, direction)}
                onEdit={() => setSheet({ kind: "category", category })}
                onAddItem={() => setSheet({ kind: "item", item: null, categoryId: category.id })}
                onEditItem={(item) => setSheet({ kind: "item", item, categoryId: category.id })}
                onChanged={reloadMenu}
              />
            ))}
        </div>
      </section>

      {sheet && sheet.kind === "category" && (
        <CategorySheet
          restaurantId={restaurantId}
          category={sheet.category}
          onSaved={reloadMenu}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet && sheet.kind === "item" && (
        <MenuItemSheet
          restaurantId={restaurantId}
          item={sheet.item}
          categoryId={sheet.categoryId}
          categories={categories}
          onSaved={reloadMenu}
          onClose={() => setSheet(null)}
        />
      )}
    </Container>
  );
};

export default MenuBuilderPage;
