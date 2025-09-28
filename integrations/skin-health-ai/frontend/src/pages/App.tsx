import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useUser, type CurrentUser } from "@stackframe/react";
import { ScanButton } from "components/ScanButton";

const App: React.FC = () => {
  const user = useUser();
  const navigate = useNavigate();
  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-transparent absolute top-0 left-0 right-0 z-10">
        <div className="container mx-auto px-4 py-3 flex justify-end items-center">
          {/* Minimal header */}
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center text-center px-4">
        <div className="max-w-2xl">
          <div className="flex justify-center mb-6">
            <img
              src="https://static.databutton.com/public/31918511-30ff-4aa8-ae29-96f0862b6436/1000002434-Picsart-BackgroundRemover.png"
              alt="WellNest Scanner Logo"
              className="h-40 md:h-56 lg:h-64 w-auto drop-shadow-xl"
            />
          </div>

          <p className="text-lg md:text-xl text-muted-foreground">
            AI-powered skin analysis to understand your skin’s current condition and create a personalized routine.
          </p>
          <div className="mt-5 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              className="rounded-full px-6 md:px-8 bg-emerald-400 hover:bg-emerald-400/90 text-emerald-950 font-semibold shadow-lg"
              onClick={() => navigate("/analysis")}
            >
              Get Your Personalized Skin Journey
            </Button>
          </div>
        </div>

        {/* Smaller SCAN Circle under copy */}
        <div className="mt-8 md:mt-10">
          <ScanButton
            ariaLabel="Start your skin scan"
            size={160}
            onClick={() => navigate("/analysis")}
          />
        </div>
      </main>
    </div>
  );
};

export default App;

