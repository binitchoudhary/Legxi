import React from 'react';
import { notFound } from 'next/navigation';
import { resolveAuctionPage } from '../../../../features/auctions/resolver/index';
import { NextAuctionServices } from '../../../../features/auctions/resolver/fetcher';
import { DynamicRenderer } from '../../../../features/auctions/renderer/DynamicRenderer';
import { initializeRegistry } from '../../../../features/auctions/registry/setup';

// Initialize the registry so layouts/sections are available
initializeRegistry();

interface PageProps {
  params: { id: string };
}

export default async function AuctionPage({ params }: PageProps) {
  // Pass the local API URL to the fetcher since we're using a mock endpoint for demo
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
  const services = new NextAuctionServices(apiBaseUrl);

  try {
    const resolvedParams = await params;
    const payload = await resolveAuctionPage(resolvedParams.id, services);

    return (
      <DynamicRenderer payload={payload} />
    );
  } catch (error: any) {
    // If it's a 404 from our NextAuctionServices, render the standard 404 page
    if (error.code === 'E-NET-404') {
      notFound();
    }
    
    // For schema errors, validation errors, timeouts, etc, let them bubble up
    // to the nearest error.tsx boundary (which we already built).
    throw error;
  }
}
