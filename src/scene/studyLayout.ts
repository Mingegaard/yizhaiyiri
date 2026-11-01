/** Move the courtyard study north by half its structural depth, in app metres. */
export const STUDY_DEPTH = 4.56;
export const STUDY_NORTH_SHIFT = STUDY_DEPTH / 2;
export const studyZ = (originalZ: number) => originalZ - STUDY_NORTH_SHIFT;
/** Bring the writing desk, tabletop objects and its two stools toward the south opening. */
export const DESK_SOUTH_SHIFT = .4;
export const studyDeskZ = (originalZ: number) => studyZ(originalZ) + DESK_SOUTH_SHIFT;
/** Additional headroom under the courtyard study canopy, in app metres. */
export const STUDY_CANOPY_RAISE = .4;
/** The original desk, stools and tabletop vessel remain removed. */
export const STUDY_FURNISHED = false;
