import express, { Request, Response } from 'express';
import YTMusic from 'ytmusic-api';
import { distance } from 'fastest-levenshtein';

async function handleNextYtSong(query: string, officialSongName: string): Promise<any> {
  const ytmusic = new YTMusic();
  await ytmusic.initialize(/* Optional: Custom cookies */);
  try {
      const results = await ytmusic.searchSongs(query);

      const filteredResults = results.filter(result => {
          const lowerTitle = result.name.toLowerCase();
          return !lowerTitle.includes('instrumental') && !lowerTitle.includes('karaoke') && !lowerTitle.includes('cover');
      });

      const processedResults = filteredResults.map(result => {
        // Split the name at any non-letter character (excluding spaces)
        let modifiedName = result.name.split(/[^ \p{L}]/u)[0].trim();
        modifiedName = modifiedName.toLowerCase();
        
        console.log(modifiedName);
        return {
          ...result,
          name: modifiedName
        };
      });

      if (processedResults.length === 0) {
          throw new Error('No relevant songs found');
      }

      let closestMatch = processedResults[0];
      let smallestDistance = distance(officialSongName.toLowerCase(), closestMatch.name.toLowerCase());

      for (const result of processedResults) {
          const currDistance = distance(officialSongName.toLowerCase(), result.name.toLowerCase());
          if (currDistance < smallestDistance) {
              smallestDistance = currDistance;
              closestMatch = result;
          }
      }

      return closestMatch;
  } catch (error) {
      console.error('Error finding closest song match:', error);
      return null;
  }
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
  const query = req.query.q as string;
  const songName = req.query.songName as string;

  if (!query) {
    return res.status(400).json({ error: 'Query parameter "q" is required' });
  }

  try {
    const response = await handleNextYtSong(query, songName);
    res.json(response);
  } catch (error: any) {
    console.error('Error calling YouTube Music API:', error.message);
    res.status(500).json({ error: 'Failed to fetch data from YouTube Music API' });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
