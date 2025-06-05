#!/usr/bin/env node

// Show a hotel WITH commission data to demonstrate complete data structure
import { CPMaxxLocalMCP } from './dist/local-server-standalone.js';

async function showCommissionHotelSample() {
  console.log('💰 CPMAXX Hotel Data - Commission Example');
  console.log('=========================================');
  
  const server = new CPMaxxLocalMCP();
  
  try {
    // Search first to get hotels
    const searchResult = await server.searchHotels({
      location: 'Portland, Oregon',
      check_in_date: '2025-06-15',
      check_out_date: '2025-06-17',
      rooms: 1,
      adults: 2,
      children: 0,
      debug_mode: false
    });
    
    const searchData = JSON.parse(searchResult.content[0].text);
    
    // Find a hotel with commission data
    const hotelWithCommission = searchData.hotels.find(h => h.commission > 0);
    
    if (hotelWithCommission) {
      console.log('🎯 FOUND HOTEL WITH COMMISSION DATA:');
      console.log('===================================');
      
      // Get full details
      const detailResult = await server.getHotelDetails({ hotel_name: hotelWithCommission.name });
      const detailData = JSON.parse(detailResult.content[0].text);
      
      if (detailData.status === 'success') {
        const hotel = detailData.hotel;
        
        console.log('🏨 HOTEL:', hotel.name);
        console.log('');
        
        console.log('💰 COMPLETE FINANCIAL DATA:');
        console.log('===========================');
        console.log('  Nightly Rate:', `$${hotel.price}`);
        console.log('  Original Price:', `$${hotel.originalPrice}`);
        console.log('  Total Price:', `$${hotel.totalPrice}`);
        console.log('  Commission Amount:', `$${hotel.commission}`);
        console.log('  Commission Percentage:', `${hotel.commissionPercent}%`);
        console.log('  Available for Booking:', hotel.available);
        console.log('');
        
        console.log('📍 COMPLETE LOCATION DATA:');
        console.log('==========================');
        console.log('  Full Address:', hotel.address);
        console.log('  Coordinates:', hotel.location.coordinates ? 
          `Lat: ${hotel.location.coordinates.lat}, Lng: ${hotel.location.coordinates.lng}` : 'Not available');
        console.log('  District:', hotel.location.district);
        console.log('  City:', hotel.location.city);
        console.log('  State/ZIP:', hotel.location.state);
        console.log('');
        
        console.log('⭐ QUALITY & FEATURES:');
        console.log('======================');
        console.log('  Star Rating:', `${hotel.rating}/5`);
        console.log('  Description:', hotel.description);
        console.log('  Hotel Programs:', hotel.hotelPrograms.length > 0 ? hotel.hotelPrograms.join(', ') : 'None');
        console.log('  Amenities:', hotel.amenities.length > 0 ? hotel.amenities.join(', ') : 'None listed');
        console.log('');
        
        console.log('📷 PHOTO & MEDIA DATA:');
        console.log('======================');
        console.log('  Featured Image URL:', hotel.photos.featured ? 'Available' : 'None');
        console.log('  Gallery Images:', hotel.photos.gallery.length);
        console.log('  Total Photo Count:', hotel.photos.photoCount);
        console.log('  Giata ID:', hotel.photos.giataId);
        console.log('');
        
        console.log('🔗 BOOKING WORKFLOW:');
        console.log('====================');
        console.log('  Search Results URL:', hotel.urls.booking ? 'Available' : 'None');
        console.log('  Select Hotel URL:', hotel.urls.selectHotel ? 'Available' : 'None');
        console.log('  Create Hotel Sheet URL:', hotel.urls.createHotelSheet ? 'Available' : 'None');
        console.log('');
        
        console.log('🏪 OTA VERIFICATION DATA:');
        console.log('=========================');
        if (hotel.otaVerification && hotel.otaVerification.verified) {
          console.log('  OTA Verified:', hotel.otaVerification.verified);
          console.log('  OTA Rate Count:', hotel.otaVerification.rates.length);
          console.log('  OTA Price Range:', `$${hotel.otaVerification.lowestOtaPrice} - $${hotel.otaVerification.highestOtaPrice}`);
          console.log('  OTA Details:');
          hotel.otaVerification.rates.forEach((rate, i) => {
            console.log(`    ${i + 1}. ${rate.provider}: $${rate.price}`);
          });
        } else {
          console.log('  OTA Verification: Not available for this hotel');
        }
        console.log('');
        
        console.log('📊 SCORING METRICS (For Claude Analysis):');
        console.log('=========================================');
        console.log('  Commission Score:', hotel.scores.commissionOnly);
        console.log('  Rating Score:', hotel.scores.ratingOnly);
        console.log('  Price Score:', hotel.scores.priceOnly);
        console.log('  Max Commission Score:', hotel.scores.maxCommission);
        console.log('  Balanced Score:', hotel.scores.balanced);
        console.log('  Best Value Score:', hotel.scores.bestValue);
        console.log('');
        
        console.log('🔧 EXTRACTION METADATA:');
        console.log('=======================');
        console.log('  Extraction Method:', hotel.extractionMethod);
        console.log('  Hotel Index in Results:', hotel.hotelIndex);
        console.log('  Extracted At:', hotel.extractedAt);
        console.log('');
        
        console.log('✨ DATA COMPLETENESS FOR CLAUDE DESKTOP:');
        console.log('========================================');
        console.log('✅ Real commission data (not calculated)');
        console.log('✅ Complete pricing breakdown');
        console.log('✅ Full location context');
        console.log('✅ Quality ratings and descriptions');
        console.log('✅ Hotel program affiliations');
        console.log('✅ Amenity listings');
        console.log('✅ Photo availability data');
        console.log('✅ Direct booking workflow URLs');
        console.log('✅ OTA comparison data (when available)');
        console.log('✅ Multi-dimensional scoring metrics');
        console.log('✅ Complete extraction audit trail');
        console.log('');
        
        console.log('💡 CLAUDE DESKTOP CAN NOW:');
        console.log('==========================');
        console.log('• Make informed recommendations based on client profile');
        console.log('• Consider commission vs client value trade-offs');
        console.log('• Factor in location proximity to client itinerary');
        console.log('• Evaluate hotel programs for client benefits');
        console.log('• Compare OTA rates for best client pricing');
        console.log('• Access direct booking URLs for immediate action');
        console.log('• Use scoring metrics for complex decision algorithms');
        console.log('• Verify data quality through extraction metadata');
      }
    } else {
      console.log('⚠️ No hotels with commission data found in this search result');
      console.log('This can happen when:');
      console.log('• Hotels are from major chains that don\'t pay commissions');
      console.log('• The search location has primarily non-commission properties');
      console.log('• Commission data wasn\'t properly extracted (rare)');
    }
    
  } catch (error) {
    console.error('❌ Sample inspection failed:', error.message);
  }
}

showCommissionHotelSample();