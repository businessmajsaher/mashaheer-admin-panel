import React from 'react';
import { useServices } from '@/hooks/useServices';
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHead } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';

export default function Services() {
  const { data: services = [], create, update, remove } = useServices();

  return (
    <div className="space-y-4">
      <Button onClick={() => create.mutate({ name: 'New Service', description: '...', price: 100, category: 'General', created_at: new Date().toISOString() })}>
        Add Service
      </Button>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {services.map((service) => (
            <TableRow key={service.id}>
              <TableCell>{service.name}</TableCell>
              <TableCell>{service.description}</TableCell>
              <TableCell>{service.price}</TableCell>
              <TableCell>{service.category}</TableCell>
              <TableCell>
                <Button size="sm" onClick={() => update.mutate({ id: service.id, updates: { name: service.name + '!' } })}>Edit</Button>
                <Button size="sm" variant="outline" onClick={() => remove.mutate(service.id)}>Delete</Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
} 