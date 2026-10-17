import { z } from "zod";
import { getCatalogCompany, saveCatalogCompany } from "@/lib/dossier-store";
import { collectCompanyContacts } from "@/lib/company-contact-collector";
import { proposalRequestAllowed } from "@/lib/proposal-request";
export const runtime = "nodejs";
export const maxDuration = 45;
export async function POST(request: Request) {
  if (!proposalRequestAllowed(request, "contacts"))
    return Response.json(
      { error: "Please wait before refreshing contacts." },
      { status: 429 },
    );
  try {
    const raw = await request.text();
    if (raw.length > 1000)
      return Response.json({ error: "Request too large." }, { status: 413 });
    const { companyId } = z
      .object({ companyId: z.string().max(100) })
      .parse(JSON.parse(raw));
    const company = await getCatalogCompany(companyId);
    if (!company?.website)
      return Response.json(
        { error: "Research a confirmed company website first." },
        { status: 404 },
      );
    const contacts = await collectCompanyContacts(company.website);
    await saveCatalogCompany({ ...company, contacts });
    return Response.json(
      { contacts },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { error: "Could not refresh company contacts." },
      { status: 502 },
    );
  }
}
