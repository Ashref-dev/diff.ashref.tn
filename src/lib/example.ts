export const EXAMPLE_ORIGINAL = `import { db } from "./db";

// Fetch a user and their latest orders.
export async function getUser(id) {
  const user = await db.users.find(id);
  if (!user) {
    throw new Error("User not found");
  }

  const orders = await db.orders.where({ userId: id });
  const total = orders.reduce((sum, o) => sum + o.amount, 0);

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    orders: orders,
    total: total,
  };
}

// Orders are grouped by calendar month for the account page.
export function groupByMonth(orders) {
  const groups = new Map();
  for (const order of orders) {
    const date = new Date(order.createdAt);
    const key = \`\${date.getFullYear()}-\${date.getMonth() + 1}\`;
    const bucket = groups.get(key) ?? [];
    bucket.push(order);
    groups.set(key, bucket);
  }
  return [...groups.entries()].sort(([a], [b]) => b.localeCompare(a));
}

export function formatTotal(total) {
  return "$" + total.toFixed(2);
}
`;

export const EXAMPLE_MODIFIED = `import { db } from "./db";
import { NotFoundError } from "./errors";

// Fetch a user and their most recent orders.
export async function getUser(id: string, limit = 20) {
  const [user, orders] = await Promise.all([
    db.users.find(id),
    db.orders.where({ userId: id }).limit(limit),
  ]);
  if (!user) {
    throw new NotFoundError("user", id);
  }

  const total = orders.reduce((sum, o) => sum + o.amount, 0);

  return {
    id: user.id,
    name: user.displayName,
    email: user.email,
    orders,
    total,
  };
}

// Orders are grouped by calendar month for the account page.
export function groupByMonth(orders) {
  const groups = new Map();
  for (const order of orders) {
    const date = new Date(order.createdAt);
    const key = \`\${date.getFullYear()}-\${date.getMonth() + 1}\`;
    const bucket = groups.get(key) ?? [];
    bucket.push(order);
    groups.set(key, bucket);
  }
  return [...groups.entries()].sort(([a], [b]) => b.localeCompare(a));
}

export function formatTotal(total: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(total);
}
`;
