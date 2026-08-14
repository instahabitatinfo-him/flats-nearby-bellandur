import { NextRequest, NextResponse } from "next/server";

const NOMINATIM_URL =
  "https://nominatim.openstreetmap.org/search";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();

  if (!query) {
    return NextResponse.json(
      { error: "Search query is required." },
      { status: 400 }
    );
  }

  if (query.length < 2) {
    return NextResponse.json(
      { error: "Search query is too short." },
      { status: 400 }
    );
  }

  try {
    const url = new URL(NOMINATIM_URL);

    url.searchParams.set("q", query);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "5");
    url.searchParams.set("addressdetails", "1");

    const response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": "FlatsNearby/1.0 (property location search)",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Location search service is unavailable." },
        { status: 502 }
      );
    }

    const results = await response.json();

    return NextResponse.json(results);
  } catch {
    return NextResponse.json(
      { error: "Unable to search for the location." },
      { status: 500 }
    );
  }
}
