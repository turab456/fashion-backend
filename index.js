import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
})); 
app.use(express.json());

// Initialize GoogleGenAI with API key
const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
});

// Check if prompt is related to fashion
const isFashionPrompt = async (prompt) => {
    const checkPrompt = `Is the following prompt about fashion? Respond only with "yes" or "no": "${prompt}"`;

    const config = {
        responseMimeType: 'text/plain',
    };

    const model = 'gemini-2.5-pro-exp-03-25'; // Use the Experimental model

    const contents = [
        {
            role: 'user',
            parts: [{ text: checkPrompt }],
        },
    ];

    try {
        const response = await ai.models.generateContentStream({
            model,
            config,
            contents,
        });

        let answer = '';
        for await (const chunk of response) {
            answer += chunk.text;
        }

        return answer.toLowerCase().includes('yes');
    } catch (err) {
        console.error('Error checking fashion prompt:', err);
        return false;
    }
};

// Handle /ask endpoint
app.post('/ask', async (req, res) => {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt required' });

    try {
        const isFashion = await isFashionPrompt(prompt);
        if (!isFashion) {
            return res.json({
                suggestion: "Sorry, I can only help with fashion-related questions.",
            });
        }

        // Generate fashion-related response using Google Gemini AI
        const aiRes = await ai.models.generateContentStream({
            model: 'gemini-2.5-pro-exp-03-25', // Use the Experimental model
            config: { responseMimeType: 'text/plain' },
            contents: [
                {
                    role: 'user',
                    parts: [{ text: prompt }],
                },
            ],
        });

        let suggestion = '';
        for await (const chunk of aiRes) {
            suggestion += chunk.text;
        }

        res.json({ suggestion });
    } catch (err) {
        console.error('Error processing request:', err.message);
        res.status(500).json({ error: 'Failed to process request' });
    }
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`✅ Backend running on port ${PORT}`);
});
