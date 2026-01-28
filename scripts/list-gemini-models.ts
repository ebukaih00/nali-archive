
import { config } from 'dotenv';
config({ path: '.env.local' });
import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY || "");

async function test3() {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
        const result = await model.generateContent("OK");
        console.log("Response:", result.response.text());
    } catch (e: any) {
        console.error("Error:", e.message);
    }
}

test3();
