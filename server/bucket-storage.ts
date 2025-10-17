import { Client } from '@replit/object-storage';

// Determine bucket ID based on environment
const DEV_BUCKET_ID = 'replit-objstore-de6c58a6-b4f1-4ccd-8165-11037524c945';
const PROD_BUCKET_ID = 'replit-objstore-63b87864-7da4-4fc4-94df-fe5bd8d4c39b';

// Use BUCKET_ID env var if set, otherwise use NODE_ENV to determine
const bucketId = process.env.BUCKET_ID || 
  (process.env.NODE_ENV === 'production' ? PROD_BUCKET_ID : DEV_BUCKET_ID);

console.log(`Using bucket: ${bucketId} (environment: ${process.env.NODE_ENV || 'development'})`);

// Initialize Replit Object Storage client with the specific bucket ID
const client = new Client({ bucketId });
console.log('Replit Object Storage client initialized successfully with bucket:', bucketId);

export interface ImageUploadResult {
  url: string;
  key: string;
  size: number;
}

export interface VideoUploadResult {
  url: string;
  key: string;
  size: number;
}

export class BucketStorageService {
  private bucketId = bucketId;

  async uploadAthleteImage(athleteId: number, imageBuffer: Buffer, fileName: string): Promise<ImageUploadResult> {
    try {
      const fileExtension = fileName.split('.').pop() || 'jpg';
      const key = `athletes/${athleteId}/profile.${fileExtension}`;
      
      console.log(`📤 Uploading ${key} to bucket: ${this.bucketId}`);
      console.log(`   Size: ${imageBuffer.length} bytes`);
      
      // Upload to Replit Object Storage
      const uploadResult = await client.uploadFromBytes(key, imageBuffer);
      
      console.log('Upload result:', uploadResult);
      
      // Handle different response formats from Replit Object Storage
      if (uploadResult.ok === false || (!uploadResult.ok && !uploadResult.success)) {
        console.error('Upload failed:', uploadResult.error || uploadResult);
        throw new Error(`Upload failed: ${uploadResult.error?.message || uploadResult.message || 'Unknown error'}`);
      }

      // Verify upload was successful
      if (!uploadResult.ok && !uploadResult.success) {
        throw new Error('Upload completed but status unclear');
      }

      // Return our API URL that will serve the image through the backend
      const downloadUrl = `/api/athletes/${athleteId}/image`;
      
      return {
        url: downloadUrl,
        key,
        size: imageBuffer.length
      };
    } catch (error) {
      console.error('Error uploading athlete image:', error);
      throw new Error('Failed to upload athlete image');
    }
  }

  async uploadCompetitionLogo(competitionId: number, imageBuffer: Buffer, fileName: string): Promise<ImageUploadResult> {
    try {
      const fileExtension = fileName.split('.').pop() || 'jpg';
      const key = `competitions/${competitionId}/logo.${fileExtension}`;
      
      console.log(`📤 Uploading ${key} to bucket: ${this.bucketId}`);
      console.log(`   Size: ${imageBuffer.length} bytes`);
      
      // Upload to Replit Object Storage
      const uploadResult = await client.uploadFromBytes(key, imageBuffer);
      
      console.log('Upload result:', uploadResult);
      
      // Handle different response formats from Replit Object Storage
      if (uploadResult.ok === false || (!uploadResult.ok && !uploadResult.success)) {
        console.error('Upload failed:', uploadResult.error || uploadResult);
        throw new Error(`Upload failed: ${uploadResult.error?.message || uploadResult.message || 'Unknown error'}`);
      }

      // Verify upload was successful
      if (!uploadResult.ok && !uploadResult.success) {
        throw new Error('Upload completed but status unclear');
      }

      // Return our API URL that will serve the image through the backend
      const downloadUrl = `/api/competitions/${competitionId}/logo`;
      
      return {
        url: downloadUrl,
        key,
        size: imageBuffer.length
      };
    } catch (error) {
      console.error('Error uploading competition logo:', error);
      throw new Error('Failed to upload competition logo');
    }
  }

