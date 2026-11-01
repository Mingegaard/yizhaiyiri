import { createContext } from 'react';

/** Motion advances only while a seated session is actually counting down. */
export const AtmosphereMotionContext = createContext(false);
