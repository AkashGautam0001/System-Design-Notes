import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

export default async function globalTeardown() {
  const uri = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/minglesphere_test?replicaSet=rs0';
  await mongoose.connect(uri);
  await mongoose.connection.db.dropDatabase();
  await mongoose.disconnect();
}
