import { closeConnection } from './connection.js';

export async function teardown() {
  await closeConnection();
}
