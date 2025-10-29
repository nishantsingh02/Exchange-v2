"use client";
import { MarketBar } from "@/app/components/MarketBar";
import { SwapUI } from "@/app/components/SwapUI";
import { TradeView } from "@/app/components/TradeView";
import { Depth } from "@/app/components/depth/Depth";
import { useParams } from "next/navigation";
import { useState } from "react";

export default function Page() {
  const { market } = useParams();
  const [activeView, setActiveView] = useState("book");
  return (
    <div className="flex flex-row flex-1">
      <div className="flex flex-col flex-1 m-4">
        <MarketBar market={market as string} />
        <div className="flex flex-row h-[920px] border-y border-slate-800">
          <div className="flex flex-col flex-1">
            <TradeView market={market as string} />
          </div>

          {/* <div className="flex flex-col w-[250px] overflow-hidden m-4">
                    <Depth market={market as string} /> 
                </div> */}

          <div className="text-white min-h-screen flex  justify-center">
            <div className="flex flex-col w-[250px] overflow-hidden m-4 rounded-lg shadow-lg">
              <div className="flex justify-between gap-2 mb-1">
                <button className={`flex-1 text-center font-bold py-2 px-4 rounded-md transition-colors ${activeView === 'book' ? 'bg-gray-800 hover:bg-gray-700' : ''}`}
                onClick={() => setActiveView('book')}
                >
                  Book
                </button>
                <button className={`flex-1 text-center active:bg-gray-700 text-white font-bold py-2 px-4 rounded-md transition-colors ${activeView === 'trade' ? 'bg-gray-800 hover:bg-gray-700': ''}`}
                onClick={() => setActiveView("trade")}
                >
                  Trade
                </button>
              </div>
              {activeView === "book" ? (
                <Depth market={market as string} />
              ) : (
                <div className="text-center py-10 text-gray-400">
                  This is the Trade View.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="w-[10px] flex-col border-slate-800 border-l"></div>
      <div>
        <div className="flex flex-col w-[250px]">
          <SwapUI market={market as string} />
        </div>
      </div>
    </div>
  );
}
