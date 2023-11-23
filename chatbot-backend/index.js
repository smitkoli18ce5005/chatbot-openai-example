/**
 * Create .env file inside chatbot-backend directory and add below properties
 * OPENAI_API_KEY=<YOUR OPEN AI API TOKEN>
 * AIRTABLE_API_KEY=<YOUR AIRTABLE API TOKEN>
 * AIRTABLE_BASE_ID=<YOUR AIRTABLE BASE ID>
 * AIRTABLE_TABLE_NAME=<YOUR AIRTABLE TABLE NAME>
 */

const express = require('express');
const app = express();
const port = 3000;
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
const multer = require('multer');
const pdf = require('pdf-parse');
const Airtable = require("airtable");
require('dotenv').config();
app.use(express.json());
app.use(cors());
app.use(bodyParser.json())
app.use(bodyParser.raw())
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const airtableBase = new Airtable({
    apiKey: process.env.AIRTABLE_API_KEY,
}).base(process.env.AIRTABLE_BASE_ID);
const airtableTable = airtableBase("Table");
const airtableView = airtableTable.select({ view: "Grid view" });

app.post('/dummy/chatbot', (req, res) => {
    try {
        const inputString = req.body.inputString;
        res.json({ bot: inputString });
    } catch (error) {
        console.error('Error handling POST request:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/openai/chatbot', async (req, res) => {
    try {
        const inputString = req.body.inputString;
        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
        {
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: inputString }],
            temperature: 0.7,
        },
        {
            headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            },
        }
        );
        res.json({ bot: response.data.choices[0].message.content });
    } catch (error) {
        console.error('Error sending text to OpenAI:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/pdf', upload.single('pdfFile'), async (req, res) => {
    try {
        if (!req.file) {
        return res.status(400).json({ error: 'No PDF file provided.' });
        }
        const pdfBuffer = req.file.buffer;
        pdf.pdf2json
        const pdfData = await pdf(pdfBuffer);
        const text = pdfData.text;
        
        const promptEmbeddingsResponse = await axios.post(
            'https://api.openai.com/v1/embeddings',
        {
            model: 'text-embedding-ada-002',
            input: text,
        },
        {
            headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            },
        }
        );
    
        const promptEmbedding = promptEmbeddingsResponse.data.data[0].embedding;
        
        const dataToAdd = {
            'Text': text,
            'Embedding': JSON.stringify(promptEmbedding),
          };

        await airtableTable.create(dataToAdd, (err, record) => {
        if (err) {
            console.error('Error adding record:', err);
            res.status(500).json({ error: 'Error adding record' });
            return;
        }
            res.json({ bot: "Embeddings are uploaded to database" });
        });

    } catch (error) {
        console.error('Error extracting text from PDF:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

function cosineSimilarity(A, B) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < A.length; i++) {
      dotProduct += A[i] * B[i];
      normA += A[i] * A[i];
      normB += B[i] * B[i];
    }
    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);
    return dotProduct / (normA * normB);
  }
  
  function getSimilarityScore(embeddingsHash, promptEmbedding) {
    const similarityScoreHash = {};
    Object.keys(embeddingsHash).forEach((text) => {
      similarityScoreHash[text] = cosineSimilarity(
        promptEmbedding,
        JSON.parse(embeddingsHash[text])
      );
    });
    return similarityScoreHash;
  }
  
  function getAirtableData() {
    return new Promise((resolve, reject) => {
      airtableView.firstPage((error, records) => {
        if (error) {
          console.error(error);
          return reject({});
        }
        const recordsHash = {};
        records.forEach(
          (record) => (recordsHash[record.get("Text")] = record.get("Embedding"))
        );
        resolve(recordsHash);
      });
    });
  }
  
app.post("/openai/chatbot/embedded", async (req, res) => {
    const prompt = req.body.inputString;
  
    try {
      if (prompt == null) {
        throw new Error("Uh oh, no prompt was provided");
      }
  
      // getting text and embeddings data from airtable
      const embeddingsHash = await getAirtableData();
      
      // get embeddings value for prompt question
      const promptEmbeddingsResponse = await axios.post(
            'https://api.openai.com/v1/embeddings',
        {
            model: 'text-embedding-ada-002',
            input: prompt,
        },
        {
            headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            },
        }
        );
     
      const promptEmbedding = promptEmbeddingsResponse.data.data[0].embedding;
  
      // create map of text against similarity score
      const similarityScoreHash = getSimilarityScore(
        embeddingsHash,
        promptEmbedding
      );
  
      // get text (i.e. key) from score map that has highest similarity score
      const textWithHighestScore = Object.keys(similarityScoreHash).reduce(
        (a, b) => (similarityScoreHash[a] > similarityScoreHash[b] ? a : b)
      );
  
      // build final prompt
      const finalPrompt = `
        Info: ${textWithHighestScore}
        Question: ${prompt}
        Answer:
      `;

      const response = await axios.post(
            'https://api.openai.com/v1/engines/text-davinci-002/completions',
        {
            prompt: finalPrompt,
            max_tokens: 100,
        },
        {
            headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            },
        }
        );
      res.json({ bot: response.data.choices[0].text });
    } catch (error) {
      console.error(error.message);
    }
  });

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
});