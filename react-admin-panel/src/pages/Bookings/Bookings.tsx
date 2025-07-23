import React from 'react';
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHead } from '@/components/ui/Table';

// Dummy data for illustration
const bookings = [
  { id: '1', user: 'Alice', slot: '2024-07-25 10:00', status: 'confirmed' },
  { id: '2', user: 'Bob', slot: '2024-07-26 14:00', status: 'pending' },
];

export default function Bookings() {
  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Slot</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bookings.map((booking) => (
            <TableRow key={booking.id}>
              <TableCell>{booking.user}</TableCell>
              <TableCell>{booking.slot}</TableCell>
              <TableCell>{booking.status}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
} 