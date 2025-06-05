#!/usr/bin/env node
/**
 * Direct test for Miami - calls browser automation directly
 */

import { CPMaxxBrowserAutomation } from './dist/browser-automation.js';

console.log('🌴 DIRECT MIAMI HOTEL SEARCH TEST');
console.log('=================================');
console.log('Calling browser automation directly for Miami, Florida');
console.log('');

const credentials = {
  login: process.env.CPMAXX_LOGIN || 'kim.henderson@cruiseplanners.com',
  password: process.env.CPMAXX_PASSWORD || '3!Pineapples'
};

const searchParams = {
  location: 'Miami, Florida',
  checkInDate: '2025-07-15',
  checkOutDate: '2025-07-20',
  rooms: 1,
  adults: 2,
  children: 0
};

const browserConfig = {
  headless: true,
  visible: false,
  timeout: 30000,
  debug: true
};

console.log('🔍 SEARCH PARAMETERS:');
console.log('===================');
console.log(`📍 Location: ${searchParams.location}`);
console.log(`📅 Check-in: ${searchParams.checkInDate}`);
console.log(`📅 Check-out: ${searchParams.checkOutDate}`);
console.log(`🛏️ Rooms: ${searchParams.rooms}`);
console.log(`👥 Adults: ${searchParams.adults}, Children: ${searchParams.children}`);
console.log('');

console.log('🚀 Starting direct browser automation...');

async function runTest() {
  try {
    const result = await CPMaxxBrowserAutomation.searchHotels(
      credentials,
      searchParams,
      browserConfig
    );

    console.log('');
    console.log('🎯 COMPLETE RAW RESULT DATA');
    console.log('===========================');
    console.log(JSON.stringify(result, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

runTest();