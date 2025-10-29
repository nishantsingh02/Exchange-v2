import axios from "axios";
import { Depth, KLine, Ticker, Trade } from "./types";

const BASE_URL = "http://localhost:3000/api/v1";

export async function getTicker(market: string): Promise<Ticker> {
    const tickers = await getTickers();
    //@ts-ignore
    const ticker = tickers.find(t => t.symbol === market);
    if (!ticker) {
        throw new Error(`No ticker found for ${market}`);
    }
    return ticker;
}

// Updated getTickers with basic error check
export async function getTickers(): Promise<Ticker[]> {
    try {
        const response = await axios.get(`${BASE_URL}/tickers`);
        
        // **CRITICAL CHECK**: Ensure response.data is an array or contains the array
        if (Array.isArray(response.data)) {
            return response.data;
        } 
        // If the API wraps the array in an object (e.g., { data: [...] })
        else if (response.data && Array.isArray(response.data.data)) {
            return response.data.data;
        }
        
        // If neither is true, throw an error
        throw new Error("Invalid response format for tickers.");

    } catch (error) {
        console.error("Failed to fetch tickers:", error);
        // Throw an error to be caught by the component
        throw new Error("API call for tickers failed."); 
    }
}


export async function getDepth(market: string): Promise<Depth> {
    const response = await axios.get(`${BASE_URL}/depth?symbol=${market}`);
    return response.data;
}
export async function getTrades(market: string): Promise<Trade[]> {
    const response = await axios.get(`${BASE_URL}/trades?symbol=${market}`);
    return response.data;
}

export async function getKlines(market: string, interval: string, startTime: number, endTime: number): Promise<KLine[]> {
    const response = await axios.get(`${BASE_URL}/klines?symbol=${market}&interval=${interval}&startTime=${startTime}&endTime=${endTime}`);
    const data: KLine[] = response.data;
    return data.sort((x, y) => (Number(x.end) < Number(y.end) ? -1 : 1));
}