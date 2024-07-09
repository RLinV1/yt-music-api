import express, { Request, Response } from 'express';
import YTMusic from 'ytmusic-api';

async function handleNextYtSong(query: string): Promise<any> {
  const ytmusic = new YTMusic();
  await ytmusic.initialize(/* Optional: Custom cookies */);

  return ytmusic.searchSongs(query); // Use search method instead of searchSongs if available
}

const app = express();
const port = 8080;

app.use(express.json());

// Enable CORS
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

// Example endpoint to proxy requests to YouTube Music API
app.get('/api/ytmusic', async (req: Request, res: Response) => {
  const query = req.query.q as string; // Assuming the query parameter is named 'q'
  console.log(query);
  if (!query) {
    return res.status(400).json({ error: 'Query parameter "q" is required' });
  }

  try {
    const response = await handleNextYtSong(query);
    console.log(response);
    res.json(response); // Send the response back to the client
  } catch (error: any) {
    console.error('Error calling YouTube Music API:', error.message);
    res.status(500).json({ error: 'Failed to fetch data from YouTube Music API' });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
