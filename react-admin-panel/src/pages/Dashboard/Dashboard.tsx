import React from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { useUsers } from '@/hooks/useUsers';
import { useServices } from '@/hooks/useServices';
import { useOrders } from '@/hooks/useOrders';

export default function Dashboard() {
  const { data: users = [] } = useUsers();
  const { data: services = [] } = useServices();
  const { data: orders = [] } = useOrders();

  return (
    <div className="grid gap-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>Users</CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>Services</CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{services.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>Orders</CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orders.length}</div>
          </CardContent>
        </Card>
      </div>
      <div>
        <h2 className="text-lg font-semibold mb-2">Recent Orders</h2>
        <div className="bg-card rounded-lg p-4 shadow">
          {orders.slice(0, 5).map((order) => (
            <div key={order.id} className="border-b last:border-0 py-2 flex justify-between">
              <span>Order #{order.id}</span>
              <span className="text-muted-foreground">{order.status}</span>
            </div>
          ))}
          {orders.length === 0 && <div className="text-muted-foreground">No recent orders.</div>}
        </div>
      </div>
    </div>
  );
} 