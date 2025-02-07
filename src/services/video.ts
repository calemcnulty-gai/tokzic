import storage from '@react-native-firebase/storage';

export interface Video {
  id: string;
  url: string;
  createdAt: number;
}

/**
 * Fetches all videos from Firebase Storage
 * Returns them in chronological order (newest first)
 */
export async function fetchVideos(): Promise<Video[]> {
  try {
    console.log('📂 Listing videos from Firebase Storage...');
    const reference = storage().ref('videos');
    const result = await reference.list();
    console.log(`📊 Found ${result.items.length} videos in storage`);
    
    const videoPromises = result.items.map(async (item) => {
      console.log(`🔍 Getting URL for video: ${item.name}`);
      const url = await item.getDownloadURL();
      console.log(`✅ Got URL for ${item.name}: ${url}`);
      return {
        id: item.name,
        url,
        createdAt: Date.now(), // In a real app, we'd store this in Firestore
      };
    });

    const videos = await Promise.all(videoPromises);
    const sortedVideos = videos.sort((a, b) => b.createdAt - a.createdAt);
    console.log(`📱 Returning ${sortedVideos.length} sorted videos`);
    return sortedVideos;
  } catch (error) {
    console.error('❌ Error fetching videos:', error);
    throw error;
  }
} 