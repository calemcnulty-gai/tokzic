import * as admin from 'firebase-admin';
import { getStorage } from 'firebase-admin/storage';
import * as dotenv from 'dotenv';
import { File } from '@google-cloud/storage';

// Load environment variables
dotenv.config();

// Initialize admin SDK with the correct bucket
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  storageBucket: 'tokzic-mobile.firebasestorage.app'
});

const storage = getStorage();
const bucket = storage.bucket();

// Sample video URLs from Mixkit (free stock videos)
const sampleVideos = [
  {
    url: 'https://assets.mixkit.co/videos/preview/mixkit-tree-with-yellow-flowers-1173-large.mp4',
    filename: 'yellow-flowers.mp4'
  },
  {
    url: 'https://assets.mixkit.co/videos/preview/mixkit-young-woman-working-out-at-home-1456-large.mp4',
    filename: 'workout.mp4'
  },
  {
    url: 'https://assets.mixkit.co/videos/preview/mixkit-waves-in-the-water-1164-large.mp4',
    filename: 'waves.mp4'
  },
  {
    url: 'https://assets.mixkit.co/videos/preview/mixkit-person-walking-on-a-street-with-storefronts-4347-large.mp4',
    filename: 'street-walk.mp4'
  }
];

const downloadAndUpload = async (videoUrl: string, filename: string) => {
  try {
    console.log('\n=== Processing Video ===');
    console.log(`🎥 Video: ${filename}`);
    console.log(`🔗 URL: ${videoUrl}`);
    
    console.log('\n📥 Downloading...');
    const response = await fetch(videoUrl);
    
    // Log response metadata
    console.log('\n📋 Response Metadata:');
    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log('Headers:');
    for (const [name, value] of response.headers.entries()) {
      console.log(`${name}: ${value}`);
    }
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const buffer = await response.arrayBuffer();
    console.log(`📦 Downloaded Size: ${(buffer.byteLength / 1024 / 1024).toFixed(2)} MB`);
    
    if (buffer.byteLength < 1000) { // Less than 1KB
      console.warn('⚠️ WARNING: Downloaded file is suspiciously small!');
      console.log(`Actual size: ${buffer.byteLength} bytes`);
      return null;
    }
    
    console.log('\n⬆️ Uploading to Firebase Storage...');
    const file = bucket.file(`videos/${filename}`);
    await file.save(Buffer.from(buffer));
    
    // Make the file publicly readable
    await file.makePublic();
    
    // Get and verify the uploaded file
    const [metadata] = await file.getMetadata();
    console.log('\n✅ Upload Complete');
    console.log('Firebase Storage Metadata:');
    if (metadata.size) {
      console.log(`- Size: ${(Number(metadata.size) / 1024 / 1024).toFixed(2)} MB`);
    }
    console.log(`- Content Type: ${metadata.contentType}`);
    console.log(`- Created: ${metadata.timeCreated}`);
    console.log(`- MD5 Hash: ${metadata.md5Hash}`);
    
    // Get the download URL
    const downloadUrl = `https://storage.googleapis.com/${bucket.name}/${file.name}`;
    console.log(`\n🔗 Download URL: ${downloadUrl}`);
    
    return downloadUrl;
  } catch (error) {
    console.error(`\n❌ Error processing ${filename}:`, error);
    throw error;
  }
};

const uploadSampleVideos = async () => {
  console.log('🚀 Starting sample video upload process...');
  
  for (const video of sampleVideos) {
    try {
      await downloadAndUpload(video.url, video.filename);
      console.log('\n-----------------------------------');
    } catch (error) {
      console.error(`Failed to process ${video.filename}`);
      console.log('\n-----------------------------------');
    }
  }
  
  console.log('\n✨ Upload process completed!');
};

// Run the upload process
uploadSampleVideos(); 