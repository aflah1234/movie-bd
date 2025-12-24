import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from '../src/config/db.js';
import Payment from '../src/models/paymentModel.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const clearPendingPayments = async () => {
    try {
        console.log('🧹 Clearing pending payments for development...');
        
        const connected = await connectDB();
        if (!connected) {
            console.error('Failed to connect to database');
            return;
        }
        
        // Delete all pending payments (for development only)
        const result = await Payment.deleteMany({ status: 'pending' });
        
        console.log(`✅ Cleared ${result.deletedCount} pending payments`);
        console.log('Now you can try the payment flow again');
        
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Error clearing payments:', error.message);
        process.exit(1);
    }
};

clearPendingPayments();