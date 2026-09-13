export default function handler(_request, response) {
  response.setHeader('Cache-Control', 'public, max-age=300');
  response.status(200).json({
    firebase: {
      apiKey: process.env.FIREBASE_API_KEY,
      authDomain: process.env.FIREBASE_AUTH_DOMAIN,
      projectId: process.env.FIREBASE_PROJECT_ID,
      appId: process.env.FIREBASE_APP_ID
    }
  });
}
