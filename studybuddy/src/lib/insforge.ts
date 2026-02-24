import { createClient } from "@insforge/sdk";

// Client-side SDK — anon key needed for realtime WebSocket auth
export const insforge = createClient({
  baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL!,
  anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!,
});
