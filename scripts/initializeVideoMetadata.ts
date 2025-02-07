import * as admin from 'firebase-admin';
import { getStorage } from 'firebase-admin/storage';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize admin SDK with credentials from environment variables
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  }),
  storageBucket: 'tokzic-mobile.firebasestorage.app'
});

const storage = getStorage();
const firestore = getFirestore();
const bucket = storage.bucket();

async function initializeVideoMetadata() {
  console.log('🚀 Starting video metadata initialization...');

  try {
    // List all videos in storage
    const [files] = await bucket.getFiles({ prefix: 'videos/' });
    console.log(`📊 Found ${files.length} videos in storage`);

    // Create metadata for each video
    for (const file of files) {
      const videoId = file.name.replace('videos/', '');
      console.log(`\n📝 Creating metadata for video: ${videoId}`);

      // Check if metadata already exists
      const docRef = firestore.collection('videos').doc(videoId);
      const doc = await docRef.get();

      if (doc.exists) {
        console.log('✅ Metadata already exists, skipping...');
        continue;
      }

      // Create metadata document
      const metadata = {
        id: videoId,
        title: videoId.replace('.mp4', '').replace(/-/g, ' '),
        description: 'Sample video for testing',
        createdAt: Date.now(),
        creatorId: 'system',
        creator: {
          username: 'System',
          avatarUrl: null,
        },
        stats: {
          views: 0,
          likes: 0,
          superLikes: 0,
          comments: 0,
          tips: 0,
        }
      };

      await docRef.set(metadata);
      console.log('✅ Created metadata successfully');
    }

    console.log('\n✨ Video metadata initialization completed!');
  } catch (error) {
    console.error('❌ Error initializing video metadata:', error);
    throw error;
  }
}

// Run the initialization
initializeVideoMetadata(); 