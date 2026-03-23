import { Storage } from '@google-cloud/storage';

const SERVICE_ACCOUNT_PATH = './service-account.json';

// Firebase Storage uses two possible bucket name formats:
// 1. <project-id>.firebasestorage.app  (new format)
// 2. <project-id>.appspot.com          (old format)
const BUCKET_NAMES = [
  'digital-art-website.firebasestorage.app',
  'digital-art-website.appspot.com'
];

const corsConfig = [
  {
    origin: ['*'],
    method: ['GET', 'POST', 'PUT', 'DELETE', 'HEAD'],
    responseHeader: ['Content-Type', 'Authorization', 'x-goog-resumable'],
    maxAgeSeconds: 3600,
  },
];

const storage = new Storage({ keyFilename: SERVICE_ACCOUNT_PATH });

async function setCors() {
  for (const bucketName of BUCKET_NAMES) {
    try {
      console.log(`Trying bucket: ${bucketName} ...`);
      await storage.bucket(bucketName).setCorsConfiguration(corsConfig);
      console.log(`✅ CORS applied successfully to: ${bucketName}`);
      return;
    } catch (err) {
      console.log(`❌ Failed for ${bucketName}: ${err.message}`);
    }
  }
  console.log('\n⚠️  Could not apply CORS to any bucket. Please check Firebase Console.');
}

setCors();

