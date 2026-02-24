import { createClient } from "@insforge/sdk";

// Server-side SDK — uses API key for DB, AI, and privileged operations
export const insforgeServer = createClient({
  baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL!,
  anonKey: process.env.INSFORGE_API_KEY!,
  headers: {
    "x-api-key": process.env.INSFORGE_API_KEY!,
  },
});
