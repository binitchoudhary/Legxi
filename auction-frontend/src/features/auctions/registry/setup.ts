import {
  registerLayout,
  registerHero,
  registerGallery,
  registerConsole,
  registerSection,
  setLatestVersion
} from '../engine/registry';

import { ClassicLayout } from '../layouts/classic';
import { ImmersiveHero } from '../components/hero/ImmersiveHero';
import { CarouselGallery } from '../components/gallery/CarouselGallery';
import { FloatingConsole } from '../components/console/FloatingConsole';
import { AuctionStory } from '../components/sections/AuctionStory';
import { TimelineSection } from '../components/sections/TimelineSection';

export function initializeRegistry() {
  setLatestVersion('v1');

  // Register Classic Layout
  registerLayout('v1', {
    manifest: {
      key: 'classic',
      displayName: 'Classic Layout',
      schemaVersions: ['v1'],
      supportedModules: ['auction_story', 'timeline', 'condition_report', 'authentication_block', 'player_profile'],
      supportedGalleries: ['carousel', 'grid'],
      supportedConsoles: ['floating', 'inline'],
      supportedHeroes: ['immersive', 'minimal'],
      supportedThemes: ['gold', 'dark'],
      supportedMedia: ['IMAGE', 'VIDEO']
    },
    component: ClassicLayout
  });

  // Register Hero
  registerHero('v1', {
    key: 'immersive',
    component: ImmersiveHero
  });

  // Register Gallery
  registerGallery('v1', {
    key: 'carousel',
    component: CarouselGallery
  });

  // Register Console
  registerConsole('v1', {
    key: 'floating',
    component: FloatingConsole
  });

  // Register Sections
  registerSection('v1', {
    manifest: { type: 'auction_story', displayName: 'Auction Story', schemaVersions: ['v1'] },
    component: AuctionStory as any
  });

  registerSection('v1', {
    manifest: { type: 'timeline', displayName: 'Timeline', schemaVersions: ['v1'] },
    component: TimelineSection as any
  });
}
