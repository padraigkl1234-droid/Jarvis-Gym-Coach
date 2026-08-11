'use client';

import React, { useMemo, useState } from 'react';
import { PixelAvatar } from '@/components/PixelAvatar';
import { PixelRoom } from '@/components/PixelRoom';
import { buildAvatarPalette } from '@/lib/avatarSprites';
import { buildRoom, buildRoomPalette, ROOM_GRID_SIZE } from '@/lib/roomSprites';
import {
  AVATAR_SWATCHES,
  DECOR_OPTIONS,
  DEFAULT_AVATAR_CUSTOMIZATION,
  DEFAULT_ROOM_CUSTOMIZATION,
  ROOM_SWATCHES,
  TV_CHANNEL_OPTIONS,
  type AvatarCustomization,
  type RoomCustomization,
} from '@/lib/customization';
import { Chip, CtaButton, Field, Sheet } from '@/components/ui';

const AVATAR_LABELS: Record<keyof AvatarCustomization, string> = {
  hair: 'Hair',
  skin: 'Skin',
  shirt: 'Shirt',
  shorts: 'Shorts',
  shoes: 'Shoes',
};

const ROOM_COLOR_LABELS: Record<'wall' | 'floor' | 'sofa' | 'curtains' | 'rug', string> = {
  wall: 'Wall',
  floor: 'Floor',
  sofa: 'Sofa',
  curtains: 'Curtains',
  rug: 'Rug',
};

/** A swatch grid for one customizable feature: curated color chips plus a
 *  native color input for anything else. */
function SwatchPicker({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (hex: string) => void;
}) {
  const isCustom = !options.some((o) => o.toLowerCase() === value.toLowerCase());
  return (
    <Field label={label}>
      <div className="flex flex-wrap items-center gap-2.5">
        {options.map((hex) => {
          const active = hex.toLowerCase() === value.toLowerCase();
          return (
            <button
              key={hex}
              type="button"
              aria-label={`${label}: ${hex}`}
              aria-pressed={active}
              onClick={() => onChange(hex)}
              className="h-8 w-8 shrink-0 rounded-full transition-transform"
              style={{
                backgroundColor: hex,
                boxShadow: active ? '0 0 0 2px #B4552F, inset 0 0 0 1px rgba(0,0,0,.08)' : 'inset 0 0 0 1px rgba(0,0,0,.08)',
                transform: active ? 'scale(1.1)' : undefined,
              }}
            />
          );
        })}
        <label
          className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border-[1.5px] border-dashed border-hairline text-[10px] font-bold text-faint"
          style={isCustom ? { backgroundColor: value, borderStyle: 'solid', borderColor: 'transparent', boxShadow: '0 0 0 2px #B4552F' } : undefined}
        >
          {!isCustom && '+'}
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            aria-label={`${label}: custom color`}
            className="absolute -inset-2 h-[calc(100%+16px)] w-[calc(100%+16px)] cursor-pointer opacity-0"
          />
        </label>
      </div>
    </Field>
  );
}

/** A row of labeled chips for picking between a few whole-look options
 *  (TV channel, reading-corner decor) rather than a color. */
function OptionPicker<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <Field label={label}>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <Chip key={o.value} active={value === o.value} onClick={() => onChange(o.value)}>
            {o.label}
          </Chip>
        ))}
      </div>
    </Field>
  );
}

export function CustomizeSheet({
  avatar,
  room,
  onSave,
  onClose,
}: {
  avatar: AvatarCustomization;
  room: RoomCustomization;
  onSave: (avatar: AvatarCustomization, room: RoomCustomization) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<'avatar' | 'room'>('avatar');
  const [draftAvatar, setDraftAvatar] = useState<AvatarCustomization>(avatar);
  const [draftRoom, setDraftRoom] = useState<RoomCustomization>(room);

  const avatarPalette = useMemo(() => buildAvatarPalette(draftAvatar), [draftAvatar]);
  const roomPalette = useMemo(() => buildRoomPalette(draftRoom), [draftRoom]);
  const roomGrid = useMemo(
    () => buildRoom({ tvChannel: draftRoom.tvChannel, decor: draftRoom.decor }),
    [draftRoom.tvChannel, draftRoom.decor]
  );

  return (
    <Sheet onClose={onClose} label="Customize your avatar and room">
      <h2 className="font-display text-[24px] text-ink">Customize</h2>
      <p className="mt-1.5 text-[13px] text-muted">Restyle your avatar and apartment on the Home tab. Purely for fun.</p>

      {/* Live preview */}
      <div className="relative mt-4 overflow-hidden rounded-[18px]" style={{ aspectRatio: `${ROOM_GRID_SIZE.width} / ${ROOM_GRID_SIZE.height}` }}>
        <PixelRoom className="absolute inset-0 h-full w-full" grid={roomGrid} palette={roomPalette} tvChannel={draftRoom.tvChannel} />
      </div>
      <div className="mt-3 flex justify-center">
        <PixelAvatar state="idle" size={72} palette={avatarPalette} />
      </div>

      {/* Tabs */}
      <div className="mt-4 flex gap-2">
        <Chip active={tab === 'avatar'} onClick={() => setTab('avatar')}>
          Avatar
        </Chip>
        <Chip active={tab === 'room'} onClick={() => setTab('room')}>
          Room
        </Chip>
      </div>

      {tab === 'avatar' && (
        <div className="mt-4 space-y-4">
          {(Object.keys(AVATAR_LABELS) as (keyof AvatarCustomization)[]).map((key) => (
            <SwatchPicker
              key={key}
              label={AVATAR_LABELS[key]}
              value={draftAvatar[key]}
              options={AVATAR_SWATCHES[key]}
              onChange={(hex) => setDraftAvatar((cur) => ({ ...cur, [key]: hex }))}
            />
          ))}
          <button type="button" onClick={() => setDraftAvatar(DEFAULT_AVATAR_CUSTOMIZATION)} className="text-[12px] font-bold text-faint hover:text-clay">
            Reset avatar to default
          </button>
        </div>
      )}

      {tab === 'room' && (
        <div className="mt-4 space-y-4">
          <OptionPicker label="TV channel" value={draftRoom.tvChannel} options={TV_CHANNEL_OPTIONS} onChange={(tvChannel) => setDraftRoom((cur) => ({ ...cur, tvChannel }))} />
          <OptionPicker label="Reading corner" value={draftRoom.decor} options={DECOR_OPTIONS} onChange={(decor) => setDraftRoom((cur) => ({ ...cur, decor }))} />
          {(Object.keys(ROOM_COLOR_LABELS) as (keyof typeof ROOM_COLOR_LABELS)[]).map((key) => (
            <SwatchPicker
              key={key}
              label={ROOM_COLOR_LABELS[key]}
              value={draftRoom[key]}
              options={ROOM_SWATCHES[key]}
              onChange={(hex) => setDraftRoom((cur) => ({ ...cur, [key]: hex }))}
            />
          ))}
          <button type="button" onClick={() => setDraftRoom(DEFAULT_ROOM_CUSTOMIZATION)} className="text-[12px] font-bold text-faint hover:text-clay">
            Reset room to default
          </button>
        </div>
      )}

      <CtaButton
        className="mt-6 !py-3.5"
        onClick={() => {
          onSave(draftAvatar, draftRoom);
          onClose();
        }}
      >
        Save
      </CtaButton>
    </Sheet>
  );
}
