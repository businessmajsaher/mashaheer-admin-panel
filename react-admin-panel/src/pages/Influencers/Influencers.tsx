import React from 'react';
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHead } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';

// Dummy data for illustration
const influencers = [
  { id: '1', name: 'Alice', status: 'pending' },
  { id: '2', name: 'Bob', status: 'verified' },
];

export default function Influencers() {
  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {influencers.map((inf) => (
            <TableRow key={inf.id}>
              <TableCell>{inf.name}</TableCell>
              <TableCell>{inf.status}</TableCell>
              <TableCell>
                <Button size="sm">Approve</Button>
                <Button size="sm" variant="outline">Suspend</Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
} 