import React from "react";
import { useUserGuardContext } from "app/auth";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const Dashboard: React.FC = () => {
  const { user } = useUserGuardContext();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-screen text-gray-800">
      <header className="bg-white shadow-md p-4 flex justify-between items-center z-10">
        <div className="flex items-center gap-3">
            <img 
              src="https://static.databutton.com/public/31918511-30ff-4aa8-ae29-96f0862b6436/1000002434-Picsart-BackgroundRemover.png" 
              alt="WellNest Scanner Logo" 
              className="h-10 w-auto"
            />
            <h1 className="text-2xl font-bold text-gray-900">
              WellNest Scanner
            </h1>
          </div>
        <div className="flex items-center gap-4">
          <span className="text-sm">Welcome, {user.email}</span>
          <Button variant="outline" onClick={() => navigate("/analysis")}>
            Go to Analysis
          </Button>
          <Button variant="outline" onClick={() => (window.location.href = "/auth/sign-out")}>
            Sign Out
          </Button>
        </div>
      </header>
      <main className="flex-1 overflow-y-auto p-8 pt-10">
        <h2 className="text-3xl font-bold mb-6">Your Progress Dashboard</h2>
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">My Progress</h2>
          <p className="text-lg text-gray-600">
            Your analysis history and progress charts will be displayed here soon.
          </p>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
