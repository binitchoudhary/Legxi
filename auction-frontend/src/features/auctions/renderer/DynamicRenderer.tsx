import React from 'react';
import type { ResolvedAuctionPage, ContentModule } from '../engine/types';
import { 
  resolveLayout, 
  resolveHero, 
  resolveGallery, 
  resolveConsole,
  resolveSection,
  validateAgainstManifest
} from '../engine/registry';
import { logger } from '../engine/logger';

interface DynamicRendererProps {
  payload: ResolvedAuctionPage;
}

export function DynamicRenderer({ payload }: DynamicRendererProps) {
  const version = payload.configuration.schema_version;
  const { visual, theme: themeContext } = payload.configuration;

  // 1. Resolve Layout
  const layoutReg = resolveLayout(version, visual.layout);
  if (!layoutReg) {
    // This shouldn't happen because resolveLayout has a fallback, but just in case
    logger.error('E-1001', 'Critical: Layout resolution failed even with fallback.', { layout: visual.layout });
    throw new Error('Critical: Failed to resolve layout.');
  }

  // 2. Resolve Core Components
  const heroReg = resolveHero(version, visual.hero);
  const galleryReg = resolveGallery(version, visual.gallery);
  const consoleReg = resolveConsole(version, visual.console);

  // 3. Validate Manifest
  const requestedModuleTypes = payload.content_modules.map((m) => m.type);
  const validation = validateAgainstManifest(
    layoutReg.manifest,
    requestedModuleTypes,
    visual.gallery,
    visual.console,
    visual.hero,
    themeContext.theme_preset
  );

  // 4. Resolve Content Modules
  // We filter out any unsupported modules to avoid runtime errors or breaking the layout
  const validModulesToRender = payload.content_modules.filter(
    (mod) => !validation.unsupportedModules.includes(mod.type)
  );

  // 5. Instantiate Core Slots
  const HeroComponent = heroReg?.component;
  const heroSlot = HeroComponent ? (
    <HeroComponent
      product={payload.product}
      auction={payload.auction}
      themeContext={themeContext}
    />
  ) : null;

  const GalleryComponent = galleryReg?.component;
  const gallerySlot = GalleryComponent ? (
    <GalleryComponent
      media={payload.product.media}
      themeContext={themeContext}
    />
  ) : null;

  const ConsoleComponent = consoleReg?.component;
  const consoleSlot = ConsoleComponent ? (
    <ConsoleComponent
      auction={payload.auction}
      behavior={payload.configuration.behavior}
      permissions={payload.configuration.permissions}
      featureFlags={payload.configuration.feature_flags}
      themeContext={themeContext}
    />
  ) : null;

  // 6. Render Sections
  const LayoutComponent = layoutReg.component;

  return (
    <LayoutComponent
      product={payload.product}
      auction={payload.auction}
      behavior={payload.configuration.behavior}
      permissions={payload.configuration.permissions}
      featureFlags={payload.configuration.feature_flags}
      themeContext={themeContext}
      contentModules={payload.content_modules}
      heroSlot={heroSlot}
      gallerySlot={gallerySlot}
      consoleSlot={consoleSlot}
    >
      {validModulesToRender.map((module: ContentModule, idx) => {
        const sectionReg = resolveSection(version, module.type);
        if (!sectionReg) return null; // Unregistered module

        const SectionComponent = sectionReg.component;
        return (
          <SectionComponent
            key={`${module.type}-${idx}`}
            data={module.data}
            auctionId={payload.auction.id}
            themeContext={themeContext}
          />
        );
      })}
    </LayoutComponent>
  );
}
