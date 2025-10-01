import { Client } from '@replit/object-storage';

// Initialize Replit Object Storage client with bucket ID
const client = new Client();
// Initialize the client with the specific bucket ID (async call)
let isInitialized = false;
const initPromise = client.init('replit-objstore-59c76f0b-8f18-4450-b997-2d163531fb5e').then(() => {
  isInitialized = true;
  console.log('Replit Object Storage client initialized successfully');
}).catch(error => {
  console.error('Failed to initialize Replit Object Storage client:', error);
});

export interface ImageUploadResult {
  url: string;
  key: string;
  size: number;
}

export class BucketStorageService {
  private bucketId = 'replit-objstore-59c76f0b-8f18-4450-b997-2d163531fb5e';

  async uploadAthleteImage(athleteId: number, imageBuffer: Buffer, fileName: string): Promise<ImageUploadResult> {
    try {
      // Ensure client is initialized
      if (!isInitialized) {
        await initPromise;
      }
      
      const fileExtension = fileName.split('.').pop() || 'jpg';
      const key = `athletes/${athleteId}/profile.${fileExtension}`;
      
      console.log(`Uploading ${key} (${imageBuffer.length} bytes)`);
      console.log('Buffer type:', typeof imageBuffer);
      console.log('Buffer is Buffer:', Buffer.isBuffer(imageBuffer));
      console.log('First 10 bytes:', imageBuffer.slice(0, 10));
      
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

  async downloadImageFromUrl(imageUrl: string): Promise<Buffer> {
    try {
      console.log(`Downloading image from: ${imageUrl}`);
      
      const response = await fetch(imageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const contentType = response.headers.get('content-type');
      // Allow common image content types and octet-stream (which some CDNs use for images)
      const validContentTypes = ['image/', 'application/octet-stream'];
      const isValidContentType = validContentTypes.some(type => contentType?.startsWith(type));
      
      // Also check if URL looks like an image file as fallback
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
      const urlLooksLikeImage = imageExtensions.some(ext => imageUrl.toLowerCase().includes(ext));
      
      // Be more lenient with CloudFront URLs as they often return octet-stream
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
      console.error('Error downloading image:', error);
      throw new Error('Failed to download image');
    }
  }

  async uploadFromUrl(athleteId: number, imageUrl: string, fileName?: string): Promise<ImageUploadResult> {
    try {
      // Download image from URL
      const imageBuffer = await this.downloadImageFromUrl(imageUrl);
      
      // Generate filename if not provided
      const finalFileName = fileName || `athlete-${athleteId}-${Date.now()}.jpg`;
      
      // Upload to bucket
      return await this.uploadAthleteImage(athleteId, imageBuffer, finalFileName);
    } catch (error) {
      console.error('Error uploading from URL:', error);
      throw new Error('Failed to upload image from URL');
    }
  }

  async deleteAthleteImage(athleteId: number): Promise<void> {
    try {
      // Ensure client is initialized
      if (!isInitialized) {
        await initPromise;
      }
      
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
      // Ensure client is initialized
      if (!isInitialized) {
        await initPromise;
      }
      
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
      // Ensure client is initialized
      if (!isInitialized) {
        await initPromise;
      }
      
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
        const errorMsg = `Failed to upload image for athlete ${athlete.id}: ${error.message}`;
        errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    return { successful, failed, errors };
  }
}

export const bucketStorage = new BucketStorageService();