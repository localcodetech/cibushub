import Container from "@/layouts/Container";
import PageHeader from "@/components/common/PageHeader";
import { List, ListRow } from "@/components/common/List";
import photoCredits from "@/data/photoCredits.json";

// /photo-credits: who took the food photos (the home page and the demo's dishes) [licences: CC BY, CC BY-SA, CC0].
// They come from Wikimedia Commons; CC BY and CC BY-SA ask us to name the photographer and
// the licence and to say the photo was changed (resized). The list comes from
// server/src/database/seeders/data/photos/credits.json (copied to data/photoCredits.json).
// [name, credit] pairs, A to Z. Photos given to us with permission have no web page (source
// is empty): their row simply isn't a link.
const credits = Object.entries(photoCredits).sort(([, a], [, b]) => a.title.localeCompare(b.title));

// "Waakye in Ghana.jpg" -> "Waakye in Ghana"
const photoName = (title) => title.replace(/\.(jpe?g|png|webp)$/i, "").replace(/_/g, " ");

const PhotoCreditsPage = () => {
  return (
    <Container>
      <section className="mx-auto max-w-2xl py-8">
        <PageHeader
          title="Photo credits"
          subtitle="Most food photos on CibusHub come from Wikimedia Commons; the rest were given to us with permission. Thank you to the photographers. Each photo was resized for the web."
        />
        <List className="mt-6">
          {credits.map(([name, credit]) => (
            <ListRow
              key={name}
              href={credit.source || undefined}
              title={photoName(credit.title)}
              meta={"By " + credit.author + " · " + credit.license}
            />
          ))}
        </List>
      </section>
    </Container>
  );
};

export default PhotoCreditsPage;
