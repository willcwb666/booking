import { getChangelogReleasesAction } from "@/server/actions/changelog";
import { ChangelogView } from "@/components/ui/changelog-view";

export default async function CompanyChangelogPage() {
  const res = await getChangelogReleasesAction();
  return <ChangelogView releases={res.releases || []} />;
}
