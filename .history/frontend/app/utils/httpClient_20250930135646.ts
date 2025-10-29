import axios from "axios";
import { Depth, KLine, Ticker, Trade } from "./types";

const BASE_URL = "http://localhost:3000/api/v1";

// Fetch a single ticker for the given market
export async function getTicker(market: string): Promise<Ticker> {
    const tickers = await getTickers();
    if (!Array.isArray(tickers)) {
        throw new Error("Tickers API did not return an array");
    }

    const ticker = tickers.find(t => t.symbol === market);
    if (!ticker) {
        throw new Error(`No ticker found for ${market}`);
    }
    return ticker;
}

// Fetch all tickers
export async function getTickers(): Promise<Ticker[]> {
    const response = await axios.get(`${BASE_URL}/tickers`);

    // Check if the API response has a "tickers" property
    if (Array.isArray(response.data)) {
        return response.data; // Already an array
    } else if (Array.isArray(response.data.tickers)) {
        return response.data.tickers; // Wrapped in an object
    } else {
        throw new Error("Unexpected tickers API response format");
    }
}

// Fetch order book depth for a market
export async function getDepth(market: string): Promise<Depth> {
    const response = await axios.get(`${BASE_URL}/depth?symbol=${market}`);
    return response.data;
}

// Fetch trades for a market
export async function getTrades(market: string): Promise<Trade[]> {
    const response = await axios.get(`${BASE_URL}/trades?symbol=${market}`);
    return response.data;
}

// Fetch historical Klines/candlestick data
export async function getKlines(
    market: string,
    interval: string,
    startTime: number,
    endTime: number
): Promise<KLine[]> {
    const response = await axios.get(
        `${BASE_URL}/klines?symbol=${market}&interval=${interval}&startTime=${startTime}&endTime=${endTime}`
    );
    const data: KLine[] = response.data;

    // Sort by end time ascending
    return data.sort((x, y) => (Number(x.end) < Number(y.end) ? -1 : 1));
}
