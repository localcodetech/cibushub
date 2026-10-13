import { useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import Container from "@/layouts/Container";
import PageHeader from "@/components/common/PageHeader";
import RestaurantForm from "@/components/owner/setup/RestaurantForm";
import { createRestaurantRequest } from "@/api/ownerRestaurants";

// /owner/restaurants/new: register a restaurant [AC-REST-01]. It waits for an admin's review.
const NewRestaurantPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleSave = async (details) => {
    const restaurant = await createRestaurantRequest(details);
    await queryClient.invalidateQueries({ queryKey: ["owner-restaurants"] });
    navigate("/owner/restaurants", { state: { justSent: restaurant.name } });
  };

  return (
    <Container>
      <section className="mx-auto max-w-2xl py-8">
        <PageHeader
          back={{ to: "/owner/restaurants", label: "My restaurants" }}
          title="Register a restaurant"
          subtitle="Our team checks every restaurant before customers can order. You can change these details later."
        />
        <div className="mt-6">
          <RestaurantForm submitLabel="Send for review" onSave={handleSave} />
        </div>
      </section>
    </Container>
  );
};

export default NewRestaurantPage;
