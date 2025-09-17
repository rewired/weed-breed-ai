export type RoomPurpose = 'growroom' | 'salesroom' | 'lab' | 'breakroom';

export const roomPurposes: { readonly id: RoomPurpose; readonly name: string }[] = [
  { id: 'growroom', name: 'Grow Room' },
  { id: 'salesroom', name: 'Sales Room' },
  { id: 'lab', name: 'Laboratory' },
  { id: 'breakroom', name: 'Break Room' },
];