  async downloadImageFromUrl(imageUrl: string, retries = 2): Promise<Buffer> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`Retry attempt ${attempt} of ${retries} for: ${imageUrl}`);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        } else {
          console.log(`Downloading image from: ${imageUrl}`);
        }
        
        const response = await fetch(imageUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': 'https://www.worldtaekwondo.org/'
          },
          signal: AbortSignal.timeout(30000)
        });
        
        if (response.status === 403) {
          console.warn(`403 Forbidden for URL: ${imageUrl} - URL may have expired`);
          throw new Error(`HTTP 403: URL expired or access forbidden`);
        }
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const contentType = response.headers.get('content-type');
        const validContentTypes = ['image/', 'application/octet-stream'];
        const isValidContentType = validContentTypes.some(type => contentType?.startsWith(type));
        
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
        const urlLooksLikeImage = imageExtensions.some(ext => imageUrl.toLowerCase().includes(ext));
        
        const isCloudFrontUrl = imageUrl.includes('cloudfront.net');
        
        if (!contentType || (!isValidContentType && !urlLooksLikeImage && !isCloudFrontUrl)) {
          console.warn(`Questionable content type: ${contentType} for URL: ${imageUrl}, but proceeding anyway`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        if (buffer.length === 0) {
          throw new Error('Empty image data received');
        }
        
        console.log(`Successfully downloaded image: ${buffer.length} bytes`);
        return buffer;
      } catch (error) {
        lastError = error as Error;
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage?.includes('403') || errorMessage?.includes('expired')) {
          console.error(`Image URL expired or forbidden (attempt ${attempt + 1}/${retries + 1}):`, errorMessage);
          break;
        }
        if (attempt === retries) {
          console.error(`Failed to download image after ${retries + 1} attempts:`, error);
        }
      }
    }
    
    throw lastError || new Error('Failed to download image');
  }

  async checkImageExists(athleteId: number): Promise<boolean> {
    try {
      const prefix = `athletes/${athleteId}/`;
      const listResult = await client.list({ prefix });
      
      if (!listResult || (!listResult.success && !listResult.ok)) {
        return false;
      }
      
      const items = listResult.data || listResult.items || listResult.value || [];
      return items && items.length > 0;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Error checking if image exists for athlete ${athleteId}:`, errorMessage);
      return false;
    }
  }

  async uploadFromUrl(athleteId: number, imageUrl: string, fileName?: string): Promise<ImageUploadResult> {
    try {
      const imageExists = await this.checkImageExists(athleteId);
      
      if (imageExists) {
        console.log(`Image already exists for athlete ${athleteId}, skipping download`);
        return {
          url: `/api/athletes/${athleteId}/image`,
          key: `athletes/${athleteId}/profile.jpg`,
          size: 0
        };
      }
      
      const imageBuffer = await this.downloadImageFromUrl(imageUrl);
      
      const finalFileName = fileName || `athlete-${athleteId}-${Date.now()}.jpg`;
      
      return await this.uploadAthleteImage(athleteId, imageBuffer, finalFileName);
    } catch (error) {
      console.error('Error uploading from URL:', error);
      throw new Error('Failed to upload image from URL');
    }
  }

  async deleteAthleteImage(athleteId: number): Promise<void> {
    try {
      // List all files for this athlete
      const prefix = `athletes/${athleteId}/`;
      const listResult = await client.list({ prefix });
      
      if (listResult.success && listResult.data) {
        // Delete all files for this athlete
        for (const obj of listResult.data) {
          const deleteResult = await client.delete(obj.key);
          if (!deleteResult.success && !deleteResult.ok) {
            console.warn(`Failed to delete ${obj.key}:`, deleteResult.error);
          }
        }
      }
    } catch (error) {
      console.error('Error deleting athlete images:', error);
      throw new Error('Failed to delete athlete images');
    }
  }

  async getAthleteImageUrl(athleteId: number): Promise<string | null> {
    try {
      const prefix = `athletes/${athleteId}/`;
      const listResult = await client.list({ prefix });
      
      if (!listResult.success || !listResult.data || listResult.data.length === 0) {
        return null;
      }
      
      // Return our API URL that will serve the image through the backend
      const downloadUrl = `/api/athletes/${athleteId}/image`;
      
      return downloadUrl;
    } catch (error) {
      console.error('Error getting athlete image URL:', error);
      return null;
    }
  }

  async getAthleteImageBuffer(athleteId: number): Promise<Buffer | null> {
    try {
      const prefix = `athletes/${athleteId}/`;
      const listResult = await client.list({ prefix });
      
      // Check different possible response formats
      if (!listResult || (!listResult.success && !listResult.ok)) {
        return null;
      }
      
      // Handle different response formats
      let items = listResult.data || listResult.items || listResult.value || [];
      
      if (!items || items.length === 0) {
        return null;
      }
      
      // Try to find the best image (prefer profile images, then jpg, then any image)
      let selectedKey = null;
      
      // Look for profile images first
      for (const item of items) {
        const key = item.key || item.name;
        if (key.includes('profile')) {
          selectedKey = key;
          break;
        }
      }
      
      // If no profile image, look for jpg files
      if (!selectedKey) {
        for (const item of items) {
          const key = item.key || item.name;
          if (key.endsWith('.jpg') || key.endsWith('.jpeg')) {
            selectedKey = key;
            break;
          }
        }
      }
      
      // If still no image, take the first one
      if (!selectedKey) {
        selectedKey = items[0].key || items[0].name;
      }
      
      // Download the selected image
      const downloadResult = await client.downloadAsBytes(selectedKey);
      
      // Handle different response formats
      if (!downloadResult || (!downloadResult.success && !downloadResult.ok)) {
        return null;
      }
      
      // For Replit Object Storage, the response format is { ok: true, value: [buffer] }
      if (downloadResult.ok && downloadResult.value && Array.isArray(downloadResult.value)) {
        const imageBuffer = downloadResult.value[0];
        return Buffer.isBuffer(imageBuffer) ? imageBuffer : Buffer.from(imageBuffer);
      }
      
      // Fallback to other possible formats
      const data = downloadResult.data || downloadResult.bytes;
      if (!data) {
        return null;
      }
      
      return Buffer.from(data);
    } catch (error) {
      console.error(`Error getting athlete image buffer for ${athleteId}:`, error);
      return null;
    }
  }

  async bulkUploadAthleteImages(athletes: Array<{ id: number; photoUrl: string }>): Promise<{
    successful: number;
    failed: number;
    errors: string[];
  }> {
    let successful = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const athlete of athletes) {
      try {
        if (athlete.photoUrl) {
          await this.uploadFromUrl(athlete.id, athlete.photoUrl);
          successful++;
          console.log(`✓ Uploaded image for athlete ${athlete.id}`);
        }
      } catch (error) {
        failed++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorMsg = `Failed to upload image for athlete ${athlete.id}: ${errorMessage}`;
        errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    return { successful, failed, errors };
  }

  async checkCompetitionLogoExists(competitionId: number): Promise<boolean> {
    try {
      const prefix = `competitions/${competitionId}/`;
      const listResult = await client.list({ prefix });
      
      if (!listResult || (!listResult.success && !listResult.ok)) {
        return false;
      }
      
      const items = listResult.data || listResult.items || listResult.value || [];
      return items && items.length > 0;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Error checking if logo exists for competition ${competitionId}:`, errorMessage);
      return false;
    }
  }

  async uploadCompetitionLogoFromUrl(competitionId: number, imageUrl: string, fileName?: string): Promise<ImageUploadResult> {
    try {
      const logoExists = await this.checkCompetitionLogoExists(competitionId);
      
      if (logoExists) {
        console.log(`Logo already exists for competition ${competitionId}, skipping download`);
        return {
          url: `/api/competitions/${competitionId}/logo`,
          key: `competitions/${competitionId}/logo.jpg`,
          size: 0
        };
      }
      
      const imageBuffer = await this.downloadImageFromUrl(imageUrl);
      
      const finalFileName = fileName || `competition-${competitionId}-${Date.now()}.jpg`;
      
      return await this.uploadCompetitionLogo(competitionId, imageBuffer, finalFileName);
    } catch (error) {
      console.error('Error uploading competition logo from URL:', error);
      throw new Error('Failed to upload competition logo from URL');
    }
  }

  async getCompetitionLogoBuffer(competitionId: number): Promise<Buffer | null> {
    try {
      const prefix = `competitions/${competitionId}/`;
      const listResult = await client.list({ prefix });
      
      // Check different possible response formats
      if (!listResult || (!listResult.success && !listResult.ok)) {
        return null;
      }
      
      // Handle different response formats
      let items = listResult.data || listResult.items || listResult.value || [];
      
      if (!items || items.length === 0) {
        return null;
      }
      
      // Try to find the logo image
      let selectedKey = null;
      
      // Look for logo images first
      for (const item of items) {
        const key = item.key || item.name;
        if (key.includes('logo')) {
          selectedKey = key;
          break;
        }
      }
      
      // If no logo image, take the first one
      if (!selectedKey) {
        selectedKey = items[0].key || items[0].name;
      }
      
      // Download the selected image
      const downloadResult = await client.downloadAsBytes(selectedKey);
      
      // Handle different response formats
      if (!downloadResult || (!downloadResult.success && !downloadResult.ok)) {
        return null;
      }
      
      // For Replit Object Storage, the response format is { ok: true, value: [buffer] }
      if (downloadResult.ok && downloadResult.value && Array.isArray(downloadResult.value)) {
        const imageBuffer = downloadResult.value[0];
        return Buffer.isBuffer(imageBuffer) ? imageBuffer : Buffer.from(imageBuffer);
      }
      
      // Fallback to other possible formats
      const data = downloadResult.data || downloadResult.bytes;
      if (!data) {
        return null;
      }
      
      return Buffer.from(data);
    } catch (error) {
      console.error(`Error getting competition logo buffer for ${competitionId}:`, error);
      return null;
    }
  }

  // Video upload methods
  async uploadVideo(analysisId: number, videoBuffer: Buffer, fileName: string): Promise<VideoUploadResult> {
    try {
      const fileExtension = fileName.split('.').pop() || 'mp4';
      const key = `videos/analysis/${analysisId}/video.${fileExtension}`;
      
      console.log(`📤 Uploading video ${key} to bucket: ${this.bucketId}`);
      console.log(`   Size: ${videoBuffer.length} bytes`);
      
      // Upload to Replit Object Storage
      const uploadResult = await client.uploadFromBytes(key, videoBuffer);
      
      console.log('Video upload result:', uploadResult);
      
      // Handle different response formats from Replit Object Storage
      if (uploadResult.ok === false || (!uploadResult.ok && !uploadResult.success)) {
        console.error('Video upload failed:', uploadResult.error || uploadResult);
        throw new Error(`Upload failed: ${uploadResult.error?.message || uploadResult.message || 'Unknown error'}`);
      }

      // Verify upload was successful
      if (!uploadResult.ok && !uploadResult.success) {
        throw new Error('Video upload completed but status unclear');
      }

      // Return our API URL that will serve the video through the backend
      const downloadUrl = `/api/video-analysis/${analysisId}/video`;
      
      return {
        url: downloadUrl,
        key,
        size: videoBuffer.length
      };
    } catch (error) {
      console.error('Error uploading video:', error);
      throw new Error('Failed to upload video');
    }
  }

  async getVideoUrl(analysisId: number): Promise<string | null> {
    try {
      const prefix = `videos/analysis/${analysisId}/`;
      const listResult = await client.list({ prefix });
      
      if (!listResult.success || !listResult.data || listResult.data.length === 0) {
        return null;
      }
      
      // Return our API URL that will serve the video through the backend
      const downloadUrl = `/api/video-analysis/${analysisId}/video`;
      
      return downloadUrl;
    } catch (error) {
      console.error('Error getting video URL:', error);
      return null;
    }
  }

  async getVideoBuffer(analysisId: number): Promise<Buffer | null> {
    try {
      const prefix = `videos/analysis/${analysisId}/`;
      const listResult = await client.list({ prefix });
      
      // Check different possible response formats
      if (!listResult || (!listResult.success && !listResult.ok)) {
        return null;
      }
      
      // Handle different response formats
      let items = listResult.data || listResult.items || listResult.value || [];
      
      if (!items || items.length === 0) {
        return null;
      }
      
      // Get the first video file
      const selectedKey = items[0].key || items[0].name;
      
      // Download the video
      const downloadResult = await client.downloadAsBytes(selectedKey);
      
      // Handle different response formats
      if (!downloadResult || (!downloadResult.success && !downloadResult.ok)) {
        return null;
      }
      
      // For Replit Object Storage, the response format is { ok: true, value: [buffer] }
      if (downloadResult.ok && downloadResult.value && Array.isArray(downloadResult.value)) {
        const videoBuffer = downloadResult.value[0];
        return Buffer.isBuffer(videoBuffer) ? videoBuffer : Buffer.from(videoBuffer);
      }
      
      // Fallback to other possible formats
      const data = downloadResult.data || downloadResult.bytes;
      if (!data) {
        return null;
      }
      
      return Buffer.from(data);
    } catch (error) {
      console.error(`Error getting video buffer for analysis ${analysisId}:`, error);
      return null;
    }
  }

  async deleteVideo(analysisId: number): Promise<void> {
    try {
      // List all files for this analysis
      const prefix = `videos/analysis/${analysisId}/`;
      const listResult = await client.list({ prefix });
      
      if (listResult.success && listResult.data) {
        // Delete all video files for this analysis
        for (const obj of listResult.data) {
          const deleteResult = await client.delete(obj.key);
          if (!deleteResult.success && !deleteResult.ok) {
            console.warn(`Failed to delete ${obj.key}:`, deleteResult.error);
          }
        }
      }
    } catch (error) {
      console.error('Error deleting video:', error);
      throw new Error('Failed to delete video');
    }
  }

  async checkVideoExists(analysisId: number): Promise<boolean> {
    try {
      const prefix = `videos/analysis/${analysisId}/`;
      const listResult = await client.list({ prefix });
      
      if (!listResult || (!listResult.success && !listResult.ok)) {
        return false;
      }
      
      const items = listResult.data || listResult.items || listResult.value || [];
      return items && items.length > 0;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Error checking if video exists for analysis ${analysisId}:`, errorMessage);
      return false;
    }
  }
}

export const bucketStorage = new BucketStorageService();