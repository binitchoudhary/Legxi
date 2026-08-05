import { NextResponse } from 'next/server';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const { id } = await params;
  
  const baseAuction = {
    id: "01JDH8ZBQ8M8M0000000000000",
    schemaVersion: "1.0",
    title: "Test Auction",
    handle: "test-auction",
    status: "ACTIVE",
    shopifyProductId: "gid://shopify/Product/123",
    hero: { type: "split", heading: "Test", ctaText: "Buy", images: [] },
    gallery: { type: "carousel", items: [] },
    layout: "classic",
    contentModules: [
      { type: "auction_story", order: 1, properties: { content: "Test story" } },
      { type: "timeline", order: 2, properties: { events: [] } }
    ]
  };

  const mocks: Record<string, any> = {
    'active': { ...baseAuction, status: 'ACTIVE' },
    'upcoming': { ...baseAuction, status: 'DRAFT' },
    'ended': { ...baseAuction, status: 'COMPLETED' },
    'unknown-layout': { ...baseAuction, layout: 'hologram_room' },
    'missing-story': { ...baseAuction, contentModules: baseAuction.contentModules.filter(m => m.type !== 'auction_story') },
    'missing-timeline': { ...baseAuction, contentModules: baseAuction.contentModules.filter(m => m.type !== 'timeline') },
    'unknown-module': { 
      ...baseAuction, 
      contentModules: [
        ...baseAuction.contentModules,
        { type: "hologram_viewer", order: 3, properties: {} }
      ]
    }
  };

  if (mocks[id]) {
    return NextResponse.json(mocks[id]);
  }

  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
