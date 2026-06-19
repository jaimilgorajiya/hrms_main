import mongoose from 'mongoose';

const atlasURI = 'mongodb+srv://ifloriana2025_db_user:aVzggLNwT4CfYtO5@employeecrm.fotdz28.mongodb.net/?appName=employeeCrm';

async function run() {
    const conn = await mongoose.connect(atlasURI);
    console.log("Connected to Atlas");
    const admin = conn.connection.db.admin();
    const dbs = await admin.listDatabases();
    console.log("=== Databases ===");
    console.log(dbs);
    await mongoose.disconnect();
}

run().catch(console.error);
