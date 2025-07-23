import React from 'react';
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHead } from '@/components/ui/Table';

// Dummy data for illustration
const wallets = [
  { id: '1', influencer: 'Alice', balance: 1200 },
  { id: '2', influencer: 'Bob', balance: 800 },
];

export default function Wallets() {
  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Influencer</TableHead>
            <TableHead>Balance</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {wallets.map((wallet) => (
            <TableRow key={wallet.id}>
              <TableCell>{wallet.influencer}</TableCell>
              <TableCell>${wallet.balance}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
} 