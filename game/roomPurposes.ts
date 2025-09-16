export type RoomPurpose = 'growroom' | 'salesroom' | 'lab';

export const roomPurposes: { readonly id: RoomPurpose; readonly name: string }[] = [
  { id: 'growroom', name: 'Grow Room' },
  { id: 'salesroom', name: 'Sales Room' },
  { id: 'lab', name: 'Laboratory' },
];
