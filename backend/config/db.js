import mongoose from 'mongoose';

mongoose.set('strictQuery', true);

export async function connectDB(uri) {
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  } catch (err) {
    const hint = uri.startsWith('mongodb+srv')
      ? 'Check your Atlas username/password, and that your IP address is allowed under Network Access.'
      : 'Is MongoDB running? On Windows check the "MongoDB" service; on macOS/Linux start `mongod`.';
    err.message = `Could not connect to MongoDB: ${err.message}\n${hint}`;
    throw err;
  }
  return mongoose.connection;
}

export async function disconnectDB() {
  await mongoose.disconnect();
}
