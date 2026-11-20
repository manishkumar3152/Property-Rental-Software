// const mongoose = require('mongoose');

// const connectDB = async () => {
//   try {
//     const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/property_rental_erp');
//     console.log(`[Database] MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
//   } catch (error) {
//     console.error(`[Database Error] Connection failed: ${error.message}`);
//     process.exit(1);
//   }
// };

// module.exports = connectDB;




const mongoose = require('mongoose');

let cached = global._mongoose;
if (!cached) cached = global._mongoose = { conn: null, promise: null };

const connectDB = async () => {
  if (cached.conn) return cached.conn;

  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/property_rental_erp';

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(uri, {
        bufferCommands: false,
        serverSelectionTimeoutMS: 8000,
      })
      .then((m) => {
        console.log(`[Database] MongoDB Connected: ${m.connection.host}/${m.connection.name}`);
        return m;
      })
      .catch((error) => {
        cached.promise = null;
        console.error(`[Database Error] Connection failed: ${error.message}`);
        throw error;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
};

module.exports = connectDB;