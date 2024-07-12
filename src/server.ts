import express, { Request, Response } from 'express';
import YTMusic from 'ytmusic-api';
import { distance, closest } from 'fastest-levenshtein';

async function handleNextYtSong(query: string, officialSongName: string, officialArtistName: string): Promise<any> {
  const ytmusic = new YTMusic();
  await ytmusic.initialize(/* Optional: Custom cookies */);
  let results = await ytmusic.searchSongs(query);

  try {
    
    const filteredResults = results.filter(result => {
      const lowerTitle = result.name.toLowerCase();
      return !lowerTitle.includes('instrumental') && !lowerTitle.includes('karaoke') && !lowerTitle.includes('cover');
    });

    const processedResults = filteredResults.map(result => {
      let modifiedName = result.name.split(/[^ \p{L}]/u)[0].trim().normalize('NFC').toLowerCase();
      let modifiedArtist = result.artist.name.trim().normalize('NFC').toLowerCase();

      return {
        ...result,
        name: modifiedName,
        artist: modifiedArtist
      };
    });

    if (processedResults.length === 0) {
      throw new Error('No relevant songs found');
    }

    // Find closest match for song name
    const closestName = closest(officialSongName.toLowerCase(), processedResults.map(result => result.name));
    
    // Find closest match for artist name
    const closestArtist = closest(officialArtistName.toLowerCase(), processedResults.map(result => result.artist));

    // Find the closest match based on both name and artist
    const closestMatch = processedResults.find(result => 
      result.name === closestName && result.artist === closestArtist
    );

    if (!closestMatch) {
      throw new Error('No relevant song match found');
    } 

    return closestMatch;
  } catch (error: any) {
    console.error('Error finding closest song match:', error);
    // Return the first item if an error occurs
    return results && results.length > 0 ? results[0] : null;
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
  const artistName = req.query.artistName as string;

  console.log(songName + "\n" + artistName)

  if (!query || !artistName) {
    return res.status(400).json({ error: 'Query parameter "q" and "artistName" are required' });
  }

  try {
    const response = await handleNextYtSong(query, songName, artistName);
    res.json(response);
  } catch (error: any) {
    console.error('Error calling YouTube Music API:', error.message);
    res.status(500).json({ error: 'Failed to fetch data from YouTube Music API' });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
