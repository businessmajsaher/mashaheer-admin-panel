import React from 'react';
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHead } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';

// Dummy data for illustration
const reviews = [
  { id: '1', user: 'Alice', rating: 5, comment: 'Great!', status: 'pending' },
  { id: '2', user: 'Bob', rating: 3, comment: 'Okay', status: 'approved' },
];

export default function Reviews() {
  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Rating</TableHead>
            <TableHead>Comment</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reviews.map((review) => (
            <TableRow key={review.id}>
              <TableCell>{review.user}</TableCell>
              <TableCell>{review.rating}</TableCell>
              <TableCell>{review.comment}</TableCell>
              <TableCell>{review.status}</TableCell>
              <TableCell>
                <Button size="sm">Approve</Button>
                <Button size="sm" variant="outline">Reject</Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
} 