# UX Reference Analysis: Luxury Collectibles & Auctions

To build a premium, world-class luxury auction experience for LEGXI, we analyzed the layout, hierarchy, and interaction design of industry leaders: **MatchWornShirt (MWS)**, **Sotheby's**, **Goldin Auctions**, **Christie's**, **Collectable**, and **Rally**.

## 1. Page Hierarchy & Structure
- **Sotheby's & Christie's**: Emphasize breathing room and expansive white/black space. They avoid clustering data. Information is progressively disclosed.
- **MatchWornShirt**: Highly focused on the emotion of the sport/event. Uses massive, immersive hero banners that drop the user straight into the action, immediately building excitement.
- **Goldin**: Focuses heavily on high-resolution imagery and current bid prominence.
- **LEGXI Implementation**: We will adopt the MWS/Sotheby's hybrid. A massive, cinematic hero section (min 85vh) to evoke emotion, followed by generous spacing for featured items, trusting the user to scroll rather than cramming information "above the fold."

## 2. Spacing & Typography
- **Spacing**: Luxury design uses macro-spacing (large gaps between sections) and micro-spacing (tight relationship between labels and values). There are no "dashboard-style" borders strictly dividing every component. 
- **Typography**: Highly contrasted typography. Large, thin, or very bold serif/sans-serif headers mixed with highly readable, slightly muted tracking for descriptions.
- **LEGXI Implementation**: Use `tracking-tight` for massive headings, `tracking-widest uppercase text-xs` for labels (e.g. LOT #, STATUS). The primary palette will be deep rich dark mode (`#050505` background, `#121212` elevated surfaces) with a signature gold/champagne accent (`#D4AF37`) for critical actions like bidding.

## 3. Product Layout (The Centerpiece)
- **Sotheby's/MWS**: The product page is split roughly 60/40 or 50/50. The left side is a high-resolution, edge-to-edge image gallery that often sticks to the viewport while the right side scrolls.
- **Storytelling**: They sell the *story*, not just the item. Sections include Provenance, Authentication, Condition, and Shipping.
- **LEGXI Implementation**: We will implement a split layout. Even when backend data (like 'Story' or 'Condition') is unavailable, we will render beautiful placeholder accordions stating: *"Full provenance and condition reports will be published prior to the final hammer."* This ensures the layout always feels robust and premium.

## 4. Auction Cards & Grid Proportions
- **Card Design**: Cards are not boxed with heavy borders. They rely on the image to define the boundaries. The images are high-res, often with a subtle backdrop.
- **Interactive Elements**: A gentle, slow hover scale (zoom) on the image. Badges (e.g., "Live", "Auth") float over the image elegantly, not as massive blocks.
- **LEGXI Implementation**: Edge-to-edge photography with a subtle gradient overlay at the bottom for text legibility. Hovering lifts the card slightly and zooms the image slowly (`duration-500` or `duration-700`).

## 5. Trust Sections & Authentication Flow
- **Authentication**: High-end items require immense trust. Pages dedicate entire visual sections to certificates of authenticity (COA), holographic seals, and process videos.
- **LEGXI Implementation**: The homepage will feature a dedicated "Why Collectors Trust LEGXI" section with high-quality icons/graphics. The login flow will adopt a cinematic split-screen, incorporating trust messaging directly into the authentication process.

## 6. Empty States & Graceful Degradation
- **Industry Standard**: You will never see a massive grey box saying "No Data" on Sotheby's. If a filter returns no results, the grid structure remains, offering curated suggestions or visually pleasing placeholders.
- **LEGXI Implementation**: Empty grids will contain beautifully skeletonized or placeholder "Upcoming Drop" cards. Missing product metadata will gracefully fallback to standard, elegant typography notifying the user that data is pending, maintaining the illusion of a fully populated, luxury interface at all times.

## 7. Motion & Mobile Behavior
- **Motion**: Animations are purposeful. Fades, slow image zooms, and subtle ripple/lift effects. Nothing is bouncy or frantic.
- **Mobile**: The cinematic feel must translate to mobile. Full-bleed images on mobile screens, sticky "Place Bid" bars at the bottom of the viewport so the CTA is always accessible while reading the provenance.
