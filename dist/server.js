"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const ytmusic_api_1 = __importDefault(require("ytmusic-api"));
const fastest_levenshtein_1 = require("fastest-levenshtein");
function handleNextYtSong(query, officialSongName, officialArtistName) {
    return __awaiter(this, void 0, void 0, function* () {
        const ytmusic = new ytmusic_api_1.default();
        yield ytmusic.initialize( /* Optional: Custom cookies */);
        let results = yield ytmusic.searchSongs(query);
        try {
            const filteredResults = results.filter(result => {
                const lowerTitle = result.name.toLowerCase();
                return !lowerTitle.includes('instrumental') && !lowerTitle.includes('karaoke') && !lowerTitle.includes('cover');
            });
            const processedResults = filteredResults.map(result => {
                let modifiedName = result.name.split(/[\s,]+/).filter(part => part !== '"' && part !== "'").join(" ").trim().normalize('NFC').toLowerCase();
                let modifiedArtist = result.artist.name.trim().normalize('NFC').toLowerCase();
                return Object.assign(Object.assign({}, result), { name: modifiedName, artist: modifiedArtist });
            });
            if (processedResults.length === 0) {
                throw new Error('No relevant songs found');
            }
            // Find closest match for song name
            const closestName = (0, fastest_levenshtein_1.closest)(officialSongName.toLowerCase(), processedResults.map(result => result.name));
            // Find closest match for artist name
            const closestArtist = (0, fastest_levenshtein_1.closest)(officialArtistName.toLowerCase(), processedResults.map(result => result.artist));
            // Find the closest match based on both name and artist
            const closestMatch = processedResults.find(result => result.name === closestName && result.artist === closestArtist);
            console.log(processedResults);
            if (!closestMatch) {
                throw new Error('No relevant song match found');
            }
            return closestMatch;
        }
        catch (error) {
            console.error('Error finding closest song match:', error);
            // Return the first item if an error occurs
            return results && results.length > 0 ? results[0] : null;
        }
    });
}
const app = (0, express_1.default)();
const port = 8080;
app.use(express_1.default.json());
// Enable CORS
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});
// Example endpoint to proxy requests to YouTube Music API
app.get('/api/ytmusic', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const query = req.query.q;
    const songName = req.query.songName;
    const artistName = req.query.artistName;
    console.log(songName + "\n" + artistName);
    if (!query || !artistName) {
        return res.status(400).json({ error: 'Query parameter "q" and "artistName" are required' });
    }
    try {
        const response = yield handleNextYtSong(query, songName, artistName);
        res.json(response);
    }
    catch (error) {
        console.error('Error calling YouTube Music API:', error.message);
        res.status(500).json({ error: 'Failed to fetch data from YouTube Music API' });
    }
}));
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
