import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SERVER_BASE = 'http://localhost:8000';

const testShowAPI = async () => {
    try {
        console.log('Testing show API endpoints...');
        
        // Test without authentication first
        console.log('\n1. Testing show API without auth:');
        const response1 = await fetch(`${SERVER_BASE}/api/show/by-date?movieId=6940220e2e3e5383254a52c4&date=2025-12-20`);
        console.log('Status:', response1.status);
        const data1 = await response1.text();
        console.log('Response:', data1);
        
        // Test if the route exists at all
        console.log('\n2. Testing if show routes are mounted:');
        const response2 = await fetch(`${SERVER_BASE}/api/show/`);
        console.log('Status:', response2.status);
        const data2 = await response2.text();
        console.log('Response:', data2);
        
    } catch (error) {
        console.error('Error testing show API:', error.message);
    }
};

testShowAPI();