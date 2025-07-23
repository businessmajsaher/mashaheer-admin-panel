import React from 'react';
import { Button } from '@/components/ui/Button';

export default function Settings() {
  return (
    <form className="space-y-4 max-w-md">
      <div>
        <label className="block mb-1 font-medium">Admin Name</label>
        <input className="border rounded px-2 py-1 w-full" defaultValue="Admin" />
      </div>
      <div>
        <label className="block mb-1 font-medium">Email</label>
        <input className="border rounded px-2 py-1 w-full" defaultValue="admin@example.com" />
      </div>
      <div>
        <label className="block mb-1 font-medium">Platform Setting</label>
        <input className="border rounded px-2 py-1 w-full" defaultValue="Some value" />
      </div>
      <Button type="submit">Save Changes</Button>
    </form>
  );
} 