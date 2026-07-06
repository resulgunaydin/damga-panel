import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { STATUS_LABEL, logActivity } from "@/lib/business";

// Telefonu karşılaştırma için sadeleştir (sadece rakam, TR ön ekleri normalize).
function normPhone(phone: string): string {
  let d = phone.replace(/\D/g, "");
  if (d.startsWith("90")) d = d.slice(2);
  if (d.startsWith("0")) d = d.slice(1);
  return d;
}

// Manuel firma ekleme (Bölüm 4.2): referansla gelen firmayı elle huniye sok.
// Çakışma koruması: aynı telefon/isim varsa uyar (409).
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  if (!name) {
    return NextResponse.json({ error: "Firma adı gerekli." }, { status: 400 });
  }
  const phone = String(body.phone ?? "").trim() || null;
  const website = String(body.website ?? "").trim() || null;

  // Çakışma kontrolü: telefon (normalize) veya birebir isim.
  const candidates = await prisma.business.findMany({
    where: {
      OR: [
        { name: { equals: name, mode: "insensitive" } },
        ...(phone ? [{ phone: { not: null } }] : []),
      ],
    },
    select: { id: true, name: true, phone: true, status: true, blacklisted: true },
  });
  const normNew = phone ? normPhone(phone) : null;
  const clash = candidates.find(
    (c) =>
      c.name.toLowerCase() === name.toLowerCase() ||
      (normNew && c.phone && normPhone(c.phone) === normNew),
  );
  if (clash) {
    return NextResponse.json(
      {
        error: "Bu firma zaten listende.",
        existing: {
          id: clash.id,
          name: clash.name,
          status: STATUS_LABEL[clash.status],
          blacklisted: clash.blacklisted,
        },
      },
      { status: 409 },
    );
  }

  const business = await prisma.business.create({
    data: {
      name,
      phone,
      website,
      manualAdded: true,
      inWorkList: true, // manuel eklenen doğrudan çalışma listesine girer
    },
  });
  await logActivity(business.id, "Manuel olarak eklendi.");
  return NextResponse.json({ business }, { status: 201 });
}
