/** Keep in sync with responsive rules in src/styles/global.css and AppHeader.css */
export const BREAKPOINT_TABLET_PX = 1024;
export const BREAKPOINT_MOBILE_PX = 768;

export const MEDIA_TABLET = `(max-width: ${BREAKPOINT_TABLET_PX}px)`;
export const MEDIA_MOBILE = `(max-width: ${BREAKPOINT_MOBILE_PX}px)`;
export const MEDIA_DESKTOP = `(min-width: ${BREAKPOINT_TABLET_PX + 1}px)`;
