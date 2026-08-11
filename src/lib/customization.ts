/**
 * The athlete can restyle their pixel avatar and apartment from Settings.
 * Colors are just a handful of base hexes — avatarSprites.ts and
 * roomSprites.ts derive the small highlight/shadow accents automatically
 * (see lib/color.ts) so any combination still looks intentional. A couple of
 * room features (the TV channel, the reading-corner decor) are swapped for a
 * whole different hand-drawn look rather than recolored.
 */

export interface AvatarCustomization {
  hair: string;
  skin: string;
  shirt: string;
  shorts: string;
  shoes: string;
}

export const DEFAULT_AVATAR_CUSTOMIZATION: AvatarCustomization = {
  hair: '#3A2E22',
  skin: '#E3B48C',
  shirt: '#B4552F',
  shorts: '#8B3D20',
  shoes: '#F5F4EE',
};

/** What's playing on the TV. */
export type TvChannel = 'football' | 'movie' | 'news' | 'off';

/** What's standing in the reading corner instead of (or as) the plant. */
export type Decor = 'plant' | 'bookshelf' | 'trophies';

export interface RoomCustomization {
  wall: string;
  floor: string;
  sofa: string;
  curtains: string;
  rug: string;
  tvChannel: TvChannel;
  decor: Decor;
}

export const DEFAULT_ROOM_CUSTOMIZATION: RoomCustomization = {
  wall: '#F2E9DA',
  floor: '#C29A6E',
  sofa: '#8A9A7C',
  curtains: '#8A9A7C',
  rug: '#C9836A',
  tvChannel: 'football',
  decor: 'plant',
};

/** The color-pickable slots — kept separate from tvChannel/decor, which pick
 *  a whole drawn look rather than a hex. */
type RoomColorKey = 'wall' | 'floor' | 'sofa' | 'curtains' | 'rug';

/** Curated swatches offered in the customize sheet, kept within the app's
 *  muted palette family so any pick still looks intentional next to the
 *  rest of the room. A native color input sits alongside for anything else. */
export const AVATAR_SWATCHES: Record<keyof AvatarCustomization, string[]> = {
  hair: ['#3A2E22', '#1E1B18', '#5C4430', '#8A6E4B', '#C9A227', '#7A2E22'],
  skin: ['#E3B48C', '#F0CBA0', '#C99367', '#A8734A', '#7A5033', '#F5DDBB'],
  shirt: ['#B4552F', '#3B6B7A', '#4C7A3D', '#7C4B9E', '#C9A227', '#2A2620'],
  shorts: ['#8B3D20', '#2A3B45', '#33502A', '#5A356F', '#4A4038', '#1C1A17'],
  shoes: ['#F5F4EE', '#2A2620', '#B4552F', '#3B6B7A', '#C9A227', '#8B3D20'],
};

export const ROOM_SWATCHES: Record<RoomColorKey, string[]> = {
  wall: ['#F2E9DA', '#E4E9E2', '#EDE0E8', '#E9E3D6', '#D9E3E6', '#3A3733'],
  floor: ['#C29A6E', '#A87C52', '#8A6440', '#D8B78C', '#6E5640', '#B5AFA6'],
  sofa: ['#8A9A7C', '#B4552F', '#3B6B7A', '#7C4B9E', '#C9A227', '#4A4038'],
  curtains: ['#8A9A7C', '#B4552F', '#3B6B7A', '#C9A227', '#7C4B9E', '#4A4038'],
  rug: ['#C9836A', '#B4552F', '#3B6B7A', '#4C7A3D', '#7C4B9E', '#4A4038'],
};

export const TV_CHANNEL_OPTIONS: { value: TvChannel; label: string }[] = [
  { value: 'football', label: 'Football' },
  { value: 'movie', label: 'Movie' },
  { value: 'news', label: 'News' },
  { value: 'off', label: 'Off' },
];

export const DECOR_OPTIONS: { value: Decor; label: string }[] = [
  { value: 'plant', label: 'Plant' },
  { value: 'bookshelf', label: 'Bookshelf' },
  { value: 'trophies', label: 'Trophy shelf' },
];
