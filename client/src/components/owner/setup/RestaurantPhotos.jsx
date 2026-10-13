import Card, { CardHeader } from "@/components/common/Card";
import FileUploadRow from "@/components/common/FileUploadRow";
import CoverPlaceholder from "@/components/restaurant/CoverPlaceholder";
import { uploadRestaurantImageRequest } from "@/api/ownerRestaurants";

const IMAGE_TYPES = "image/jpeg,image/png,image/webp";

// The logo and cover photo customers see [AC-REST-01, AC-IMG-01]. Each one is sent as soon
// as it's picked; the server checks it, resizes it and replaces the old one.
//   onUploaded(): the page loads the restaurant again, so the new photo shows
const RestaurantPhotos = ({ restaurant, onUploaded }) => {
  const upload = async (kind, file) => {
    await uploadRestaurantImageRequest(restaurant.id, kind, file);
    await onUploaded();
  };

  return (
    <Card padding="lg">
      <CardHeader title="Photos" level={2} />

      {/* The cover: the wide photo at the top of the restaurant's page */}
      {restaurant.coverImageUrl ? (
        <img
          src={restaurant.coverImageUrl}
          alt="Cover photo"
          className="h-32 w-full rounded-xl object-cover"
        />
      ) : (
        <CoverPlaceholder name={restaurant.name} size="header" />
      )}
      <FileUploadRow
        title="Cover photo"
        hint="Your best dish or the front of the restaurant. Wide photos work best. JPG, PNG or WebP, up to 5 MB."
        accept={IMAGE_TYPES}
        isDone={Boolean(restaurant.coverImageUrl)}
        onUpload={(file) => upload("cover", file)}
      />

      {/* The logo: the small square on lists and receipts */}
      <div className="mt-4 flex items-center gap-4">
        {restaurant.logoUrl ? (
          <img
            src={restaurant.logoUrl}
            alt="Logo"
            className="size-16 rounded-lg border border-border object-cover"
          />
        ) : (
          <span className="flex size-16 items-center justify-center rounded-lg border border-dashed border-border text-[13px] text-muted-foreground">
            No logo
          </span>
        )}
      </div>
      <FileUploadRow
        title="Logo"
        hint="A square image. JPG, PNG or WebP, up to 5 MB."
        accept={IMAGE_TYPES}
        isDone={Boolean(restaurant.logoUrl)}
        onUpload={(file) => upload("logo", file)}
      />
    </Card>
  );
};

export default RestaurantPhotos;
