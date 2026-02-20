import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

export default async function globalSetup() {
  const uri = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/minglesphere_test?replicaSet=rs0';
  await mongoose.connect(uri);
  // Drop the test database to start fresh
  await mongoose.connection.db.dropDatabase();
  await mongoose.disconnect();
}
