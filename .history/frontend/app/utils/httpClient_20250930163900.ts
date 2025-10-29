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