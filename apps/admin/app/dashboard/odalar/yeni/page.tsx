import type { Metadata } from 'next';
import RoomForm from '@/components/RoomForm';

export const metadata: Metadata = { title: 'Yeni Oda Modeli' };

export default function YeniOdaPage() {
  return <RoomForm mode="create" />;
}
