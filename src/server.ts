import express, { Request, Response } from 'express';
import YTMusic from 'ytmusic-api';
import { distance, closest } from 'fastest-levenshtein';
import path, { format } from 'path';
const ytdl = require("@distube/ytdl-core");

const fs = require('fs')

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
      let modifiedName = result.name
      .split(/[\s,]+/) // Split by spaces or commas
      .filter(part => part !== '"' && part !== "'") // Filter out unwanted parts
      .join(" ") // Join the parts back together with a space
      .replace(/[^a-zA-Z0-9&"' ]/g, '') // Allow only letters, numbers, spaces, & and quotation marks
      .replace(/&/g, 'and') // Replace ampersands with 'and'
      .trim() // Trim any leading or trailing spaces
      .normalize('NFC') // Normalize the string
      .toLowerCase(); // Convert to lowercase    

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
    // console.log(processedResults)

    if (!closestMatch) {
      throw new Error('No relevant song match found');
    } 

    return closestMatch;
  } catch (error: any) {
    console.error('Error finding closest song match:', error);
    console.log(results[0]);
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

  // console.log(songName + "\n" + artistName)

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

app.get('/api/download', async (req: Request, res: Response) => {
  const url = req.query.url; // Replace with your video URL

  // Set response headers
  res.header('Content-Disposition', 'attachment; filename="music.mp3"');
  res.header('Content-Type', 'mp3');

  // Stream the video directly to the response
  try
  {
    // Download the video to a temporary file
    ytdl(url, {
        quality: 'highest',
        filter: 'audioonly',
        format: 'mp3' // Choose the highest video quality
      })
      .pipe(res)
      .on('finish', () => {
        console.log("done downloading video")
      })
    ;


  } catch (error) {
    console.error('Error downloading:', error);
    res.status(500).send('Error downloading video.');
  }

  
})
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
//localhost:8080/api/download?url=https://www.youtube.com/watch?v=-HV3wsLYQTc





