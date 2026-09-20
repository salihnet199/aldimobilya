/**
 * ALDi Mobilya — Advanced Motion System Types
 * Quiet Luxury + Cinematic + Editorial Image Presentation
 */

export type MotionPreset =
  | 'cinematicZoomIn'     // 1. Slow, noble scale 1.00 -> 1.055
  | 'cinematicZoomOut'    // 2. Slow breathing scale 1.055 -> 1.00
  | 'panLeft'             // 3. Subtle horizontal drift left
  | 'panRight'            // 4. Subtle horizontal drift right
  | 'panUp'               // 5. Gentle vertical tilt up
  | 'panDown'             // 6. Gentle vertical tilt down
  | 'crossFade'           // 7. Silky smooth opacity cross-dissolve
  | 'directionalSlide'    // 8. Kinetic directional shift with soft fade
  | 'blurReveal'          // 9. Ultra-subtle blur(4px) -> blur(0px) reveal
  | 'maskReveal'          // 10. Architectural geometric mask wipe
  | 'verticalReveal'      // 11. Top-to-bottom curtain reveal
  | 'horizontalReveal'    // 12. Left-to-right curtain reveal
  | 'scaleFade'           // 13. Scale 1.03 -> 1.00 with opacity fade
  | 'parallaxSubtle'      // 14. Micro depth shift on scroll (desktop only)
  | 'layeredParallax'     // 15. Multi-plane depth separation
  | 'imageDepth'          // 16. Perspective micro-shift on interaction
  | 'focusPull'           // 17. Subtle contrast & focus settle
  | 'editorialReveal'     // 18. Magazine-style asymmetrical reveal
  | 'galleryTransition'   // 19. Dedicated room gallery transition
  | 'heroCinematicMotion';// 20. Velvet breathing multi-phase director cut

export type MotionProfile =
  | 'luxury'       // Slow, graceful, stately
  | 'cinematic'    // Sweeping camera feel, gentle pan/zoom
  | 'editorial'    // High-fashion magazine reveal style
  | 'subtle'       // Lightweight micro-motion for cards & grids
  | 'hero'         // Multi-layer hero carousel presentation
  | 'gallery';     // Room detail gallery viewer

export interface MotionConfig {
  preset: MotionPreset;
  durationMs?: number;
  delayMs?: number;
  easing?: string;
  autoplay?: boolean;
}
